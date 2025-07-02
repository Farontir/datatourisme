"""
Commande Django pour tester les fonctionnalités WebSocket
"""
from django.core.management.base import BaseCommand
import time
import json


class Command(BaseCommand):
    help = 'Teste les fonctionnalités WebSocket'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-type',
            choices=['notifications', 'resources', 'analytics', 'health'],
            default='notifications',
            help='Type de test à effectuer',
        )
        parser.add_argument(
            '--count',
            type=int,
            default=1,
            help='Nombre de messages de test à envoyer',
        )

    def handle(self, *args, **options):
        test_type = options['test_type']
        count = options['count']
        
        self.stdout.write(
            self.style.SUCCESS(f'=== Test WebSocket: {test_type} ===\n')
        )
        
        try:
            if test_type == 'notifications':
                self._test_notifications(count)
            elif test_type == 'resources':
                self._test_resource_updates(count)
            elif test_type == 'analytics':
                self._test_analytics(count)
            elif test_type == 'health':
                self._test_health()
            
            self.stdout.write(
                self.style.SUCCESS('\n✓ Test terminé avec succès')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors du test: {e}')
            )

    def _test_notifications(self, count):
        """Teste l'envoi de notifications"""
        from tourism.websocket_utils import websocket_notifier
        
        self.stdout.write('Test des notifications...')
        
        for i in range(count):
            websocket_notifier.send_notification(
                category='test',
                title=f'Notification de test #{i+1}',
                message=f'Ceci est un message de test numéro {i+1}',
                data={'test_number': i+1, 'timestamp': time.time()}
            )
            
            self.stdout.write(f'  → Notification #{i+1} envoyée')
            
            if count > 1:
                time.sleep(1)  # Pause entre les messages

    def _test_resource_updates(self, count):
        """Teste les notifications de mise à jour de ressources"""
        from tourism.websocket_utils import (
            notify_resource_created,
            notify_resource_updated,
            notify_resource_deleted
        )
        
        self.stdout.write('Test des mises à jour de ressources...')
        
        for i in range(count):
            resource_id = f'test_resource_{i+1}'
            
            # Test création
            notify_resource_created(
                resource_id=resource_id,
                resource_data={
                    'name': f'Ressource de test {i+1}',
                    'description': f'Description de test pour la ressource {i+1}',
                    'city': 'Ville Test',
                    'resource_types': ['TestType'],
                    'is_active': True
                }
            )
            self.stdout.write(f'  → Création ressource #{i+1} notifiée')
            
            time.sleep(0.5)
            
            # Test mise à jour
            notify_resource_updated(
                resource_id=resource_id,
                changes={
                    'name': {
                        'old': f'Ressource de test {i+1}',
                        'new': f'Ressource modifiée {i+1}'
                    },
                    'description': {
                        'old': f'Description de test pour la ressource {i+1}',
                        'new': f'Description mise à jour pour la ressource {i+1}'
                    }
                }
            )
            self.stdout.write(f'  → Mise à jour ressource #{i+1} notifiée')
            
            if count == 1:  # Seulement pour le premier test
                time.sleep(0.5)
                
                # Test suppression
                notify_resource_deleted(resource_id=resource_id)
                self.stdout.write(f'  → Suppression ressource #{i+1} notifiée')

    def _test_analytics(self, count):
        """Teste les notifications d'analytics"""
        from tourism.websocket_utils import (
            websocket_notifier,
            notify_analytics_generated
        )
        import random
        
        self.stdout.write('Test des analytics...')
        
        for i in range(count):
            # Analytics de test
            analytics_data = {
                'total_resources': random.randint(100, 1000),
                'new_today': random.randint(0, 50),
                'updated_recently': random.randint(0, 20),
                'cache_hit_rate': round(random.uniform(70, 95), 2),
                'test_run': i + 1,
                'timestamp': time.time()
            }
            
            notify_analytics_generated('test_analytics', analytics_data)
            
            self.stdout.write(f'  → Analytics #{i+1} envoyées')
            
            if count > 1:
                time.sleep(2)

    def _test_health(self):
        """Teste la santé des WebSockets"""
        from tourism.websocket_utils import websocket_health_checker
        
        self.stdout.write('Test de santé WebSocket...')
        
        # Vérifier le statut
        status = websocket_health_checker.get_status()
        
        self.stdout.write('Statut WebSocket:')
        for key, value in status.items():
            status_icon = '✓' if value else '✗' if isinstance(value, bool) else '→'
            self.stdout.write(f'  {status_icon} {key}: {value}')
        
        # Test de connexion
        self.stdout.write('\nTest de connexion...')
        is_healthy = websocket_health_checker.check_connection()
        
        if is_healthy:
            self.stdout.write('  ✓ Connexion WebSocket fonctionnelle')
        else:
            self.stdout.write('  ✗ Problème de connexion WebSocket')
        
        # Informations sur les channels
        try:
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            
            if channel_layer:
                self.stdout.write(f'\nChannel Layer: {type(channel_layer).__name__}')
                
                # Essayer d'obtenir des informations sur la configuration
                if hasattr(channel_layer, 'hosts'):
                    self.stdout.write(f'Hosts: {channel_layer.hosts}')
                elif hasattr(channel_layer, 'config'):
                    hosts = channel_layer.config.get('hosts', 'Non configuré')
                    self.stdout.write(f'Configuration hosts: {hosts}')
            else:
                self.stdout.write('\n✗ Aucun channel layer configuré')
                
        except Exception as e:
            self.stdout.write(f'\nErreur récupération info channel layer: {e}')

    def _show_websocket_info(self):
        """Affiche des informations sur la configuration WebSocket"""
        
        self.stdout.write('\nInformations WebSocket:')
        
        try:
            from django.conf import settings
            
            # Configuration ASGI
            asgi_app = getattr(settings, 'ASGI_APPLICATION', 'Non configuré')
            self.stdout.write(f'  ASGI Application: {asgi_app}')
            
            # Configuration Channel Layers
            channel_layers = getattr(settings, 'CHANNEL_LAYERS', {})
            if channel_layers:
                default_layer = channel_layers.get('default', {})
                backend = default_layer.get('BACKEND', 'Non configuré')
                self.stdout.write(f'  Channel Layer Backend: {backend}')
                
                config = default_layer.get('CONFIG', {})
                if 'hosts' in config:
                    self.stdout.write(f'  Redis Hosts: {config["hosts"]}')
            else:
                self.stdout.write('  ✗ CHANNEL_LAYERS non configuré')
            
        except Exception as e:
            self.stdout.write(f'  Erreur récupération configuration: {e}')