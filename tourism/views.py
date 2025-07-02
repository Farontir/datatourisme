from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from .models import TouristicResource
from .serializers import TouristicResourceListSerializer, TouristicResourceDetailSerializer
from .cache import ResourceCacheService, SearchCacheService, cache_result
import hashlib

class TouristicResourceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les ressources touristiques"""
    
    queryset = TouristicResource.objects.filter(is_active=True)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'resource_types']
    ordering_fields = ['created_at', 'creation_date', 'resource_id']
    ordering = ['-created_at']
    
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
    
    @action(detail=False, methods=['get'])
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
        
        # Effectuer la recherche
        point = Point(lng_float, lat_float, srid=4326)
        
        # Filtrage par distance
        queryset = self.get_queryset().filter(
            location__distance_lte=(point, Distance(m=radius_int))
        ).order_by('location')
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_response = self.get_paginated_response(serializer.data)
            
            # Mettre en cache
            SearchCacheService.set_nearby_results(
                lat_float, lng_float, radius_int, 
                paginated_response.data, language
            )
            
            paginated_response['X-Cache'] = 'MISS'
            paginated_response['Cache-Control'] = 'public, max-age=1800'
            return paginated_response
        
        serializer = self.get_serializer(queryset, many=True)
        response_data = serializer.data
        
        # Mettre en cache
        SearchCacheService.set_nearby_results(
            lat_float, lng_float, radius_int, response_data, language
        )
        
        response = Response(response_data)
        response['X-Cache'] = 'MISS'
        response['Cache-Control'] = 'public, max-age=1800'
        return response
    
    @action(detail=False, methods=['get'])
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
