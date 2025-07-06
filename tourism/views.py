from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from django.core.cache import cache
from django.db.models import Prefetch
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from .models import TouristicResource, MediaRepresentation, PriceSpecification
from .serializers import TouristicResourceListSerializer, TouristicResourceDetailSerializer
from .cache import ResourceCacheService, SearchCacheService, cache_result
from .security import rate_limit, validate_input
from .metrics import ApplicationMetrics
from .exceptions import ValidationError, ErrorHandler
import hashlib

class TouristicResourceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour les ressources touristiques avec fonctionnalités avancées
    
    Ce ViewSet fournit des endpoints pour accéder aux ressources touristiques
    avec support de la recherche géographique, filtrage avancé, et cache optimisé.
    """
    
    queryset = TouristicResource.objects.filter(is_active=True)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'resource_types']
    ordering_fields = ['created_at', 'creation_date', 'resource_id']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Optimize queryset with prefetch_related to avoid N+1 queries"""
        queryset = super().get_queryset()
        
        if self.action == 'list':
            # For list view, prefetch only main media and prices for list serializer
            queryset = queryset.prefetch_related(
                Prefetch('media', 
                        queryset=MediaRepresentation.objects.filter(is_main=True),
                        to_attr='main_media_prefetch'),
                Prefetch('prices', 
                        queryset=PriceSpecification.objects.select_related().order_by('min_price'),
                        to_attr='prices_prefetch')
            )
        elif self.action == 'retrieve':
            # For detail view, prefetch all related objects
            queryset = queryset.prefetch_related(
                'opening_hours',
                'prices',
                'media'
            )
        elif self.action == 'nearby':
            # For nearby searches, prefetch main media for distance annotations
            queryset = queryset.prefetch_related(
                Prefetch('media', 
                        queryset=MediaRepresentation.objects.filter(is_main=True),
                        to_attr='main_media_prefetch')
            )
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TouristicResourceDetailSerializer
        return TouristicResourceListSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Récupération de la langue depuis les paramètres ou headers
        language = self.request.query_params.get('lang', 'fr')
        if language not in ['fr', 'en', 'de', 'es', 'it', 'nl']:
            language = 'fr'
        context['language'] = language
        return context
    
    def _get_cache_key_params(self):
        """Génère les paramètres pour les clés de cache"""
        return {
            'lang': self.request.query_params.get('lang', 'fr'),
            'search': self.request.query_params.get('search', ''),
            'ordering': self.request.query_params.get('ordering', ''),
            'page': self.request.query_params.get('page', '1'),
        }
    
    def list(self, request, *args, **kwargs):
        """Liste des ressources avec cache"""
        # Paramètres de cache
        cache_params = self._get_cache_key_params()
        
        # Essayer de récupérer depuis le cache
        cached_response = ResourceCacheService.get_resource_list(
            cache_params, 
            int(cache_params['page']), 
            cache_params['lang']
        )
        
        if cached_response is not None:
            response = Response(cached_response)
            response['X-Cache'] = 'HIT'
            response['Cache-Control'] = 'public, max-age=900'
            return response
        
        # Récupérer les données normalement
        response = super().list(request, *args, **kwargs)
        
        # Mettre en cache si succès
        if response.status_code == 200:
            ResourceCacheService.set_resource_list(
                cache_params,
                response.data,
                int(cache_params['page']),
                cache_params['lang']
            )
            response['X-Cache'] = 'MISS'
            response['Cache-Control'] = 'public, max-age=900'
        
        return response
    
    def retrieve(self, request, *args, **kwargs):
        """Détail d'une ressource avec cache"""
        resource_id = kwargs.get('pk')
        language = self.request.query_params.get('lang', 'fr')
        
        # Essayer de récupérer depuis le cache
        cached_response = ResourceCacheService.get_resource(resource_id, language)
        
        if cached_response is not None:
            response = Response(cached_response)
            response['X-Cache'] = 'HIT'
            response['Cache-Control'] = 'public, max-age=3600'
            return response
        
        # Récupérer les données normalement
        response = super().retrieve(request, *args, **kwargs)
        
        # Mettre en cache si succès
        if response.status_code == 200:
            ResourceCacheService.set_resource(resource_id, response.data, language)
            response['X-Cache'] = 'MISS'
            response['Cache-Control'] = 'public, max-age=3600'
        
        return response
    
    @extend_schema(
        summary="Recherche géographique des ressources",
        description="""
        Trouve les ressources touristiques dans un rayon donné autour d'un point géographique.
        
        Cette endpoint utilise PostGIS pour des recherches géographiques précises et rapides.
        Les résultats sont triés par distance croissante du point de recherche.
        """,
        parameters=[
            OpenApiParameter(
                name='lat',
                type=OpenApiTypes.FLOAT,
                location=OpenApiParameter.QUERY,
                description='Latitude du point de recherche (format décimal)',
                required=True
            ),
            OpenApiParameter(
                name='lng',
                type=OpenApiTypes.FLOAT,
                location=OpenApiParameter.QUERY,
                description='Longitude du point de recherche (format décimal)',
                required=True
            ),
            OpenApiParameter(
                name='radius',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Rayon de recherche en mètres (défaut: 5000m)',
                required=False
            ),
            OpenApiParameter(
                name='lang',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Langue pour les données localisées',
                enum=['fr', 'en', 'de', 'es', 'it', 'nl'],
                required=False
            ),
        ],
        examples=[
            OpenApiExample(
                'Recherche autour de Paris',
                description='Ressources touristiques dans un rayon de 10km autour de Paris',
                value={
                    'count': 42,
                    'next': 'http://api.example.com/api/v1/resources/nearby/?lat=48.8566&lng=2.3522&radius=10000&page=2',
                    'previous': None,
                    'results': [
                        {
                            'id': 1,
                            'resource_id': 'paris-001',
                            'name': 'Tour Eiffel',
                            'description': 'Monument emblématique de Paris',
                            'location': {
                                'type': 'Point',
                                'coordinates': [2.2945, 48.8584]
                            },
                            'city': 'Paris',
                            'resource_types': ['CulturalSite', 'PlaceOfInterest'],
                            'distance_km': 2.8,
                            'is_active': True
                        },
                        {
                            'id': 2,
                            'resource_id': 'paris-002',
                            'name': 'Musée du Louvre',
                            'description': 'Plus grand musée du monde',
                            'location': {
                                'type': 'Point',
                                'coordinates': [2.3376, 48.8606]
                            },
                            'city': 'Paris',
                            'resource_types': ['CulturalSite', 'Museum'],
                            'distance_km': 1.2,
                            'is_active': True
                        }
                    ]
                },
                response_only=True,
            ),
            OpenApiExample(
                'Recherche sans résultats',
                description='Cas où aucune ressource n\'est trouvée dans le rayon',
                value={
                    'count': 0,
                    'next': None,
                    'previous': None,
                    'results': []
                },
                response_only=True,
            )
        ],
        tags=['Recherche géographique']
    )
    @action(detail=False, methods=['get'])
    @rate_limit(requests_per_minute=100)
    @validate_input('sql', 'xss')
    def nearby(self, request):
        """Recherche des ressources à proximité avec cache"""
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 5000)  # rayon en mètres
        language = request.query_params.get('lang', 'fr')
        
        if not lat or not lng:
            return Response(
                {'error': 'Les paramètres lat et lng sont requis'},
                status=400
            )
        
        try:
            lat_float = float(lat)
            lng_float = float(lng)
            radius_int = int(radius)
        except ValueError:
            return Response(
                {'error': 'Paramètres invalides'},
                status=400
            )
        
        # Vérifier le cache
        cached_response = SearchCacheService.get_nearby_results(
            lat_float, lng_float, radius_int, language
        )
        
        if cached_response is not None:
            response = Response(cached_response)
            response['X-Cache'] = 'HIT'
            response['Cache-Control'] = 'public, max-age=1800'
            return response
        
        # Enregistrer les métriques
        ApplicationMetrics.record_api_request(
            endpoint='nearby',
            method=request.method,
            status_code=200,
            duration=0  # Sera calculé par le middleware
        )
        
        # Effectuer la recherche
        point = Point(lng_float, lat_float, srid=4326)
        
        # Filtrage par distance avec annotation de distance
        queryset = self.get_queryset().filter(
            location__distance_lte=(point, Distance(m=radius_int))
        ).annotate(
            distance=Distance('location', point)
        ).order_by('distance')
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            
            # Ajouter les distances aux résultats
            for i, item in enumerate(paginated_response.data['results']):
                if hasattr(page[i], 'distance'):
                    item['distance_km'] = round(page[i].distance.km, 2)
            
            # Mettre en cache
            SearchCacheService.set_nearby_results(
                lat_float, lng_float, radius_int, 
                paginated_response.data, language
            )
            
            paginated_response['X-Cache'] = 'MISS'
            paginated_response['Cache-Control'] = 'public, max-age=1800'
            paginated_response['X-Search-Type'] = 'geographic'
            return paginated_response
        
        serializer = self.get_serializer(queryset, many=True)
        response_data = serializer.data
        
        # Ajouter les distances
        for i, item in enumerate(response_data):
            if hasattr(queryset[i], 'distance'):
                item['distance_km'] = round(queryset[i].distance.km, 2)
        
        # Mettre en cache
        SearchCacheService.set_nearby_results(
            lat_float, lng_float, radius_int, response_data, language
        )
        
        response = Response(response_data)
        response['X-Cache'] = 'MISS'
        response['Cache-Control'] = 'public, max-age=1800'
        response['X-Search-Type'] = 'geographic'
        return response
    
    @extend_schema(
        summary="Filtrage par type de ressource",
        description="""
        Filtre les ressources touristiques par type spécifique.
        
        Les types de ressources disponibles incluent :
        - PlaceOfInterest : Lieux d'intérêt général
        - CulturalSite : Sites culturels (musées, monuments, etc.)
        - SportsAndLeisurePlace : Lieux de sports et loisirs
        - Accommodation : Hébergements
        - FoodEstablishment : Restaurants et établissements culinaires
        - Event : Événements et manifestations
        """,
        parameters=[
            OpenApiParameter(
                name='type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Type de ressource à filtrer',
                required=True,
                enum=['PlaceOfInterest', 'CulturalSite', 'SportsAndLeisurePlace', 
                      'Accommodation', 'FoodEstablishment', 'Event']
            ),
            OpenApiParameter(
                name='lang',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Langue pour les données localisées',
                enum=['fr', 'en', 'de', 'es', 'it', 'nl'],
                required=False
            ),
            OpenApiParameter(
                name='page',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Numéro de page',
                required=False
            ),
        ],
        examples=[
            OpenApiExample(
                'Sites culturels',
                description='Liste des sites culturels disponibles',
                value={
                    'count': 156,
                    'next': 'http://api.example.com/api/v1/resources/by_type/?type=CulturalSite&page=2',
                    'previous': None,
                    'results': [
                        {
                            'id': 5,
                            'resource_id': 'culture-001',
                            'name': 'Château de Versailles',
                            'description': 'Résidence royale française du XVIIe siècle',
                            'location': {
                                'type': 'Point',
                                'coordinates': [2.1204, 48.8049]
                            },
                            'city': 'Versailles',
                            'resource_types': ['CulturalSite', 'PlaceOfInterest'],
                            'is_active': True
                        }
                    ]
                },
                response_only=True,
            )
        ],
        tags=['Filtrage']
    )
    @action(detail=False, methods=['get'])
    @rate_limit(requests_per_minute=200)
    @validate_input('sql', 'xss')
    def by_type(self, request):
        """Filtrage par type de ressource avec cache"""
        resource_type = request.query_params.get('type')
        language = request.query_params.get('lang', 'fr')
        page_param = request.query_params.get('page', '1')
        
        if not resource_type:
            return Response(
                {'error': 'Le paramètre type est requis'},
                status=400
            )
        
        # Vérifier le cache
        cached_response = SearchCacheService.get_search_results(
            resource_type, 
            {'type': resource_type, 'page': page_param}, 
            language
        )
        
        if cached_response is not None:
            response = Response(cached_response)
            response['X-Cache'] = 'HIT'
            response['Cache-Control'] = 'public, max-age=600'
            return response
        
        # Effectuer la recherche
        queryset = self.get_queryset().filter(
            resource_types__contains=[resource_type]
        )
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            
            # Mettre en cache
            SearchCacheService.set_search_results(
                resource_type,
                {'type': resource_type, 'page': page_param},
                paginated_response.data,
                language
            )
            
            paginated_response['X-Cache'] = 'MISS'
            paginated_response['Cache-Control'] = 'public, max-age=600'
            return paginated_response
        
        serializer = self.get_serializer(queryset, many=True)
        response_data = serializer.data
        
        # Mettre en cache
        SearchCacheService.set_search_results(
            resource_type,
            {'type': resource_type, 'page': page_param},
            response_data,
            language
        )
        
        response = Response(response_data)
        response['X-Cache'] = 'MISS'
        response['Cache-Control'] = 'public, max-age=600'
        return response
