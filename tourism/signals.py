"""
Signaux Django pour les notifications WebSocket automatiques
"""
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.core.cache import cache
from .models import TouristicResource
from .websocket_utils import (
    notify_resource_created,
    notify_resource_updated,
    notify_resource_deleted
)
from .cache import ResourceCacheService
import logging

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=TouristicResource)
def capture_resource_changes(sender, instance, **kwargs):
    """Capture les changements avant la sauvegarde pour détection des modifications"""
    
    if instance.pk:  # Resource existante
        try:
            # Récupérer l'ancienne version
            old_instance = TouristicResource.objects.get(pk=instance.pk)
            
            # Comparer les champs importants
            changes = {}
            important_fields = [
                'name', 'description', 'city', 'address', 'location',
                'resource_types', 'categories', 'is_active'
            ]
            
            for field in important_fields:
                old_value = getattr(old_instance, field, None)
                new_value = getattr(instance, field, None)
                
                if old_value != new_value:
                    changes[field] = {
                        'old': old_value,
                        'new': new_value
                    }
            
            # Stocker les changements temporairement
            if changes:
                cache_key = f'resource_changes_{instance.pk}'
                cache.set(cache_key, changes, 300)  # 5 minutes
                logger.debug(f"Changements détectés pour ressource {instance.pk}: {list(changes.keys())}")
                
        except TouristicResource.DoesNotExist:
            # Nouvelle ressource, rien à comparer
            pass
        except Exception as e:
            logger.error(f"Erreur capture changements ressource {instance.pk}: {e}")


@receiver(post_save, sender=TouristicResource)
def notify_resource_save(sender, instance, created, **kwargs):
    """Notifie les modifications de ressources via WebSocket"""
    
    try:
        # Préparer les données de base de la ressource
        resource_data = {
            'resource_id': instance.resource_id,
            'name': instance.name,
            'description': instance.description[:200] + '...' if len(instance.description or '') > 200 else instance.description,
            'city': instance.city,
            'resource_types': instance.resource_types or [],
            'is_active': instance.is_active,
            'updated_at': instance.updated_at.isoformat()
        }
        
        if created:
            # Nouvelle ressource
            logger.info(f"Ressource créée: {instance.resource_id}")
            notify_resource_created(
                resource_id=instance.resource_id,
                resource_data=resource_data
            )
        else:
            # Ressource mise à jour
            cache_key = f'resource_changes_{instance.pk}'
            changes = cache.get(cache_key, {})
            
            if changes:
                logger.info(f"Ressource mise à jour: {instance.resource_id}, changements: {list(changes.keys())}")
                notify_resource_updated(
                    resource_id=instance.resource_id,
                    changes=changes,
                    resource_data=resource_data
                )
                
                # Nettoyer le cache temporaire
                cache.delete(cache_key)
            else:
                # Mise à jour sans changements détectés (peut-être des champs non trackés)
                logger.debug(f"Ressource sauvegardée sans changements majeurs: {instance.resource_id}")
        
        # Invalider le cache de la ressource
        ResourceCacheService.invalidate_resource(instance.resource_id)
        
        # Déclencher une tâche asynchrone pour la réindexation si nécessaire
        try:
            from .tasks import process_resource_update
            
            changes_summary = {}
            if not created:
                cache_key = f'resource_changes_{instance.pk}'
                changes_summary = cache.get(cache_key, {})
            
            # Exécuter de manière asynchrone
            process_resource_update.delay(
                resource_id=instance.resource_id,
                changes=changes_summary
            )
            
        except Exception as e:
            logger.error(f"Erreur déclenchement tâche asynchrone: {e}")
            
    except Exception as e:
        logger.error(f"Erreur notification sauvegarde ressource {instance.resource_id}: {e}")


@receiver(post_delete, sender=TouristicResource)
def notify_resource_deletion(sender, instance, **kwargs):
    """Notifie la suppression de ressources via WebSocket"""
    
    try:
        logger.info(f"Ressource supprimée: {instance.resource_id}")
        
        # Notifier via WebSocket
        notify_resource_deleted(resource_id=instance.resource_id)
        
        # Nettoyer le cache
        ResourceCacheService.invalidate_resource(instance.resource_id)
        
        # Supprimer de l'index Elasticsearch
        try:
            from .search import SearchIndexService
            SearchIndexService.delete_from_index(instance.resource_id)
        except Exception as e:
            logger.error(f"Erreur suppression index Elasticsearch: {e}")
            
    except Exception as e:
        logger.error(f"Erreur notification suppression ressource {instance.resource_id}: {e}")


# Signal personnalisé pour les événements système
from django.dispatch import Signal

# Définir des signaux personnalisés
cache_cleared = Signal()
elasticsearch_reindexed = Signal()
analytics_generated = Signal()


@receiver(cache_cleared)
def notify_cache_cleared_signal(sender, **kwargs):
    """Notifie que le cache a été vidé"""
    from .websocket_utils import notify_cache_cleared
    notify_cache_cleared()


@receiver(elasticsearch_reindexed)
def notify_elasticsearch_reindexed_signal(sender, **kwargs):
    """Notifie la réindexation Elasticsearch"""
    from .websocket_utils import notify_elasticsearch_reindexed
    notify_elasticsearch_reindexed()


@receiver(analytics_generated)
def notify_analytics_generated_signal(sender, analytics_type=None, data=None, **kwargs):
    """Notifie la génération d'analytics"""
    from .websocket_utils import notify_analytics_generated
    
    if analytics_type and data:
        notify_analytics_generated(analytics_type, data)