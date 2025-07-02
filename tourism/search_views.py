"""
Vues pour les fonctionnalités de recherche Elasticsearch
"""
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from django.core.cache import cache
from .search import SearchService, SearchIndexService
from .cache import SearchCacheService
import hashlib
import json


class SearchViewSet(GenericViewSet):
    """ViewSet pour les recherches Elasticsearch"""
    
    @action(detail=False, methods=['get'])
    def text(self, request):
        """
        Recherche textuelle dans les ressources
        
        Paramètres:
        - q: terme de recherche
        - lang: langue (fr, en, de, es, it, nl)
        - page: numéro de page
        - page_size: taille de page (max 100)
        - types: types de ressources (liste séparée par virgule)
        - cities: villes (liste séparée par virgule)
        """
        query = request.query_params.get('q', '').strip()
        language = request.query_params.get('lang', 'fr')
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        
        # Filtres optionnels
        filters = {}
        if request.query_params.get('types'):
            filters['resource_types'] = request.query_params.get('types').split(',')
        if request.query_params.get('cities'):
            filters['cities'] = request.query_params.get('cities').split(',')
        
        # Vérifier le cache
        cache_key = self._generate_cache_key('text_search', {
            'query': query,
            'language': language,
            'page': page,
            'page_size': page_size,
            'filters': filters
        })
        
        cached_result = cache.get(cache_key)
        if cached_result:
            response = Response(cached_result)
            response['X-Cache'] = 'HIT'
            return response
        
        # Effectuer la recherche
        try:
            results = SearchService.text_search(
                query=query,
                language=language,
                filters=filters,
                page=page,
                page_size=page_size
            )
            
            # Mettre en cache (10 minutes)
            cache.set(cache_key, results, 600)
            
            response = Response(results)
            response['X-Cache'] = 'MISS'
            response['Cache-Control'] = 'public, max-age=600'
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Erreur de recherche: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def geo(self, request):
        """
        Recherche géographique
        
        Paramètres:
        - lat: latitude (requis)
        - lng: longitude (requis)
        - radius: rayon en km (défaut: 10)
        - lang: langue
        - page: numéro de page
        - page_size: taille de page
        - types: types de ressources
        """
        try:
            lat = float(request.query_params.get('lat'))
            lng = float(request.query_params.get('lng'))
        except (TypeError, ValueError):
            return Response(
                {'error': 'Paramètres lat et lng requis et doivent être numériques'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        radius_km = float(request.query_params.get('radius', 10))
        language = request.query_params.get('lang', 'fr')
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        
        # Filtres optionnels
        filters = {}
        if request.query_params.get('types'):
            filters['resource_types'] = request.query_params.get('types').split(',')
        
        # Vérifier le cache
        cache_key = self._generate_cache_key('geo_search', {
            'lat': lat,
            'lng': lng,
            'radius_km': radius_km,
            'language': language,
            'page': page,
            'page_size': page_size,
            'filters': filters
        })
        
        cached_result = cache.get(cache_key)
        if cached_result:
            response = Response(cached_result)
            response['X-Cache'] = 'HIT'
            return response
        
        # Effectuer la recherche
        try:
            results = SearchService.geo_search(
                lat=lat,
                lng=lng,
                radius_km=radius_km,
                language=language,
                filters=filters,
                page=page,
                page_size=page_size
            )
            
            # Mettre en cache (30 minutes)
            cache.set(cache_key, results, 1800)
            
            response = Response(results)
            response['X-Cache'] = 'MISS'
            response['Cache-Control'] = 'public, max-age=1800'
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Erreur de recherche géographique: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def autocomplete(self, request):
        """
        Autocomplétion pour les suggestions de recherche
        
        Paramètres:
        - q: début du terme de recherche (requis)
        - lang: langue
        - limit: nombre maximum de suggestions (défaut: 10, max: 20)
        """
        query = request.query_params.get('q', '').strip()
        
        if not query or len(query) < 2:
            return Response(
                {'error': 'Le paramètre q est requis et doit contenir au moins 2 caractères'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        language = request.query_params.get('lang', 'fr')
        limit = min(int(request.query_params.get('limit', 10)), 20)
        
        # Vérifier le cache
        cache_key = self._generate_cache_key('autocomplete', {
            'query': query,
            'language': language,
            'limit': limit
        })
        
        cached_result = cache.get(cache_key)
        if cached_result:
            response = Response({'suggestions': cached_result})
            response['X-Cache'] = 'HIT'
            return response
        
        # Effectuer l'autocomplétion
        try:
            suggestions = SearchService.autocomplete(
                query=query,
                language=language,
                limit=limit
            )
            
            # Mettre en cache (5 minutes)
            cache.set(cache_key, suggestions, 300)
            
            response = Response({'suggestions': suggestions})
            response['X-Cache'] = 'MISS'
            response['Cache-Control'] = 'public, max-age=300'
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Erreur d\'autocomplétion: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """
        Recherche par types de ressources
        
        Paramètres:
        - types: types de ressources (liste séparée par virgule, requis)
        - lang: langue
        - page: numéro de page
        - page_size: taille de page
        """
        types_param = request.query_params.get('types')
        
        if not types_param:
            return Response(
                {'error': 'Le paramètre types est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        resource_types = types_param.split(',')
        language = request.query_params.get('lang', 'fr')
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        
        # Vérifier le cache
        cache_key = self._generate_cache_key('type_search', {
            'resource_types': resource_types,
            'language': language,
            'page': page,
            'page_size': page_size
        })
        
        cached_result = cache.get(cache_key)
        if cached_result:
            response = Response(cached_result)
            response['X-Cache'] = 'HIT'
            return response
        
        # Effectuer la recherche
        try:
            results = SearchService.filter_by_type(
                resource_types=resource_types,
                language=language,
                page=page,
                page_size=page_size
            )
            
            # Mettre en cache (10 minutes)
            cache.set(cache_key, results, 600)
            
            response = Response(results)
            response['X-Cache'] = 'MISS'
            response['Cache-Control'] = 'public, max-age=600'
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Erreur de recherche par type: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def reindex(self, request):
        """
        Réindexe toutes les ressources dans Elasticsearch
        
        Attention: opération coûteuse, à utiliser avec parcimonie
        """
        try:
            result = SearchIndexService.reindex_all()
            
            if result['success']:
                return Response({
                    'message': 'Réindexation lancée avec succès',
                    'details': result['message']
                })
            else:
                return Response(
                    {'error': result['error']},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la réindexation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_cache_key(self, prefix: str, params: dict) -> str:
        """Génère une clé de cache unique pour les paramètres de recherche"""
        
        # Sérialiser les paramètres de manière déterministe
        params_str = json.dumps(params, sort_keys=True, default=str)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()[:16]
        
        return f"tourism:search:{prefix}:{params_hash}"