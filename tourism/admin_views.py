"""
Vues d'administration et de monitoring pour l'API Tourism
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from django.http import JsonResponse, HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .connections import ConnectionManager
from .circuit_breaker import CircuitBreakerManager
from .metrics import get_metrics_collector, MetricsExporter
from .security import AdvancedRateLimit
import logging

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    Endpoint de vérification de santé du système
    """
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        summary="Vérification de santé du système",
        description="""
        Retourne l'état de santé des différents composants du système :
        - Base de données
        - Redis (cache)
        - Elasticsearch
        - Circuit breakers
        
        Utile pour les monitoring externes et les load balancers.
        """,
        examples=[
            OpenApiExample(
                'Système en bonne santé',
                description='Tous les services fonctionnent correctement',
                value={
                    'status': 'healthy',
                    'timestamp': '2024-01-15T10:30:00Z',
                    'services': {
                        'database': {'status': 'healthy', 'response_time_ms': 2},
                        'redis': {'status': 'healthy', 'response_time_ms': 1},
                        'elasticsearch': {'status': 'healthy', 'response_time_ms': 15}
                    },
                    'circuit_breakers': {
                        'redis': {'state': 'closed', 'failure_count': 0},
                        'elasticsearch': {'state': 'closed', 'failure_count': 0}
                    }
                },
                response_only=True,
            ),
            OpenApiExample(
                'Système dégradé',
                description='Un ou plusieurs services rencontrent des problèmes',
                value={
                    'status': 'degraded',
                    'timestamp': '2024-01-15T10:30:00Z',
                    'services': {
                        'database': {'status': 'healthy', 'response_time_ms': 2},
                        'redis': {'status': 'healthy', 'response_time_ms': 1},
                        'elasticsearch': {'status': 'error', 'error': 'Connection refused'}
                    },
                    'circuit_breakers': {
                        'redis': {'state': 'closed', 'failure_count': 0},
                        'elasticsearch': {'state': 'open', 'failure_count': 5}
                    }
                },
                response_only=True,
            )
        ],
        tags=['Monitoring']
    )
    @method_decorator(never_cache)
    def get(self, request):
        """Vérifie l'état de santé du système"""
        import time
        from django.utils import timezone
        
        start_time = time.time()
        health_status = {
            'timestamp': timezone.now().isoformat(),
            'services': {},
            'circuit_breakers': {},
            'overall_status': 'healthy'
        }
        
        # Tester les connexions
        services_status = ConnectionManager.test_connections()
        
        for service_name, service_info in services_status.items():
            if isinstance(service_info, dict):
                if 'error' in service_info['status']:
                    health_status['overall_status'] = 'degraded'
                health_status['services'][service_name] = service_info
            else:
                # Format simple (rétrocompatibilité)
                health_status['services'][service_name] = {
                    'status': service_info if 'error' not in str(service_info) else 'error',
                    'details': str(service_info)
                }
                if 'error' in str(service_info):
                    health_status['overall_status'] = 'degraded'
        
        # État des circuit breakers
        cb_stats = CircuitBreakerManager.get_all_stats()
        for cb_name, cb_info in cb_stats.items():
            health_status['circuit_breakers'][cb_name] = {
                'state': cb_info['state'],
                'failure_count': cb_info['failure_count'],
                'success_rate': cb_info.get('success_rate', 0)
            }
            
            # Si un circuit breaker est ouvert, le système est dégradé
            if cb_info['state'] == 'open':
                health_status['overall_status'] = 'degraded'
        
        # Temps de réponse total
        response_time = (time.time() - start_time) * 1000
        health_status['response_time_ms'] = round(response_time, 2)
        
        # Code de statut HTTP selon l'état
        status_code = status.HTTP_200_OK if health_status['overall_status'] == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
        
        return Response(health_status, status=status_code)


class MetricsView(APIView):
    """
    Endpoint pour récupérer les métriques du système
    """
    permission_classes = [permissions.IsAdminUser]
    
    @extend_schema(
        summary="Métriques du système",
        description="""
        Retourne les métriques détaillées du système pour monitoring et analyse.
        
        Inclut :
        - Métriques de performance (timings, throughput)
        - Compteurs d'événements
        - Gauges de ressources
        - Histogrammes de distribution
        """,
        parameters=[
            OpenApiParameter(
                name='window',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Fenêtre de temps en minutes (défaut: 60)',
                example=60,
                required=False
            ),
            OpenApiParameter(
                name='format',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Format de sortie',
                example='json',
                enum=['json', 'prometheus', 'influxdb'],
                required=False
            ),
        ],
        examples=[
            OpenApiExample(
                'Métriques JSON',
                description='Métriques au format JSON structuré',
                value={
                    'timestamp': '2024-01-15T10:30:00Z',
                    'window_minutes': 60,
                    'timings': {
                        'api.request.duration': {
                            'count': 1250,
                            'mean': 0.145,
                            'p95': 0.580,
                            'p99': 1.200
                        }
                    },
                    'counters': {
                        'api.requests.total': 1250,
                        'cache.hits': 890,
                        'cache.misses': 360
                    },
                    'gauges': {
                        'active_connections': 25,
                        'memory_usage_mb': 512
                    }
                },
                response_only=True,
            )
        ],
        tags=['Monitoring']
    )
    def get(self, request):
        """Récupère les métriques du système"""
        window_minutes = int(request.query_params.get('window', 60))
        format_type = request.query_params.get('format', 'json')
        
        try:
            if format_type == 'prometheus':
                metrics_data = MetricsExporter.to_prometheus(window_minutes)
                return HttpResponse(
                    metrics_data,
                    content_type='text/plain; version=0.0.4; charset=utf-8'
                )
            elif format_type == 'influxdb':
                metrics_lines = MetricsExporter.to_influxdb(window_minutes)
                return HttpResponse(
                    '\n'.join(metrics_lines),
                    content_type='text/plain; charset=utf-8'
                )
            else:  # JSON par défaut
                metrics_data = get_metrics_collector().get_all_stats(window_minutes)
                return Response(metrics_data)
                
        except Exception as e:
            logger.error(f"Error retrieving metrics: {e}")
            return Response(
                {'error': 'Failed to retrieve metrics', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CircuitBreakerStatusView(APIView):
    """
    Endpoint pour gérer les circuit breakers
    """
    permission_classes = [permissions.IsAdminUser]
    
    @extend_schema(
        summary="État des circuit breakers",
        description="Retourne l'état détaillé de tous les circuit breakers",
        examples=[
            OpenApiExample(
                'État des circuit breakers',
                value={
                    'redis': {
                        'name': 'redis',
                        'state': 'closed',
                        'failure_count': 0,
                        'success_count': 1250,
                        'total_calls': 1250,
                        'success_rate': 100.0,
                        'last_failure_time': None
                    },
                    'elasticsearch': {
                        'name': 'elasticsearch',
                        'state': 'half_open',
                        'failure_count': 3,
                        'success_count': 895,
                        'total_calls': 898,
                        'success_rate': 99.67,
                        'last_failure_time': '2024-01-15T10:25:00Z'
                    }
                },
                response_only=True,
            )
        ],
        tags=['Administration']
    )
    def get(self, request):
        """Récupère l'état des circuit breakers"""
        return Response(CircuitBreakerManager.get_all_stats())
    
    @extend_schema(
        summary="Réinitialiser les circuit breakers",
        description="Réinitialise tous les circuit breakers à l'état fermé",
        request=None,
        examples=[
            OpenApiExample(
                'Réinitialisation réussie',
                value={'message': 'All circuit breakers have been reset'},
                response_only=True,
            )
        ],
        tags=['Administration']
    )
    def post(self, request):
        """Réinitialise tous les circuit breakers"""
        try:
            CircuitBreakerManager.reset_all()
            logger.info("All circuit breakers reset by admin")
            return Response({'message': 'All circuit breakers have been reset'})
        except Exception as e:
            logger.error(f"Error resetting circuit breakers: {e}")
            return Response(
                {'error': 'Failed to reset circuit breakers', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CacheStatsView(APIView):
    """
    Endpoint pour les statistiques de cache
    """
    permission_classes = [permissions.IsAdminUser]
    
    @extend_schema(
        summary="Statistiques du cache",
        description="""
        Retourne les statistiques détaillées du système de cache Redis.
        
        Inclut :
        - Statistiques de hit/miss
        - Utilisation mémoire
        - Nombre de connexions actives
        - Performance des clés
        """,
        examples=[
            OpenApiExample(
                'Statistiques de cache',
                value={
                    'hit_rate': 85.6,
                    'total_requests': 1250,
                    'hits': 1070,
                    'misses': 180,
                    'memory_usage': '245MB',
                    'connected_clients': 12,
                    'keys_count': 1580,
                    'evicted_keys': 25
                },
                response_only=True,
            )
        ],
        tags=['Monitoring']
    )
    def get(self, request):
        """Récupère les statistiques de cache"""
        try:
            from .cache import CacheService
            
            # Statistiques Redis
            redis_stats = CacheService.get_stats()
            
            # Statistiques des connexions
            connection_stats = ConnectionManager.get_connection_stats()
            
            # Combiner les statistiques
            cache_stats = {
                **redis_stats,
                'connection_info': connection_stats.get('redis_info', {}),
                'circuit_breaker': connection_stats.get('circuit_breakers', {}).get('redis', {})
            }
            
            return Response(cache_stats)
            
        except Exception as e:
            logger.error(f"Error retrieving cache stats: {e}")
            return Response(
                {'error': 'Failed to retrieve cache statistics', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    summary="Nettoyage du cache",
    description="Vide complètement le cache Redis (à utiliser avec précaution)",
    methods=['POST'],
    request=None,
    responses={
        200: OpenApiExample(
            'Cache vidé',
            value={'message': 'Cache cleared successfully'},
        )
    },
    tags=['Administration']
)
@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def clear_cache(request):
    """Vide le cache Redis"""
    try:
        from .cache import CacheService
        
        success = CacheService.clear_all()
        if success:
            logger.warning("Cache cleared by admin user")
            return Response({'message': 'Cache cleared successfully'})
        else:
            return Response(
                {'error': 'Failed to clear cache'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return Response(
            {'error': 'Failed to clear cache', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class SecurityStatsView(APIView):
    """
    Endpoint pour les statistiques de sécurité
    """
    permission_classes = [permissions.IsAdminUser]
    
    @extend_schema(
        summary="Statistiques de sécurité",
        description="""
        Retourne les statistiques de sécurité du système :
        - Rate limiting
        - Tentatives d'intrusion bloquées
        - IPs blacklistées
        - Activités suspectes détectées
        """,
        examples=[
            OpenApiExample(
                'Statistiques de sécurité',
                value={
                    'rate_limiting': {
                        'requests_blocked': 45,
                        'suspicious_activity_detected': 12,
                        'blacklisted_ips': 8
                    },
                    'input_validation': {
                        'sql_injection_attempts': 15,
                        'xss_attempts': 8,
                        'total_threats_blocked': 23
                    },
                    'recent_blocked_ips': [
                        {'ip': '192.168.1.100', 'reason': 'rate_limit', 'timestamp': '2024-01-15T10:25:00Z'},
                        {'ip': '10.0.0.50', 'reason': 'suspicious_activity', 'timestamp': '2024-01-15T10:20:00Z'}
                    ]
                },
                response_only=True,
            )
        ],
        tags=['Sécurité']
    )
    def get(self, request):
        """Récupère les statistiques de sécurité"""
        try:
            # Récupérer les métriques de sécurité
            collector = get_metrics_collector()
            stats = collector.get_all_stats(window_minutes=60)
            
            # Extraire les métriques de sécurité
            security_stats = {
                'rate_limiting': {},
                'input_validation': {},
                'circuit_breakers': CircuitBreakerManager.get_all_stats()
            }
            
            # Analyser les compteurs de sécurité
            for counter_name, count in stats.get('counters', {}).items():
                if 'security.requests.blocked' in counter_name:
                    security_stats['rate_limiting']['requests_blocked'] = count
                elif 'security.threats.sql' in counter_name:
                    security_stats['input_validation']['sql_injection_attempts'] = count
                elif 'security.threats.xss' in counter_name:
                    security_stats['input_validation']['xss_attempts'] = count
            
            return Response(security_stats)
            
        except Exception as e:
            logger.error(f"Error retrieving security stats: {e}")
            return Response(
                {'error': 'Failed to retrieve security statistics', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    summary="Reset des métriques",
    description="Remet à zéro toutes les métriques collectées",
    methods=['POST'],
    request=None,
    responses={
        200: OpenApiExample(
            'Métriques réinitialisées',
            value={'message': 'All metrics have been reset'},
        )
    },
    tags=['Administration']
)
@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def reset_metrics(request):
    """Remet à zéro toutes les métriques"""
    try:
        collector = get_metrics_collector()
        collector.reset_all()
        
        logger.warning("All metrics reset by admin user")
        return Response({'message': 'All metrics have been reset'})
        
    except Exception as e:
        logger.error(f"Error resetting metrics: {e}")
        return Response(
            {'error': 'Failed to reset metrics', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )