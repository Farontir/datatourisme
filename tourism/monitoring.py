"""
Dashboard de monitoring temps réel pour l'application tourism
"""
from typing import Dict, List, Any
from datetime import datetime, timedelta
from django.utils import timezone
from django.template.loader import render_to_string
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from drf_spectacular.utils import extend_schema

from .connections import ConnectionManager
from .circuit_breaker import CircuitBreakerManager
from .metrics import get_metrics_collector, ApplicationMetrics
import json
import logging

logger = logging.getLogger(__name__)


class MonitoringDashboard:
    """
    Générateur de dashboard de monitoring
    """
    
    @staticmethod
    def get_system_overview() -> Dict[str, Any]:
        """
        Retourne une vue d'ensemble du système
        
        Returns:
            Dictionnaire avec les métriques principales
        """
        collector = get_metrics_collector()
        stats = collector.get_all_stats(window_minutes=60)
        
        # Santé des services
        services_health = ConnectionManager.test_connections()
        
        # Circuit breakers
        circuit_breakers = CircuitBreakerManager.get_all_stats()
        
        # Métriques clés
        overview = {
            'timestamp': timezone.now().isoformat(),
            'system_health': {
                'overall_status': 'healthy',
                'services': {},
                'circuit_breakers_open': 0
            },
            'performance': {
                'total_requests': 0,
                'avg_response_time': 0,
                'error_rate': 0,
                'cache_hit_rate': 0
            },
            'resources': {
                'active_connections': 0,
                'memory_usage_mb': 0,
                'cpu_usage_percent': 0
            }
        }
        
        # Analyser la santé des services
        for service_name, service_info in services_health.items():
            if isinstance(service_info, dict):
                if 'error' in service_info.get('status', ''):
                    overview['system_health']['overall_status'] = 'degraded'
                overview['system_health']['services'][service_name] = service_info.get('status', 'unknown')
            else:
                status_str = str(service_info)
                if 'error' in status_str:
                    overview['system_health']['overall_status'] = 'degraded'
                overview['system_health']['services'][service_name] = 'healthy' if 'error' not in status_str else 'error'
        
        # Compter les circuit breakers ouverts
        for cb_name, cb_info in circuit_breakers.items():
            if cb_info.get('state') == 'open':
                overview['system_health']['circuit_breakers_open'] += 1
                overview['system_health']['overall_status'] = 'degraded'
        
        # Calculer les métriques de performance
        api_requests = 0
        total_response_time = 0
        error_count = 0
        cache_hits = 0
        cache_total = 0
        
        for counter_name, count in stats.get('counters', {}).items():
            if 'api.request.count' in counter_name:
                api_requests += count
                if 'status_class=2xx' not in counter_name:
                    error_count += count
            elif 'cache.operation.count' in counter_name:
                cache_total += count
                if 'result=hit' in counter_name:
                    cache_hits += count
        
        # Temps de réponse moyen
        api_timing = stats.get('timings', {}).get('api.request.duration', {})
        if api_timing:
            total_response_time = api_timing.get('mean', 0) * 1000  # Convertir en ms
        
        overview['performance'].update({
            'total_requests': api_requests,
            'avg_response_time': round(total_response_time, 2),
            'error_rate': round((error_count / max(api_requests, 1)) * 100, 2),
            'cache_hit_rate': round((cache_hits / max(cache_total, 1)) * 100, 2)
        })
        
        # Métriques de ressources (gauges)
        for gauge_name, value in stats.get('gauges', {}).items():
            if 'connections.active' in gauge_name:
                overview['resources']['active_connections'] += value
            elif 'memory.usage' in gauge_name:
                overview['resources']['memory_usage_mb'] += value / 1024 / 1024
        
        return overview
    
    @staticmethod
    def get_detailed_metrics(window_minutes: int = 60) -> Dict[str, Any]:
        """
        Retourne les métriques détaillées pour le dashboard
        
        Args:
            window_minutes: Fenêtre de temps en minutes
            
        Returns:
            Métriques détaillées
        """
        collector = get_metrics_collector()
        stats = collector.get_all_stats(window_minutes)
        
        # Organiser les métriques par catégorie
        detailed = {
            'api_metrics': {
                'requests_per_minute': [],
                'response_times': [],
                'error_rates': [],
                'endpoints': {}
            },
            'database_metrics': {
                'query_times': [],
                'query_counts': [],
                'slow_queries': []
            },
            'cache_metrics': {
                'hit_rates': [],
                'operations': [],
                'memory_usage': []
            },
            'search_metrics': {
                'search_times': [],
                'result_counts': [],
                'search_types': {}
            }
        }
        
        # Analyser les timings
        for timing_name, timing_stats in stats.get('timings', {}).items():
            if 'api.request' in timing_name:
                detailed['api_metrics']['response_times'].append({
                    'name': timing_name,
                    'mean': timing_stats.get('mean', 0) * 1000,
                    'p95': timing_stats.get('p95', 0) * 1000,
                    'p99': timing_stats.get('p99', 0) * 1000,
                    'count': timing_stats.get('count', 0)
                })
            elif 'database.query' in timing_name:
                detailed['database_metrics']['query_times'].append({
                    'name': timing_name,
                    'mean': timing_stats.get('mean', 0) * 1000,
                    'count': timing_stats.get('count', 0)
                })
            elif 'search.operation' in timing_name:
                detailed['search_metrics']['search_times'].append({
                    'name': timing_name,
                    'mean': timing_stats.get('mean', 0) * 1000,
                    'count': timing_stats.get('count', 0)
                })
        
        # Analyser les compteurs
        for counter_name, count in stats.get('counters', {}).items():
            if 'api.request.count' in counter_name:
                # Extraire l'endpoint et le statut
                if '[' in counter_name:
                    tags_part = counter_name.split('[')[1].rstrip(']')
                    tags = dict(tag.split('=') for tag in tags_part.split(',') if '=' in tag)
                    endpoint = tags.get('endpoint', 'unknown')
                    
                    if endpoint not in detailed['api_metrics']['endpoints']:
                        detailed['api_metrics']['endpoints'][endpoint] = {
                            'total_requests': 0,
                            'success_requests': 0,
                            'error_requests': 0
                        }
                    
                    detailed['api_metrics']['endpoints'][endpoint]['total_requests'] += count
                    
                    if '2xx' in counter_name:
                        detailed['api_metrics']['endpoints'][endpoint]['success_requests'] += count
                    else:
                        detailed['api_metrics']['endpoints'][endpoint]['error_requests'] += count
        
        return detailed
    
    @staticmethod
    def get_alert_conditions() -> List[Dict[str, Any]]:
        """
        Vérifie les conditions d'alerte du système
        
        Returns:
            Liste des alertes actives
        """
        alerts = []
        overview = MonitoringDashboard.get_system_overview()
        
        # Alerte : Système dégradé
        if overview['system_health']['overall_status'] == 'degraded':
            alerts.append({
                'level': 'warning',
                'title': 'Système dégradé',
                'message': 'Un ou plusieurs services rencontrent des problèmes',
                'timestamp': timezone.now().isoformat(),
                'details': overview['system_health']['services']
            })
        
        # Alerte : Taux d'erreur élevé
        if overview['performance']['error_rate'] > 5:
            alerts.append({
                'level': 'error',
                'title': 'Taux d\'erreur élevé',
                'message': f'Taux d\'erreur: {overview["performance"]["error_rate"]}%',
                'timestamp': timezone.now().isoformat()
            })
        
        # Alerte : Temps de réponse élevé
        if overview['performance']['avg_response_time'] > 1000:
            alerts.append({
                'level': 'warning',
                'title': 'Temps de réponse élevé',
                'message': f'Temps moyen: {overview["performance"]["avg_response_time"]}ms',
                'timestamp': timezone.now().isoformat()
            })
        
        # Alerte : Cache hit rate faible
        if overview['performance']['cache_hit_rate'] < 70:
            alerts.append({
                'level': 'info',
                'title': 'Taux de cache faible',
                'message': f'Hit rate: {overview["performance"]["cache_hit_rate"]}%',
                'timestamp': timezone.now().isoformat()
            })
        
        # Alerte : Circuit breakers ouverts
        if overview['system_health']['circuit_breakers_open'] > 0:
            alerts.append({
                'level': 'error',
                'title': 'Circuit breakers ouverts',
                'message': f'{overview["system_health"]["circuit_breakers_open"]} circuit breaker(s) ouvert(s)',
                'timestamp': timezone.now().isoformat()
            })
        
        return alerts
    
    @staticmethod
    def generate_html_dashboard() -> str:
        """
        Génère un dashboard HTML simple
        
        Returns:
            Code HTML du dashboard
        """
        overview = MonitoringDashboard.get_system_overview()
        detailed = MonitoringDashboard.get_detailed_metrics()
        alerts = MonitoringDashboard.get_alert_conditions()
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tourism API - Monitoring Dashboard</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .container { max-width: 1200px; margin: 0 auto; }
                .header { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
                .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
                .metric-label { color: #666; font-size: 0.9em; }
                .status-healthy { color: #28a745; }
                .status-degraded { color: #dc3545; }
                .status-warning { color: #ffc107; }
                .alert { padding: 15px; margin: 10px 0; border-radius: 5px; }
                .alert-error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
                .alert-warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
                .alert-info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
                .refresh-info { color: #666; font-size: 0.8em; margin-top: 10px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f8f9fa; }
            </style>
            <script>
                // Auto-refresh every 30 seconds
                setTimeout(function() { location.reload(); }, 30000);
            </script>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Tourism API - Monitoring Dashboard</h1>
                    <p>État du système: <span class="status-{overall_status}">{overall_status_text}</span></p>
                    <div class="refresh-info">Dernière mise à jour: {timestamp} (Actualisation automatique dans 30s)</div>
                </div>
                
                {alerts_html}
                
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">{total_requests}</div>
                        <div class="metric-label">Requêtes totales (1h)</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{avg_response_time}ms</div>
                        <div class="metric-label">Temps de réponse moyen</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{error_rate}%</div>
                        <div class="metric-label">Taux d'erreur</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{cache_hit_rate}%</div>
                        <div class="metric-label">Taux de cache hit</div>
                    </div>
                </div>
                
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>Services</h3>
                        <table>
                            {services_table}
                        </table>
                    </div>
                    <div class="metric-card">
                        <h3>Circuit Breakers</h3>
                        <table>
                            {circuit_breakers_table}
                        </table>
                    </div>
                </div>
                
                <div class="metric-card">
                    <h3>Endpoints les plus utilisés</h3>
                    <table>
                        <tr><th>Endpoint</th><th>Requêtes</th><th>Succès</th><th>Erreurs</th><th>Taux de succès</th></tr>
                        {endpoints_table}
                    </table>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Générer les alertes HTML
        alerts_html = ""
        if alerts:
            alerts_html = "<div>"
            for alert in alerts:
                level_class = f"alert-{alert['level']}"
                alerts_html += f'<div class="alert {level_class}"><strong>{alert["title"]}</strong>: {alert["message"]}</div>'
            alerts_html += "</div>"
        
        # Générer le tableau des services
        services_table = ""
        for service, status in overview['system_health']['services'].items():
            status_class = "status-healthy" if "healthy" in str(status) else "status-degraded"
            services_table += f'<tr><td>{service}</td><td class="{status_class}">{status}</td></tr>'
        
        # Générer le tableau des circuit breakers
        circuit_breakers = CircuitBreakerManager.get_all_stats()
        circuit_breakers_table = ""
        for cb_name, cb_info in circuit_breakers.items():
            state = cb_info.get('state', 'unknown')
            state_class = "status-healthy" if state == "closed" else "status-degraded"
            failure_count = cb_info.get('failure_count', 0)
            circuit_breakers_table += f'<tr><td>{cb_name}</td><td class="{state_class}">{state}</td><td>{failure_count}</td></tr>'
        
        # Générer le tableau des endpoints
        endpoints_table = ""
        for endpoint, metrics in detailed['api_metrics']['endpoints'].items():
            total = metrics['total_requests']
            success = metrics['success_requests']
            errors = metrics['error_requests']
            success_rate = round((success / max(total, 1)) * 100, 1)
            endpoints_table += f'<tr><td>{endpoint}</td><td>{total}</td><td>{success}</td><td>{errors}</td><td>{success_rate}%</td></tr>'
        
        # Remplacer les variables dans le template
        return html_template.format(
            overall_status=overview['system_health']['overall_status'],
            overall_status_text=overview['system_health']['overall_status'].title(),
            timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            alerts_html=alerts_html,
            total_requests=overview['performance']['total_requests'],
            avg_response_time=overview['performance']['avg_response_time'],
            error_rate=overview['performance']['error_rate'],
            cache_hit_rate=overview['performance']['cache_hit_rate'],
            services_table=services_table,
            circuit_breakers_table=circuit_breakers_table,
            endpoints_table=endpoints_table
        )


class DashboardView(APIView):
    """
    Vue pour afficher le dashboard de monitoring
    """
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Affiche le dashboard HTML"""
        try:
            html_content = MonitoringDashboard.generate_html_dashboard()
            return HttpResponse(html_content, content_type='text/html')
        except Exception as e:
            logger.error(f"Error generating dashboard: {e}")
            return HttpResponse(
                f"<h1>Erreur Dashboard</h1><p>Impossible de générer le dashboard: {e}</p>",
                content_type='text/html',
                status=500
            )


class DashboardAPIView(APIView):
    """
    API JSON pour le dashboard de monitoring
    """
    permission_classes = [permissions.IsAdminUser]
    
    @extend_schema(
        summary="Données du dashboard de monitoring",
        description="Retourne toutes les données nécessaires pour construire un dashboard de monitoring",
        tags=['Monitoring']
    )
    def get(self, request):
        """Retourne les données JSON du dashboard"""
        try:
            window_minutes = int(request.query_params.get('window', 60))
            
            dashboard_data = {
                'overview': MonitoringDashboard.get_system_overview(),
                'detailed_metrics': MonitoringDashboard.get_detailed_metrics(window_minutes),
                'alerts': MonitoringDashboard.get_alert_conditions(),
                'circuit_breakers': CircuitBreakerManager.get_all_stats(),
                'connections': ConnectionManager.get_connection_stats()
            }
            
            return Response(dashboard_data)
            
        except Exception as e:
            logger.error(f"Error retrieving dashboard data: {e}")
            return Response(
                {'error': 'Failed to retrieve dashboard data', 'details': str(e)},
                status=500
            )