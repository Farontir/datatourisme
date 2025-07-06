"""
Base test classes and mixins to standardize testing patterns.

This module consolidates common test setup and teardown patterns
that were duplicated across multiple test files.
"""
import time
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase, TransactionTestCase
from django.core.cache import cache
from django.contrib.auth.models import User
from django.utils import timezone
from tourism.models import TouristicResource, Category, ResourceType


class BaseTestCase(TestCase):
    """
    Base test case with common setup patterns.
    
    Consolidates the setUp/tearDown patterns found across:
    - test_cache.py
    - test_security.py  
    - test_metrics.py
    - test_elasticsearch.py
    """
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data once for the entire test class."""
        # Create test categories
        cls.category = Category.objects.create(
            name={'fr': 'Test Category', 'en': 'Test Category'},
            dc_identifier='test-category'
        )
        
        # Create test resource types
        cls.resource_type = ResourceType.objects.create(
            name={'fr': 'Test Type', 'en': 'Test Type'},
            dc_identifier='test-type'
        )
        
        # Create test user
        cls.test_user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def setUp(self):
        """Set up for each test method."""
        # Clear cache before each test
        cache.clear()
        
        # Reset time for consistent testing
        self.start_time = timezone.now()
        
        # Create a test resource
        self.test_resource = TouristicResource.objects.create(
            resource_id='test-resource-123',
            dc_identifier='test-123',
            resource_types=['TestType'],
            data={
                '@id': 'test-resource-123',
                '@type': ['TestType'],
                'rdfs:label': {'fr': 'Test Resource'},
                'rdfs:comment': {'fr': 'Test description'}
            },
            name={'fr': 'Test Resource'},
            description={'fr': 'Test description'},
            available_languages=['fr'],
            creation_date=self.start_time.date()
        )
    
    def tearDown(self):
        """Clean up after each test."""
        cache.clear()


class BaseTransactionTestCase(TransactionTestCase):
    """
    Base transaction test case for tests requiring database transactions.
    
    Used for testing services that require atomic transactions
    like JsonLdImportService.
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test class."""
        super().setUpClass()
        cls.test_data_setup()
    
    @classmethod
    def test_data_setup(cls):
        """Set up test data that can be used across transaction tests."""
        # Create minimal test data
        cls.category = Category.objects.create(
            name={'fr': 'Test Category'},
            dc_identifier='test-category'
        )
    
    def setUp(self):
        """Set up for each test."""
        cache.clear()


class CachingTestMixin:
    """
    Mixin for tests that need to verify caching behavior.
    
    Provides utilities for cache testing that were duplicated
    across cache, views, and search tests.
    """
    
    def assert_cache_hit(self, cache_key, expected_data=None):
        """Assert that cache key exists and optionally check data."""
        cached_data = cache.get(cache_key)
        self.assertIsNotNone(cached_data, f"Expected cache hit for key: {cache_key}")
        
        if expected_data is not None:
            self.assertEqual(cached_data, expected_data)
    
    def assert_cache_miss(self, cache_key):
        """Assert that cache key does not exist."""
        cached_data = cache.get(cache_key)
        self.assertIsNone(cached_data, f"Expected cache miss for key: {cache_key}")
    
    def get_cache_keys_matching(self, pattern):
        """Get all cache keys matching a pattern."""
        # This is a simplified version - in production you'd use Redis KEYS
        # For testing with dummy cache, we'll mock this
        return []
    
    def clear_cache_pattern(self, pattern):
        """Clear cache keys matching pattern."""
        cache.clear()  # Simplified for testing


class MockingTestMixin:
    """
    Mixin providing common mocking utilities.
    
    Consolidates mock setup patterns used across different tests.
    """
    
    def setUp(self):
        """Set up common mocks."""
        super().setUp()
        self.mocks = {}
    
    def mock_elasticsearch(self):
        """Mock Elasticsearch client."""
        es_mock = MagicMock()
        es_mock.search.return_value = {
            'hits': {
                'total': {'value': 0},
                'hits': []
            },
            'took': 5
        }
        
        patcher = patch('tourism.search.elasticsearch_client', es_mock)
        self.mocks['elasticsearch'] = patcher.start()
        return es_mock
    
    def mock_redis(self):
        """Mock Redis client."""
        redis_mock = MagicMock()
        redis_mock.ping.return_value = True
        
        patcher = patch('tourism.cache.redis_client', redis_mock)
        self.mocks['redis'] = patcher.start()
        return redis_mock
    
    def mock_celery(self):
        """Mock Celery tasks."""
        celery_mock = MagicMock()
        
        patcher = patch('tourism.tasks.celery_app', celery_mock)
        self.mocks['celery'] = patcher.start()
        return celery_mock
    
    def mock_websocket(self):
        """Mock WebSocket functionality."""
        ws_mock = MagicMock()
        
        patcher = patch('tourism.websocket.WebSocketManager', ws_mock)
        self.mocks['websocket'] = patcher.start()
        return ws_mock
    
    def tearDown(self):
        """Clean up mocks."""
        for patcher in self.mocks.values():
            if hasattr(patcher, 'stop'):
                patcher.stop()
        super().tearDown()


class TimingTestMixin:
    """
    Mixin for tests that need to verify timing and performance.
    
    Used by metrics and performance tests.
    """
    
    def assert_timing_within(self, operation, max_duration_ms):
        """Assert that operation completes within specified time."""
        start_time = time.time()
        operation()
        duration_ms = (time.time() - start_time) * 1000
        
        self.assertLess(
            duration_ms, 
            max_duration_ms,
            f"Operation took {duration_ms:.2f}ms, expected < {max_duration_ms}ms"
        )
    
    def time_operation(self, operation):
        """Time an operation and return duration in milliseconds."""
        start_time = time.time()
        result = operation()
        duration_ms = (time.time() - start_time) * 1000
        return result, duration_ms


class SecurityTestMixin:
    """
    Mixin for security-related testing.
    
    Provides utilities for testing security features like rate limiting,
    input validation, and malicious activity detection.
    """
    
    def create_malicious_requests(self, count=10, delay=0.1):
        """Create multiple requests to test rate limiting."""
        from django.test import RequestFactory
        
        factory = RequestFactory()
        requests = []
        
        for i in range(count):
            request = factory.get(f'/test/?attempt={i}')
            request.META['REMOTE_ADDR'] = '192.168.1.100'  # Fixed IP for testing
            requests.append(request)
            
            if delay > 0 and i < count - 1:
                time.sleep(delay)
                
        return requests
    
    def assert_rate_limited(self, response):
        """Assert that response indicates rate limiting."""
        self.assertEqual(response.status_code, 429)
        self.assertIn('rate limit', str(response.content).lower())
    
    def create_xss_payload(self):
        """Create XSS test payload."""
        return "<script>alert('xss')</script>"
    
    def create_sql_injection_payload(self):
        """Create SQL injection test payload."""
        return "'; DROP TABLE users; --"


class APITestMixin:
    """
    Mixin for API testing with consistent response validation.
    
    Provides utilities for testing REST API endpoints with
    consistent response format validation.
    """
    
    def assert_api_success(self, response, expected_status=200):
        """Assert successful API response."""
        self.assertEqual(response.status_code, expected_status)
        
        if hasattr(response, 'json'):
            data = response.json()
            self.assertTrue(data.get('success', False))
    
    def assert_api_error(self, response, expected_status=400, expected_code=None):
        """Assert API error response."""
        self.assertEqual(response.status_code, expected_status)
        
        if hasattr(response, 'json'):
            data = response.json()
            self.assertFalse(data.get('success', True))
            self.assertTrue(data.get('error', False))
            
            if expected_code:
                self.assertEqual(data.get('error_code'), expected_code)
    
    def assert_pagination_response(self, response, expected_count=None):
        """Assert paginated API response structure."""
        self.assert_api_success(response)
        
        data = response.json()
        self.assertIn('meta', data)
        self.assertIn('pagination', data['meta'])
        
        pagination = data['meta']['pagination']
        required_fields = ['current_page', 'page_size', 'total_pages', 'total_count']
        
        for field in required_fields:
            self.assertIn(field, pagination)
            
        if expected_count is not None:
            self.assertEqual(pagination['total_count'], expected_count)