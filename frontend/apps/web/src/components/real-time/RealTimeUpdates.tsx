'use client';

import { useEffect, useState } from 'react';
import { useWebSocket, usePushNotifications, Badge, Alert, AlertDescription } from '@datatourisme/ui';
import { Bell, Wifi, WifiOff, Clock, Users, MapPin } from 'lucide-react';

// Types
interface AvailabilityUpdate {
  resourceId: string;
  resourceName: string;
  available: number;
  capacity: number;
  date: string;
  timeSlot: string;
}

interface BookingUpdate {
  bookingId: string;
  status: 'confirmed' | 'cancelled' | 'pending';
  resourceName: string;
  guestName: string;
}

interface PriceUpdate {
  resourceId: string;
  resourceName: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
}

// Real-time updates component
export function RealTimeUpdates() {
  const [availabilityUpdates, setAvailabilityUpdates] = useState<AvailabilityUpdate[]>([]);
  const [bookingUpdates, setBookingUpdates] = useState<BookingUpdate[]>([]);
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdate[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // WebSocket connection
  const websocket = useWebSocket({
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080/ws',
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      delay: 1000,
      backoffMultiplier: 1.5,
    },
    heartbeat: {
      enabled: true,
      interval: 30000,
      message: { type: 'ping' },
    },
    debug: true,
  });

  // Push notifications
  const pushNotifications = usePushNotifications({
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    registerEndpoint: '/api/push/register',
    unregisterEndpoint: '/api/push/unregister',
    debug: true,
  });

  // Connect to WebSocket on mount
  useEffect(() => {
    websocket.connect();
    
    return () => {
      websocket.disconnect();
    };
  }, []);

  // Subscribe to availability updates
  useEffect(() => {
    const unsubscribe = websocket.subscribe('availability_update', (payload: AvailabilityUpdate) => {
      setAvailabilityUpdates(prev => [payload, ...prev.slice(0, 9)]); // Keep last 10
      
      // Show push notification if enabled
      if (notificationsEnabled && pushNotifications.state.isSubscribed) {
        pushNotifications.sendTestNotification(
          'Disponibilité mise à jour',
          {
            body: `${payload.resourceName}: ${payload.available}/${payload.capacity} places disponibles`,
            icon: '/icons/icon-192x192.png',
            tag: 'availability',
          }
        );
      }
    });

    return unsubscribe;
  }, [websocket, notificationsEnabled, pushNotifications]);

  // Subscribe to booking updates
  useEffect(() => {
    const unsubscribe = websocket.subscribe('booking_update', (payload: BookingUpdate) => {
      setBookingUpdates(prev => [payload, ...prev.slice(0, 9)]); // Keep last 10
      
      // Show push notification if enabled
      if (notificationsEnabled && pushNotifications.state.isSubscribed) {
        const statusText = payload.status === 'confirmed' ? 'confirmée' : 
                          payload.status === 'cancelled' ? 'annulée' : 'en attente';
        
        pushNotifications.sendTestNotification(
          'Réservation mise à jour',
          {
            body: `Réservation ${statusText}: ${payload.resourceName}`,
            icon: '/icons/icon-192x192.png',
            tag: 'booking',
          }
        );
      }
    });

    return unsubscribe;
  }, [websocket, notificationsEnabled, pushNotifications]);

  // Subscribe to price updates
  useEffect(() => {
    const unsubscribe = websocket.subscribe('price_update', (payload: PriceUpdate) => {
      setPriceUpdates(prev => [payload, ...prev.slice(0, 9)]); // Keep last 10
      
      // Show push notification if enabled
      if (notificationsEnabled && pushNotifications.state.isSubscribed) {
        pushNotifications.sendTestNotification(
          'Prix mis à jour',
          {
            body: `${payload.resourceName}: ${payload.newPrice}€ (${payload.reason})`,
            icon: '/icons/icon-192x192.png',
            tag: 'price',
          }
        );
      }
    });

    return unsubscribe;
  }, [websocket, notificationsEnabled, pushNotifications]);

  // Handle notification toggle
  const handleNotificationToggle = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      if (pushNotifications.state.isSubscribed) {
        await pushNotifications.unsubscribe();
      }
    } else {
      const success = await pushNotifications.subscribe();
      if (success) {
        setNotificationsEnabled(true);
      }
    }
  };

  // Send test messages (for development)
  const sendTestAvailability = () => {
    websocket.sendJSON({
      type: 'availability_update',
      payload: {
        resourceId: 'test-' + Date.now(),
        resourceName: 'Château de Fontainebleau',
        available: Math.floor(Math.random() * 50),
        capacity: 50,
        date: new Date().toISOString().split('T')[0],
        timeSlot: '14:00-16:00',
      }
    });
  };

  const sendTestBooking = () => {
    const statuses = ['confirmed', 'cancelled', 'pending'];
    websocket.sendJSON({
      type: 'booking_update',
      payload: {
        bookingId: 'booking-' + Date.now(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        resourceName: 'Musée du Louvre',
        guestName: 'Jean Dupont',
      }
    });
  };

  const sendTestPrice = () => {
    websocket.sendJSON({
      type: 'price_update',
      payload: {
        resourceId: 'test-' + Date.now(),
        resourceName: 'Tour Eiffel',
        oldPrice: 25,
        newPrice: 30,
        reason: 'Période de forte affluence',
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mises à jour temps réel</h1>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {websocket.state.status === 'connected' ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm text-neutral-600">
              {websocket.state.status === 'connected' ? 'Connecté' : 'Déconnecté'}
            </span>
          </div>

          {/* Notification Toggle */}
          <button
            onClick={handleNotificationToggle}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              notificationsEnabled
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>
              {notificationsEnabled ? 'Notifications ON' : 'Notifications OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* WebSocket Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Latence</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {websocket.state.latency ? `${websocket.state.latency}ms` : '-'}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Wifi className="w-5 h-5 text-green-500" />
            <span className="font-medium">Messages</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {websocket.state.messages.length}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-purple-500" />
            <span className="font-medium">Notifications</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {pushNotifications.state.isSubscribed ? 'Activées' : 'Désactivées'}
          </p>
        </div>
      </div>

      {/* Test Buttons (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">Tests (Développement)</h3>
          <div className="flex space-x-2">
            <button
              onClick={sendTestAvailability}
              className="px-3 py-2 bg-blue-500 text-white rounded text-sm"
            >
              Test Disponibilité
            </button>
            <button
              onClick={sendTestBooking}
              className="px-3 py-2 bg-green-500 text-white rounded text-sm"
            >
              Test Réservation
            </button>
            <button
              onClick={sendTestPrice}
              className="px-3 py-2 bg-orange-500 text-white rounded text-sm"
            >
              Test Prix
            </button>
          </div>
        </div>
      )}

      {/* Updates Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Availability Updates */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-medium flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span>Disponibilités</span>
            </h3>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-3">
            {availabilityUpdates.length === 0 ? (
              <p className="text-neutral-500 text-sm">Aucune mise à jour</p>
            ) : (
              availabilityUpdates.map((update, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-sm">{update.resourceName}</p>
                  <p className="text-xs text-neutral-600">
                    {update.available}/{update.capacity} places
                  </p>
                  <p className="text-xs text-neutral-500">
                    {update.date} • {update.timeSlot}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Booking Updates */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-medium flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-green-500" />
              <span>Réservations</span>
            </h3>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-3">
            {bookingUpdates.length === 0 ? (
              <p className="text-neutral-500 text-sm">Aucune mise à jour</p>
            ) : (
              bookingUpdates.map((update, index) => (
                <div key={index} className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium text-sm">{update.resourceName}</p>
                  <p className="text-xs text-neutral-600">{update.guestName}</p>
                  <Badge 
                    variant={update.status === 'confirmed' ? 'default' : 
                            update.status === 'cancelled' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {update.status === 'confirmed' ? 'Confirmée' :
                     update.status === 'cancelled' ? 'Annulée' : 'En attente'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Price Updates */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-medium flex items-center space-x-2">
              <span className="w-5 h-5 text-orange-500">€</span>
              <span>Prix</span>
            </h3>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-3">
            {priceUpdates.length === 0 ? (
              <p className="text-neutral-500 text-sm">Aucune mise à jour</p>
            ) : (
              priceUpdates.map((update, index) => (
                <div key={index} className="p-3 bg-orange-50 rounded-lg">
                  <p className="font-medium text-sm">{update.resourceName}</p>
                  <p className="text-xs">
                    <span className="line-through text-neutral-500">{update.oldPrice}€</span>
                    {' → '}
                    <span className="font-medium">{update.newPrice}€</span>
                  </p>
                  <p className="text-xs text-neutral-600">{update.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Connection Error */}
      {websocket.state.error && (
        <Alert variant="destructive">
          <AlertDescription>
            Erreur de connexion WebSocket. Reconnexion en cours...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}