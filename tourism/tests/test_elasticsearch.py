"""
Tests for Elasticsearch functionality
"""
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase, override_settings
from django.contrib.gis.geos import Point
from elasticsearch.exceptions import ConnectionError, RequestError, NotFoundError
from elasticsearch_dsl import Search, Document
from tourism.models import TouristicResource
from tourism.documents import TouristicResourceDocument
from tourism.search import SearchService, SearchIndexService, DatabaseSearchFallback
from tourism.circuit_breaker import CircuitBreakerError
from decimal import Decimal


@override_settings(
    ELASTICSEARCH_DSL={
        'default': {
            'hosts': ['localhost:9200']
        }
    }
)
class ElasticsearchDocumentTests(TestCase):
    """Tests for Elasticsearch document mapping"""
    
    def setUp(self):
        self.resource = TouristicResource.objects.create(
            resource_id='test-resource-1',
            name={'fr': 'Tour Eiffel', 'en': 'Eiffel Tower'},
            description={'fr': 'Monument emblématique', 'en': 'Iconic monument'},
            location=Point(2.2945, 48.8584),
            city='Paris',
            resource_types=['CulturalSite', 'PlaceOfInterest'],
            is_active=True
        )
    
    def test_document_prepare_location(self):
        """Test document location preparation"""
        doc = TouristicResourceDocument()
        location = doc.prepare_location(self.resource)
        
        self.assertIsNotNone(location)
        self.assertEqual(location['lat'], 48.8584)
        self.assertEqual(location['lon'], 2.2945)
    
    def test_document_prepare_location_none(self):
        """Test document location preparation with None location"""
        resource_no_location = TouristicResource.objects.create(
            resource_id='test-resource-2',
            name={'fr': 'Test Resource'},
            description={'fr': 'Test description'},
            is_active=True
        )
        
        doc = TouristicResourceDocument()
        location = doc.prepare_location(resource_no_location)
        
        self.assertIsNone(location)
    
    def test_document_prepare_multilingual_data(self):
        """Test document multilingual data preparation"""
        doc = TouristicResourceDocument()
        multilingual_data = doc.prepare_multilingual_data(self.resource)
        
        self.assertIn('fr', multilingual_data)
        self.assertIn('en', multilingual_data)
        self.assertEqual(multilingual_data['fr']['name'], 'Tour Eiffel')
        self.assertEqual(multilingual_data['en']['name'], 'Eiffel Tower')
    
    def test_document_prepare_name(self):
        """Test document name preparation"""
        doc = TouristicResourceDocument()
        name = doc.prepare_name(self.resource)
        
        self.assertEqual(name, 'Tour Eiffel')  # French default
    
    def test_document_prepare_description(self):
        """Test document description preparation"""
        doc = TouristicResourceDocument()
        description = doc.prepare_description(self.resource)
        
        self.assertEqual(description, 'Monument emblématique')  # French default
    
    def test_document_should_index_object(self):
        """Test document indexing conditions"""
        doc = TouristicResourceDocument()
        
        # Active resource should be indexed
        self.assertTrue(doc.should_index_object(self.resource))
        
        # Inactive resource should not be indexed
        self.resource.is_active = False
        self.assertFalse(doc.should_index_object(self.resource))


class SearchServiceTests(TestCase):
    """Tests for SearchService"""
    
    def setUp(self):
        self.resource = TouristicResource.objects.create(
            resource_id='test-resource-1',
            name={'fr': 'Tour Eiffel', 'en': 'Eiffel Tower'},
            description={'fr': 'Monument emblématique', 'en': 'Iconic monument'},
            location=Point(2.2945, 48.8584),
            city='Paris',
            resource_types=['CulturalSite', 'PlaceOfInterest'],
            is_active=True
        )
    
    @patch('tourism.search.Search')
    def test_text_search_success(self, mock_search_class):
        """Test successful text search"""
        # Mock Elasticsearch search
        mock_search = Mock()
        mock_response = Mock()
        mock_response.hits = [Mock(resource_id='test-resource-1', meta=Mock(score=1.0))]
        mock_response.hits.total.value = 1
        mock_response.took = 5
        mock_response.hits.max_score = 1.0
        mock_response.aggregations.to_dict.return_value = {
            'types': {'buckets': [{'key': 'CulturalSite', 'doc_count': 1}]}
        }
        
        mock_search.execute.return_value = mock_response
        mock_search.query.return_value = mock_search
        mock_search.sort.return_value = mock_search
        mock_search.__getitem__.return_value = mock_search
        mock_search.aggs = Mock()
        mock_search_class.return_value = mock_search
        
        # Test search
        result = SearchService.text_search('Tour Eiffel', 'fr')
        
        self.assertIsNotNone(result)
        self.assertEqual(result['total'], 1)
        self.assertEqual(result['took'], 5)
        self.assertEqual(len(result['hits']), 1)
        self.assertEqual(result['source'], 'elasticsearch')
    
    @patch('tourism.search.ServiceCircuitBreakers')
    def test_text_search_circuit_breaker_fallback(self, mock_circuit_breakers):
        """Test text search fallback when circuit breaker is open"""
        # Mock circuit breaker to raise exception
        mock_circuit_breaker = Mock()
        mock_circuit_breaker.call.side_effect = CircuitBreakerError("Service unavailable")
        mock_circuit_breakers.elasticsearch_circuit_breaker.return_value = mock_circuit_breaker
        
        # Mock database fallback
        with patch.object(DatabaseSearchFallback, 'text_search') as mock_fallback:
            mock_fallback.return_value = {
                'hits': [],
                'total': 0,
                'took': 0,
                'aggregations': {},
                'fallback': True,
                'source': 'database'
            }
            
            result = SearchService.text_search('test query')
            
            self.assertTrue(result['fallback'])
            self.assertEqual(result['source'], 'database')
            mock_fallback.assert_called_once()
    
    @patch('tourism.search.Search')
    def test_geo_search_success(self, mock_search_class):
        """Test successful geo search"""
        # Mock Elasticsearch search
        mock_search = Mock()
        mock_response = Mock()
        mock_response.hits = [Mock(
            resource_id='test-resource-1', 
            meta=Mock(score=1.0, sort=[0.5])  # 0.5 km distance
        )]
        mock_response.hits.total.value = 1
        mock_response.took = 3
        mock_response.aggregations.to_dict.return_value = {}
        
        mock_search.execute.return_value = mock_response
        mock_search.query.return_value = mock_search
        mock_search.sort.return_value = mock_search
        mock_search.__getitem__.return_value = mock_search
        mock_search.aggs = Mock()
        mock_search_class.return_value = mock_search
        
        # Test geo search
        result = SearchService.geo_search(48.8566, 2.3522, 5.0)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['total'], 1)
        self.assertEqual(result['center']['lat'], 48.8566)
        self.assertEqual(result['center']['lng'], 2.3522)
        self.assertEqual(result['radius_km'], 5.0)
    
    @patch('tourism.search.Search')
    def test_autocomplete_success(self, mock_search_class):
        """Test successful autocomplete"""
        # Mock Elasticsearch search
        mock_search = Mock()
        mock_response = Mock()
        mock_response.suggest = {
            'name_suggest': [
                {'options': [
                    {'text': 'Tour Eiffel', '_score': 1.0},
                    {'text': 'Tour Montparnasse', '_score': 0.8}
                ]}
            ]
        }
        
        mock_search.execute.return_value = mock_response
        mock_search.suggest.return_value = mock_search
        mock_search_class.return_value = mock_search
        
        # Test autocomplete
        result = SearchService.autocomplete('Tour')
        
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['text'], 'Tour Eiffel')
        self.assertEqual(result[0]['score'], 1.0)
    
    @patch('tourism.search.Search')
    def test_filter_by_type(self, mock_search_class):
        """Test filtering by resource type"""
        # Mock Elasticsearch search
        mock_search = Mock()
        mock_response = Mock()
        mock_response.hits = [Mock(resource_id='test-resource-1', meta=Mock(score=1.0))]
        mock_response.hits.total.value = 1
        mock_response.took = 2
        mock_response.aggregations.to_dict.return_value = {}
        
        mock_search.execute.return_value = mock_response
        mock_search.query.return_value = mock_search
        mock_search.sort.return_value = mock_search
        mock_search.__getitem__.return_value = mock_search
        mock_search.aggs = Mock()
        mock_search_class.return_value = mock_search
        
        # Test filter by type
        result = SearchService.filter_by_type(['CulturalSite'])
        
        self.assertIsNotNone(result)
        self.assertEqual(result['total'], 1)
        self.assertIn('filters', result)
        self.assertEqual(result['filters']['resource_types'], ['CulturalSite'])


class SearchIndexServiceTests(TestCase):
    """Tests for SearchIndexService"""
    
    def setUp(self):
        self.resource = TouristicResource.objects.create(
            resource_id='test-resource-1',
            name={'fr': 'Tour Eiffel'},
            description={'fr': 'Monument emblématique'},
            is_active=True
        )
    
    @patch('tourism.search.call_command')
    def test_reindex_all_success(self, mock_call_command):
        """Test successful reindexing"""
        result = SearchIndexService.reindex_all()
        
        self.assertTrue(result['success'])
        self.assertEqual(result['message'], 'Réindexation terminée')
        mock_call_command.assert_called_once_with('search_index', '--rebuild', '-f')
    
    @patch('tourism.search.call_command')
    def test_reindex_all_failure(self, mock_call_command):
        """Test reindexing failure"""
        mock_call_command.side_effect = Exception("Connection failed")
        
        result = SearchIndexService.reindex_all()
        
        self.assertFalse(result['success'])
        self.assertIn('Connection failed', result['error'])
    
    @patch('tourism.search.TouristicResourceDocument')
    def test_index_resource_success(self, mock_doc_class):
        """Test successful resource indexing"""
        mock_doc = Mock()
        mock_doc_class.return_value = mock_doc
        
        result = SearchIndexService.index_resource('test-resource-1')
        
        self.assertTrue(result['success'])
        self.assertIn('test-resource-1', result['message'])
        mock_doc.update.assert_called_once()
    
    def test_index_resource_not_found(self):
        """Test indexing non-existent resource"""
        result = SearchIndexService.index_resource('non-existent')
        
        self.assertFalse(result['success'])
        self.assertIn('does not exist', result['error'])
    
    @patch('tourism.search.TouristicResourceDocument')
    def test_delete_from_index_success(self, mock_doc_class):
        """Test successful deletion from index"""
        mock_doc = Mock()
        mock_doc_class.return_value = mock_doc
        
        result = SearchIndexService.delete_from_index('test-resource-1')
        
        self.assertTrue(result['success'])
        mock_doc.delete.assert_called_once_with(id='test-resource-1', ignore=404)


class DatabaseSearchFallbackTests(TestCase):
    """Tests for database search fallback"""
    
    def setUp(self):
        self.resource1 = TouristicResource.objects.create(
            resource_id='test-resource-1',
            name={'fr': 'Tour Eiffel'},
            description={'fr': 'Monument emblématique'},
            location=Point(2.2945, 48.8584),
            city='Paris',
            resource_types=['CulturalSite'],
            is_active=True
        )
        
        self.resource2 = TouristicResource.objects.create(
            resource_id='test-resource-2',
            name={'fr': 'Louvre'},
            description={'fr': 'Musée célèbre'},
            location=Point(2.3376, 48.8606),
            city='Paris',
            resource_types=['CulturalSite'],
            is_active=True
        )
    
    def test_text_search_fallback(self):
        """Test database text search fallback"""
        result = DatabaseSearchFallback.text_search('Tour', 'fr')
        
        self.assertIsNotNone(result)
        self.assertTrue(result['fallback'])
        self.assertEqual(result['source'], 'database')
        self.assertGreaterEqual(result['total'], 1)
    
    def test_geo_search_fallback(self):
        """Test database geo search fallback"""
        # Search near Eiffel Tower
        result = DatabaseSearchFallback.geo_search(48.8584, 2.2945, 1.0)
        
        self.assertIsNotNone(result)
        self.assertTrue(result['fallback'])
        self.assertEqual(result['source'], 'database')
        self.assertGreaterEqual(result['total'], 1)
        
        # Check that distance is included
        if result['hits']:
            self.assertIn('distance_km', result['hits'][0])
    
    def test_apply_filters(self):
        """Test applying filters to queryset"""
        from tourism.models import TouristicResource
        
        queryset = TouristicResource.objects.filter(is_active=True)
        
        # Test resource types filter
        filtered = DatabaseSearchFallback._apply_filters(
            queryset, 
            {'resource_types': ['CulturalSite']}
        )
        
        self.assertEqual(filtered.count(), 2)  # Both resources are CulturalSite
        
        # Test cities filter
        filtered = DatabaseSearchFallback._apply_filters(
            queryset,
            {'cities': ['Paris']}
        )
        
        self.assertEqual(filtered.count(), 2)  # Both resources are in Paris
    
    def test_format_database_hit(self):
        """Test formatting database hit"""
        hit = DatabaseSearchFallback._format_database_hit(self.resource1, 'fr')
        
        self.assertEqual(hit['resource_id'], 'test-resource-1')
        self.assertEqual(hit['name'], 'Tour Eiffel')
        self.assertEqual(hit['city'], 'Paris')
        self.assertIn('location', hit)
        self.assertEqual(hit['location']['lat'], 48.8584)
    
    def test_calculate_aggregations(self):
        """Test calculating aggregations from queryset"""
        queryset = TouristicResource.objects.filter(is_active=True)
        aggregations = DatabaseSearchFallback._calculate_aggregations(queryset)
        
        self.assertIn('types', aggregations)
        self.assertIn('cities', aggregations)
        
        # Check that CulturalSite appears in types
        type_keys = [item['key'] for item in aggregations['types']]
        self.assertIn('CulturalSite', type_keys)
        
        # Check that Paris appears in cities
        city_keys = [item['key'] for item in aggregations['cities']]
        self.assertIn('Paris', city_keys)


class ElasticsearchErrorHandlingTests(TestCase):
    """Tests for Elasticsearch error handling"""
    
    @patch('tourism.search.Search')
    def test_connection_error_fallback(self, mock_search_class):
        """Test fallback when Elasticsearch is unavailable"""
        mock_search = Mock()
        mock_search.execute.side_effect = ConnectionError("Connection failed")
        mock_search.query.return_value = mock_search
        mock_search_class.return_value = mock_search
        
        # Should fallback to database search
        with patch.object(DatabaseSearchFallback, 'text_search') as mock_fallback:
            mock_fallback.return_value = {
                'hits': [],
                'total': 0,
                'fallback': True,
                'source': 'database'
            }
            
            result = SearchService.text_search('test')
            
            self.assertTrue(result['fallback'])
            self.assertEqual(result['source'], 'database')
    
    @patch('tourism.search.Search')
    def test_request_error_handling(self, mock_search_class):
        """Test handling of Elasticsearch request errors"""
        mock_search = Mock()
        mock_search.execute.side_effect = RequestError("Bad request")
        mock_search.query.return_value = mock_search
        mock_search_class.return_value = mock_search
        
        # Should fallback to database search
        with patch.object(DatabaseSearchFallback, 'text_search') as mock_fallback:
            mock_fallback.return_value = {
                'hits': [],
                'total': 0,
                'fallback': True,
                'source': 'database'
            }
            
            result = SearchService.text_search('test')
            
            self.assertTrue(result['fallback'])


@override_settings(
    ELASTICSEARCH_DSL={
        'default': {
            'hosts': []  # No hosts to simulate unavailable ES
        }
    }
)
class ElasticsearchIntegrationTests(TestCase):
    """Integration tests for Elasticsearch functionality"""
    
    def setUp(self):
        self.resource = TouristicResource.objects.create(
            resource_id='test-resource-1',
            name={'fr': 'Tour Eiffel'},
            description={'fr': 'Monument emblématique'},
            location=Point(2.2945, 48.8584),
            city='Paris',
            resource_types=['CulturalSite'],
            is_active=True
        )
    
    def test_search_with_no_elasticsearch(self):
        """Test search functionality when Elasticsearch is not available"""
        # This should automatically fallback to database search
        result = SearchService.text_search('Tour')
        
        self.assertIsNotNone(result)
        # Should either be from ES (if available) or fallback to database
        self.assertIn('source', result)