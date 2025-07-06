"""
Tests for WebSocket functionality
"""
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from tourism.models import TouristicResource
from tourism.consumers import NotificationConsumer
from tourism.websocket_utils import (
    websocket_notifier, 
    notify_resource_update,
    notify_cache_cleared,
    notify_elasticsearch_reindexed
)


class WebSocketConsumerTests(TestCase):
    """Tests for WebSocket consumers"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.resource = TouristicResource.objects.create(
            resource_id='test-resource-1',
            name={'fr': 'Test Resource'},
            description={'fr': 'Test description'},
            is_active=True
        )
    
    async def test_websocket_connect(self):
        """Test WebSocket connection"""
        communicator = WebsocketCommunicator(NotificationConsumer.as_asgi(), "/ws/notifications/")
        connected, subprotocol = await communicator.connect()
        
        self.assertTrue(connected)
        await communicator.disconnect()
    
    async def test_websocket_connect_with_auth(self):
        """Test WebSocket connection with authentication"""
        # Simulate authenticated user
        communicator = WebsocketCommunicator(
            NotificationConsumer.as_asgi(), 
            "/ws/notifications/",
            headers=[(b"authorization", b"Bearer test-token")]
        )
        
        # Mock authentication
        with patch.object(NotificationConsumer, 'authenticate_user', return_value=self.user):
            connected, subprotocol = await communicator.connect()
            self.assertTrue(connected)
            
            # Test sending a message
            await communicator.send_json_to({
                'type': 'subscribe',
                'topics': ['resource_updates', 'cache_updates']
            })
            
            response = await communicator.receive_json_from()
            self.assertEqual(response['type'], 'subscription_confirmed')
            
            await communicator.disconnect()
    
    async def test_websocket_receive_notification(self):
        """Test receiving notifications through WebSocket"""
        communicator = WebsocketCommunicator(NotificationConsumer.as_asgi(), "/ws/notifications/")
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Subscribe to notifications
        await communicator.send_json_to({
            'type': 'subscribe',
            'topics': ['resource_updates']
        })
        
        # Wait for subscription confirmation
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'subscription_confirmed')
        
        # Send a notification
        await communicator.send_json_to({
            'type': 'notification',
            'topic': 'resource_updates',
            'data': {
                'resource_id': 'test-resource-1',
                'action': 'updated'
            }
        })
        
        # Should receive the notification back
        notification = await communicator.receive_json_from()
        self.assertEqual(notification['type'], 'notification')
        self.assertEqual(notification['topic'], 'resource_updates')
        
        await communicator.disconnect()
    
    async def test_websocket_error_handling(self):
        """Test WebSocket error handling"""
        communicator = WebsocketCommunicator(NotificationConsumer.as_asgi(), "/ws/notifications/")
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Send invalid message format
        await communicator.send_json_to({
            'invalid': 'message'
        })
        
        # Should receive error response
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'error')
        self.assertIn('Invalid message format', response['message'])
        
        await communicator.disconnect()
    
    async def test_websocket_disconnect_cleanup(self):
        """Test WebSocket disconnection cleanup"""
        communicator = WebsocketCommunicator(NotificationConsumer.as_asgi(), "/ws/notifications/")
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Subscribe to topics
        await communicator.send_json_to({
            'type': 'subscribe',
            'topics': ['resource_updates', 'cache_updates']
        })
        
        await communicator.receive_json_from()  # subscription confirmation
        
        # Disconnect
        await communicator.disconnect()
        
        # Verify cleanup (this would need access to consumer internals)
        # In a real implementation, you'd check that subscriptions are cleaned up


class WebSocketUtilsTests(TestCase):
    """Tests for WebSocket utility functions"""
    
    def setUp(self):
        self.resource = TouristicResource.objects.create(
            resource_id='test-resource-1',
            name={'fr': 'Test Resource'},
            description={'fr': 'Test description'},
            is_active=True
        )
    
    @patch('tourism.websocket_utils.get_channel_layer')
    def test_websocket_notifier(self, mock_get_channel_layer):
        """Test websocket_notifier function"""
        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        # Test sending notification
        websocket_notifier(
            topic='test_topic',
            message={'test': 'data'},
            group='test_group'
        )
        
        # Verify channel layer was called
        mock_channel_layer.group_send.assert_called_once()
        call_args = mock_channel_layer.group_send.call_args
        self.assertEqual(call_args[0][0], 'test_group')
        self.assertEqual(call_args[0][1]['type'], 'websocket.notification')
    
    @patch('tourism.websocket_utils.websocket_notifier')
    def test_notify_resource_update(self, mock_notifier):
        """Test notify_resource_update function"""
        notify_resource_update(
            resource_id='test-resource-1',
            action='updated',
            user_id=1
        )
        
        mock_notifier.assert_called_once()
        call_args = mock_notifier.call_args[1]
        self.assertEqual(call_args['topic'], 'resource_updates')
        self.assertEqual(call_args['message']['resource_id'], 'test-resource-1')
        self.assertEqual(call_args['message']['action'], 'updated')
    
    @patch('tourism.websocket_utils.websocket_notifier')
    def test_notify_cache_cleared(self, mock_notifier):
        """Test notify_cache_cleared function"""
        notify_cache_cleared(
            cache_type='resource_cache',
            keys_cleared=['key1', 'key2']
        )
        
        mock_notifier.assert_called_once()
        call_args = mock_notifier.call_args[1]
        self.assertEqual(call_args['topic'], 'cache_updates')
        self.assertEqual(call_args['message']['cache_type'], 'resource_cache')
        self.assertEqual(call_args['message']['keys_cleared'], ['key1', 'key2'])
    
    @patch('tourism.websocket_utils.websocket_notifier')
    def test_notify_elasticsearch_reindexed(self, mock_notifier):
        """Test notify_elasticsearch_reindexed function"""
        notify_elasticsearch_reindexed(
            index_name='tourism_resources',
            documents_count=100,
            duration_seconds=5.2
        )
        
        mock_notifier.assert_called_once()
        call_args = mock_notifier.call_args[1]
        self.assertEqual(call_args['topic'], 'elasticsearch_updates')
        self.assertEqual(call_args['message']['index_name'], 'tourism_resources')
        self.assertEqual(call_args['message']['documents_count'], 100)
    
    @patch('tourism.websocket_utils.async_to_sync')
    @patch('tourism.websocket_utils.get_channel_layer')
    def test_websocket_notifier_error_handling(self, mock_get_channel_layer, mock_async_to_sync):
        """Test websocket_notifier error handling"""
        # Mock channel layer to raise exception
        mock_channel_layer = Mock()
        mock_channel_layer.group_send.side_effect = Exception("Connection error")
        mock_get_channel_layer.return_value = mock_channel_layer
        
        # Should not raise exception, just log error
        try:
            websocket_notifier(
                topic='test_topic',
                message={'test': 'data'},
                group='test_group'
            )
        except Exception:
            self.fail("websocket_notifier should handle exceptions gracefully")


class WebSocketIntegrationTests(TestCase):
    """Integration tests for WebSocket functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.resource = TouristicResource.objects.create(
            resource_id='test-resource-1',
            name={'fr': 'Test Resource'},
            description={'fr': 'Test description'},
            is_active=True
        )
    
    @patch('tourism.websocket_utils.get_channel_layer')
    async def test_resource_update_websocket_notification(self, mock_get_channel_layer):
        """Test that resource updates trigger WebSocket notifications"""
        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        # Create WebSocket connection
        communicator = WebsocketCommunicator(NotificationConsumer.as_asgi(), "/ws/notifications/")
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Subscribe to resource updates
        await communicator.send_json_to({
            'type': 'subscribe',
            'topics': ['resource_updates']
        })
        
        await communicator.receive_json_from()  # subscription confirmation
        
        # Update resource (this should trigger WebSocket notification)
        await database_sync_to_async(self._update_resource)()
        
        # Verify notification was sent through channel layer
        mock_channel_layer.group_send.assert_called()
        
        await communicator.disconnect()
    
    def _update_resource(self):
        """Helper method to update resource"""
        self.resource.name = {'fr': 'Updated Resource'}
        self.resource.save()
    
    async def test_websocket_performance_multiple_connections(self):
        """Test WebSocket performance with multiple connections"""
        communicators = []
        
        # Create multiple connections
        for i in range(10):
            communicator = WebsocketCommunicator(
                NotificationConsumer.as_asgi(), 
                f"/ws/notifications/"
            )
            connected, subprotocol = await communicator.connect()
            self.assertTrue(connected)
            communicators.append(communicator)
        
        # Send messages to all connections
        for i, communicator in enumerate(communicators):
            await communicator.send_json_to({
                'type': 'subscribe',
                'topics': ['resource_updates']
            })
            
            response = await communicator.receive_json_from()
            self.assertEqual(response['type'], 'subscription_confirmed')
        
        # Disconnect all
        for communicator in communicators:
            await communicator.disconnect()
    
    @override_settings(
        CHANNEL_LAYERS={
            'default': {
                'BACKEND': 'channels.layers.InMemoryChannelLayer',
            }
        }
    )
    async def test_websocket_with_inmemory_channel_layer(self):
        """Test WebSocket with in-memory channel layer"""
        communicator = WebsocketCommunicator(NotificationConsumer.as_asgi(), "/ws/notifications/")
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        await communicator.send_json_to({
            'type': 'ping'
        })
        
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'pong')
        
        await communicator.disconnect()


# Async test runner helper
def run_async_test(coro):
    """Helper to run async tests"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# Convert async tests to sync for Django test runner
class WebSocketTestCase(TestCase):
    """Wrapper to run async WebSocket tests in Django"""
    
    def test_websocket_connect(self):
        test = WebSocketConsumerTests()
        test.setUp()
        run_async_test(test.test_websocket_connect())
    
    def test_websocket_connect_with_auth(self):
        test = WebSocketConsumerTests()
        test.setUp()
        run_async_test(test.test_websocket_connect_with_auth())
    
    def test_websocket_receive_notification(self):
        test = WebSocketConsumerTests()
        test.setUp()
        run_async_test(test.test_websocket_receive_notification())
    
    def test_websocket_error_handling(self):
        test = WebSocketConsumerTests()
        test.setUp()
        run_async_test(test.test_websocket_error_handling())
    
    def test_websocket_disconnect_cleanup(self):
        test = WebSocketConsumerTests()
        test.setUp()
        run_async_test(test.test_websocket_disconnect_cleanup())