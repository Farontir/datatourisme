"""
Tests pour le système de cache Phase 2
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth.models import User
from tourism.models import TouristicResource, Category, ResourceType
from tourism.cache import CacheService, ResourceCacheService
from decimal import Decimal


class CacheServiceTest(TestCase):
    """Tests pour le service de cache"""
    
    def setUp(self):
        """Configuration des tests"""
        self.cache_service = CacheService()
        cache.clear()  # Vider le cache avant chaque test
    
    def test_cache_key_generation(self):
        """Test de génération des clés de cache"""
        key = self.cache_service.get_cache_key('resource', 'test_key')
        self.assertTrue(key.startswith('tourism:res:'))
        self.assertIn('test_key', key)
    
    def test_cache_set_get(self):
        """Test d'écriture et lecture du cache"""
        data = {'test': 'data'}
        key = 'test_key'
        
        # Écrire dans le cache
        self.cache_service.set('resource', key, data)
        
        # Lire depuis le cache
        cached_data = self.cache_service.get('resource', key)
        self.assertEqual(cached_data, data)
    
    def test_cache_delete(self):
        """Test de suppression du cache"""
        data = {'test': 'data'}
        key = 'test_key'
        
        # Écrire dans le cache
        self.cache_service.set('resource', key, data)
        
        # Vérifier que les données sont en cache
        self.assertIsNotNone(self.cache_service.get('resource', key))
        
        # Supprimer du cache
        self.cache_service.delete('resource', key)
        
        # Vérifier que les données ne sont plus en cache
        self.assertIsNone(self.cache_service.get('resource', key))
    
    def test_cache_invalidation(self):
        """Test d'invalidation du cache"""
        # Créer plusieurs entrées de cache
        self.cache_service.set('resource', 'key1', {'data': 1})
        self.cache_service.set('resource', 'key2', {'data': 2})
        self.cache_service.set('list', 'key1', {'data': 3})
        
        # Invalider le cache des ressources
        self.cache_service.invalidate_pattern('resource')
        
        # Vérifier que les clés ressources sont supprimées
        self.assertIsNone(self.cache_service.get('resource', 'key1'))
        self.assertIsNone(self.cache_service.get('resource', 'key2'))
        
        # Vérifier que les autres clés sont toujours là
        self.assertIsNotNone(self.cache_service.get('list', 'key1'))


class ResourceCacheServiceTest(TestCase):
    """Tests pour le service de cache des ressources"""
    
    def setUp(self):
        """Configuration des tests"""
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
            name={'fr': 'Test Resource'},
            description={'fr': 'Test Resource Description'},
            latitude=Decimal('48.8566'),
            longitude=Decimal('2.3522'),
            created_by=self.user
        )
        self.resource.categories.add(self.category)
        self.resource.resource_types.add(self.resource_type)
        
        self.cache_service = ResourceCacheService()
        cache.clear()
    
    def test_cache_resource_detail(self):
        """Test de mise en cache des détails d'une ressource"""
        # Première récupération (doit mettre en cache)
        cached_resource = self.cache_service.get_resource_detail(self.resource.id)
        self.assertIsNotNone(cached_resource)
        
        # Vérifier que les données sont correctes
        self.assertEqual(cached_resource['name'], self.resource.name)
        self.assertEqual(cached_resource['description'], self.resource.description)
    
    def test_cache_resource_list(self):
        """Test de mise en cache des listes de ressources"""
        filters = {'category': self.category.id}
        
        # Première récupération (doit mettre en cache)
        cached_list = self.cache_service.get_resource_list(filters)
        self.assertIsNotNone(cached_list)
        
        # Vérifier que la ressource est dans la liste
        self.assertEqual(len(cached_list), 1)
        self.assertEqual(cached_list[0]['id'], self.resource.id)
    
    def test_cache_invalidation_on_resource_update(self):
        """Test d'invalidation du cache lors de la mise à jour d'une ressource"""
        # Mettre en cache
        self.cache_service.get_resource_detail(self.resource.id)
        
        # Vérifier que c'est en cache
        cache_key = self.cache_service.get_cache_key('resource', str(self.resource.id))
        self.assertIsNotNone(cache.get(cache_key))
        
        # Invalider le cache pour cette ressource
        self.cache_service.invalidate_resource_cache(self.resource.id)
        
        # Vérifier que le cache est invalidé
        self.assertIsNone(cache.get(cache_key))