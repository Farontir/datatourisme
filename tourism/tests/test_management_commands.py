"""
Tests for Django management commands
"""
import json
import tempfile
from io import StringIO
from unittest.mock import Mock, patch, mock_open
from django.test import TestCase, override_settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.contrib.gis.geos import Point
from tourism.models import TouristicResource
from tourism.management.commands.import_jsonld import Command as ImportCommand
from tourism.management.commands.cache_clear import Command as CacheClearCommand
from tourism.management.commands.cache_stats import Command as CacheStatsCommand
from tourism.management.commands.elasticsearch_setup import Command as ElasticsearchSetupCommand
from tourism.management.commands.check_data_quality import Command as DataQualityCommand


class ImportJsonLdCommandTests(TestCase):
    """Tests for import_jsonld management command"""
    
    def setUp(self):
        self.sample_jsonld = {
            "@id": "test-resource-1",
            "@type": ["PlaceOfInterest"],
            "rdfs:label": {"fr": "Test Resource"},
            "rdfs:comment": {"fr": "Test description"},
            "schema:geo": {
                "schema:latitude": 48.8566,
                "schema:longitude": 2.3522
            }
        }
    
    def test_import_from_file_success(self):
        """Test successful import from JSON-LD file"""
        # Create temporary file with JSON-LD data
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            json.dump(self.sample_jsonld, temp_file)
            temp_file_path = temp_file.name
        
        # Capture command output
        out = StringIO()
        
        try:
            call_command('import_jsonld', temp_file_path, stdout=out)
            
            # Check that resource was created
            self.assertTrue(TouristicResource.objects.filter(resource_id='test-resource-1').exists())
            
            # Check command output
            output = out.getvalue()
            self.assertIn('Successfully imported', output)
            
        finally:
            # Clean up temporary file
            import os
            os.unlink(temp_file_path)
    
    def test_import_from_directory(self):
        """Test import from directory containing JSON-LD files"""
        import tempfile
        import os
        
        # Create temporary directory with JSON-LD files
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create multiple JSON-LD files
            for i in range(3):
                sample_data = {
                    "@id": f"test-resource-{i+1}",
                    "@type": ["PlaceOfInterest"],
                    "rdfs:label": {"fr": f"Test Resource {i+1}"},
                    "rdfs:comment": {"fr": f"Test description {i+1}"}
                }
                
                file_path = os.path.join(temp_dir, f"resource_{i+1}.json")
                with open(file_path, 'w') as f:
                    json.dump(sample_data, f)
            
            # Import from directory
            out = StringIO()
            call_command('import_jsonld', temp_dir, stdout=out)
            
            # Check that all resources were created
            self.assertEqual(TouristicResource.objects.count(), 3)
            
            # Check command output
            output = out.getvalue()
            self.assertIn('3 resources processed', output)
    
    def test_import_invalid_json(self):
        """Test import with invalid JSON file"""
        # Create temporary file with invalid JSON
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            temp_file.write('{"invalid": json}')  # Invalid JSON
            temp_file_path = temp_file.name
        
        try:
            with self.assertRaises(CommandError):
                call_command('import_jsonld', temp_file_path)
        finally:
            import os
            os.unlink(temp_file_path)
    
    def test_import_missing_file(self):
        """Test import with non-existent file"""
        with self.assertRaises(CommandError):
            call_command('import_jsonld', '/non/existent/file.json')
    
    def test_import_with_options(self):
        """Test import command with various options"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            json.dump(self.sample_jsonld, temp_file)
            temp_file_path = temp_file.name
        
        try:
            out = StringIO()
            call_command(
                'import_jsonld', 
                temp_file_path,
                '--batch-size', '50',
                '--max-workers', '2',
                '--force',
                stdout=out
            )
            
            # Check that resource was created
            self.assertTrue(TouristicResource.objects.filter(resource_id='test-resource-1').exists())
            
        finally:
            import os
            os.unlink(temp_file_path)
    
    @patch('tourism.management.commands.import_jsonld.JsonLdImportService')
    def test_import_with_service_error(self, mock_service_class):
        """Test import command handling service errors"""
        mock_service = Mock()
        mock_service.import_resource.side_effect = Exception("Import failed")
        mock_service_class.return_value = mock_service
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            json.dump(self.sample_jsonld, temp_file)
            temp_file_path = temp_file.name
        
        try:
            with self.assertRaises(CommandError):
                call_command('import_jsonld', temp_file_path)
        finally:
            import os
            os.unlink(temp_file_path)


class CacheClearCommandTests(TestCase):
    """Tests for cache_clear management command"""
    
    @patch('tourism.management.commands.cache_clear.CacheService')
    def test_clear_all_cache(self, mock_cache_service):
        """Test clearing all cache"""
        mock_cache_service.clear_all.return_value = True
        
        out = StringIO()
        call_command('cache_clear', '--all', stdout=out)
        
        mock_cache_service.clear_all.assert_called_once()
        output = out.getvalue()
        self.assertIn('All cache cleared successfully', output)
    
    @patch('tourism.management.commands.cache_clear.CacheService')
    def test_clear_specific_cache_types(self, mock_cache_service):
        """Test clearing specific cache types"""
        mock_cache_service.clear_by_pattern.return_value = 5  # 5 keys cleared
        
        out = StringIO()
        call_command('cache_clear', '--types', 'resources,search', stdout=out)
        
        # Should be called twice (once for each type)
        self.assertEqual(mock_cache_service.clear_by_pattern.call_count, 2)
        
        output = out.getvalue()
        self.assertIn('Cleared', output)
    
    @patch('tourism.management.commands.cache_clear.CacheService')
    def test_clear_cache_with_pattern(self, mock_cache_service):
        """Test clearing cache with custom pattern"""
        mock_cache_service.clear_by_pattern.return_value = 3
        
        out = StringIO()
        call_command('cache_clear', '--pattern', 'tourism:api:*', stdout=out)
        
        mock_cache_service.clear_by_pattern.assert_called_once_with('tourism:api:*')
        
        output = out.getvalue()
        self.assertIn('3 keys cleared', output)
    
    @patch('tourism.management.commands.cache_clear.CacheService')
    def test_clear_cache_error_handling(self, mock_cache_service):
        """Test cache clear error handling"""
        mock_cache_service.clear_all.side_effect = Exception("Cache error")
        
        with self.assertRaises(CommandError):
            call_command('cache_clear', '--all')


class CacheStatsCommandTests(TestCase):
    """Tests for cache_stats management command"""
    
    @patch('tourism.management.commands.cache_stats.CacheService')
    def test_cache_stats_display(self, mock_cache_service):
        """Test cache statistics display"""
        mock_cache_service.get_stats.return_value = {
            'total_keys': 150,
            'memory_usage': '25.6 MB',
            'hit_rate': 87.5,
            'by_type': {
                'resources': 45,
                'search': 32,
                'api': 73
            }
        }
        
        out = StringIO()
        call_command('cache_stats', stdout=out)
        
        output = out.getvalue()
        self.assertIn('Total keys: 150', output)
        self.assertIn('Memory usage: 25.6 MB', output)
        self.assertIn('Hit rate: 87.5%', output)
        self.assertIn('resources: 45', output)
    
    @patch('tourism.management.commands.cache_stats.CacheService')
    def test_cache_stats_json_output(self, mock_cache_service):
        """Test cache statistics JSON output"""
        mock_stats = {
            'total_keys': 150,
            'memory_usage': '25.6 MB',
            'hit_rate': 87.5
        }
        mock_cache_service.get_stats.return_value = mock_stats
        
        out = StringIO()
        call_command('cache_stats', '--json', stdout=out)
        
        output = out.getvalue()
        self.assertIn('"total_keys": 150', output)
        self.assertIn('"hit_rate": 87.5', output)
    
    @patch('tourism.management.commands.cache_stats.CacheService')
    def test_cache_stats_detailed(self, mock_cache_service):
        """Test detailed cache statistics"""
        mock_cache_service.get_detailed_stats.return_value = {
            'total_keys': 150,
            'memory_usage': '25.6 MB',
            'connections': {
                'active': 5,
                'idle': 10
            },
            'performance': {
                'avg_response_time': 2.3,
                'slow_queries': 3
            }
        }
        
        out = StringIO()
        call_command('cache_stats', '--detailed', stdout=out)
        
        output = out.getvalue()
        self.assertIn('Active connections: 5', output)
        self.assertIn('Average response time: 2.3ms', output)


class ElasticsearchSetupCommandTests(TestCase):
    """Tests for elasticsearch_setup management command"""
    
    @patch('tourism.management.commands.elasticsearch_setup.connections')
    def test_elasticsearch_setup_success(self, mock_connections):
        """Test successful Elasticsearch setup"""
        mock_es = Mock()
        mock_es.ping.return_value = True
        mock_es.indices.exists.return_value = False
        mock_connections.get_connection.return_value = mock_es
        
        out = StringIO()
        call_command('elasticsearch_setup', stdout=out)
        
        output = out.getvalue()
        self.assertIn('Elasticsearch connection successful', output)
        self.assertIn('Index created successfully', output)
    
    @patch('tourism.management.commands.elasticsearch_setup.connections')
    def test_elasticsearch_setup_connection_error(self, mock_connections):
        """Test Elasticsearch setup with connection error"""
        mock_connections.get_connection.side_effect = ConnectionError("Connection failed")
        
        with self.assertRaises(CommandError):
            call_command('elasticsearch_setup')
    
    @patch('tourism.management.commands.elasticsearch_setup.connections')
    @patch('tourism.management.commands.elasticsearch_setup.call_command')
    def test_elasticsearch_setup_with_reindex(self, mock_call_command, mock_connections):
        """Test Elasticsearch setup with reindexing"""
        mock_es = Mock()
        mock_es.ping.return_value = True
        mock_es.indices.exists.return_value = True
        mock_connections.get_connection.return_value = mock_es
        
        out = StringIO()
        call_command('elasticsearch_setup', '--reindex', stdout=out)
        
        # Should call the search_index command for reindexing
        mock_call_command.assert_called_with('search_index', '--rebuild', '-f')
        
        output = out.getvalue()
        self.assertIn('Reindexing completed', output)
    
    @patch('tourism.management.commands.elasticsearch_setup.registry')
    def test_elasticsearch_setup_create_index(self, mock_registry):
        """Test Elasticsearch index creation"""
        mock_document = Mock()
        mock_registry.get_documents.return_value = [mock_document]
        
        out = StringIO()
        call_command('elasticsearch_setup', '--create-index', stdout=out)
        
        output = out.getvalue()
        self.assertIn('Creating Elasticsearch index', output)


class DataQualityCommandTests(TestCase):
    """Tests for check_data_quality management command"""
    
    def setUp(self):
        # Create test resources with various quality issues
        self.good_resource = TouristicResource.objects.create(
            resource_id='good-resource',
            name={'fr': 'Good Resource'},
            description={'fr': 'Good description with enough content'},
            location=Point(2.3522, 48.8566),
            city='Paris',
            resource_types=['PlaceOfInterest'],
            is_active=True
        )
        
        self.bad_resource = TouristicResource.objects.create(
            resource_id='bad-resource',
            name={'fr': 'Bad'},  # Too short
            description={'fr': ''},  # Empty description
            location=None,  # No location
            city='',  # Empty city
            resource_types=[],  # No types
            is_active=True
        )
    
    def test_data_quality_check(self):
        """Test data quality check"""
        out = StringIO()
        call_command('check_data_quality', stdout=out)
        
        output = out.getvalue()
        self.assertIn('Data Quality Report', output)
        self.assertIn('Total resources checked:', output)
        self.assertIn('Issues found:', output)
    
    def test_data_quality_check_with_details(self):
        """Test data quality check with detailed output"""
        out = StringIO()
        call_command('check_data_quality', '--detailed', stdout=out)
        
        output = out.getvalue()
        self.assertIn('DETAILED ISSUES', output)
        self.assertIn('bad-resource', output)  # Should mention the bad resource
    
    def test_data_quality_check_specific_checks(self):
        """Test data quality check with specific validation types"""
        out = StringIO()
        call_command('check_data_quality', '--checks', 'location,description', stdout=out)
        
        output = out.getvalue()
        self.assertIn('Running specific checks:', output)
    
    def test_data_quality_check_json_output(self):
        """Test data quality check with JSON output"""
        out = StringIO()
        call_command('check_data_quality', '--json', stdout=out)
        
        output = out.getvalue()
        # Should be valid JSON
        try:
            json.loads(output)
        except json.JSONDecodeError:
            self.fail("Output should be valid JSON")
    
    def test_data_quality_check_export_csv(self):
        """Test data quality check with CSV export"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
            temp_file_path = temp_file.name
        
        try:
            out = StringIO()
            call_command('check_data_quality', '--export-csv', temp_file_path, stdout=out)
            
            output = out.getvalue()
            self.assertIn(f'Results exported to {temp_file_path}', output)
            
            # Check that file was created and has content
            import os
            self.assertTrue(os.path.exists(temp_file_path))
            self.assertGreater(os.path.getsize(temp_file_path), 0)
            
        finally:
            import os
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)


class GeneralManagementCommandTests(TestCase):
    """General tests for management command infrastructure"""
    
    def test_command_help_output(self):
        """Test that commands provide helpful output"""
        commands = [
            'import_jsonld',
            'cache_clear',
            'cache_stats',
            'elasticsearch_setup',
            'check_data_quality'
        ]
        
        for command in commands:
            with self.subTest(command=command):
                out = StringIO()
                try:
                    call_command(command, '--help', stdout=out)
                    output = out.getvalue()
                    self.assertIn('usage:', output.lower())
                except SystemExit:
                    # --help causes SystemExit, which is expected
                    pass
    
    def test_command_error_handling(self):
        """Test command error handling"""
        # Test commands with invalid arguments
        with self.assertRaises(SystemExit):
            call_command('import_jsonld', '--invalid-option')
    
    @patch('tourism.management.commands.cache_stats.CacheService')
    def test_command_verbosity_levels(self, mock_cache_service):
        """Test command verbosity levels"""
        mock_cache_service.get_stats.return_value = {'total_keys': 10}
        
        # Test different verbosity levels
        for verbosity in [0, 1, 2]:
            with self.subTest(verbosity=verbosity):
                out = StringIO()
                call_command('cache_stats', verbosity=verbosity, stdout=out)
                # Higher verbosity should produce more output
                output = out.getvalue()
                if verbosity > 0:
                    self.assertGreater(len(output), 0)


class CommandUtilityTests(TestCase):
    """Tests for command utility functions"""
    
    def test_import_command_file_validation(self):
        """Test import command file validation"""
        command = ImportCommand()
        
        # Test valid file extensions
        self.assertTrue(command._is_valid_file('test.json'))
        self.assertTrue(command._is_valid_file('test.jsonld'))
        
        # Test invalid file extensions
        self.assertFalse(command._is_valid_file('test.txt'))
        self.assertFalse(command._is_valid_file('test.xml'))
    
    def test_cache_clear_pattern_validation(self):
        """Test cache clear pattern validation"""
        command = CacheClearCommand()
        
        # Test valid patterns
        self.assertTrue(command._is_valid_pattern('tourism:*'))
        self.assertTrue(command._is_valid_pattern('cache:api:*'))
        
        # Test invalid patterns (if any validation exists)
        # This depends on the actual implementation
    
    @patch('tourism.management.commands.elasticsearch_setup.connections')
    def test_elasticsearch_health_check(self, mock_connections):
        """Test Elasticsearch health check utility"""
        command = ElasticsearchSetupCommand()
        
        # Mock healthy Elasticsearch
        mock_es = Mock()
        mock_es.ping.return_value = True
        mock_es.cluster.health.return_value = {'status': 'green'}
        mock_connections.get_connection.return_value = mock_es
        
        health = command._check_elasticsearch_health()
        self.assertTrue(health['available'])
        self.assertEqual(health['status'], 'green')
        
        # Mock unhealthy Elasticsearch
        mock_es.ping.return_value = False
        health = command._check_elasticsearch_health()
        self.assertFalse(health['available'])