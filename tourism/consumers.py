"""
Consumers WebSocket pour l'application tourism
"""
import json
import asyncio
from typing import Dict, Any
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from django.utils import timezone
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    """Consumer pour les notifications générales"""
    
    async def connect(self):
        """Connexion WebSocket"""
        self.user = self.scope["user"]
        self.group_name = "notifications_general"
        
        # Joindre le groupe de notifications
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Envoyer un message de bienvenue
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connexion aux notifications établie',
            'timestamp': timezone.now().isoformat()
        }))
        
        logger.info(f"Client connecté aux notifications: {self.channel_name}")
    
    async def disconnect(self, close_code):
        """Déconnexion WebSocket"""
        # Quitter le groupe
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        
        logger.info(f"Client déconnecté des notifications: {self.channel_name}")
    
    async def receive(self, text_data):
        """Réception d'un message du client"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                # Répondre au ping
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().isoformat()
                }))
            
            elif message_type == 'subscribe':
                # S'abonner à des notifications spécifiques
                categories = text_data_json.get('categories', [])
                await self.handle_subscription(categories)
            
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Format JSON invalide'
            }))
    
    async def handle_subscription(self, categories):
        """Gère l'abonnement à des catégories de notifications"""
        
        # Stocker les préférences de l'utilisateur (simplifié)
        for category in categories:
            group_name = f"notifications_{category}"
            await self.channel_layer.group_add(
                group_name,
                self.channel_name
            )
        
        await self.send(text_data=json.dumps({
            'type': 'subscription_confirmed',
            'categories': categories,
            'timestamp': timezone.now().isoformat()
        }))
    
    # Méthodes pour recevoir des messages du groupe
    async def notification_message(self, event):
        """Envoie une notification au client"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'category': event.get('category', 'general'),
            'title': event['title'],
            'message': event['message'],
            'data': event.get('data', {}),
            'timestamp': event.get('timestamp', timezone.now().isoformat())
        }))


class ResourceUpdateConsumer(AsyncWebsocketConsumer):
    """Consumer pour les mises à jour en temps réel des ressources"""
    
    async def connect(self):
        """Connexion WebSocket"""
        self.group_name = "resource_updates"
        
        # Joindre le groupe
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Envoyer les statistiques initiales
        await self.send_initial_stats()
        
        logger.info(f"Client connecté aux mises à jour de ressources: {self.channel_name}")
    
    async def disconnect(self, close_code):
        """Déconnexion WebSocket"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        
        logger.info(f"Client déconnecté des mises à jour de ressources: {self.channel_name}")
    
    async def receive(self, text_data):
        """Réception d'un message du client"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'get_stats':
                await self.send_current_stats()
            
            elif message_type == 'subscribe_resource':
                resource_id = data.get('resource_id')
                if resource_id:
                    await self.subscribe_to_resource(resource_id)
            
        except json.JSONDecodeError:
            await self.send_error("Format JSON invalide")
    
    async def send_initial_stats(self):
        """Envoie les statistiques initiales"""
        stats = await self.get_resource_stats()
        await self.send(text_data=json.dumps({
            'type': 'initial_stats',
            'data': stats,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def send_current_stats(self):
        """Envoie les statistiques actuelles"""
        stats = await self.get_resource_stats()
        await self.send(text_data=json.dumps({
            'type': 'current_stats',
            'data': stats,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def subscribe_to_resource(self, resource_id):
        """S'abonne aux mises à jour d'une ressource spécifique"""
        resource_group = f"resource_{resource_id}"
        await self.channel_layer.group_add(
            resource_group,
            self.channel_name
        )
        
        await self.send(text_data=json.dumps({
            'type': 'subscription_confirmed',
            'resource_id': resource_id,
            'timestamp': timezone.now().isoformat()
        }))
    
    @database_sync_to_async
    def get_resource_stats(self):
        """Récupère les statistiques des ressources"""
        from .models import TouristicResource
        
        try:
            total_resources = TouristicResource.objects.filter(is_active=True).count()
            
            # Nouvelles ressources aujourd'hui
            today = timezone.now().date()
            new_today = TouristicResource.objects.filter(
                created_at__date=today,
                is_active=True
            ).count()
            
            # Mises à jour récentes (dernière heure)
            one_hour_ago = timezone.now() - timedelta(hours=1)
            updated_recently = TouristicResource.objects.filter(
                updated_at__gte=one_hour_ago,
                is_active=True
            ).count()
            
            return {
                'total_resources': total_resources,
                'new_today': new_today,
                'updated_recently': updated_recently,
                'last_updated': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erreur récupération stats ressources: {e}")
            return {}
    
    async def send_error(self, message):
        """Envoie un message d'erreur"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message,
            'timestamp': timezone.now().isoformat()
        }))
    
    # Méthodes pour recevoir des messages du groupe
    async def resource_created(self, event):
        """Notification de création de ressource"""
        await self.send(text_data=json.dumps({
            'type': 'resource_created',
            'resource': event['resource'],
            'timestamp': event.get('timestamp', timezone.now().isoformat())
        }))
    
    async def resource_updated(self, event):
        """Notification de mise à jour de ressource"""
        await self.send(text_data=json.dumps({
            'type': 'resource_updated',
            'resource_id': event['resource_id'],
            'changes': event.get('changes', {}),
            'timestamp': event.get('timestamp', timezone.now().isoformat())
        }))
    
    async def resource_deleted(self, event):
        """Notification de suppression de ressource"""
        await self.send(text_data=json.dumps({
            'type': 'resource_deleted',
            'resource_id': event['resource_id'],
            'timestamp': event.get('timestamp', timezone.now().isoformat())
        }))


class AnalyticsConsumer(AsyncWebsocketConsumer):
    """Consumer pour les analytics en temps réel"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.analytics_task = None
    
    async def connect(self):
        """Connexion WebSocket"""
        self.group_name = "analytics_realtime"
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Démarrer l'envoi périodique des analytics
        self.analytics_task = asyncio.create_task(self.send_periodic_analytics())
        
        logger.info(f"Client connecté aux analytics: {self.channel_name}")
    
    async def disconnect(self, close_code):
        """Déconnexion WebSocket"""
        # Annuler la tâche périodique
        if self.analytics_task:
            self.analytics_task.cancel()
        
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        
        logger.info(f"Client déconnecté des analytics: {self.channel_name}")
    
    async def receive(self, text_data):
        """Réception d'un message du client"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'get_cache_stats':
                await self.send_cache_stats()
            
            elif message_type == 'get_search_stats':
                await self.send_search_stats()
            
        except json.JSONDecodeError:
            await self.send_error("Format JSON invalide")
    
    async def send_periodic_analytics(self):
        """Envoie les analytics de manière périodique"""
        try:
            while True:
                await asyncio.sleep(30)  # Toutes les 30 secondes
                
                analytics = await self.get_current_analytics()
                await self.send(text_data=json.dumps({
                    'type': 'periodic_analytics',
                    'data': analytics,
                    'timestamp': timezone.now().isoformat()
                }))
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Erreur analytics périodiques: {e}")
    
    async def send_cache_stats(self):
        """Envoie les statistiques du cache"""
        stats = await self.get_cache_stats()
        await self.send(text_data=json.dumps({
            'type': 'cache_stats',
            'data': stats,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def send_search_stats(self):
        """Envoie les statistiques de recherche"""
        stats = await self.get_search_stats()
        await self.send(text_data=json.dumps({
            'type': 'search_stats',
            'data': stats,
            'timestamp': timezone.now().isoformat()
        }))
    
    @database_sync_to_async
    def get_current_analytics(self):
        """Récupère les analytics actuelles"""
        try:
            from .cache import CacheService
            
            # Statistiques du cache
            cache_stats = CacheService.get_stats()
            
            # Analytics simples
            analytics = {
                'cache': cache_stats,
                'timestamp': timezone.now().isoformat()
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Erreur récupération analytics: {e}")
            return {}
    
    @database_sync_to_async
    def get_cache_stats(self):
        """Récupère les statistiques détaillées du cache"""
        try:
            from .cache import CacheService
            return CacheService.get_stats()
        except Exception as e:
            logger.error(f"Erreur stats cache: {e}")
            return {}
    
    @database_sync_to_async
    def get_search_stats(self):
        """Récupère les statistiques de recherche"""
        try:
            # Récupérer depuis le cache ou calculer
            search_stats = cache.get('tourism:search_stats', {})
            return search_stats
        except Exception as e:
            logger.error(f"Erreur stats recherche: {e}")
            return {}
    
    async def send_error(self, message):
        """Envoie un message d'erreur"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message,
            'timestamp': timezone.now().isoformat()
        }))
    
    # Méthodes pour recevoir des messages du groupe
    async def analytics_update(self, event):
        """Mise à jour des analytics"""
        await self.send(text_data=json.dumps({
            'type': 'analytics_update',
            'data': event['data'],
            'timestamp': event.get('timestamp', timezone.now().isoformat())
        }))


class ChatConsumer(AsyncWebsocketConsumer):
    """Consumer pour le chat/support (optionnel)"""
    
    async def connect(self):
        """Connexion WebSocket"""
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        
        # Joindre la room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        logger.info(f"Client connecté au chat {self.room_name}: {self.channel_name}")
    
    async def disconnect(self, close_code):
        """Déconnexion WebSocket"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        logger.info(f"Client déconnecté du chat {self.room_name}: {self.channel_name}")
    
    async def receive(self, text_data):
        """Réception d'un message du client"""
        try:
            data = json.loads(text_data)
            message = data.get('message', '')
            sender = data.get('sender', 'Anonymous')
            
            if message.strip():
                # Diffuser le message à tous les clients de la room
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': message,
                        'sender': sender,
                        'timestamp': timezone.now().isoformat()
                    }
                )
        
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Format JSON invalide'
            }))
    
    async def chat_message(self, event):
        """Envoie un message de chat au client"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'sender': event['sender'],
            'timestamp': event['timestamp']
        }))