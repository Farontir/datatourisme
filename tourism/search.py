"""
Services de recherche Elasticsearch pour les ressources touristiques
"""
from typing import Dict, List, Optional, Tuple
from elasticsearch_dsl import Search, Q, A
from django_elasticsearch_dsl.search import Search as DjangoSearch
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from .documents import TouristicResourceDocument
import logging

logger = logging.getLogger(__name__)


class SearchService:
    """Service centralisé pour les recherches Elasticsearch"""
    
    @classmethod
    def text_search(cls, query: str, language: str = 'fr', 
                   filters: Optional[Dict] = None, 
                   page: int = 1, page_size: int = 20) -> Dict:
        """
        Recherche textuelle dans les ressources
        
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
            
            return {
                'hits': [cls._format_hit(hit, language) for hit in response.hits],
                'total': response.hits.total.value,
                'took': response.took,
                'aggregations': cls._format_aggregations(response.aggregations),
                'page': page,
                'page_size': page_size,
                'max_score': response.hits.max_score
            }
            
        except Exception as e:
            logger.error(f"Erreur recherche textuelle: {e}")
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
    def geo_search(cls, lat: float, lng: float, radius_km: float = 10,
                  language: str = 'fr', filters: Optional[Dict] = None,
                  page: int = 1, page_size: int = 20) -> Dict:
        """
        Recherche géographique
        
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
            
            return {
                'hits': [cls._format_hit(hit, language, include_distance=True, 
                        center_point={'lat': lat, 'lon': lng}) for hit in response.hits],
                'total': response.hits.total.value,
                'took': response.took,
                'aggregations': cls._format_aggregations(response.aggregations),
                'page': page,
                'page_size': page_size,
                'center': {'lat': lat, 'lng': lng},
                'radius_km': radius_km
            }
            
        except Exception as e:
            logger.error(f"Erreur recherche géographique: {e}")
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