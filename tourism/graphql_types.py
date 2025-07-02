"""
Types GraphQL pour les ressources touristiques
"""
import graphene
from graphene import relay
from graphene_django import DjangoObjectType
from graphene_django.filter import DjangoFilterConnectionField
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from .models import TouristicResource
from .search import SearchService
import logging

logger = logging.getLogger(__name__)


class LocationType(graphene.ObjectType):
    """Type pour la géolocalisation"""
    latitude = graphene.Float(description="Latitude")
    longitude = graphene.Float(description="Longitude")


class ContactInfoType(graphene.ObjectType):
    """Type pour les informations de contact"""
    phone = graphene.String()
    email = graphene.String()
    website = graphene.String()


class MultilingualContentType(graphene.ObjectType):
    """Type pour le contenu multilingue"""
    name = graphene.String()
    description = graphene.String()
    short_description = graphene.String()


class TouristicResourceType(DjangoObjectType):
    """Type GraphQL pour les ressources touristiques"""
    
    location = graphene.Field(LocationType, description="Coordonnées géographiques")
    contact_info = graphene.Field(ContactInfoType, description="Informations de contact")
    
    # Contenu localisé
    localized_name = graphene.String(
        lang=graphene.String(default_value="fr"),
        description="Nom dans la langue spécifiée"
    )
    localized_description = graphene.String(
        lang=graphene.String(default_value="fr"),
        description="Description dans la langue spécifiée"
    )
    localized_content = graphene.Field(
        MultilingualContentType,
        lang=graphene.String(default_value="fr"),
        description="Contenu complet dans la langue spécifiée"
    )
    
    # Distance depuis un point (utilisé dans les recherches géographiques)
    distance_km = graphene.Float(description="Distance en kilomètres depuis un point de référence")
    
    class Meta:
        model = TouristicResource
        fields = (
            'resource_id', 'name', 'description', 'resource_types', 'categories',
            'city', 'postal_code', 'address', 'creation_date', 'last_update',
            'is_active', 'created_at', 'updated_at'
        )
        interfaces = (relay.Node,)
        connection_class = relay.Connection
    
    def resolve_location(self, info):
        """Résout les coordonnées géographiques"""
        if self.location:
            return LocationType(
                latitude=self.location.y,
                longitude=self.location.x
            )
        return None
    
    def resolve_contact_info(self, info):
        """Résout les informations de contact"""
        contact = {}
        if hasattr(self, 'contact_phone') and self.contact_phone:
            contact['phone'] = self.contact_phone
        if hasattr(self, 'contact_email') and self.contact_email:
            contact['email'] = self.contact_email
        if hasattr(self, 'contact_website') and self.contact_website:
            contact['website'] = self.contact_website
        
        return ContactInfoType(**contact) if contact else None
    
    def resolve_localized_name(self, info, lang="fr"):
        """Résout le nom localisé"""
        if self.multilingual_data and lang in self.multilingual_data:
            return self.multilingual_data[lang].get('name', self.name)
        return self.name
    
    def resolve_localized_description(self, info, lang="fr"):
        """Résout la description localisée"""
        if self.multilingual_data and lang in self.multilingual_data:
            return self.multilingual_data[lang].get('description', self.description)
        return self.description
    
    def resolve_localized_content(self, info, lang="fr"):
        """Résout le contenu complet localisé"""
        if self.multilingual_data and lang in self.multilingual_data:
            content = self.multilingual_data[lang]
            return MultilingualContentType(
                name=content.get('name', self.name),
                description=content.get('description', self.description),
                short_description=content.get('short_description', '')
            )
        
        return MultilingualContentType(
            name=self.name,
            description=self.description,
            short_description=''
        )


class SearchResultType(graphene.ObjectType):
    """Type pour les résultats de recherche"""
    
    resources = graphene.List(TouristicResourceType, description="Liste des ressources trouvées")
    total_count = graphene.Int(description="Nombre total de résultats")
    page = graphene.Int(description="Numéro de page actuelle")
    page_size = graphene.Int(description="Taille de la page")
    took_ms = graphene.Int(description="Temps d'exécution en millisecondes")
    max_score = graphene.Float(description="Score maximum de pertinence")
    
    # Facettes pour le filtrage
    facets = graphene.Field('FacetsType', description="Facettes pour le filtrage")


class FacetItemType(graphene.ObjectType):
    """Type pour un élément de facette"""
    key = graphene.String(description="Clé de la facette")
    count = graphene.Int(description="Nombre d'occurrences")


class FacetsType(graphene.ObjectType):
    """Type pour les facettes de recherche"""
    resource_types = graphene.List(FacetItemType, description="Types de ressources")
    cities = graphene.List(FacetItemType, description="Villes")


class AutocompleteResultType(graphene.ObjectType):
    """Type pour les résultats d'autocomplétion"""
    resource_id = graphene.String(description="ID de la ressource")
    name = graphene.String(description="Nom suggéré")
    score = graphene.Float(description="Score de pertinence")


class GeoSearchInput(graphene.InputObjectType):
    """Input pour la recherche géographique"""
    latitude = graphene.Float(required=True, description="Latitude du centre de recherche")
    longitude = graphene.Float(required=True, description="Longitude du centre de recherche")
    radius_km = graphene.Float(default_value=10.0, description="Rayon de recherche en kilomètres")


class SearchFiltersInput(graphene.InputObjectType):
    """Input pour les filtres de recherche"""
    resource_types = graphene.List(graphene.String, description="Types de ressources à inclure")
    cities = graphene.List(graphene.String, description="Villes à inclure")
    is_active = graphene.Boolean(default_value=True, description="Inclure uniquement les ressources actives")
    date_from = graphene.Date(description="Date de création minimale")
    date_to = graphene.Date(description="Date de création maximale")


class Query(graphene.ObjectType):
    """Requêtes GraphQL principales"""
    
    # Requêtes simples
    resource = graphene.Field(
        TouristicResourceType,
        resource_id=graphene.String(required=True),
        lang=graphene.String(default_value="fr"),
        description="Récupère une ressource par son ID"
    )
    
    resources = graphene.List(
        TouristicResourceType,
        page=graphene.Int(default_value=1),
        page_size=graphene.Int(default_value=20),
        lang=graphene.String(default_value="fr"),
        filters=SearchFiltersInput(),
        description="Liste paginée des ressources"
    )
    
    # Recherches avancées
    search_text = graphene.Field(
        SearchResultType,
        query=graphene.String(required=True),
        lang=graphene.String(default_value="fr"),
        page=graphene.Int(default_value=1),
        page_size=graphene.Int(default_value=20),
        filters=SearchFiltersInput(),
        description="Recherche textuelle dans les ressources"
    )
    
    search_geo = graphene.Field(
        SearchResultType,
        geo_params=GeoSearchInput(required=True),
        lang=graphene.String(default_value="fr"),
        page=graphene.Int(default_value=1),
        page_size=graphene.Int(default_value=20),
        filters=SearchFiltersInput(),
        description="Recherche géographique"
    )
    
    search_by_type = graphene.Field(
        SearchResultType,
        resource_types=graphene.List(graphene.String, required=True),
        lang=graphene.String(default_value="fr"),
        page=graphene.Int(default_value=1),
        page_size=graphene.Int(default_value=20),
        description="Recherche par types de ressources"
    )
    
    autocomplete = graphene.List(
        AutocompleteResultType,
        query=graphene.String(required=True),
        lang=graphene.String(default_value="fr"),
        limit=graphene.Int(default_value=10),
        description="Autocomplétion pour les suggestions de recherche"
    )
    
    # Métadonnées
    resource_types = graphene.List(
        graphene.String,
        description="Liste tous les types de ressources disponibles"
    )
    
    cities = graphene.List(
        graphene.String,
        description="Liste toutes les villes disponibles"
    )
    
    def resolve_resource(self, info, resource_id, lang="fr"):
        """Résout une ressource individuelle"""
        try:
            return TouristicResource.objects.get(
                resource_id=resource_id,
                is_active=True
            )
        except TouristicResource.DoesNotExist:
            return None
    
    def resolve_resources(self, info, page=1, page_size=20, lang="fr", filters=None):
        """Résout une liste de ressources"""
        queryset = TouristicResource.objects.filter(is_active=True)
        
        # Appliquer les filtres
        if filters:
            if filters.get('resource_types'):
                queryset = queryset.filter(resource_types__overlap=filters['resource_types'])
            if filters.get('cities'):
                queryset = queryset.filter(city__in=filters['cities'])
            if filters.get('date_from'):
                queryset = queryset.filter(creation_date__gte=filters['date_from'])
            if filters.get('date_to'):
                queryset = queryset.filter(creation_date__lte=filters['date_to'])
        
        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        
        return queryset.order_by('-created_at')[start:end]
    
    def resolve_search_text(self, info, query, lang="fr", page=1, page_size=20, filters=None):
        """Résout une recherche textuelle"""
        try:
            # Convertir les filtres GraphQL en format Elasticsearch
            es_filters = {}
            if filters:
                if filters.get('resource_types'):
                    es_filters['resource_types'] = filters['resource_types']
                if filters.get('cities'):
                    es_filters['cities'] = filters['cities']
                if filters.get('is_active') is not None:
                    es_filters['is_active'] = filters['is_active']
                if filters.get('date_from'):
                    es_filters['date_from'] = filters['date_from']
                if filters.get('date_to'):
                    es_filters['date_to'] = filters['date_to']
            
            # Effectuer la recherche Elasticsearch
            results = SearchService.text_search(
                query=query,
                language=lang,
                filters=es_filters,
                page=page,
                page_size=page_size
            )
            
            # Convertir les résultats
            return self._convert_search_results(results)
            
        except Exception as e:
            logger.error(f"Erreur recherche textuelle GraphQL: {e}")
            return SearchResultType(
                resources=[],
                total_count=0,
                page=page,
                page_size=page_size,
                took_ms=0
            )
    
    def resolve_search_geo(self, info, geo_params, lang="fr", page=1, page_size=20, filters=None):
        """Résout une recherche géographique"""
        try:
            # Convertir les filtres
            es_filters = {}
            if filters:
                if filters.get('resource_types'):
                    es_filters['resource_types'] = filters['resource_types']
                if filters.get('is_active') is not None:
                    es_filters['is_active'] = filters['is_active']
            
            # Effectuer la recherche géographique
            results = SearchService.geo_search(
                lat=geo_params['latitude'],
                lng=geo_params['longitude'],
                radius_km=geo_params.get('radius_km', 10.0),
                language=lang,
                filters=es_filters,
                page=page,
                page_size=page_size
            )
            
            return self._convert_search_results(results)
            
        except Exception as e:
            logger.error(f"Erreur recherche géographique GraphQL: {e}")
            return SearchResultType(
                resources=[],
                total_count=0,
                page=page,
                page_size=page_size,
                took_ms=0
            )
    
    def resolve_search_by_type(self, info, resource_types, lang="fr", page=1, page_size=20):
        """Résout une recherche par types"""
        try:
            results = SearchService.filter_by_type(
                resource_types=resource_types,
                language=lang,
                page=page,
                page_size=page_size
            )
            
            return self._convert_search_results(results)
            
        except Exception as e:
            logger.error(f"Erreur recherche par type GraphQL: {e}")
            return SearchResultType(
                resources=[],
                total_count=0,
                page=page,
                page_size=page_size,
                took_ms=0
            )
    
    def resolve_autocomplete(self, info, query, lang="fr", limit=10):
        """Résout l'autocomplétion"""
        try:
            suggestions = SearchService.autocomplete(
                query=query,
                language=lang,
                limit=limit
            )
            
            return [
                AutocompleteResultType(
                    resource_id=suggestion['resource_id'],
                    name=suggestion['name'],
                    score=suggestion['score']
                )
                for suggestion in suggestions
            ]
            
        except Exception as e:
            logger.error(f"Erreur autocomplétion GraphQL: {e}")
            return []
    
    def resolve_resource_types(self, info):
        """Résout la liste des types de ressources"""
        try:
            types = TouristicResource.objects.filter(is_active=True)\
                .values_list('resource_types', flat=True)\
                .distinct()
            
            # Aplatir les listes de types
            all_types = set()
            for type_list in types:
                if type_list:
                    all_types.update(type_list)
            
            return sorted(list(all_types))
            
        except Exception as e:
            logger.error(f"Erreur récupération types: {e}")
            return []
    
    def resolve_cities(self, info):
        """Résout la liste des villes"""
        try:
            return list(
                TouristicResource.objects.filter(is_active=True)
                .values_list('city', flat=True)
                .distinct()
                .order_by('city')
            )
        except Exception as e:
            logger.error(f"Erreur récupération villes: {e}")
            return []
    
    def _convert_search_results(self, es_results):
        """Convertit les résultats Elasticsearch en types GraphQL"""
        try:
            # Récupérer les IDs des ressources
            resource_ids = [hit['resource_id'] for hit in es_results['hits']]
            
            # Récupérer les ressources depuis la base de données
            resources = TouristicResource.objects.filter(
                resource_id__in=resource_ids,
                is_active=True
            )
            
            # Créer un mapping pour préserver l'ordre et ajouter les métadonnées de recherche
            resource_map = {str(r.resource_id): r for r in resources}
            ordered_resources = []
            
            for hit in es_results['hits']:
                resource_id = hit['resource_id']
                if resource_id in resource_map:
                    resource = resource_map[resource_id]
                    # Ajouter la distance si disponible
                    if 'distance_km' in hit:
                        resource.distance_km = hit['distance_km']
                    ordered_resources.append(resource)
            
            # Convertir les facettes
            facets = None
            if 'aggregations' in es_results:
                facets_data = {}
                aggs = es_results['aggregations']
                
                if 'types' in aggs:
                    facets_data['resource_types'] = [
                        FacetItemType(key=item['key'], count=item['count'])
                        for item in aggs['types']
                    ]
                
                if 'cities' in aggs:
                    facets_data['cities'] = [
                        FacetItemType(key=item['key'], count=item['count'])
                        for item in aggs['cities']
                    ]
                
                if facets_data:
                    facets = FacetsType(**facets_data)
            
            return SearchResultType(
                resources=ordered_resources,
                total_count=es_results.get('total', 0),
                page=es_results.get('page', 1),
                page_size=es_results.get('page_size', 20),
                took_ms=es_results.get('took', 0),
                max_score=es_results.get('max_score'),
                facets=facets
            )
            
        except Exception as e:
            logger.error(f"Erreur conversion résultats: {e}")
            return SearchResultType(
                resources=[],
                total_count=0,
                page=1,
                page_size=20,
                took_ms=0
            )