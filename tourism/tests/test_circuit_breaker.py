"""
Tests pour le système de circuit breaker
"""
import time
import threading
from unittest.mock import Mock, patch
from django.test import TestCase
from ..circuit_breaker import (
    CircuitBreaker, CircuitBreakerError, CircuitState,
    CircuitBreakerManager, with_circuit_breaker, safe_call
)


class CircuitBreakerTest(TestCase):
    """Tests pour la classe CircuitBreaker"""
    
    def setUp(self):
        self.cb = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=5,
            expected_exception=ValueError,
            name="test_circuit"
        )
    
    def test_initial_state_closed(self):
        """Test que le circuit breaker commence fermé"""
        self.assertEqual(self.cb.state, CircuitState.CLOSED)
        self.assertEqual(self.cb.failure_count, 0)
    
    def test_successful_call(self):
        """Test d'un appel réussi"""
        mock_func = Mock(return_value="success")
        
        result = self.cb.call(mock_func, "arg1", kwarg1="value1")
        
        self.assertEqual(result, "success")
        mock_func.assert_called_once_with("arg1", kwarg1="value1")
        self.assertEqual(self.cb.state, CircuitState.CLOSED)
        self.assertEqual(self.cb.failure_count, 0)
    
    def test_failure_counting(self):
        """Test du comptage des échecs"""
        mock_func = Mock(side_effect=ValueError("test error"))
        
        # Premier échec
        with self.assertRaises(ValueError):
            self.cb.call(mock_func)
        self.assertEqual(self.cb.failure_count, 1)
        self.assertEqual(self.cb.state, CircuitState.CLOSED)
        
        # Deuxième échec
        with self.assertRaises(ValueError):
            self.cb.call(mock_func)
        self.assertEqual(self.cb.failure_count, 2)
        self.assertEqual(self.cb.state, CircuitState.CLOSED)
        
        # Troisième échec - circuit s'ouvre
        with self.assertRaises(ValueError):
            self.cb.call(mock_func)
        self.assertEqual(self.cb.failure_count, 3)
        self.assertEqual(self.cb.state, CircuitState.OPEN)
    
    def test_circuit_open_blocks_calls(self):
        """Test que le circuit ouvert bloque les appels"""
        # Forcer l'ouverture du circuit
        self.cb.force_open()
        
        mock_func = Mock()
        
        with self.assertRaises(CircuitBreakerError):
            self.cb.call(mock_func)
        
        # La fonction ne doit pas être appelée
        mock_func.assert_not_called()
    
    def test_half_open_recovery(self):
        """Test de la récupération en mode half-open"""
        # Forcer l'ouverture avec timeout court
        cb = CircuitBreaker(
            failure_threshold=2,
            recovery_timeout=0.1,
            name="recovery_test"
        )
        
        # Provoquer l'ouverture
        mock_failing_func = Mock(side_effect=Exception("error"))
        with self.assertRaises(Exception):
            cb.call(mock_failing_func)
        with self.assertRaises(Exception):
            cb.call(mock_failing_func)
        
        self.assertEqual(cb.state, CircuitState.OPEN)
        
        # Attendre le timeout
        time.sleep(0.2)
        
        # Premier appel après timeout - mode half-open
        mock_success_func = Mock(return_value="success")
        result = cb.call(mock_success_func)
        
        self.assertEqual(result, "success")
        self.assertEqual(cb.state, CircuitState.CLOSED)
    
    def test_unexpected_exception_not_counted(self):
        """Test qu'une exception inattendue n'est pas comptée"""
        cb = CircuitBreaker(expected_exception=ValueError)
        
        mock_func = Mock(side_effect=RuntimeError("unexpected"))
        
        with self.assertRaises(RuntimeError):
            cb.call(mock_func)
        
        # L'échec ne doit pas être compté
        self.assertEqual(cb.failure_count, 0)
        self.assertEqual(cb.state, CircuitState.CLOSED)
    
    def test_thread_safety(self):
        """Test de la thread safety"""
        results = []
        errors = []
        
        def success_func():
            time.sleep(0.01)
            return "success"
        
        def error_func():
            time.sleep(0.01)
            raise ValueError("error")
        
        def worker(func):
            try:
                result = self.cb.call(func)
                results.append(result)
            except Exception as e:
                errors.append(e)
        
        # Lancer plusieurs threads avec succès
        threads = []
        for _ in range(10):
            t = threading.Thread(target=worker, args=(success_func,))
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        # Tous les appels doivent réussir
        self.assertEqual(len(results), 10)
        self.assertEqual(len(errors), 0)
        self.assertEqual(self.cb.failure_count, 0)
    
    def test_get_stats(self):
        """Test de récupération des statistiques"""
        mock_func = Mock(return_value="success")
        
        # Quelques appels réussis
        self.cb.call(mock_func)
        self.cb.call(mock_func)
        
        stats = self.cb.get_stats()
        
        self.assertEqual(stats['name'], 'test_circuit')
        self.assertEqual(stats['state'], 'closed')
        self.assertEqual(stats['success_count'], 2)
        self.assertEqual(stats['total_calls'], 2)
        self.assertEqual(stats['success_rate'], 100.0)
    
    def test_reset(self):
        """Test de la réinitialisation"""
        # Provoquer des échecs
        mock_func = Mock(side_effect=ValueError("error"))
        
        with self.assertRaises(ValueError):
            self.cb.call(mock_func)
        
        self.assertEqual(self.cb.failure_count, 1)
        
        # Réinitialiser
        self.cb.reset()
        
        self.assertEqual(self.cb.state, CircuitState.CLOSED)
        self.assertEqual(self.cb.failure_count, 0)
        self.assertIsNone(self.cb.last_failure_time)


class CircuitBreakerManagerTest(TestCase):
    """Tests pour le gestionnaire de circuit breakers"""
    
    def test_get_circuit_breaker_singleton(self):
        """Test que le manager retourne le même circuit breaker"""
        cb1 = CircuitBreakerManager.get_circuit_breaker("test_service")
        cb2 = CircuitBreakerManager.get_circuit_breaker("test_service")
        
        self.assertIs(cb1, cb2)
    
    def test_different_names_different_instances(self):
        """Test que différents noms donnent différentes instances"""
        cb1 = CircuitBreakerManager.get_circuit_breaker("service1")
        cb2 = CircuitBreakerManager.get_circuit_breaker("service2")
        
        self.assertIsNot(cb1, cb2)
        self.assertEqual(cb1.name, "service1")
        self.assertEqual(cb2.name, "service2")
    
    def test_get_all_stats(self):
        """Test de récupération de toutes les statistiques"""
        cb1 = CircuitBreakerManager.get_circuit_breaker("service1")
        cb2 = CircuitBreakerManager.get_circuit_breaker("service2")
        
        stats = CircuitBreakerManager.get_all_stats()
        
        self.assertIn("service1", stats)
        self.assertIn("service2", stats)
        self.assertEqual(stats["service1"]["name"], "service1")
        self.assertEqual(stats["service2"]["name"], "service2")
    
    def test_reset_all(self):
        """Test de réinitialisation de tous les circuit breakers"""
        cb1 = CircuitBreakerManager.get_circuit_breaker("service1")
        cb2 = CircuitBreakerManager.get_circuit_breaker("service2")
        
        # Provoquer des échecs
        mock_func = Mock(side_effect=Exception("error"))
        
        with self.assertRaises(Exception):
            cb1.call(mock_func)
        with self.assertRaises(Exception):
            cb2.call(mock_func)
        
        self.assertEqual(cb1.failure_count, 1)
        self.assertEqual(cb2.failure_count, 1)
        
        # Réinitialiser tous
        CircuitBreakerManager.reset_all()
        
        self.assertEqual(cb1.failure_count, 0)
        self.assertEqual(cb2.failure_count, 0)


class CircuitBreakerDecoratorTest(TestCase):
    """Tests pour le décorateur circuit breaker"""
    
    def test_decorator_basic_usage(self):
        """Test d'usage basique du décorateur"""
        
        @with_circuit_breaker("test_decorator")
        def test_function(x, y=None):
            if x == "error":
                raise ValueError("test error")
            return f"result: {x}, {y}"
        
        # Test d'appel réussi
        result = test_function("success", y="param")
        self.assertEqual(result, "result: success, param")
        
        # Test d'échec
        with self.assertRaises(ValueError):
            test_function("error")
    
    def test_decorator_circuit_opening(self):
        """Test d'ouverture du circuit avec le décorateur"""
        
        @with_circuit_breaker("test_opening", failure_threshold=2)
        def failing_function():
            raise ValueError("always fails")
        
        # Premiers échecs
        with self.assertRaises(ValueError):
            failing_function()
        with self.assertRaises(ValueError):
            failing_function()
        
        # Circuit ouvert - doit lever CircuitBreakerError
        with self.assertRaises(CircuitBreakerError):
            failing_function()
    
    def test_decorator_stats_access(self):
        """Test d'accès aux statistiques via le décorateur"""
        
        @with_circuit_breaker("test_stats")
        def test_function():
            return "success"
        
        # Faire quelques appels
        test_function()
        test_function()
        
        # Accéder aux stats
        stats = test_function.get_stats()
        self.assertEqual(stats['success_count'], 2)
        self.assertEqual(stats['total_calls'], 2)


class SafeCallTest(TestCase):
    """Tests pour la fonction safe_call"""
    
    def test_safe_call_success(self):
        """Test d'appel réussi avec safe_call"""
        mock_func = Mock(return_value="success")
        
        result = safe_call(mock_func, "arg1", fallback_value="fallback", kwarg1="value1")
        
        self.assertEqual(result, "success")
        mock_func.assert_called_once_with("arg1", kwarg1="value1")
    
    def test_safe_call_with_fallback(self):
        """Test de fallback avec safe_call"""
        mock_func = Mock(side_effect=Exception("error"))
        
        result = safe_call(mock_func, fallback_value="fallback")
        
        self.assertEqual(result, "fallback")
    
    def test_safe_call_circuit_breaker_error(self):
        """Test de fallback sur CircuitBreakerError"""
        mock_func = Mock(side_effect=CircuitBreakerError("circuit open"))
        
        result = safe_call(mock_func, fallback_value="fallback")
        
        self.assertEqual(result, "fallback")
    
    def test_safe_call_none_fallback(self):
        """Test avec fallback None"""
        mock_func = Mock(side_effect=Exception("error"))
        
        result = safe_call(mock_func, fallback_value=None)
        
        self.assertIsNone(result)


class ServiceCircuitBreakersTest(TestCase):
    """Tests pour les circuit breakers de services"""
    
    def test_service_circuit_breakers_different_configs(self):
        """Test que les services ont des configurations différentes"""
        from ..circuit_breaker import ServiceCircuitBreakers
        
        redis_cb = ServiceCircuitBreakers.redis_circuit_breaker()
        es_cb = ServiceCircuitBreakers.elasticsearch_circuit_breaker()
        db_cb = ServiceCircuitBreakers.database_circuit_breaker()
        
        # Vérifier que ce sont des instances différentes
        self.assertIsNot(redis_cb, es_cb)
        self.assertIsNot(es_cb, db_cb)
        
        # Vérifier les noms
        self.assertEqual(redis_cb.name, "redis")
        self.assertEqual(es_cb.name, "elasticsearch")
        self.assertEqual(db_cb.name, "database")
        
        # Vérifier les configurations
        self.assertEqual(redis_cb.failure_threshold, 3)
        self.assertEqual(es_cb.failure_threshold, 5)
        self.assertEqual(db_cb.failure_threshold, 10)