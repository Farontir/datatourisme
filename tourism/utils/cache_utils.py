"""
Cache utilities for consistent cache key generation and response handling.

This module consolidates all cache-related functionality that was duplicated
across views, search_views, and cache.py modules.
"""
import hashlib
import json
import logging
from typing import Any, Dict, Optional
from django.core.cache import cache
from django.http import HttpResponse
from django.conf import settings

logger = logging.getLogger(__name__)


class CacheKeyGenerator:
    """
    Centralized cache key generation with consistent hashing and namespacing.
    
    Eliminates the duplicated cache key generation logic found in:
    - tourism/cache.py (CacheService.generate_key)
    - tourism/views.py (_get_cache_key_params)  
    - tourism/search_views.py (_generate_cache_key)
    """
    
    DEFAULT_PREFIX = getattr(settings, 'CACHE_KEY_PREFIX', 'tourism')
    
    @classmethod
    def generate_key(
        cls, 
        prefix: str, 
        params: Dict[str, Any], 
        namespace: Optional[str] = None
    ) -> str:
        """
        Generate a consistent cache key from parameters.
        
        Args:
            prefix: Cache key prefix (e.g., 'api', 'search', 'resources')
            params: Dictionary of parameters to include in key
            namespace: Optional namespace for key isolation
            
        Returns:
            Generated cache key string
            
        Example:
            >>> CacheKeyGenerator.generate_key('api', {'id': 123, 'lang': 'fr'})
            'tourism:api:d4f2a7b8c1e3'
        """
        # Normalize parameters for consistent hashing
        normalized_params = cls._normalize_params(params)
        
        # Create deterministic hash
        params_str = json.dumps(normalized_params, sort_keys=True, default=str)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()[:12]
        
        # Build key components
        key_parts = [cls.DEFAULT_PREFIX]
        
        if namespace:
            key_parts.append(namespace)
            
        key_parts.extend([prefix, params_hash])
        
        return ':'.join(key_parts)
    
    @classmethod
    def generate_list_key(
        cls, 
        resource_type: str, 
        filters: Dict[str, Any], 
        page: int = 1, 
        language: str = 'fr'
    ) -> str:
        """
        Generate cache key for resource lists.
        
        Standardizes the cache key generation for paginated resource lists
        that was duplicated across multiple view methods.
        """
        params = {
            'resource_type': resource_type,
            'filters': filters,
            'page': page,
            'language': language
        }
        return cls.generate_key('list', params)
    
    @classmethod
    def generate_search_key(
        cls,
        query: str,
        search_type: str,
        filters: Dict[str, Any],
        page: int = 1,
        page_size: int = 20,
        language: str = 'fr'
    ) -> str:
        """
        Generate cache key for search results.
        
        Consolidates search cache key generation logic from search_views.py.
        """
        params = {
            'query': query,
            'search_type': search_type,
            'filters': filters,
            'page': page,
            'page_size': page_size,
            'language': language
        }
        return cls.generate_key('search', params)
    
    @classmethod
    def generate_geo_key(
        cls,
        lat: float,
        lng: float,
        radius: float,
        filters: Dict[str, Any],
        page: int = 1,
        language: str = 'fr'
    ) -> str:
        """
        Generate cache key for geographic searches.
        
        Consolidates geographic search cache key generation.
        """
        params = {
            'lat': round(lat, 6),  # Precision to ~10cm
            'lng': round(lng, 6),
            'radius': radius,
            'filters': filters,
            'page': page,
            'language': language
        }
        return cls.generate_key('geo', params)
    
    @classmethod
    def _normalize_params(cls, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize parameters for consistent hashing.
        
        Handles type conversion and sorting to ensure identical
        parameters always generate the same hash.
        """
        normalized = {}
        
        for key, value in params.items():
            if value is None:
                continue
                
            # Convert to string for consistent hashing
            if isinstance(value, (list, tuple)):
                # Sort lists for consistent ordering
                normalized[key] = sorted([str(v) for v in value])
            elif isinstance(value, dict):
                # Recursively normalize nested dicts
                normalized[key] = cls._normalize_params(value)
            else:
                normalized[key] = str(value)
                
        return normalized


class CacheResponseMixin:
    """
    Mixin for adding consistent cache headers to HTTP responses.
    
    Consolidates the cache header logic that was duplicated across:
    - tourism/views.py (X-Cache, Cache-Control headers)
    - tourism/search_views.py (same header patterns)
    """
    
    DEFAULT_CACHE_TIMEOUT = getattr(settings, 'DEFAULT_CACHE_TIMEOUT', 3600)
    
    @staticmethod
    def add_cache_headers(
        response: HttpResponse, 
        cache_status: str = 'MISS',
        max_age: Optional[int] = None,
        cache_control: str = 'public',
        additional_headers: Optional[Dict[str, str]] = None
    ) -> HttpResponse:
        """
        Add consistent cache headers to a response.
        
        Args:
            response: Django HttpResponse object
            cache_status: 'HIT' or 'MISS' 
            max_age: Cache max-age in seconds (default from settings)
            cache_control: Cache-Control directive
            additional_headers: Extra headers to add
            
        Returns:
            Response with cache headers added
        """
        if max_age is None:
            max_age = CacheResponseMixin.DEFAULT_CACHE_TIMEOUT
            
        # Standard cache headers
        response['X-Cache'] = cache_status
        response['Cache-Control'] = f'{cache_control}, max-age={max_age}'
        response['Vary'] = 'Accept-Language, Authorization'
        
        # Add ETag for better caching
        if hasattr(response, 'content') and response.content:
            content_hash = hashlib.md5(response.content).hexdigest()[:16]
            response['ETag'] = f'"{content_hash}"'
        
        # Add additional headers if provided
        if additional_headers:
            for header, value in additional_headers.items():
                response[header] = value
                
        return response
    
    @staticmethod
    def create_cached_response(
        data: Any,
        cache_key: str,
        timeout: Optional[int] = None,
        response_class=None
    ) -> HttpResponse:
        """
        Create a response and cache the data.
        
        Args:
            data: Data to include in response and cache
            cache_key: Key for caching the data  
            timeout: Cache timeout (default from settings)
            response_class: Response class to use
            
        Returns:
            HTTP response with data and cache headers
        """
        from rest_framework.response import Response
        
        if timeout is None:
            timeout = CacheResponseMixin.DEFAULT_CACHE_TIMEOUT
            
        # Cache the data
        cache.set(cache_key, data, timeout)
        
        # Create response
        if response_class:
            response = response_class(data)
        else:
            response = Response(data)
        
        # Add cache headers
        return CacheResponseMixin.add_cache_headers(
            response,
            cache_status='MISS',
            max_age=timeout
        )
    
    @staticmethod
    def get_cached_response(
        cache_key: str,
        response_class=None
    ) -> Optional[HttpResponse]:
        """
        Retrieve cached data and create response.
        
        Args:
            cache_key: Cache key to look up
            response_class: Response class to use
            
        Returns:
            Cached response or None if not found
        """
        from rest_framework.response import Response
        
        cached_data = cache.get(cache_key)
        if cached_data is None:
            return None
            
        # Create response
        if response_class:
            response = response_class(cached_data)
        else:
            response = Response(cached_data)
            
        # Add cache headers
        return CacheResponseMixin.add_cache_headers(
            response,
            cache_status='HIT'
        )


class CacheManager:
    """
    High-level cache management utilities.
    
    Provides a simplified interface for common caching patterns
    used throughout the application.
    """
    
    @staticmethod
    def get_or_set_list(
        key_prefix: str,
        params: Dict[str, Any],
        fetch_function,
        timeout: Optional[int] = None
    ):
        """
        Get cached list data or fetch and cache it.
        
        Args:
            key_prefix: Prefix for cache key generation
            params: Parameters for cache key and fetch function
            fetch_function: Function to call if cache miss
            timeout: Cache timeout
            
        Returns:
            Cached or freshly fetched data
        """
        cache_key = CacheKeyGenerator.generate_key(key_prefix, params)
        
        # Try to get from cache
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            logger.debug(f"Cache HIT for key: {cache_key}")
            return cached_data, True  # (data, cache_hit)
        
        # Cache miss - fetch data
        logger.debug(f"Cache MISS for key: {cache_key}")
        data = fetch_function(**params)
        
        # Cache the result
        if timeout is None:
            timeout = CacheResponseMixin.DEFAULT_CACHE_TIMEOUT
        cache.set(cache_key, data, timeout)
        
        return data, False  # (data, cache_hit)
    
    @staticmethod
    def invalidate_pattern(pattern: str) -> int:
        """
        Invalidate cache keys matching a pattern.
        
        Args:
            pattern: Cache key pattern to match
            
        Returns:
            Number of keys invalidated
        """
        try:
            # Use the existing cache service if available
            from tourism.cache import CacheService
            return CacheService.clear_by_pattern(pattern)
        except ImportError:
            # Fallback to basic cache clearing
            logger.warning(f"Could not import CacheService, using basic cache clear")
            cache.clear()
            return 0
    
    @staticmethod
    def warm_cache(cache_keys: Dict[str, Any]) -> Dict[str, bool]:
        """
        Warm cache with pre-computed values.
        
        Args:
            cache_keys: Dictionary of cache_key -> data pairs
            
        Returns:
            Dictionary of cache_key -> success status
        """
        results = {}
        
        for cache_key, data in cache_keys.items():
            try:
                cache.set(cache_key, data, CacheResponseMixin.DEFAULT_CACHE_TIMEOUT)
                results[cache_key] = True
                logger.debug(f"Cache warmed for key: {cache_key}")
            except Exception as e:
                logger.error(f"Failed to warm cache for key {cache_key}: {e}")
                results[cache_key] = False
                
        return results