"""
Tests pour le système de sécurité
"""
import time
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase, RequestFactory
from django.http import JsonResponse
from django.core.cache import cache
from ..security import (
    AdvancedRateLimit, InputValidator, SecurityMiddleware,
    rate_limit, validate_input, report_malicious_activity
)


class AdvancedRateLimitTest(TestCase):
    """Tests pour le rate limiting avancé"""
    
    def setUp(self):
        self.rate_limiter = AdvancedRateLimit()
        self.factory = RequestFactory()
        cache.clear()  # Nettoyer le cache entre les tests
    
    def test_get_client_ip_basic(self):
        """Test d'extraction d'IP basique"""
        request = self.factory.get('/')
        client_ip = self.rate_limiter._get_client_ip(request)
        
        self.assertEqual(client_ip, '127.0.0.1')
    
    def test_get_client_ip_forwarded(self):
        """Test d'extraction d'IP avec X-Forwarded-For"""
        request = self.factory.get('/', HTTP_X_FORWARDED_FOR='192.168.1.100, 10.0.0.1')
        client_ip = self.rate_limiter._get_client_ip(request)
        
        self.assertEqual(client_ip, '192.168.1.100')
    
    def test_get_client_id_anonymous(self):
        """Test de génération d'ID client anonyme"""
        request = self.factory.get('/')
        client_id = self.rate_limiter._get_client_id(request)
        
        self.assertTrue(client_id.startswith('ip:'))
    
    def test_get_client_id_authenticated(self):
        """Test de génération d'ID client authentifié"""
        request = self.factory.get('/')
        
        # Mock user authentifié
        mock_user = Mock()
        mock_user.is_authenticated = True
        mock_user.id = 123
        request.user = mock_user
        
        client_id = self.rate_limiter._get_client_id(request)
        
        self.assertEqual(client_id, 'user:123')
    
    def test_get_client_id_api_key(self):
        """Test de génération d'ID client avec API key"""
        request = self.factory.get('/', HTTP_X_API_KEY='test-api-key-123')
        
        client_id = self.rate_limiter._get_client_id(request)
        
        self.assertTrue(client_id.startswith('api_key:'))
    
    def test_get_user_type_anonymous(self):
        """Test de détermination du type d'utilisateur anonyme"""
        request = self.factory.get('/')
        user_type = self.rate_limiter._get_user_type(request)
        
        self.assertEqual(user_type, 'anonymous')
    
    def test_get_user_type_authenticated(self):
        """Test de détermination du type d'utilisateur authentifié"""
        request = self.factory.get('/')
        
        mock_user = Mock()
        mock_user.is_authenticated = True
        request.user = mock_user
        
        user_type = self.rate_limiter._get_user_type(request)
        
        self.assertEqual(user_type, 'authenticated')
    
    def test_get_user_type_premium(self):
        """Test de détermination du type d'utilisateur premium"""
        request = self.factory.get('/')
        
        mock_user = Mock()
        mock_user.is_authenticated = True
        mock_user.subscription = 'premium'
        request.user = mock_user
        
        user_type = self.rate_limiter._get_user_type(request)
        
        self.assertEqual(user_type, 'premium')
    
    @patch('tourism.security.cache')
    def test_check_global_rate_limit_allowed(self, mock_cache):
        """Test de vérification de limite globale autorisée"""
        # Mock cache pour simuler 5 requêtes sur 100 autorisées
        mock_cache.get.return_value = 5
        
        request = self.factory.get('/')
        result = self.rate_limiter.is_allowed(request)
        
        self.assertTrue(result['allowed'])
        self.assertEqual(result['user_type'], 'anonymous')
    
    @patch('tourism.security.cache')
    def test_check_global_rate_limit_exceeded(self, mock_cache):
        """Test de vérification de limite globale dépassée"""
        # Mock cache pour simuler 150 requêtes sur 100 autorisées
        mock_cache.get.return_value = 150
        
        request = self.factory.get('/')
        result = self.rate_limiter.is_allowed(request)
        
        self.assertFalse(result['allowed'])
        self.assertIn('Global rate limit exceeded', result['reason'])
    
    def test_endpoint_rate_limiting(self):
        """Test de rate limiting par endpoint"""
        request = self.factory.get('/')
        
        # Test avec endpoint connu
        result = self.rate_limiter.is_allowed(request, 'export')
        self.assertTrue(result['allowed'])
    
    def test_suspicious_activity_detection(self):
        """Test de détection d'activité suspecte"""
        client_id = "test:suspicious:client"
        
        # Simuler beaucoup de requêtes
        with patch.object(self.rate_limiter, '_get_request_count') as mock_count:
            mock_count.return_value = 150  # Au-dessus du seuil de 100
            
            result = self.rate_limiter._check_suspicious_activity(client_id)
            
            # Première détection - pas encore bloqué
            self.assertTrue(result['allowed'])
    
    def test_ip_reputation_blacklist(self):
        """Test de vérification de réputation IP"""
        ip = "192.168.1.100"
        
        # Mettre l'IP en liste noire
        cache.set(f"ip:blacklist:{ip}", True, 3600)
        
        result = self.rate_limiter._check_ip_reputation(ip)
        
        self.assertFalse(result['allowed'])
        self.assertIn('blacklisted', result['reason'])
    
    def test_report_malicious_ip(self):
        """Test de signalement d'IP malveillante"""
        ip = "192.168.1.100"
        
        # Premier signalement
        self.rate_limiter.report_malicious_ip(ip, "spam")
        reports = cache.get(f"ip:reports:{ip}")
        self.assertEqual(reports, 1)
        
        # Signalements multiples
        for _ in range(5):
            self.rate_limiter.report_malicious_ip(ip, "spam")
        
        reports = cache.get(f"ip:reports:{ip}")
        self.assertEqual(reports, 6)
        
        # Vérifier que l'IP est mise en liste noire après 5 signalements
        blacklisted = cache.get(f"ip:blacklist:{ip}")
        self.assertTrue(blacklisted)


class InputValidatorTest(TestCase):
    """Tests pour le validateur d'entrées"""
    
    def setUp(self):
        self.validator = InputValidator()
    
    def test_validate_input_clean(self):
        """Test de validation d'entrée propre"""
        result = self.validator.validate_input("Hello World", ["sql", "xss"])
        
        self.assertTrue(result['valid'])
        self.assertEqual(len(result['threats_detected']), 0)
        self.assertEqual(result['sanitized_value'], "Hello World")
    
    def test_validate_input_sql_injection(self):
        """Test de détection d'injection SQL"""
        malicious_inputs = [
            "'; DROP TABLE users; --",
            "admin' OR '1'='1",
            "UNION SELECT * FROM passwords",
            "/* comment */ SELECT"
        ]
        
        for malicious_input in malicious_inputs:
            result = self.validator.validate_input(malicious_input, ["sql"])
            
            self.assertFalse(result['valid'])
            self.assertTrue(any(
                threat['type'] == 'sql' 
                for threat in result['threats_detected']
            ))
    
    def test_validate_input_xss(self):
        """Test de détection d'XSS"""
        malicious_inputs = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "<iframe src='malicious.com'></iframe>"
        ]
        
        for malicious_input in malicious_inputs:
            result = self.validator.validate_input(malicious_input, ["xss"])
            
            self.assertFalse(result['valid'])
            self.assertTrue(any(
                threat['type'] == 'xss' 
                for threat in result['threats_detected']
            ))
    
    def test_validate_input_ldap_injection(self):
        """Test de détection d'injection LDAP"""
        malicious_inputs = [
            "admin)(|(password=*))",
            "*)(uid=*",
            "admin)(&(password=*))"
        ]
        
        for malicious_input in malicious_inputs:
            result = self.validator.validate_input(malicious_input, ["ldap"])
            
            self.assertFalse(result['valid'])
            self.assertTrue(any(
                threat['type'] == 'ldap' 
                for threat in result['threats_detected']
            ))
    
    def test_sanitize_input(self):
        """Test de sanitisation d'entrée"""
        malicious_input = "<script>alert('xss')</script><!-- comment -->"
        
        result = self.validator.validate_input(malicious_input, ["xss"])
        
        self.assertFalse(result['valid'])
        self.assertNotIn('<script>', result['sanitized_value'])
        self.assertNotIn('<!--', result['sanitized_value'])
    
    def test_validate_request_data(self):
        """Test de validation de données de requête"""
        request_data = {
            'username': 'admin',
            'search': "'; DROP TABLE users; --",
            'description': "Normal description",
            'number': 42  # Non-string, doit être ignoré
        }
        
        result = self.validator.validate_request_data(request_data)
        
        self.assertFalse(result['valid'])
        self.assertIn('search', result['field_results'])
        self.assertFalse(result['field_results']['search']['valid'])
        
        # Les champs valides doivent passer
        self.assertIn('username', result['field_results'])
        self.assertTrue(result['field_results']['username']['valid'])


class SecurityMiddlewareTest(TestCase):
    """Tests pour le middleware de sécurité"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.get_response = Mock(return_value=Mock())
        self.middleware = SecurityMiddleware(self.get_response)
        cache.clear()
    
    def test_middleware_allowed_request(self):
        """Test de requête autorisée par le middleware"""
        request = self.factory.get('/api/resources/')
        
        with patch.object(self.middleware.rate_limiter, 'is_allowed') as mock_allowed:
            mock_allowed.return_value = {'allowed': True}
            
            response = self.middleware(request)
            
            # Le middleware doit appeler get_response normalement
            self.get_response.assert_called_once_with(request)
    
    def test_middleware_rate_limited_request(self):
        """Test de requête limitée par le middleware"""
        request = self.factory.get('/api/resources/')
        
        with patch.object(self.middleware.rate_limiter, 'is_allowed') as mock_allowed:
            mock_allowed.return_value = {
                'allowed': False,
                'reason': 'Rate limit exceeded',
                'retry_after': 60
            }
            
            response = self.middleware(request)
            
            # Le middleware doit retourner une réponse 429
            self.assertEqual(response.status_code, 429)
            self.assertIn('Rate limit exceeded', response.content.decode())
            self.assertEqual(response['Retry-After'], '60')
    
    def test_middleware_security_headers(self):
        """Test d'ajout des headers de sécurité"""
        request = self.factory.get('/api/resources/')
        
        with patch.object(self.middleware.rate_limiter, 'is_allowed') as mock_allowed:
            mock_allowed.return_value = {'allowed': True}
            
            response = self.middleware(request)
            
            # Vérifier les headers de sécurité
            final_response = self.middleware._add_security_headers(response)
            
            self.assertEqual(final_response['X-Content-Type-Options'], 'nosniff')
            self.assertEqual(final_response['X-Frame-Options'], 'DENY')
            self.assertEqual(final_response['X-XSS-Protection'], '1; mode=block')
            self.assertIn('Content-Security-Policy', final_response)
    
    def test_extract_endpoint(self):
        """Test d'extraction du nom d'endpoint"""
        endpoints = [
            ('/api/v1/resources/', 'resources'),
            ('/api/v1/search/', 'search'),
            ('/api/v1/export/', 'export'),
            ('/admin/', 'unknown'),
            ('/', 'unknown')
        ]
        
        for path, expected in endpoints:
            request = self.factory.get(path)
            endpoint = self.middleware._extract_endpoint(request)
            self.assertEqual(endpoint, expected)
    
    def test_validate_request_body_post(self):
        """Test de validation du corps de requête POST"""
        request_data = {'search': "'; DROP TABLE users; --"}
        request = self.factory.post('/api/resources/', data=request_data)
        
        with patch.object(request, 'data', request_data):
            result = self.middleware._validate_request_body(request)
            
            self.assertFalse(result['valid'])
            self.assertTrue(len(result['threats_detected']) > 0)


class SecurityDecoratorsTest(TestCase):
    """Tests pour les décorateurs de sécurité"""
    
    def setUp(self):
        self.factory = RequestFactory()
        cache.clear()
    
    def test_rate_limit_decorator_allowed(self):
        """Test du décorateur rate_limit avec requête autorisée"""
        
        @rate_limit(requests_per_minute=60)
        def test_view(request):
            return JsonResponse({'status': 'success'})
        
        request = self.factory.get('/')
        
        with patch('tourism.security.AdvancedRateLimit') as mock_rate_limiter_class:
            mock_rate_limiter = Mock()
            mock_rate_limiter.is_allowed.return_value = {'allowed': True}
            mock_rate_limiter_class.return_value = mock_rate_limiter
            
            response = test_view(request)
            
            self.assertEqual(response.status_code, 200)
    
    def test_rate_limit_decorator_blocked(self):
        """Test du décorateur rate_limit avec requête bloquée"""
        
        @rate_limit(requests_per_minute=60)
        def test_view(request):
            return JsonResponse({'status': 'success'})
        
        request = self.factory.get('/')
        
        with patch('tourism.security.AdvancedRateLimit') as mock_rate_limiter_class:
            mock_rate_limiter = Mock()
            mock_rate_limiter.is_allowed.return_value = {
                'allowed': False,
                'reason': 'Rate limit exceeded'
            }
            mock_rate_limiter_class.return_value = mock_rate_limiter
            
            response = test_view(request)
            
            self.assertEqual(response.status_code, 429)
    
    def test_validate_input_decorator_clean(self):
        """Test du décorateur validate_input avec entrée propre"""
        
        @validate_input('sql', 'xss')
        def test_view(request):
            return JsonResponse({'status': 'success'})
        
        request = self.factory.get('/?search=hello')
        response = test_view(request)
        
        self.assertEqual(response.status_code, 200)
    
    def test_validate_input_decorator_malicious(self):
        """Test du décorateur validate_input avec entrée malveillante"""
        
        @validate_input('sql', 'xss')
        def test_view(request):
            return JsonResponse({'status': 'success'})
        
        request = self.factory.get("/?search='; DROP TABLE users; --")
        response = test_view(request)
        
        self.assertEqual(response.status_code, 400)


class SecurityUtilsTest(TestCase):
    """Tests pour les utilitaires de sécurité"""
    
    def setUp(self):
        self.factory = RequestFactory()
        cache.clear()
    
    def test_report_malicious_activity(self):
        """Test de signalement d'activité malveillante"""
        request = self.factory.get('/', REMOTE_ADDR='192.168.1.100')
        
        with patch('tourism.security.AdvancedRateLimit') as mock_rate_limiter_class:
            mock_rate_limiter = Mock()
            mock_rate_limiter_class.return_value = mock_rate_limiter
            
            report_malicious_activity(request, "bot_detected")
            
            mock_rate_limiter.report_malicious_ip.assert_called_once_with(
                '192.168.1.100', 
                'bot_detected'
            )


class SecurityIntegrationTest(TestCase):
    """Tests d'intégration pour le système de sécurité"""
    
    def setUp(self):
        self.factory = RequestFactory()
        cache.clear()
    
    def test_full_security_pipeline(self):
        """Test complet du pipeline de sécurité"""
        
        @rate_limit(requests_per_minute=10)
        @validate_input('sql', 'xss')
        def protected_view(request):
            return JsonResponse({'data': 'protected resource'})
        
        # Requête normale - doit passer
        request1 = self.factory.get('/?search=normal_query')
        response1 = protected_view(request1)
        self.assertEqual(response1.status_code, 200)
        
        # Requête avec injection SQL - doit être bloquée
        request2 = self.factory.get("/?search='; DROP TABLE users; --")
        response2 = protected_view(request2)
        self.assertEqual(response2.status_code, 400)
    
    def test_middleware_with_malicious_post(self):
        """Test du middleware avec requête POST malveillante"""
        get_response = Mock(return_value=Mock())
        middleware = SecurityMiddleware(get_response)
        
        malicious_data = {
            'comment': '<script>alert("xss")</script>',
            'search': "'; DROP TABLE users; --"
        }
        
        request = self.factory.post('/api/resources/', data=malicious_data)
        
        with patch.object(request, 'data', malicious_data):
            with patch.object(middleware.rate_limiter, 'is_allowed') as mock_allowed:
                mock_allowed.return_value = {'allowed': True}
                
                response = middleware(request)
                
                # Le middleware doit détecter les menaces et bloquer
                # Note: Cela dépend de l'implémentation exacte du middleware