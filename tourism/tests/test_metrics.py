"""
Tests pour le système de métriques
"""
import time
import threading
from unittest.mock import Mock, patch
from django.test import TestCase
from django.utils import timezone
from ..metrics import (
    MetricsCollector, ApplicationMetrics, time_it, count_calls,
    MetricsExporter, get_metrics_collector
)


class MetricsCollectorTest(TestCase):
    """Tests pour le collecteur de métriques"""
    
    def setUp(self):
        self.collector = MetricsCollector(max_samples=100)
    
    def test_record_timing(self):
        """Test d'enregistrement de timing"""
        self.collector.record_timing("test.operation", 0.5, {"service": "test"})
        
        stats = self.collector.get_timing_stats("test.operation", window_minutes=60)
        
        self.assertEqual(stats['count'], 1)
        self.assertEqual(stats['total'], 0.5)
        self.assertEqual(stats['mean'], 0.5)
        self.assertEqual(stats['min'], 0.5)
        self.assertEqual(stats['max'], 0.5)
    
    def test_increment_counter(self):
        """Test d'incrémentation de compteur"""
        self.collector.increment_counter("test.counter", 5, {"type": "success"})
        self.collector.increment_counter("test.counter", 3, {"type": "success"})
        
        stats = self.collector.get_counter_stats()
        
        self.assertEqual(stats["test.counter[type=success]"], 8)
    
    def test_set_gauge(self):
        """Test de définition de gauge"""
        self.collector.set_gauge("test.gauge", 42.5, {"instance": "web1"})
        
        stats = self.collector.get_gauge_stats()
        
        self.assertEqual(stats["test.gauge[instance=web1]"], 42.5)
    
    def test_record_histogram(self):
        """Test d'enregistrement d'histogramme"""
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        
        for value in values:
            self.collector.record_histogram("test.histogram", value)
        
        stats = self.collector.get_histogram_stats("test.histogram", window_minutes=60)
        
        self.assertEqual(stats['count'], 5)
        self.assertEqual(stats['total'], 15.0)
        self.assertEqual(stats['mean'], 3.0)
        self.assertEqual(stats['min'], 1.0)
        self.assertEqual(stats['max'], 5.0)
        self.assertEqual(stats['p50'], 3.0)
    
    def test_timing_stats_window(self):
        """Test du fenêtrage temporel pour les timings"""
        # Enregistrer une métrique ancienne (simulée)
        old_timing = {
            'duration': 0.1,
            'timestamp': timezone.now() - timezone.timedelta(hours=2),
            'tags': {}
        }
        self.collector._timings["old.metric"].append(old_timing)
        
        # Enregistrer une métrique récente
        self.collector.record_timing("old.metric", 0.2)
        
        # Fenêtre de 60 minutes - seule la métrique récente doit être incluse
        stats = self.collector.get_timing_stats("old.metric", window_minutes=60)
        
        self.assertEqual(stats['count'], 1)
        self.assertEqual(stats['total'], 0.2)
    
    def test_percentile_calculation(self):
        """Test du calcul des percentiles"""
        values = list(range(1, 101))  # 1 à 100
        
        for value in values:
            self.collector.record_timing("percentile.test", value / 100.0)
        
        stats = self.collector.get_timing_stats("percentile.test", window_minutes=60)
        
        # Vérifier les percentiles approximatifs
        self.assertAlmostEqual(stats['p50'], 0.5, places=1)
        self.assertAlmostEqual(stats['p95'], 0.95, places=1)
        self.assertAlmostEqual(stats['p99'], 0.99, places=1)
    
    def test_thread_safety(self):
        """Test de la thread safety du collecteur"""
        results = []
        
        def worker():
            for i in range(100):
                self.collector.record_timing("thread.test", 0.01)
                self.collector.increment_counter("thread.counter", 1)
                results.append(i)
        
        # Lancer plusieurs threads
        threads = []
        for _ in range(5):
            t = threading.Thread(target=worker)
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        # Vérifier les résultats
        self.assertEqual(len(results), 500)  # 5 threads * 100 iterations
        
        timing_stats = self.collector.get_timing_stats("thread.test", window_minutes=60)
        counter_stats = self.collector.get_counter_stats()
        
        self.assertEqual(timing_stats['count'], 500)
        self.assertEqual(counter_stats["thread.counter"], 500)
    
    def test_get_all_stats(self):
        """Test de récupération de toutes les statistiques"""
        # Enregistrer différents types de métriques
        self.collector.record_timing("api.request", 0.1)
        self.collector.increment_counter("db.queries", 1)
        self.collector.set_gauge("memory.usage", 1024)
        self.collector.record_histogram("response.size", 2048)
        
        stats = self.collector.get_all_stats(window_minutes=60)
        
        # Vérifier la structure
        self.assertIn('timestamp', stats)
        self.assertIn('window_minutes', stats)
        self.assertIn('timings', stats)
        self.assertIn('counters', stats)
        self.assertIn('gauges', stats)
        self.assertIn('histograms', stats)
        
        # Vérifier le contenu
        self.assertIn('api.request', stats['timings'])
        self.assertIn('db.queries', stats['counters'])
        self.assertIn('memory.usage', stats['gauges'])
        self.assertIn('response.size', stats['histograms'])
    
    def test_reset_all(self):
        """Test de réinitialisation de toutes les métriques"""
        # Enregistrer des métriques
        self.collector.record_timing("test.timing", 0.1)
        self.collector.increment_counter("test.counter", 1)
        self.collector.set_gauge("test.gauge", 42)
        
        # Vérifier qu'elles existent
        self.assertTrue(len(self.collector._timings) > 0)
        self.assertTrue(len(self.collector._counters) > 0)
        self.assertTrue(len(self.collector._gauges) > 0)
        
        # Réinitialiser
        self.collector.reset_all()
        
        # Vérifier qu'elles ont été supprimées
        self.assertEqual(len(self.collector._timings), 0)
        self.assertEqual(len(self.collector._counters), 0)
        self.assertEqual(len(self.collector._gauges), 0)


class ApplicationMetricsTest(TestCase):
    """Tests pour les métriques d'application"""
    
    def setUp(self):
        # Réinitialiser les métriques avant chaque test
        get_metrics_collector().reset_all()
    
    def test_record_api_request(self):
        """Test d'enregistrement de requête API"""
        ApplicationMetrics.record_api_request(
            endpoint="/api/resources",
            method="GET",
            status_code=200,
            duration=0.150
        )
        
        collector = get_metrics_collector()
        
        # Vérifier les timings
        timing_stats = collector.get_timing_stats('api.request.duration', window_minutes=60)
        self.assertEqual(timing_stats['count'], 1)
        self.assertEqual(timing_stats['total'], 0.150)
        
        # Vérifier les compteurs
        counter_stats = collector.get_counter_stats()
        self.assertEqual(counter_stats['api.request.count[endpoint=/api/resources,method=GET,status_class=2xx,status_code=200]'], 1)
    
    def test_record_database_query(self):
        """Test d'enregistrement de requête base de données"""
        ApplicationMetrics.record_database_query("SELECT", "tourism_resource", 0.025)
        
        collector = get_metrics_collector()
        
        timing_stats = collector.get_timing_stats('database.query.duration', window_minutes=60)
        self.assertEqual(timing_stats['count'], 1)
        self.assertEqual(timing_stats['total'], 0.025)
        
        counter_stats = collector.get_counter_stats()
        self.assertEqual(counter_stats['database.query.count[operation=SELECT,table=tourism_resource]'], 1)
    
    def test_record_cache_operation(self):
        """Test d'enregistrement d'opération de cache"""
        # Cache hit
        ApplicationMetrics.record_cache_operation("GET", True, 0.001)
        
        # Cache miss
        ApplicationMetrics.record_cache_operation("GET", False, 0.005)
        
        collector = get_metrics_collector()
        counter_stats = collector.get_counter_stats()
        
        self.assertEqual(counter_stats['cache.operation.count[operation=GET,result=hit]'], 1)
        self.assertEqual(counter_stats['cache.operation.count[operation=GET,result=miss]'], 1)
    
    def test_record_search_operation(self):
        """Test d'enregistrement d'opération de recherche"""
        ApplicationMetrics.record_search_operation("text", 25, 0.150)
        
        collector = get_metrics_collector()
        
        # Vérifier timing
        timing_stats = collector.get_timing_stats('search.operation.duration', window_minutes=60)
        self.assertEqual(timing_stats['count'], 1)
        
        # Vérifier histogramme des résultats
        histogram_stats = collector.get_histogram_stats('search.results.count', window_minutes=60)
        self.assertEqual(histogram_stats['count'], 1)
        self.assertEqual(histogram_stats['total'], 25)
        
        # Vérifier compteur
        counter_stats = collector.get_counter_stats()
        self.assertEqual(counter_stats['search.operation.count[has_results=yes,search_type=text]'], 1)
    
    def test_record_import_operation(self):
        """Test d'enregistrement d'opération d'import"""
        ApplicationMetrics.record_import_operation("json_ld", 100, 5, 30.0)
        
        collector = get_metrics_collector()
        
        # Vérifier timing
        timing_stats = collector.get_timing_stats('import.operation.duration', window_minutes=60)
        self.assertEqual(timing_stats['count'], 1)
        
        # Vérifier histogrammes
        imported_stats = collector.get_histogram_stats('import.imported.count', window_minutes=60)
        self.assertEqual(imported_stats['total'], 100)
        
        error_stats = collector.get_histogram_stats('import.errors.count', window_minutes=60)
        self.assertEqual(error_stats['total'], 5)
    
    def test_set_gauge_metrics(self):
        """Test de définition de métriques gauge"""
        ApplicationMetrics.set_active_connections("redis", 10)
        ApplicationMetrics.set_memory_usage("cache", 1048576)
        
        collector = get_metrics_collector()
        gauge_stats = collector.get_gauge_stats()
        
        self.assertEqual(gauge_stats['connections.active[service=redis]'], 10)
        self.assertEqual(gauge_stats['memory.usage.bytes[component=cache]'], 1048576)


class MetricsDecoratorsTest(TestCase):
    """Tests pour les décorateurs de métriques"""
    
    def setUp(self):
        get_metrics_collector().reset_all()
    
    def test_time_it_decorator(self):
        """Test du décorateur time_it"""
        
        @time_it('test.function.duration')
        def test_function(duration=0.01):
            time.sleep(duration)
            return "success"
        
        result = test_function(0.02)
        
        self.assertEqual(result, "success")
        
        collector = get_metrics_collector()
        timing_stats = collector.get_timing_stats('test.function.duration', window_minutes=60)
        
        self.assertEqual(timing_stats['count'], 1)
        self.assertGreaterEqual(timing_stats['total'], 0.02)
    
    def test_time_it_decorator_with_error(self):
        """Test du décorateur time_it avec erreur"""
        
        @time_it('test.error.duration')
        def failing_function():
            raise ValueError("test error")
        
        with self.assertRaises(ValueError):
            failing_function()
        
        collector = get_metrics_collector()
        timing_stats = collector.get_timing_stats('test.error.duration', window_minutes=60)
        
        self.assertEqual(timing_stats['count'], 1)
        # Vérifier les tags de statut
        # Note: Le tag status=error sera inclus dans les métriques
    
    def test_count_calls_decorator(self):
        """Test du décorateur count_calls"""
        
        @count_calls('test.calls.count')
        def test_function(should_fail=False):
            if should_fail:
                raise ValueError("test error")
            return "success"
        
        # Appels réussis
        test_function()
        test_function()
        
        # Appel en échec
        with self.assertRaises(ValueError):
            test_function(should_fail=True)
        
        collector = get_metrics_collector()
        counter_stats = collector.get_counter_stats()
        
        # Vérifier les compteurs
        success_key = None
        error_key = None
        
        for key in counter_stats.keys():
            if 'test.calls.count' in key and 'status=success' in key:
                success_key = key
            elif 'test.calls.count' in key and 'status=error' in key:
                error_key = key
        
        self.assertIsNotNone(success_key)
        self.assertIsNotNone(error_key)
        self.assertEqual(counter_stats[success_key], 2)
        self.assertEqual(counter_stats[error_key], 1)


class MetricsExporterTest(TestCase):
    """Tests pour l'exporteur de métriques"""
    
    def setUp(self):
        self.collector = MetricsCollector()
        # Enregistrer quelques métriques de test
        self.collector.record_timing("api.request", 0.1)
        self.collector.increment_counter("db.queries", 5)
        self.collector.set_gauge("memory.usage", 1024)
    
    def test_to_prometheus(self):
        """Test d'export au format Prometheus"""
        # Mock du collecteur global
        with patch('tourism.metrics._global_metrics', self.collector):
            prometheus_output = MetricsExporter.to_prometheus(window_minutes=60)
        
        # Vérifier le format Prometheus
        self.assertIn('# TYPE', prometheus_output)
        self.assertIn('counter', prometheus_output)
        self.assertIn('gauge', prometheus_output)
        self.assertIn('db.queries 5', prometheus_output)
        self.assertIn('memory.usage 1024', prometheus_output)
    
    def test_to_json(self):
        """Test d'export au format JSON"""
        import json
        
        with patch('tourism.metrics._global_metrics', self.collector):
            json_output = MetricsExporter.to_json(window_minutes=60)
        
        # Vérifier que c'est du JSON valide
        data = json.loads(json_output)
        
        self.assertIn('timestamp', data)
        self.assertIn('timings', data)
        self.assertIn('counters', data)
        self.assertIn('gauges', data)
    
    def test_to_influxdb(self):
        """Test d'export au format InfluxDB"""
        with patch('tourism.metrics._global_metrics', self.collector):
            influx_lines = MetricsExporter.to_influxdb(window_minutes=60)
        
        # Vérifier le format InfluxDB line protocol
        self.assertIsInstance(influx_lines, list)
        self.assertTrue(len(influx_lines) > 0)
        
        # Vérifier qu'au moins une ligne contient les métriques attendues
        found_counter = False
        found_gauge = False
        
        for line in influx_lines:
            if 'db.queries' in line and 'type=counter' in line:
                found_counter = True
            if 'memory.usage' in line and 'type=gauge' in line:
                found_gauge = True
        
        self.assertTrue(found_counter)
        self.assertTrue(found_gauge)


class MetricsIntegrationTest(TestCase):
    """Tests d'intégration pour le système de métriques"""
    
    def test_full_metrics_workflow(self):
        """Test complet du workflow de métriques"""
        
        @time_it('integration.test.duration')
        @count_calls('integration.test.calls')
        def api_operation(success=True):
            ApplicationMetrics.record_database_query("SELECT", "test_table", 0.01)
            ApplicationMetrics.record_cache_operation("GET", success, 0.001)
            
            if success:
                return {"status": "success", "data": [1, 2, 3]}
            else:
                raise Exception("API error")
        
        # Opérations réussies
        result1 = api_operation(True)
        result2 = api_operation(True)
        
        # Opération en échec
        with self.assertRaises(Exception):
            api_operation(False)
        
        # Vérifier les métriques
        collector = get_metrics_collector()
        stats = collector.get_all_stats(window_minutes=60)
        
        # Vérifier que toutes les métriques sont présentes
        self.assertIn('integration.test.duration', stats['timings'])
        self.assertIn('database.query.duration', stats['timings'])
        self.assertIn('cache.operation.duration', stats['timings'])
        
        # Vérifier les compteurs
        counter_stats = collector.get_counter_stats()
        success_calls = sum(v for k, v in counter_stats.items() 
                          if 'integration.test.calls' in k and 'status=success' in k)
        error_calls = sum(v for k, v in counter_stats.items() 
                        if 'integration.test.calls' in k and 'status=error' in k)
        
        self.assertEqual(success_calls, 2)
        self.assertEqual(error_calls, 1)