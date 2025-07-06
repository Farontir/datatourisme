"""
Services de recherche Elasticsearch pour les ressources touristiques avec fallback
"""
from typing import Dict, List, Optional, Tuple
from elasticsearch_dsl import Search, Q, A
from django_elasticsearch_dsl.search import Search as DjangoSearch
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from django.db.models import Q as DjangoQ
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from .documents import TouristicResourceDocument
from .models import TouristicResource
from .connections import with_elasticsearch_fallback
from .circuit_breaker import ServiceCircuitBreakers, CircuitBreakerError
from .metrics import ApplicationMetrics, time_it
from .exceptions import SearchError, ServiceUnavailableError, ErrorHandler
import logging

logger = logging.getLogger(__name__)


class DatabaseSearchFallback:
    """Service de recherche fallback utilisant PostgreSQL"""
    
    @staticmethod
    @time_it('search.database_fallback.text_search.duration')
    def text_search(query: str, language: str = 'fr', 
                   filters: Optional[Dict] = None, 
                   page: int = 1, page_size: int = 20) -> Dict:
        """
        Recherche textuelle avec PostgreSQL full-text search
        
        Args:
            query: Terme de recherche
            language: Langue de recherche
            filters: Filtres additionnels
            page: Numéro de page
            page_size: Taille de page
            
        Returns:
            Dictionnaire avec résultats et métadonnées
        """
        try:
            ApplicationMetrics.increment_counter('search.fallback.text_search.calls', 1)
            
            # Construire le queryset de base
            queryset = TouristicResource.objects.filter(is_active=True)
            
            # Appliquer la recherche textuelle si query fourni
            if query:
                # Utiliser PostgreSQL full-text search
                search_vector = SearchVector('name', 'description', config='french')
                search_query = SearchQuery(query, config='french')
                
                queryset = queryset.annotate(
                    search=search_vector,
                    rank=SearchRank(search_vector, search_query)
                ).filter(search=search_query).order_by('-rank')
            else:
                queryset = queryset.order_by('-created_at')
            
            # Appliquer les filtres
            if filters:
                queryset = DatabaseSearchFallback._apply_filters(queryset, filters)
            
            # Pagination
            total = queryset.count()
            start = (page - 1) * page_size
            end = start + page_size
            results = queryset[start:end]
            
            # Formatter les résultats
            hits = []
            for resource in results:
                hit = DatabaseSearchFallback._format_database_hit(resource, language)
                hits.append(hit)
            
            # Calculer les agrégations basiques
            aggregations = DatabaseSearchFallback._calculate_aggregations(
                TouristicResource.objects.filter(is_active=True)
            )
            
            return {
                'hits': hits,
                'total': total,
                'took': 0,  # Non applicable pour DB
                'aggregations': aggregations,
                'page': page,
                'page_size': page_size,
                'fallback': True,
                'source': 'database'
            }
            
        except Exception as e:
            logger.error(f"Database fallback text search failed: {e}")
            ApplicationMetrics.increment_counter('search.fallback.text_search.errors', 1)
            return {
                'hits': [],
                'total': 0,
                'took': 0,
                'aggregations': {},
                'page': page,
                'page_size': page_size,
                'error': str(e),
                'fallback': True,
                'source': 'database'
            }
    
    @staticmethod
    @time_it('search.database_fallback.geo_search.duration')
    def geo_search(lat: float, lng: float, radius_km: float = 10,
                  language: str = 'fr', filters: Optional[Dict] = None,
                  page: int = 1, page_size: int = 20) -> Dict:
        """
        Recherche géographique avec PostGIS
        
        Args:
            lat: Latitude
            lng: Longitude  
            radius_km: Rayon en kilomètres
            language: Langue
            filters: Filtres additionnels
            page: Numéro de page
            page_size: Taille de page
            
        Returns:
            Dictionnaire avec résultats et métadonnées
        """
        try:
            ApplicationMetrics.increment_counter('search.fallback.geo_search.calls', 1)
            
            # Point de recherche
            search_point = Point(lng, lat, srid=4326)
            
            # Construire le queryset avec distance
            queryset = TouristicResource.objects.filter(
                is_active=True,
                location__distance_lte=(search_point, Distance(km=radius_km))
            ).annotate(
                distance=Distance('location', search_point)
            ).order_by('distance')
            
            # Appliquer les filtres
            if filters:
                queryset = DatabaseSearchFallback._apply_filters(queryset, filters)
            
            # Pagination
            total = queryset.count()
            start = (page - 1) * page_size
            end = start + page_size
            results = queryset[start:end]
            
            # Formatter les résultats
            hits = []
            for resource in results:
                hit = DatabaseSearchFallback._format_database_hit(resource, language, include_distance=True)
                hits.append(hit)
            
            # Calculer les agrégations
            aggregations = DatabaseSearchFallback._calculate_aggregations(queryset)
            
            return {
                'hits': hits,
                'total': total,
                'took': 0,
                'aggregations': aggregations,
                'page': page,
                'page_size': page_size,
                'center': {'lat': lat, 'lng': lng},
                'radius_km': radius_km,
                'fallback': True,
                'source': 'database'
            }
            
        except Exception as e:
            logger.error(f"Database fallback geo search failed: {e}")
            ApplicationMetrics.increment_counter('search.fallback.geo_search.errors', 1)
            return {
                'hits': [],
                'total': 0,
                'took': 0,
                'aggregations': {},
                'page': page,
                'page_size': page_size,
                'error': str(e),
                'fallback': True,
                'source': 'database'
            }
    
    @staticmethod
    def _apply_filters(queryset, filters: Dict):
        """Applique les filtres au queryset"""
        if 'resource_types' in filters and filters['resource_types']:
            queryset = queryset.filter(resource_types__overlap=filters['resource_types'])
        
        if 'cities' in filters and filters['cities']:
            queryset = queryset.filter(city__in=filters['cities'])
        
        if 'is_active' in filters:
            queryset = queryset.filter(is_active=filters['is_active'])
        
        if 'date_from' in filters:
            queryset = queryset.filter(creation_date__gte=filters['date_from'])
        
        if 'date_to' in filters:
            queryset = queryset.filter(creation_date__lte=filters['date_to'])
        
        return queryset
    
    @staticmethod
    def _format_database_hit(resource, language: str = 'fr', include_distance: bool = False) -> Dict:
        """Formate un résultat de recherche depuis la base de données"""
        result = {
            'resource_id': resource.resource_id,
            'name': resource.get_name(language),
            'description': resource.get_description(language),
            'location': {
                'lat': resource.location.y if resource.location else None,
                'lon': resource.location.x if resource.location else None
            } if resource.location else None,
            'city': resource.city,
            'address': resource.address,
            'resource_types': resource.resource_types or [],
            'creation_date': resource.creation_date.isoformat() if resource.creation_date else None,
            'is_active': resource.is_active,
            'score': getattr(resource, 'rank', None) or 1.0
        }
        
        # Ajouter la distance si calculée
        if include_distance and hasattr(resource, 'distance'):
            result['distance_km'] = round(resource.distance.km, 2)
        
        return result
    
    @staticmethod
    def _calculate_aggregations(queryset) -> Dict:
        """Calcule des agrégations basiques depuis la base de données"""
        try:
            # Compter les types de ressources
            resource_types_agg = {}
            for resource in queryset.values_list('resource_types', flat=True):
                if resource:
                    for rt in resource:
                        resource_types_agg[rt] = resource_types_agg.get(rt, 0) + 1
            
            # Compter les villes
            cities_agg = {}
            for city in queryset.exclude(city__isnull=True).exclude(city='').values_list('city', flat=True):
                cities_agg[city] = cities_agg.get(city, 0) + 1
            
            return {
                'types': [{'key': k, 'count': v} for k, v in sorted(resource_types_agg.items(), key=lambda x: x[1], reverse=True)[:20]],
                'cities': [{'key': k, 'count': v} for k, v in sorted(cities_agg.items(), key=lambda x: x[1], reverse=True)[:20]]
            }
            
        except Exception as e:
            logger.error(f"Error calculating aggregations: {e}")
            return {'types': [], 'cities': []}


class SearchService:
    """Service centralisé pour les recherches Elasticsearch avec fallback robuste"""
    
    @classmethod
    @time_it('search.text_search.duration')
    def text_search(cls, query: str, language: str = 'fr', 
                   filters: Optional[Dict] = None, 
                   page: int = 1, page_size: int = 20) -> Dict:
        """
        Recherche textuelle dans les ressources avec fallback automatique
        
        Args:
            query: Terme de recherche
            language: Langue de recherche
            filters: Filtres additionnels
            page: Numéro de page
            page_size: Taille de page
            
        Returns:
            Dictionnaire avec résultats et métadonnées
        """
        # Tenter Elasticsearch d'abord
        try:
            ApplicationMetrics.increment_counter('search.elasticsearch.text_search.attempts', 1)
            
            # Vérifier le circuit breaker
            circuit_breaker = ServiceCircuitBreakers.elasticsearch_circuit_breaker()
            
            def _elasticsearch_search():
                search = Search(using='default', index='tourism_resources')
                
                if query:
                    # Recherche multi-champs avec boost
                    search_query = Q('multi_match', 
                        query=query,
                        fields=[
                            f'multilingual_data.{language}.name^3',
                            f'multilingual_data.{language}.description^2',
                            f'multilingual_data.{language}.short_description',
                            'name^3',
                            'description^2',
                            'city^1.5',
                            'address'
                        ],
                        type='best_fields',
                        fuzziness='AUTO'
                    )
                    
                    # Ajouter recherche par suggestion pour l'autocomplétion
                    suggest_query = Q('match', **{f'name.suggest': {'value': query, 'boost': 2}})
                    
                    # Combiner les requêtes
                    combined_query = Q('bool', should=[search_query, suggest_query])
                    search = search.query(combined_query)
                
                # Appliquer les filtres
                if filters:
                    search = cls._apply_filters(search, filters)
                
                # Tri par pertinence puis par date
                search = search.sort('_score', '-creation_date')
                
                # Pagination
                start = (page - 1) * page_size
                search = search[start:start + page_size]
                
                # Agrégations pour les facettes
                search.aggs.bucket('types', 'terms', field='resource_types', size=20)
                search.aggs.bucket('cities', 'terms', field='city.raw', size=20)
                
                # Exécution
                response = search.execute()
                
                result = {
                    'hits': [cls._format_hit(hit, language) for hit in response.hits],
                    'total': response.hits.total.value,
                    'took': response.took,
                    'aggregations': cls._format_aggregations(response.aggregations),
                    'page': page,
                    'page_size': page_size,
                    'max_score': response.hits.max_score,
                    'source': 'elasticsearch'
                }
                
                ApplicationMetrics.increment_counter('search.elasticsearch.text_search.success', 1)
                ApplicationMetrics.record_search_operation('text', result['total'], response.took / 1000.0)
                
                return result
            
            # Exécuter avec circuit breaker
            return circuit_breaker.call(_elasticsearch_search)
            
        except (CircuitBreakerError, Exception) as e:
            logger.warning(f"Elasticsearch text search failed, using fallback: {e}")
            ApplicationMetrics.increment_counter('search.elasticsearch.text_search.failures', 1)
            
            # Fallback vers la base de données
            return DatabaseSearchFallback.text_search(query, language, filters, page, page_size)
    
    @classmethod
    @time_it('search.geo_search.duration')
    def geo_search(cls, lat: float, lng: float, radius_km: float = 10,
                  language: str = 'fr', filters: Optional[Dict] = None,
                  page: int = 1, page_size: int = 20) -> Dict:
        """
        Recherche géographique avec fallback automatique
        
        Args:
            lat: Latitude
            lng: Longitude  
            radius_km: Rayon en kilomètres
            language: Langue
            filters: Filtres additionnels
            page: Numéro de page
            page_size: Taille de page
            
        Returns:
            Dictionnaire avec résultats et métadonnées
        """
        # Tenter Elasticsearch d'abord
        try:
            ApplicationMetrics.increment_counter('search.elasticsearch.geo_search.attempts', 1)
            
            # Vérifier le circuit breaker
            circuit_breaker = ServiceCircuitBreakers.elasticsearch_circuit_breaker()
            
            def _elasticsearch_geo_search():
                search = Search(using='default', index='tourism_resources')
                
                # Filtre géographique
                geo_query = Q('geo_distance', 
                    distance=f'{radius_km}km',
                    location={'lat': lat, 'lon': lng}
                )
                search = search.query(geo_query)
                
                # Appliquer les filtres additionnels
                if filters:
                    search = cls._apply_filters(search, filters)
                
                # Tri par distance
                search = search.sort({
                    '_geo_distance': {
                        'location': {'lat': lat, 'lon': lng},
                        'order': 'asc',
                        'unit': 'km'
                    }
                })
                
                # Pagination
                start = (page - 1) * page_size
                search = search[start:start + page_size]
                
                # Agrégations
                search.aggs.bucket('types', 'terms', field='resource_types', size=20)
                search.aggs.metric('avg_distance', 'geo_distance', 
                    field='location', 
                    origin={'lat': lat, 'lon': lng},
                    unit='km'
                )
                
                # Exécution
                response = search.execute()
                
                result = {
                    'hits': [cls._format_hit(hit, language, include_distance=True, 
                            center_point={'lat': lat, 'lon': lng}) for hit in response.hits],
                    'total': response.hits.total.value,
                    'took': response.took,
                    'aggregations': cls._format_aggregations(response.aggregations),
                    'page': page,
                    'page_size': page_size,
                    'center': {'lat': lat, 'lng': lng},
                    'radius_km': radius_km,
                    'source': 'elasticsearch'
                }
                
                ApplicationMetrics.increment_counter('search.elasticsearch.geo_search.success', 1)
                ApplicationMetrics.record_search_operation('geo', result['total'], response.took / 1000.0)
                
                return result
            
            # Exécuter avec circuit breaker
            return circuit_breaker.call(_elasticsearch_geo_search)
            
        except (CircuitBreakerError, Exception) as e:
            logger.warning(f"Elasticsearch geo search failed, using fallback: {e}")
            ApplicationMetrics.increment_counter('search.elasticsearch.geo_search.failures', 1)
            
            # Fallback vers la base de données
            return DatabaseSearchFallback.geo_search(lat, lng, radius_km, language, filters, page, page_size)
    
    @classmethod
    def autocomplete(cls, query: str, language: str = 'fr', limit: int = 10) -> List[Dict]:
        """
        Autocomplétion pour les suggestions de recherche
        
        Args:
            query: Début du terme de recherche
            language: Langue
            limit: Nombre maximum de suggestions
            
        Returns:
            Liste des suggestions
        """
        try:
            search = Search(using='default', index='tourism_resources')
            
            # Requête d'autocomplétion
            suggest_query = Q('match_phrase_prefix', 
                **{f'multilingual_data.{language}.name': query}
            )
            
            # Alternative avec name principal
            name_query = Q('match_phrase_prefix', name=query)
            
            # Combiner les requêtes
            combined_query = Q('bool', should=[suggest_query, name_query])
            search = search.query(combined_query)
            
            # Limiter les résultats
            search = search[:limit]
            
            # Champs à retourner
            search = search.source(['resource_id', 'name', f'multilingual_data.{language}.name'])
            
            response = search.execute()
            
            suggestions = []
            for hit in response.hits:
                name = cls._get_localized_field(hit, 'name', language)
                if name:
                    suggestions.append({
                        'resource_id': hit.resource_id,
                        'name': name,
                        'score': hit.meta.score
                    })
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Erreur autocomplétion: {e}")
            return []
    
    @classmethod
    def filter_by_type(cls, resource_types: List[str], language: str = 'fr',
                      page: int = 1, page_size: int = 20) -> Dict:
        """
        Filtre par types de ressources
        
        Args:
            resource_types: Liste des types de ressources
            language: Langue
            page: Numéro de page
            page_size: Taille de page
            
        Returns:
            Dictionnaire avec résultats et métadonnées
        """
        try:
            search = Search(using='default', index='tourism_resources')
            
            # Filtre par types
            type_query = Q('terms', resource_types=resource_types)
            search = search.query(type_query)
            
            # Tri par date de création
            search = search.sort('-creation_date')
            
            # Pagination
            start = (page - 1) * page_size
            search = search[start:start + page_size]
            
            # Agrégations
            search.aggs.bucket('types', 'terms', field='resource_types', size=20)
            search.aggs.bucket('cities', 'terms', field='city.raw', size=20)
            
            response = search.execute()
            
            return {
                'hits': [cls._format_hit(hit, language) for hit in response.hits],
                'total': response.hits.total.value,
                'took': response.took,
                'aggregations': cls._format_aggregations(response.aggregations),
                'page': page,
                'page_size': page_size,
                'filters': {'resource_types': resource_types}
            }
            
        except Exception as e:
            logger.error(f"Erreur filtre par type: {e}")
            return {
                'hits': [],
                'total': 0,
                'took': 0,
                'aggregations': {},
                'page': page,
                'page_size': page_size,
                'error': str(e)
            }
    
    @classmethod
    def _apply_filters(cls, search: Search, filters: Dict) -> Search:
        """Applique les filtres à la recherche"""
        
        if 'resource_types' in filters and filters['resource_types']:
            search = search.filter('terms', resource_types=filters['resource_types'])
        
        if 'cities' in filters and filters['cities']:
            search = search.filter('terms', **{'city.raw': filters['cities']})
        
        if 'is_active' in filters:
            search = search.filter('term', is_active=filters['is_active'])
        
        if 'date_from' in filters:
            search = search.filter('range', creation_date={'gte': filters['date_from']})
        
        if 'date_to' in filters:
            search = search.filter('range', creation_date={'lte': filters['date_to']})
        
        return search
    
    @classmethod
    def _format_hit(cls, hit, language: str = 'fr', include_distance: bool = False,
                   center_point: Optional[Dict] = None) -> Dict:
        """Formate un résultat de recherche"""
        
        result = {
            'resource_id': hit.resource_id,
            'name': cls._get_localized_field(hit, 'name', language),
            'description': cls._get_localized_field(hit, 'description', language),
            'location': getattr(hit, 'location', None),
            'city': getattr(hit, 'city', None),
            'address': getattr(hit, 'address', None),
            'resource_types': getattr(hit, 'resource_types', []),
            'creation_date': getattr(hit, 'creation_date', None),
            'is_active': getattr(hit, 'is_active', True),
            'score': hit.meta.score
        }
        
        # Ajouter la distance si demandée
        if include_distance and center_point and hasattr(hit.meta, 'sort'):
            result['distance_km'] = round(hit.meta.sort[0], 2)
        
        return result
    
    @classmethod
    def _get_localized_field(cls, hit, field: str, language: str) -> str:
        """Récupère un champ localisé"""
        
        # Essayer d'abord la version localisée
        if hasattr(hit, 'multilingual_data') and hit.multilingual_data:
            lang_data = hit.multilingual_data.get(language, {})
            if field in lang_data and lang_data[field]:
                return lang_data[field]
        
        # Fallback sur le champ principal
        return getattr(hit, field, '')
    
    @classmethod
    def _format_aggregations(cls, aggregations) -> Dict:
        """Formate les agrégations pour la réponse"""
        
        formatted = {}
        
        for agg_name, agg_data in aggregations.to_dict().items():
            if 'buckets' in agg_data:
                # Agrégation par buckets (terms)
                formatted[agg_name] = [
                    {'key': bucket['key'], 'count': bucket['doc_count']}
                    for bucket in agg_data['buckets']
                ]
            elif 'value' in agg_data:
                # Agrégation métrique
                formatted[agg_name] = agg_data['value']
        
        return formatted


class SearchIndexService:
    """Service pour la gestion des index Elasticsearch"""
    
    @classmethod
    def reindex_all(cls) -> Dict:
        """Réindexe toutes les ressources"""
        try:
            from django.core.management import call_command
            call_command('search_index', '--rebuild', '-f')
            
            return {'success': True, 'message': 'Réindexation terminée'}
        except Exception as e:
            logger.error(f"Erreur réindexation: {e}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def index_resource(cls, resource_id: int) -> Dict:
        """Indexe une ressource spécifique"""
        try:
            from .models import TouristicResource
            
            resource = TouristicResource.objects.get(resource_id=resource_id)
            doc = TouristicResourceDocument()
            doc.update(resource)
            
            return {'success': True, 'message': f'Ressource {resource_id} indexée'}
        except Exception as e:
            logger.error(f"Erreur indexation ressource {resource_id}: {e}")
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def delete_from_index(cls, resource_id: int) -> Dict:
        """Supprime une ressource de l'index"""
        try:
            doc = TouristicResourceDocument()
            doc.delete(id=resource_id, ignore=404)
            
            return {'success': True, 'message': f'Ressource {resource_id} supprimée de l\'index'}
        except Exception as e:
            logger.error(f"Erreur suppression index ressource {resource_id}: {e}")
            return {'success': False, 'error': str(e)}