"""
Tests pour les tâches Celery Phase 2
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.cache import cache
from tourism.models import TouristicResource, Category, ResourceType
from tourism.tasks import (
    update_cache_statistics,
    cleanup_expired_data,
    reindex_elasticsearch_incremental,
    generate_daily_analytics,
    send_resource_notification
)
from decimal import Decimal


class CeleryTasksTest(TestCase):
    """Tests pour les tâches Celery"""
    
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
        
        # Vider le cache avant chaque test
        cache.clear()
    
    def test_update_cache_statistics_task(self):
        """Test de la tâche de mise à jour des statistiques du cache"""
        try:
            # Exécuter la tâche
            result = update_cache_statistics.apply()
            
            # Vérifier que la tâche s'est terminée avec succès
            self.assertEqual(result.state, 'SUCCESS')
            
            # Vérifier que le résultat contient les statistiques attendues
            self.assertIn('total_keys', result.result)
            self.assertIn('memory_usage', result.result)
            self.assertIn('hit_rate', result.result)
            
        except Exception as e:
            # Si Redis n'est pas disponible, la tâche doit échouer gracieusement
            self.assertIn('redis', str(e).lower())
    
    def test_cleanup_expired_data_task(self):
        """Test de la tâche de nettoyage des données expirées"""
        try:
            # Exécuter la tâche
            result = cleanup_expired_data.apply()
            
            # Vérifier que la tâche s'est terminée avec succès
            self.assertEqual(result.state, 'SUCCESS')
            
            # Vérifier que le résultat contient les informations de nettoyage
            self.assertIn('expired_cache_keys', result.result)
            self.assertIn('expired_sessions', result.result)
            
        except Exception as e:
            # Si Redis n'est pas disponible, la tâche doit échouer gracieusement
            self.assertIn('redis', str(e).lower())
    
    def test_reindex_elasticsearch_incremental_task(self):
        """Test de la tâche de réindexation Elasticsearch incrémentale"""
        try:
            # Exécuter la tâche
            result = reindex_elasticsearch_incremental.apply()
            
            # Vérifier que la tâche s'est terminée avec succès
            self.assertEqual(result.state, 'SUCCESS')
            
            # Vérifier que le résultat contient les informations de réindexation
            self.assertIn('indexed_resources', result.result)
            self.assertIn('total_time', result.result)
            
        except Exception as e:
            # Si Elasticsearch n'est pas disponible, la tâche doit échouer gracieusement
            self.assertIn('elasticsearch', str(e).lower())
    
    def test_generate_daily_analytics_task(self):
        """Test de la tâche de génération d'analytics quotidiennes"""
        try:
            # Exécuter la tâche
            result = generate_daily_analytics.apply()
            
            # Vérifier que la tâche s'est terminée avec succès
            self.assertEqual(result.state, 'SUCCESS')
            
            # Vérifier que le résultat contient les analytics
            self.assertIn('total_resources', result.result)
            self.assertIn('total_views', result.result)
            self.assertIn('top_categories', result.result)
            self.assertIn('cache_stats', result.result)
            
        except Exception as e:
            # Si Redis n'est pas disponible, la tâche doit échouer gracieusement
            self.assertIn('redis', str(e).lower())
    
    def test_send_resource_notification_task(self):
        """Test de la tâche d'envoi de notification de ressource"""
        try:
            # Exécuter la tâche avec notre ressource de test
            result = send_resource_notification.apply(
                args=[self.resource.id, 'created', {'user_id': self.user.id}]
            )
            
            # Vérifier que la tâche s'est terminée avec succès
            self.assertEqual(result.state, 'SUCCESS')
            
            # Vérifier que le résultat contient les informations de notification
            self.assertIn('notification_sent', result.result)
            self.assertIn('resource_id', result.result)
            self.assertIn('action', result.result)
            
        except Exception as e:
            # Si Redis/Channels n'est pas disponible, la tâche doit échouer gracieusement
            self.assertIn('redis', str(e).lower())
    
    def test_task_retry_behavior(self):
        """Test du comportement de retry des tâches"""
        # Cette tâche va échouer car l'ID n'existe pas
        result = send_resource_notification.apply(
            args=[99999, 'created', {'user_id': self.user.id}]
        )
        
        # Vérifier que la tâche a échoué
        self.assertEqual(result.state, 'FAILURE')
        
        # Vérifier que l'erreur est bien une erreur de ressource non trouvée
        self.assertIn('not found', str(result.result).lower())
    
    def test_task_parameters_validation(self):
        """Test de validation des paramètres des tâches"""
        # Test avec des paramètres invalides
        result = send_resource_notification.apply(
            args=[None, 'invalid_action', {}]
        )
        
        # Vérifier que la tâche a échoué
        self.assertEqual(result.state, 'FAILURE')
    
    def test_task_idempotency(self):
        """Test de l'idempotence des tâches"""
        # Exécuter la même tâche plusieurs fois
        result1 = generate_daily_analytics.apply()
        result2 = generate_daily_analytics.apply()
        
        # Les deux tâches doivent réussir
        self.assertEqual(result1.state, 'SUCCESS')
        self.assertEqual(result2.state, 'SUCCESS')
        
        # Les résultats doivent être similaires (même structure)
        self.assertEqual(set(result1.result.keys()), set(result2.result.keys()))