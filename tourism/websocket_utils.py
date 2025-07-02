"""
Utilitaires pour les WebSockets - envoi de notifications en temps réel
"""
import json
import asyncio
from typing import Dict, Any, List, Optional
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class WebSocketNotifier:
    """Classe pour envoyer des notifications WebSocket"""
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
    
    def send_notification(self, category: str, title: str, message: str, 
                         data: Optional[Dict] = None, target_groups: Optional[List[str]] = None):
        """
        Envoie une notification via WebSocket
        
        Args:
            category: Catégorie de notification
            title: Titre de la notification
            message: Message de la notification
            data: Données supplémentaires
            target_groups: Groupes cibles (par défaut: notifications générales)
        """
        if not self.channel_layer:
            logger.warning("Channel layer non configuré, notification ignorée")
            return
        
        notification_data = {
            'type': 'notification_message',
            'category': category,
            'title': title,
            'message': message,
            'data': data or {},
            'timestamp': timezone.now().isoformat()
        }
        
        # Groupes par défaut
        if not target_groups:
            target_groups = ['notifications_general', f'notifications_{category}']
        
        # Envoyer à tous les groupes cibles
        for group in target_groups:
            try:
                async_to_sync(self.channel_layer.group_send)(
                    group,
                    notification_data
                )
                logger.debug(f"Notification envoyée au groupe {group}: {title}")
            except Exception as e:
                logger.error(f"Erreur envoi notification au groupe {group}: {e}")
    
    def send_resource_update(self, resource_id: str, event_type: str, 
                           resource_data: Optional[Dict] = None, changes: Optional[Dict] = None):
        """
        Notifie une mise à jour de ressource
        
        Args:
            resource_id: ID de la ressource
            event_type: Type d'événement (created, updated, deleted)
            resource_data: Données de la ressource
            changes: Changements effectués (pour les mises à jour)
        """
        if not self.channel_layer:
            return
        
        event_data = {
            'type': f'resource_{event_type}',
            'resource_id': resource_id,
            'timestamp': timezone.now().isoformat()
        }
        
        if resource_data:
            event_data['resource'] = resource_data
        
        if changes:
            event_data['changes'] = changes
        
        # Envoyer aux groupes concernés
        groups = ['resource_updates', f'resource_{resource_id}']
        
        for group in groups:
            try:
                async_to_sync(self.channel_layer.group_send)(
                    group,
                    event_data
                )
                logger.debug(f"Mise à jour ressource envoyée au groupe {group}")
            except Exception as e:
                logger.error(f"Erreur envoi mise à jour ressource au groupe {group}: {e}")
    
    def send_analytics_update(self, analytics_data: Dict):
        """
        Envoie une mise à jour des analytics
        
        Args:
            analytics_data: Données d'analytics
        """
        if not self.channel_layer:
            return
        
        try:
            async_to_sync(self.channel_layer.group_send)(
                'analytics_realtime',
                {
                    'type': 'analytics_update',
                    'data': analytics_data,
                    'timestamp': timezone.now().isoformat()
                }
            )
            logger.debug("Mise à jour analytics envoyée")
        except Exception as e:
            logger.error(f"Erreur envoi analytics: {e}")
    
    def send_cache_stats_update(self, cache_stats: Dict):
        """
        Envoie une mise à jour des statistiques de cache
        
        Args:
            cache_stats: Statistiques du cache
        """
        if not self.channel_layer:
            return
        
        try:
            async_to_sync(self.channel_layer.group_send)(
                'analytics_realtime',
                {
                    'type': 'analytics_update',
                    'data': {
                        'cache_stats': cache_stats,
                        'type': 'cache_update'
                    },
                    'timestamp': timezone.now().isoformat()
                }
            )
            logger.debug("Statistiques cache envoyées")
        except Exception as e:
            logger.error(f"Erreur envoi stats cache: {e}")


# Instance globale du notifier
websocket_notifier = WebSocketNotifier()


def notify_resource_created(resource_id: str, resource_data: Dict):
    """Notifie la création d'une ressource"""
    websocket_notifier.send_resource_update(
        resource_id=resource_id,
        event_type='created',
        resource_data=resource_data
    )
    
    websocket_notifier.send_notification(
        category='resources',
        title='Nouvelle ressource créée',
        message=f'La ressource {resource_data.get("name", resource_id)} a été créée',
        data={'resource_id': resource_id}
    )


def notify_resource_updated(resource_id: str, changes: Dict, resource_data: Optional[Dict] = None):
    """Notifie la mise à jour d'une ressource"""
    websocket_notifier.send_resource_update(
        resource_id=resource_id,
        event_type='updated',
        resource_data=resource_data,
        changes=changes
    )
    
    # Notification si changements importants
    important_fields = ['name', 'description', 'location', 'is_active']
    important_changes = {k: v for k, v in changes.items() if k in important_fields}
    
    if important_changes:
        websocket_notifier.send_notification(
            category='resources',
            title='Ressource mise à jour',
            message=f'La ressource {resource_id} a été modifiée',
            data={
                'resource_id': resource_id,
                'changes': important_changes
            }
        )


def notify_resource_deleted(resource_id: str):
    """Notifie la suppression d'une ressource"""
    websocket_notifier.send_resource_update(
        resource_id=resource_id,
        event_type='deleted'
    )
    
    websocket_notifier.send_notification(
        category='resources',
        title='Ressource supprimée',
        message=f'La ressource {resource_id} a été supprimée',
        data={'resource_id': resource_id}
    )


def notify_system_event(event_type: str, title: str, message: str, data: Optional[Dict] = None):
    """Notifie un événement système"""
    websocket_notifier.send_notification(
        category='system',
        title=title,
        message=message,
        data=data or {'event_type': event_type}
    )


def notify_cache_cleared():
    """Notifie que le cache a été vidé"""
    notify_system_event(
        event_type='cache_cleared',
        title='Cache vidé',
        message='Le cache Redis a été entièrement vidé'
    )


def notify_elasticsearch_reindexed():
    """Notifie qu'Elasticsearch a été réindexé"""
    notify_system_event(
        event_type='elasticsearch_reindexed',
        title='Réindexation terminée',
        message='La réindexation Elasticsearch est terminée'
    )


def notify_analytics_generated(analytics_type: str, data: Dict):
    """Notifie la génération de nouvelles analytics"""
    websocket_notifier.send_analytics_update(data)
    
    notify_system_event(
        event_type='analytics_generated',
        title='Analytics générées',
        message=f'Nouvelles analytics {analytics_type} disponibles',
        data=data
    )


class WebSocketHealthChecker:
    """Vérificateur de santé pour les WebSockets"""
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
    
    def check_connection(self) -> bool:
        """Vérifie si la connexion WebSocket est fonctionnelle"""
        if not self.channel_layer:
            return False
        
        try:
            # Test simple d'envoi de message
            async_to_sync(self.channel_layer.group_send)(
                'health_check',
                {
                    'type': 'health_ping',
                    'timestamp': timezone.now().isoformat()
                }
            )
            return True
        except Exception as e:
            logger.error(f"Erreur santé WebSocket: {e}")
            return False
    
    def get_status(self) -> Dict:
        """Retourne le statut des WebSockets"""
        is_healthy = self.check_connection()
        
        return {
            'websockets_enabled': self.channel_layer is not None,
            'connection_healthy': is_healthy,
            'channel_layer_backend': str(type(self.channel_layer).__name__) if self.channel_layer else None,
            'timestamp': timezone.now().isoformat()
        }


# Instance globale du vérificateur
websocket_health_checker = WebSocketHealthChecker()