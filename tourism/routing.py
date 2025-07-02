"""
Routing WebSocket pour l'application tourism
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Notifications générales
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
    
    # Mises à jour en temps réel des ressources
    re_path(r'ws/resources/updates/$', consumers.ResourceUpdateConsumer.as_asgi()),
    
    # Statistiques en temps réel
    re_path(r'ws/analytics/$', consumers.AnalyticsConsumer.as_asgi()),
    
    # Chat/Support (optionnel)
    re_path(r'ws/chat/(?P<room_name>\w+)/$', consumers.ChatConsumer.as_asgi()),
]