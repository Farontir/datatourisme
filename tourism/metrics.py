"""
Système de métriques et monitoring pour l'application tourism
"""
import time
import threading
from collections import defaultdict, deque
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, List, Any, Optional, Callable
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
import logging
import json

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Collecteur de métriques thread-safe pour monitoring"""
    
    def __init__(self, max_samples: int = 1000):
        """
        Initialise le collecteur de métriques
        
        Args:
            max_samples: Nombre maximum d'échantillons à conserver en mémoire
        """
        self.max_samples = max_samples
        self._lock = threading.Lock()
        
        # Stockage des métriques
        self._timings = defaultdict(lambda: deque(maxlen=max_samples))
        self._counters = defaultdict(int)
        self._gauges = defaultdict(float)
        self._histograms = defaultdict(lambda: deque(maxlen=max_samples))
        
        # Cache des statistiques calculées
        self._stats_cache = {}
        self._cache_timestamp = None
        self._cache_ttl = 60  # 1 minute
    
    def record_timing(self, metric_name: str, duration: float, tags: Optional[Dict] = None):
        """
        Enregistre une métrique de timing
        
        Args:
            metric_name: Nom de la métrique
            duration: Durée en secondes
            tags: Tags additionnels
        """
        with self._lock:
            timestamp = timezone.now()
            metric_data = {
                'duration': duration,
                'timestamp': timestamp,
                'tags': tags or {}
            }
            
            self._timings[metric_name].append(metric_data)
            
            # Invalider le cache
            self._invalidate_cache()
            
            logger.debug(f"Recorded timing for {metric_name}: {duration:.3f}s")
    
    def increment_counter(self, metric_name: str, value: int = 1, tags: Optional[Dict] = None):
        """
        Incrémente un compteur
        
        Args:
            metric_name: Nom de la métrique
            value: Valeur à ajouter
            tags: Tags additionnels
        """
        with self._lock:
            key = self._build_metric_key(metric_name, tags)
            self._counters[key] += value
            self._invalidate_cache()
            
            logger.debug(f"Incremented counter {metric_name}: +{value}")
    
    def set_gauge(self, metric_name: str, value: float, tags: Optional[Dict] = None):
        """
        Définit une valeur de gauge
        
        Args:
            metric_name: Nom de la métrique
            value: Valeur à définir
            tags: Tags additionnels
        """
        with self._lock:
            key = self._build_metric_key(metric_name, tags)
            self._gauges[key] = value
            self._invalidate_cache()
            
            logger.debug(f"Set gauge {metric_name}: {value}")
    
    def record_histogram(self, metric_name: str, value: float, tags: Optional[Dict] = None):
        """
        Enregistre une valeur dans un histogramme
        
        Args:
            metric_name: Nom de la métrique
            value: Valeur à enregistrer
            tags: Tags additionnels
        """
        with self._lock:
            timestamp = timezone.now()
            metric_data = {
                'value': value,
                'timestamp': timestamp,
                'tags': tags or {}
            }
            
            self._histograms[metric_name].append(metric_data)
            self._invalidate_cache()
            
            logger.debug(f"Recorded histogram value for {metric_name}: {value}")
    
    def get_timing_stats(self, metric_name: str, window_minutes: int = 60) -> Dict[str, Any]:
        """
        Calcule les statistiques pour une métrique de timing
        
        Args:
            metric_name: Nom de la métrique
            window_minutes: Fenêtre de temps en minutes
            
        Returns:
            Dictionnaire avec les statistiques
        """
        with self._lock:
            if metric_name not in self._timings:
                return {}
            
            # Filtrer par fenêtre de temps
            cutoff_time = timezone.now() - timedelta(minutes=window_minutes)
            recent_timings = [
                t for t in self._timings[metric_name]
                if t['timestamp'] >= cutoff_time
            ]
            
            if not recent_timings:
                return {}
            
            durations = [t['duration'] for t in recent_timings]
            durations.sort()
            
            count = len(durations)
            total = sum(durations)
            
            return {
                'count': count,
                'total': total,
                'mean': total / count,
                'min': min(durations),
                'max': max(durations),
                'p50': self._percentile(durations, 0.5),
                'p95': self._percentile(durations, 0.95),
                'p99': self._percentile(durations, 0.99),
                'rate_per_minute': count / window_minutes,
                'window_minutes': window_minutes
            }
    
    def get_counter_stats(self, window_minutes: int = 60) -> Dict[str, int]:
        """Retourne les statistiques des compteurs"""
        with self._lock:
            return dict(self._counters)
    
    def get_gauge_stats(self) -> Dict[str, float]:
        """Retourne les valeurs actuelles des gauges"""
        with self._lock:
            return dict(self._gauges)
    
    def get_histogram_stats(self, metric_name: str, window_minutes: int = 60) -> Dict[str, Any]:
        """
        Calcule les statistiques pour un histogramme
        
        Args:
            metric_name: Nom de la métrique
            window_minutes: Fenêtre de temps en minutes
            
        Returns:
            Dictionnaire avec les statistiques
        """
        with self._lock:
            if metric_name not in self._histograms:
                return {}
            
            # Filtrer par fenêtre de temps
            cutoff_time = timezone.now() - timedelta(minutes=window_minutes)
            recent_values = [
                h for h in self._histograms[metric_name]
                if h['timestamp'] >= cutoff_time
            ]
            
            if not recent_values:
                return {}
            
            values = [h['value'] for h in recent_values]
            values.sort()
            
            count = len(values)
            total = sum(values)
            
            return {
                'count': count,
                'total': total,
                'mean': total / count,
                'min': min(values),
                'max': max(values),
                'p50': self._percentile(values, 0.5),
                'p95': self._percentile(values, 0.95),
                'p99': self._percentile(values, 0.99)
            }
    
    def get_all_stats(self, window_minutes: int = 60) -> Dict[str, Any]:
        """
        Retourne toutes les statistiques
        
        Args:
            window_minutes: Fenêtre de temps en minutes
            
        Returns:
            Dictionnaire complet des statistiques
        """
        # Vérifier le cache
        if self._is_cache_valid():
            return self._stats_cache
        
        with self._lock:
            stats = {
                'timestamp': timezone.now().isoformat(),
                'window_minutes': window_minutes,
                'timings': {},
                'counters': self.get_counter_stats(window_minutes),
                'gauges': self.get_gauge_stats(),
                'histograms': {}
            }
            
            # Statistiques de timing
            for metric_name in self._timings.keys():
                stats['timings'][metric_name] = self.get_timing_stats(metric_name, window_minutes)
            
            # Statistiques d'histogramme
            for metric_name in self._histograms.keys():
                stats['histograms'][metric_name] = self.get_histogram_stats(metric_name, window_minutes)
            
            # Mettre en cache
            self._stats_cache = stats
            self._cache_timestamp = timezone.now()
            
            return stats
    
    def reset_all(self):
        """Remet à zéro toutes les métriques"""
        with self._lock:
            self._timings.clear()
            self._counters.clear()
            self._gauges.clear()
            self._histograms.clear()
            self._invalidate_cache()
            
            logger.info("All metrics reset")
    
    def _build_metric_key(self, metric_name: str, tags: Optional[Dict] = None) -> str:
        """Construit une clé de métrique avec tags"""
        if not tags:
            return metric_name
        
        tag_string = ','.join(f"{k}={v}" for k, v in sorted(tags.items()))
        return f"{metric_name}[{tag_string}]"
    
    def _percentile(self, values: List[float], percentile: float) -> float:
        """Calcule un percentile"""
        if not values:
            return 0.0
        
        index = int(percentile * (len(values) - 1))
        return values[index]
    
    def _invalidate_cache(self):
        """Invalide le cache des statistiques"""
        self._cache_timestamp = None
        self._stats_cache = {}
    
    def _is_cache_valid(self) -> bool:
        """Vérifie si le cache est valide"""
        if not self._cache_timestamp:
            return False
        
        age = timezone.now() - self._cache_timestamp
        return age.total_seconds() < self._cache_ttl


# Instance globale du collecteur
_global_metrics = MetricsCollector()


def get_metrics_collector() -> MetricsCollector:
    """Retourne l'instance globale du collecteur de métriques"""
    return _global_metrics


def time_it(metric_name: str, tags: Optional[Dict] = None):
    """
    Décorateur pour mesurer le temps d'exécution d'une fonction
    
    Args:
        metric_name: Nom de la métrique
        tags: Tags additionnels
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            status = 'success'
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                status = 'error'
                raise
            finally:
                duration = time.time() - start_time
                final_tags = dict(tags or {})
                final_tags['status'] = status
                final_tags['function'] = func.__name__
                
                _global_metrics.record_timing(metric_name, duration, final_tags)
        
        return wrapper
    return decorator


def count_calls(metric_name: str, tags: Optional[Dict] = None):
    """
    Décorateur pour compter les appels de fonction
    
    Args:
        metric_name: Nom de la métrique
        tags: Tags additionnels
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            final_tags = dict(tags or {})
            final_tags['function'] = func.__name__
            
            try:
                result = func(*args, **kwargs)
                final_tags['status'] = 'success'
                return result
            except Exception as e:
                final_tags['status'] = 'error'
                raise
            finally:
                _global_metrics.increment_counter(metric_name, 1, final_tags)
        
        return wrapper
    return decorator


class ApplicationMetrics:
    """Métriques spécifiques à l'application tourism"""
    
    @staticmethod
    def record_api_request(endpoint: str, method: str, status_code: int, duration: float):
        """Enregistre une requête API"""
        tags = {
            'endpoint': endpoint,
            'method': method,
            'status_code': str(status_code),
            'status_class': f"{status_code // 100}xx"
        }
        
        _global_metrics.record_timing('api.request.duration', duration, tags)
        _global_metrics.increment_counter('api.request.count', 1, tags)
    
    @staticmethod
    def record_database_query(operation: str, table: str, duration: float):
        """Enregistre une requête base de données"""
        tags = {
            'operation': operation,
            'table': table
        }
        
        _global_metrics.record_timing('database.query.duration', duration, tags)
        _global_metrics.increment_counter('database.query.count', 1, tags)
    
    @staticmethod
    def record_cache_operation(operation: str, hit: bool, duration: float):
        """Enregistre une opération de cache"""
        tags = {
            'operation': operation,
            'result': 'hit' if hit else 'miss'
        }
        
        _global_metrics.record_timing('cache.operation.duration', duration, tags)
        _global_metrics.increment_counter('cache.operation.count', 1, tags)
    
    @staticmethod
    def record_search_operation(search_type: str, results_count: int, duration: float):
        """Enregistre une opération de recherche"""
        tags = {
            'search_type': search_type,
            'has_results': 'yes' if results_count > 0 else 'no'
        }
        
        _global_metrics.record_timing('search.operation.duration', duration, tags)
        _global_metrics.record_histogram('search.results.count', results_count, tags)
        _global_metrics.increment_counter('search.operation.count', 1, tags)
    
    @staticmethod
    def record_import_operation(source: str, imported_count: int, error_count: int, duration: float):
        """Enregistre une opération d'import"""
        tags = {
            'source': source,
            'status': 'success' if error_count == 0 else 'partial' if imported_count > 0 else 'failed'
        }
        
        _global_metrics.record_timing('import.operation.duration', duration, tags)
        _global_metrics.record_histogram('import.imported.count', imported_count, tags)
        _global_metrics.record_histogram('import.errors.count', error_count, tags)
        _global_metrics.increment_counter('import.operation.count', 1, tags)
    
    @staticmethod
    def set_active_connections(service: str, count: int):
        """Définit le nombre de connexions actives"""
        tags = {'service': service}
        _global_metrics.set_gauge('connections.active', count, tags)
    
    @staticmethod
    def set_memory_usage(component: str, bytes_used: int):
        """Définit l'usage mémoire"""
        tags = {'component': component}
        _global_metrics.set_gauge('memory.usage.bytes', bytes_used, tags)


class MetricsMiddleware:
    """Middleware Django pour collecter automatiquement les métriques API"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        duration = time.time() - start_time
        
        # Enregistrer les métriques
        ApplicationMetrics.record_api_request(
            endpoint=request.path,
            method=request.method,
            status_code=response.status_code,
            duration=duration
        )
        
        # Ajouter des headers de métriques
        response['X-Response-Time'] = f"{duration:.3f}"
        
        return response


class MetricsExporter:
    """Exporteur de métriques vers différents formats"""
    
    @staticmethod
    def to_prometheus(window_minutes: int = 60) -> str:
        """
        Exporte les métriques au format Prometheus
        
        Args:
            window_minutes: Fenêtre de temps
            
        Returns:
            Métriques au format Prometheus
        """
        stats = _global_metrics.get_all_stats(window_minutes)
        lines = []
        
        # Counters
        for metric_name, value in stats['counters'].items():
            lines.append(f"# TYPE {metric_name} counter")
            lines.append(f"{metric_name} {value}")
        
        # Gauges
        for metric_name, value in stats['gauges'].items():
            lines.append(f"# TYPE {metric_name} gauge")
            lines.append(f"{metric_name} {value}")
        
        # Timings (convertis en histogrammes)
        for metric_name, timing_stats in stats['timings'].items():
            if timing_stats:
                lines.append(f"# TYPE {metric_name}_seconds histogram")
                lines.append(f"{metric_name}_seconds_count {timing_stats['count']}")
                lines.append(f"{metric_name}_seconds_sum {timing_stats['total']}")
                lines.append(f"{metric_name}_seconds{{le=\"0.1\"}} {timing_stats['count'] if timing_stats['p99'] <= 0.1 else 0}")
                lines.append(f"{metric_name}_seconds{{le=\"0.5\"}} {timing_stats['count'] if timing_stats['p99'] <= 0.5 else 0}")
                lines.append(f"{metric_name}_seconds{{le=\"1.0\"}} {timing_stats['count'] if timing_stats['p99'] <= 1.0 else 0}")
                lines.append(f"{metric_name}_seconds{{le=\"+Inf\"}} {timing_stats['count']}")
        
        return '\n'.join(lines)
    
    @staticmethod
    def to_json(window_minutes: int = 60) -> str:
        """
        Exporte les métriques au format JSON
        
        Args:
            window_minutes: Fenêtre de temps
            
        Returns:
            Métriques au format JSON
        """
        stats = _global_metrics.get_all_stats(window_minutes)
        return json.dumps(stats, indent=2, default=str)
    
    @staticmethod
    def to_influxdb(window_minutes: int = 60) -> List[str]:
        """
        Exporte les métriques au format InfluxDB line protocol
        
        Args:
            window_minutes: Fenêtre de temps
            
        Returns:
            Liste de lignes au format InfluxDB
        """
        stats = _global_metrics.get_all_stats(window_minutes)
        lines = []
        timestamp = int(time.time() * 1000000000)  # nanoseconds
        
        # Counters
        for metric_name, value in stats['counters'].items():
            lines.append(f"{metric_name},type=counter value={value} {timestamp}")
        
        # Gauges
        for metric_name, value in stats['gauges'].items():
            lines.append(f"{metric_name},type=gauge value={value} {timestamp}")
        
        # Timings
        for metric_name, timing_stats in stats['timings'].items():
            if timing_stats:
                base_name = metric_name.replace('.', '_')
                lines.append(f"{base_name}_count,type=timing value={timing_stats['count']} {timestamp}")
                lines.append(f"{base_name}_mean,type=timing value={timing_stats['mean']} {timestamp}")
                lines.append(f"{base_name}_p95,type=timing value={timing_stats['p95']} {timestamp}")
                lines.append(f"{base_name}_p99,type=timing value={timing_stats['p99']} {timestamp}")
        
        return lines


# Configuration par défaut
def setup_default_metrics():
    """Configure les métriques par défaut pour l'application"""
    # Métriques système de base
    ApplicationMetrics.set_active_connections('database', 0)
    ApplicationMetrics.set_active_connections('redis', 0)
    ApplicationMetrics.set_active_connections('elasticsearch', 0)
    
    logger.info("Default metrics setup completed")