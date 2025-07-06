"""
Tests pour l'API GraphQL Phase 2
"""
from django.test import TestCase
from django.contrib.auth.models import User
from graphene.test import Client
from tourism.models import TouristicResource, Category, ResourceType
from tourism.schema import schema
from decimal import Decimal


class GraphQLTestCase(TestCase):
    """Tests pour l'API GraphQL"""
    
    def setUp(self):
        """Configuration des tests"""
        self.client = Client(schema)
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.category = Category.objects.create(
            name={'fr': 'Test Category'},
            description={'fr': 'Test Description'}
        )
        self.resource_type = ResourceType.objects.create(
            name={'fr': 'Test Type'},
            description={'fr': 'Test Type Description'}
        )
        self.resource = TouristicResource.objects.create(
            name={'fr': 'Test Resource', 'en': 'Test Resource EN'},
            description={'fr': 'Test Resource Description', 'en': 'Test Resource Description EN'},
            latitude=Decimal('48.8566'),
            longitude=Decimal('2.3522'),
            created_by=self.user
        )
        self.resource.categories.add(self.category)
        self.resource.resource_types.add(self.resource_type)
    
    def test_query_all_resources(self):
        """Test de requête pour récupérer toutes les ressources"""
        query = '''
        query {
            allResources {
                id
                name
                description
                latitude
                longitude
                categories {
                    id
                    name
                }
                resourceTypes {
                    id
                    name
                }
            }
        }
        '''
        
        result = self.client.execute(query)
        
        # Vérifier qu'il n'y a pas d'erreurs
        self.assertIsNone(result.get('errors'))
        
        # Vérifier les données
        data = result['data']
        self.assertIsNotNone(data['allResources'])
        self.assertEqual(len(data['allResources']), 1)
        
        resource = data['allResources'][0]
        self.assertEqual(resource['name'], self.resource.name)
        self.assertEqual(resource['description'], self.resource.description)
        self.assertEqual(float(resource['latitude']), float(self.resource.latitude))
        self.assertEqual(float(resource['longitude']), float(self.resource.longitude))
    
    def test_query_resource_by_id(self):
        """Test de requête pour récupérer une ressource par ID"""
        query = '''
        query($id: ID!) {
            resource(id: $id) {
                id
                name
                description
                latitude
                longitude
            }
        }
        '''
        
        variables = {'id': str(self.resource.id)}
        result = self.client.execute(query, variables=variables)
        
        # Vérifier qu'il n'y a pas d'erreurs
        self.assertIsNone(result.get('errors'))
        
        # Vérifier les données
        data = result['data']
        self.assertIsNotNone(data['resource'])
        
        resource = data['resource']
        self.assertEqual(resource['name'], self.resource.name)
        self.assertEqual(resource['description'], self.resource.description)
    
    def test_query_resources_by_category(self):
        """Test de requête pour récupérer les ressources par catégorie"""
        query = '''
        query($categoryId: ID!) {
            resourcesByCategory(categoryId: $categoryId) {
                id
                name
                categories {
                    id
                    name
                }
            }
        }
        '''
        
        variables = {'categoryId': str(self.category.id)}
        result = self.client.execute(query, variables=variables)
        
        # Vérifier qu'il n'y a pas d'erreurs
        self.assertIsNone(result.get('errors'))
        
        # Vérifier les données
        data = result['data']
        self.assertIsNotNone(data['resourcesByCategory'])
        self.assertEqual(len(data['resourcesByCategory']), 1)
        
        resource = data['resourcesByCategory'][0]
        self.assertEqual(resource['name'], self.resource.name)
    
    def test_query_nearby_resources(self):
        """Test de requête pour récupérer les ressources à proximité"""
        query = '''
        query($lat: Float!, $lon: Float!, $radius: Float!) {
            nearbyResources(latitude: $lat, longitude: $lon, radius: $radius) {
                id
                name
                latitude
                longitude
                distance
            }
        }
        '''
        
        variables = {
            'lat': 48.8566,
            'lon': 2.3522,
            'radius': 1000.0
        }
        result = self.client.execute(query, variables=variables)
        
        # Vérifier qu'il n'y a pas d'erreurs
        self.assertIsNone(result.get('errors'))
        
        # Vérifier les données
        data = result['data']
        self.assertIsNotNone(data['nearbyResources'])
        self.assertEqual(len(data['nearbyResources']), 1)
        
        resource = data['nearbyResources'][0]
        self.assertEqual(resource['name'], self.resource.name)
        self.assertIsNotNone(resource['distance'])
    
    def test_query_search_resources(self):
        """Test de requête de recherche de ressources"""
        query = '''
        query($searchTerm: String!) {
            searchResources(query: $searchTerm) {
                id
                name
                description
                searchScore
            }
        }
        '''
        
        variables = {'searchTerm': 'Test'}
        result = self.client.execute(query, variables=variables)
        
        # Vérifier qu'il n'y a pas d'erreurs
        self.assertIsNone(result.get('errors'))
        
        # Vérifier les données
        data = result['data']
        self.assertIsNotNone(data['searchResources'])
        
        # La recherche peut être vide si Elasticsearch n'est pas configuré pour les tests
        # mais la requête ne doit pas échouer
    
    def test_query_all_categories(self):
        """Test de requête pour récupérer toutes les catégories"""
        query = '''
        query {
            allCategories {
                id
                name
                description
            }
        }
        '''
        
        result = self.client.execute(query)
        
        # Vérifier qu'il n'y a pas d'erreurs
        self.assertIsNone(result.get('errors'))
        
        # Vérifier les données
        data = result['data']
        self.assertIsNotNone(data['allCategories'])
        self.assertEqual(len(data['allCategories']), 1)
        
        category = data['allCategories'][0]
        self.assertEqual(category['name'], self.category.name)
        self.assertEqual(category['description'], self.category.description)
    
    def test_query_all_resource_types(self):
        """Test de requête pour récupérer tous les types de ressources"""
        query = '''
        query {
            allResourceTypes {
                id
                name
                description
            }
        }
        '''
        
        result = self.client.execute(query)
        
        # Vérifier qu'il n'y a pas d'erreurs
        self.assertIsNone(result.get('errors'))
        
        # Vérifier les données
        data = result['data']
        self.assertIsNotNone(data['allResourceTypes'])
        self.assertEqual(len(data['allResourceTypes']), 1)
        
        resource_type = data['allResourceTypes'][0]
        self.assertEqual(resource_type['name'], self.resource_type.name)
        self.assertEqual(resource_type['description'], self.resource_type.description)
    
    def test_invalid_query(self):
        """Test d'une requête GraphQL invalide"""
        query = '''
        query {
            nonExistentField
        }
        '''
        
        result = self.client.execute(query)
        
        # Vérifier qu'il y a des erreurs
        self.assertIsNotNone(result.get('errors'))
        self.assertTrue(len(result['errors']) > 0)