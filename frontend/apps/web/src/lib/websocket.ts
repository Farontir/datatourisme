'use client';

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth-store';

export interface WebSocketEvent {
  type: 'favorite_added' | 'favorite_removed' | 'collection_updated' | 'booking_update' | 'availability_changed';
  userId: string;
  data: any;
  timestamp: Date;
}

export class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    if (typeof window === 'undefined') return;

    const { accessToken, user } = useAuthStore.getState();
    
    if (!user || !accessToken) {
      console.log('No user or token available for WebSocket connection');
      return;
    }

    this.socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001', {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Join user-specific room
      const { user } = useAuthStore.getState();
      if (user) {
        this.socket?.emit('join-user-room', user.id);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnect();
    });

    // Handle real-time events
    this.socket.on('favorite-update', (data) => {
      this.emitToListeners('favorite-update', data);
    });

    this.socket.on('collection-update', (data) => {
      this.emitToListeners('collection-update', data);
    });

    this.socket.on('booking-update', (data) => {
      this.emitToListeners('booking-update', data);
    });

    this.socket.on('availability-update', (data) => {
      this.emitToListeners('availability-update', data);
    });

    this.socket.on('sync-favorites', (data) => {
      this.emitToListeners('sync-favorites', data);
    });
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.initializeSocket();
    }, delay);
  }

  private emitToListeners(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  // Public methods
  connect() {
    if (!this.socket || !this.socket.connected) {
      this.initializeSocket();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Event subscription
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  // Emit events to server
  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  }

  // Favorites-specific methods
  addFavorite(resourceId: string, optimistic = true) {
    if (optimistic) {
      // Optimistically update local state first
      this.emitToListeners('favorite-update', {
        type: 'add',
        resourceId,
        optimistic: true,
      });
    }

    this.emit('add-favorite', { resourceId });
  }

  removeFavorite(resourceId: string, optimistic = true) {
    if (optimistic) {
      // Optimistically update local state first
      this.emitToListeners('favorite-update', {
        type: 'remove',
        resourceId,
        optimistic: true,
      });
    }

    this.emit('remove-favorite', { resourceId });
  }

  createCollection(name: string, description?: string) {
    this.emit('create-collection', { name, description });
  }

  updateCollection(collectionId: string, updates: any) {
    this.emit('update-collection', { collectionId, updates });
  }

  deleteCollection(collectionId: string) {
    this.emit('delete-collection', { collectionId });
  }

  addToCollection(collectionId: string, resourceId: string) {
    this.emit('add-to-collection', { collectionId, resourceId });
  }

  removeFromCollection(collectionId: string, resourceId: string) {
    this.emit('remove-from-collection', { collectionId, resourceId });
  }

  // Booking-specific methods
  subscribeToBooking(bookingId: string) {
    this.emit('subscribe-booking', { bookingId });
  }

  unsubscribeFromBooking(bookingId: string) {
    this.emit('unsubscribe-booking', { bookingId });
  }

  // Availability-specific methods
  subscribeToAvailability(resourceId: string, date?: Date) {
    this.emit('subscribe-availability', { resourceId, date });
  }

  unsubscribeFromAvailability(resourceId: string) {
    this.emit('unsubscribe-availability', { resourceId });
  }

  // Admin methods
  broadcastMessage(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    this.emit('admin-broadcast', { message, type });
  }

  updateResourceAvailability(resourceId: string, availability: any) {
    this.emit('update-availability', { resourceId, availability });
  }
}

// Singleton instance
export const webSocketManager = new WebSocketManager();

// React hook for WebSocket events
export function useWebSocket() {
  const isConnected = webSocketManager.isConnected();

  const subscribe = (event: string, callback: (data: any) => void) => {
    return webSocketManager.on(event, callback);
  };

  const emit = (event: string, data: any) => {
    webSocketManager.emit(event, data);
  };

  return {
    isConnected,
    subscribe,
    emit,
    connect: () => webSocketManager.connect(),
    disconnect: () => webSocketManager.disconnect(),
    
    // Favorites methods
    addFavorite: (resourceId: string) => webSocketManager.addFavorite(resourceId),
    removeFavorite: (resourceId: string) => webSocketManager.removeFavorite(resourceId),
    
    // Collections methods
    createCollection: (name: string, description?: string) => 
      webSocketManager.createCollection(name, description),
    updateCollection: (collectionId: string, updates: any) =>
      webSocketManager.updateCollection(collectionId, updates),
    deleteCollection: (collectionId: string) =>
      webSocketManager.deleteCollection(collectionId),
    addToCollection: (collectionId: string, resourceId: string) =>
      webSocketManager.addToCollection(collectionId, resourceId),
    removeFromCollection: (collectionId: string, resourceId: string) =>
      webSocketManager.removeFromCollection(collectionId, resourceId),
  };
}

// Auto-connect when auth state changes
if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state) => {
    if (state.isAuthenticated && state.user) {
      webSocketManager.connect();
    } else {
      webSocketManager.disconnect();
    }
  });
}