"""
Gestionnaire centralisé des connexions aux services externes avec circuit breaker
"""
import time
import random
from elasticsearch import Elasticsearch, ConnectionError as ESConnectionError
from redis import ConnectionPool, Redis, ConnectionError as RedisConnectionError
from django.conf import settings
from django.core.cache import cache
import logging
from typing import Optional, Any, Callable
from functools import wraps
from .circuit_breaker import ServiceCircuitBreakers, CircuitBreakerError

logger = logging.getLogger(__name__)


def exponential_backoff(max_retries: int = 3, base_delay: float = 1.0):
    """
    Décorateur pour retry avec backoff exponentiel
    
    Args:
        max_retries: Nombre maximum de tentatives
        base_delay: Délai de base en secondes
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except (RedisConnectionError, ESConnectionError, ConnectionError) as e:
                    last_exception = e
                    
                    if attempt < max_retries:
                        # Calcul du délai avec jitter
                        delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                        logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}. Retrying in {delay:.2f}s")
                        time.sleep(delay)
                    else:
                        logger.error(f"All {max_retries + 1} attempts failed for {func.__name__}: {e}")
                        raise
            
            raise last_exception
        return wrapper
    return decorator


class ConnectionManager:
    """Gestionnaire centralisé des connexions aux services externes avec pooling et circuit breaker"""
    
    _redis_pool: Optional[ConnectionPool] = None
    _es_client: Optional[Elasticsearch] = None
    
    @classmethod
    @exponential_backoff(max_retries=3, base_delay=1.0)
    def get_redis_connection(cls) -> Redis:
        """
        Retourne une connexion Redis depuis le pool réutilisable avec circuit breaker
        
        Returns:
            Redis: Instance Redis avec pool de connexions
        """
        def _create_redis_connection():
            if cls._redis_pool is None:
                cls._redis_pool = ConnectionPool.from_url(
                    settings.CACHES['default']['LOCATION'],
                    max_connections=50,
                    retry_on_timeout=True,
                    socket_keepalive=True,
                    socket_keepalive_options={},
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5
                )
                logger.info("Redis connection pool initialized successfully")
            
            redis_client = Redis(connection_pool=cls._redis_pool)
            # Test de connectivité
            redis_client.ping()
            return redis_client
        
        circuit_breaker = ServiceCircuitBreakers.redis_circuit_breaker()
        return circuit_breaker.call(_create_redis_connection)
    
    @classmethod
    @exponential_backoff(max_retries=3, base_delay=1.0)
    def get_elasticsearch_client(cls) -> Elasticsearch:
        """
        Retourne un client Elasticsearch avec retry et timeout configurés avec circuit breaker
        
        Returns:
            Elasticsearch: Client Elasticsearch optimisé
        """
        def _create_elasticsearch_client():
            if cls._es_client is None:
                cls._es_client = Elasticsearch(
                    hosts=[settings.ELASTICSEARCH_DSL['default']['hosts']],
                    retry_on_timeout=True,
                    max_retries=3,
                    timeout=30,
                    sniff_on_start=True,
                    sniff_on_connection_fail=True,
                    sniffer_timeout=60,
                    http_compress=True,
                    verify_certs=False,
                    ssl_show_warn=False
                )
                
                # Vérifier la connexion
                if not cls._es_client.ping():
                    raise ESConnectionError("Elasticsearch ping failed")
                    
                logger.info("Elasticsearch client initialized successfully")
            
            return cls._es_client
        
        circuit_breaker = ServiceCircuitBreakers.elasticsearch_circuit_breaker()
        return circuit_breaker.call(_create_elasticsearch_client)
    
    @classmethod
    def test_connections(cls) -> dict:
        """
        Teste toutes les connexions aux services externes
        
        Returns:
            dict: Status de chaque service avec informations de circuit breaker
        """
        status = {}
        
        # Test Redis avec informations de circuit breaker
        try:
            redis_client = cls.get_redis_connection()
            redis_client.ping()
            redis_cb = ServiceCircuitBreakers.redis_circuit_breaker()
            status['redis'] = {
                'status': 'healthy',
                'circuit_breaker': redis_cb.get_stats()
            }
        except CircuitBreakerError:
            redis_cb = ServiceCircuitBreakers.redis_circuit_breaker()
            status['redis'] = {
                'status': 'circuit_breaker_open',
                'circuit_breaker': redis_cb.get_stats()
            }
        except Exception as e:
            status['redis'] = {
                'status': f'error: {str(e)}',
                'circuit_breaker': ServiceCircuitBreakers.redis_circuit_breaker().get_stats()
            }
            logger.error(f"Redis health check failed: {e}")
        
        # Test Elasticsearch avec informations de circuit breaker
        try:
            es_client = cls.get_elasticsearch_client()
            if es_client.ping():
                cluster_health = es_client.cluster.health()
                es_cb = ServiceCircuitBreakers.elasticsearch_circuit_breaker()
                status['elasticsearch'] = {
                    'status': f"healthy - {cluster_health['status']}",
                    'circuit_breaker': es_cb.get_stats(),
                    'cluster_info': cluster_health
                }
            else:
                status['elasticsearch'] = {
                    'status': 'unreachable',
                    'circuit_breaker': ServiceCircuitBreakers.elasticsearch_circuit_breaker().get_stats()
                }
        except CircuitBreakerError:
            es_cb = ServiceCircuitBreakers.elasticsearch_circuit_breaker()
            status['elasticsearch'] = {
                'status': 'circuit_breaker_open',
                'circuit_breaker': es_cb.get_stats()
            }
        except Exception as e:
            status['elasticsearch'] = {
                'status': f'error: {str(e)}',
                'circuit_breaker': ServiceCircuitBreakers.elasticsearch_circuit_breaker().get_stats()
            }
            logger.error(f"Elasticsearch health check failed: {e}")
        
        return status
    
    @classmethod
    def close_connections(cls):
        """Ferme proprement toutes les connexions"""
        if cls._redis_pool:
            cls._redis_pool.disconnect()
            cls._redis_pool = None
            logger.info("Redis connection pool closed")
        
        if cls._es_client:
            cls._es_client.close()
            cls._es_client = None
            logger.info("Elasticsearch client closed")
    
    @classmethod
    def get_connection_stats(cls) -> dict:
        """Retourne les statistiques détaillées des connexions"""
        from .circuit_breaker import CircuitBreakerManager
        
        stats = {
            'circuit_breakers': CircuitBreakerManager.get_all_stats(),
            'connection_pools': {
                'redis_pool_active': cls._redis_pool is not None,
                'elasticsearch_client_active': cls._es_client is not None
            }
        }
        
        # Ajouter des stats Redis si disponible
        if cls._redis_pool:
            try:
                redis_client = Redis(connection_pool=cls._redis_pool)
                redis_info = redis_client.info()
                stats['redis_info'] = {
                    'connected_clients': redis_info.get('connected_clients', 0),
                    'used_memory_human': redis_info.get('used_memory_human', '0B'),
                    'uptime_in_seconds': redis_info.get('uptime_in_seconds', 0)
                }
            except Exception as e:
                stats['redis_info'] = {'error': str(e)}
        
        return stats


class SafeConnectionMixin:
    """Mixin pour une utilisation sécurisée des connexions avec fallback"""
    
    def get_redis_safely(self) -> Optional[Redis]:
        """Retourne une connexion Redis ou None si indisponible"""
        try:
            return ConnectionManager.get_redis_connection()
        except (CircuitBreakerError, Exception) as e:
            logger.warning(f"Redis unavailable, falling back: {e}")
            return None
    
    def get_elasticsearch_safely(self) -> Optional[Elasticsearch]:
        """Retourne un client Elasticsearch ou None si indisponible"""
        try:
            return ConnectionManager.get_elasticsearch_client()
        except (CircuitBreakerError, Exception) as e:
            logger.warning(f"Elasticsearch unavailable, falling back: {e}")
            return None
    
    def execute_with_fallback(self, 
                             primary_func: Callable, 
                             fallback_func: Callable, 
                             *args, 
                             **kwargs) -> Any:
        """
        Exécute une fonction avec fallback automatique
        
        Args:
            primary_func: Fonction principale à exécuter
            fallback_func: Fonction de fallback
            *args: Arguments positionnels
            **kwargs: Arguments nommés
            
        Returns:
            Résultat de la fonction principale ou de fallback
        """
        try:
            return primary_func(*args, **kwargs)
        except (CircuitBreakerError, Exception) as e:
            logger.warning(f"Primary function failed: {e}, using fallback")
            return fallback_func(*args, **kwargs)


# Fonctions utilitaires pour simplifier l'usage
def with_redis_fallback(fallback_value: Any = None):
    """
    Décorateur pour exécuter une fonction avec fallback Redis
    
    Args:
        fallback_value: Valeur à retourner en cas d'échec
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except (CircuitBreakerError, RedisConnectionError, Exception) as e:
                logger.warning(f"Redis operation failed: {e}, returning fallback")
                return fallback_value
        return wrapper
    return decorator


def with_elasticsearch_fallback(fallback_value: Any = None):
    """
    Décorateur pour exécuter une fonction avec fallback Elasticsearch
    
    Args:
        fallback_value: Valeur à retourner en cas d'échec
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except (CircuitBreakerError, ESConnectionError, Exception) as e:
                logger.warning(f"Elasticsearch operation failed: {e}, returning fallback")
                return fallback_value
        return wrapper
    return decorator