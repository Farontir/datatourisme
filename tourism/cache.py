"""
Service de cache centralisé pour l'application tourism
"""
import hashlib
import json
from typing import Any, Optional, List
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class CacheService:
    """Service centralisé pour la gestion du cache Redis"""
    
    # Préfixes pour les différents types de cache
    PREFIXES = {
        'resource': 'res',
        'list': 'list',
        'search': 'search',
        'nearby': 'nearby',
        'analytics': 'analytics',
        'api': 'api',
    }
    
    # Durées de cache par défaut (en secondes)
    TIMEOUTS = {
        'resource': 3600,      # 1 heure pour les ressources individuelles
        'list': 900,           # 15 minutes pour les listes
        'search': 600,         # 10 minutes pour les recherches
        'nearby': 1800,        # 30 minutes pour les recherches géographiques
        'analytics': 7200,     # 2 heures pour les analytics
        'api': 300,            # 5 minutes pour les réponses API générales
    }
    
    @classmethod
    def generate_key(cls, prefix: str, *args, **kwargs) -> str:
        """
        Génère une clé de cache unique
        
        Args:
            prefix: Préfixe du type de cache
            *args: Arguments positionnels
            **kwargs: Arguments nommés
            
        Returns:
            Clé de cache unique
        """
        # Créer une chaîne unique à partir des arguments
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items()) if kwargs else {}
        }
        
        # Serializer et hasher pour créer une clé courte
        key_string = json.dumps(key_data, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()[:16]
        
        return f"{cls.PREFIXES.get(prefix, prefix)}:{key_hash}"
    
    @classmethod
    def get(cls, prefix: str, *args, **kwargs) -> Optional[Any]:
        """
        Récupère une valeur du cache
        
        Args:
            prefix: Préfixe du type de cache
            *args, **kwargs: Arguments pour générer la clé
            
        Returns:
            Valeur du cache ou None si non trouvée
        """
        key = cls.generate_key(prefix, *args, **kwargs)
        try:
            value = cache.get(key)
            if value is not None:
                logger.debug(f"Cache HIT: {key}")
            else:
                logger.debug(f"Cache MISS: {key}")
            return value
        except Exception as e:
            logger.error(f"Erreur cache GET {key}: {e}")
            return None
    
    @classmethod
    def set(cls, prefix: str, value: Any, timeout: Optional[int] = None, 
            *args, **kwargs) -> bool:
        """
        Stocke une valeur dans le cache
        
        Args:
            prefix: Préfixe du type de cache
            value: Valeur à stocker
            timeout: Durée de cache (None = utiliser défaut)
            *args, **kwargs: Arguments pour générer la clé
            
        Returns:
            True si succès, False sinon
        """
        key = cls.generate_key(prefix, *args, **kwargs)
        
        if timeout is None:
            timeout = cls.TIMEOUTS.get(prefix, cls.TIMEOUTS['api'])
        
        try:
            success = cache.set(key, value, timeout)
            if success:
                logger.debug(f"Cache SET: {key} (timeout: {timeout}s)")
            else:
                logger.warning(f"Cache SET failed: {key}")
            return success
        except Exception as e:
            logger.error(f"Erreur cache SET {key}: {e}")
            return False
    
    @classmethod
    def delete(cls, prefix: str, *args, **kwargs) -> bool:
        """
        Supprime une entrée du cache
        
        Args:
            prefix: Préfixe du type de cache
            *args, **kwargs: Arguments pour générer la clé
            
        Returns:
            True si succès, False sinon
        """
        key = cls.generate_key(prefix, *args, **kwargs)
        try:
            success = cache.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return success
        except Exception as e:
            logger.error(f"Erreur cache DELETE {key}: {e}")
            return False
    
    @classmethod
    def delete_pattern(cls, pattern: str) -> int:
        """
        Supprime toutes les entrées correspondant à un pattern
        
        Args:
            pattern: Pattern à matcher (ex: "res:*")
            
        Returns:
            Nombre d'entrées supprimées
        """
        try:
            # Note: cette méthode nécessite django-redis
            deleted = cache.delete_pattern(f"tourism:{pattern}")
            logger.info(f"Cache DELETE PATTERN: {pattern} ({deleted} entrées)")
            return deleted
        except Exception as e:
            logger.error(f"Erreur cache DELETE PATTERN {pattern}: {e}")
            return 0
    
    @classmethod
    def clear_all(cls) -> bool:
        """
        Vide tout le cache
        
        Returns:
            True si succès, False sinon
        """
        try:
            cache.clear()
            logger.info("Cache entièrement vidé")
            return True
        except Exception as e:
            logger.error(f"Erreur cache CLEAR: {e}")
            return False
    
    @classmethod
    def get_stats(cls) -> dict:
        """
        Récupère les statistiques du cache
        
        Returns:
            Dictionnaire avec les stats
        """
        try:
            # Note: nécessite django-redis avec redis-py
            redis_client = cache._cache.get_client(write=False)
            info = redis_client.info()
            
            return {
                'connected_clients': info.get('connected_clients', 0),
                'used_memory_human': info.get('used_memory_human', '0B'),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'hit_rate': cls._calculate_hit_rate(
                    info.get('keyspace_hits', 0),
                    info.get('keyspace_misses', 0)
                )
            }
        except Exception as e:
            logger.error(f"Erreur récupération stats cache: {e}")
            return {}
    
    @staticmethod
    def _calculate_hit_rate(hits: int, misses: int) -> float:
        """Calcule le taux de réussite du cache"""
        total = hits + misses
        return (hits / total * 100) if total > 0 else 0.0


class ResourceCacheService:
    """Service de cache spécialisé pour les ressources touristiques"""
    
    @classmethod
    def get_resource(cls, resource_id: int, language: str = 'fr') -> Optional[dict]:
        """Récupère une ressource depuis le cache"""
        return CacheService.get('resource', resource_id, language)
    
    @classmethod
    def set_resource(cls, resource_id: int, data: dict, language: str = 'fr') -> bool:
        """Stocke une ressource dans le cache"""
        return CacheService.set('resource', data, None, resource_id, language)
    
    @classmethod
    def invalidate_resource(cls, resource_id: int) -> int:
        """Invalide toutes les entrées cache pour une ressource"""
        pattern = f"res:*{resource_id}*"
        return CacheService.delete_pattern(pattern)
    
    @classmethod
    def get_resource_list(cls, filters: dict, page: int = 1, 
                          language: str = 'fr') -> Optional[dict]:
        """Récupère une liste de ressources depuis le cache"""
        return CacheService.get('list', filters, page, language)
    
    @classmethod
    def set_resource_list(cls, filters: dict, data: dict, page: int = 1,
                          language: str = 'fr') -> bool:
        """Stocke une liste de ressources dans le cache"""
        return CacheService.set('list', data, None, filters, page, language)
    
    @classmethod
    def invalidate_all_lists(cls) -> int:
        """Invalide toutes les listes en cache"""
        return CacheService.delete_pattern("list:*")


class SearchCacheService:
    """Service de cache spécialisé pour les recherches"""
    
    @classmethod
    def get_search_results(cls, query: str, filters: dict, 
                          language: str = 'fr') -> Optional[dict]:
        """Récupère des résultats de recherche depuis le cache"""
        return CacheService.get('search', query, filters, language)
    
    @classmethod
    def set_search_results(cls, query: str, filters: dict, data: dict,
                          language: str = 'fr') -> bool:
        """Stocke des résultats de recherche dans le cache"""
        return CacheService.set('search', data, None, query, filters, language)
    
    @classmethod
    def get_nearby_results(cls, lat: float, lng: float, radius: int,
                          language: str = 'fr') -> Optional[dict]:
        """Récupère des résultats de recherche géographique depuis le cache"""
        return CacheService.get('nearby', lat, lng, radius, language)
    
    @classmethod
    def set_nearby_results(cls, lat: float, lng: float, radius: int,
                          data: dict, language: str = 'fr') -> bool:
        """Stocke des résultats de recherche géographique dans le cache"""
        return CacheService.set('nearby', data, None, lat, lng, radius, language)


class AnalyticsCacheService:
    """Service de cache spécialisé pour les analytics"""
    
    @classmethod
    def get_analytics(cls, metric: str, date_range: str) -> Optional[dict]:
        """Récupère des données d'analytics depuis le cache"""
        return CacheService.get('analytics', metric, date_range)
    
    @classmethod
    def set_analytics(cls, metric: str, date_range: str, data: dict) -> bool:
        """Stocke des données d'analytics dans le cache"""
        # Analytics avec cache plus long (2 heures)
        return CacheService.set('analytics', data, 7200, metric, date_range)
    
    @classmethod
    def invalidate_analytics(cls) -> int:
        """Invalide toutes les données d'analytics en cache"""
        return CacheService.delete_pattern("analytics:*")


# Décorateurs pour simplifier l'utilisation
def cache_result(prefix: str, timeout: Optional[int] = None):
    """
    Décorateur pour mettre en cache le résultat d'une fonction
    
    Args:
        prefix: Préfixe du cache
        timeout: Durée de cache (None = défaut)
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Générer clé de cache
            cache_key = CacheService.generate_key(prefix, func.__name__, *args, **kwargs)
            
            # Essayer de récupérer depuis le cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache HIT pour {func.__name__}: {cache_key}")
                return cached_result
            
            # Exécuter la fonction et mettre en cache
            result = func(*args, **kwargs)
            
            cache_timeout = timeout or CacheService.TIMEOUTS.get(prefix, 300)
            cache.set(cache_key, result, cache_timeout)
            logger.debug(f"Cache SET pour {func.__name__}: {cache_key}")
            
            return result
        return wrapper
    return decorator