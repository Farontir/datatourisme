import { useState, useEffect, useCallback } from 'react';

export interface PushNotificationOptions {
  /** VAPID public key for push notifications */
  vapidPublicKey: string;
  /** Service worker registration path */
  serviceWorkerPath?: string;
  /** API endpoint to register push subscription */
  registerEndpoint?: string;
  /** API endpoint to unregister push subscription */
  unregisterEndpoint?: string;
  /** Debug mode */
  debug?: boolean;
}

export interface PushNotificationState {
  /** Current permission status */
  permission: NotificationPermission;
  /** Whether push notifications are supported */
  isSupported: boolean;
  /** Whether user is subscribed to push notifications */
  isSubscribed: boolean;
  /** Current push subscription */
  subscription: PushSubscription | null;
  /** Whether currently processing subscription */
  isLoading: boolean;
  /** Last error if any */
  error: string | null;
}

export interface UsePushNotificationsReturn {
  /** Current push notification state */
  state: PushNotificationState;
  /** Request notification permission */
  requestPermission: () => Promise<boolean>;
  /** Subscribe to push notifications */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>;
  /** Send a test notification */
  sendTestNotification: (title: string, options?: NotificationOptions) => boolean;
  /** Check if notifications are supported */
  isSupported: () => boolean;
}

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

export function usePushNotifications(options: PushNotificationOptions): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationState>({
    permission: 'default',
    isSupported: false,
    isSubscribed: false,
    subscription: null,
    isLoading: false,
    error: null,
  });

  // Logging utility
  const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    if (options.debug) {
      console[level](`[PushNotifications] ${message}`, data || '');
    }
  }, [options.debug]);

  // Check if push notifications are supported
  const isSupported = useCallback((): boolean => {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }, []);

  // Initialize push notification state
  useEffect(() => {
    const initializePushState = async () => {
      if (!isSupported()) {
        setState(prev => ({ ...prev, isSupported: false }));
        log('warn', 'Push notifications not supported');
        return;
      }

      setState(prev => ({ ...prev, isSupported: true }));
      
      // Check current permission
      const permission = Notification.permission;
      setState(prev => ({ ...prev, permission }));

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        setState(prev => ({
          ...prev,
          subscription,
          isSubscribed: !!subscription,
        }));

        if (subscription) {
          log('info', 'Already subscribed to push notifications', subscription);
        }
      } catch (error) {
        log('error', 'Failed to check existing subscription:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to check existing subscription' 
        }));
      }
    };

    initializePushState();
  }, [isSupported, log]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) {
      log('error', 'Push notifications not supported');
      return false;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission === 'granted') {
        log('info', 'Notification permission granted');
        return true;
      } else {
        log('warn', `Notification permission ${permission}`);
        return false;
      }
    } catch (error) {
      log('error', 'Failed to request notification permission:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to request notification permission' 
      }));
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isSupported, log]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) {
      log('error', 'Push notifications not supported');
      return false;
    }

    if (Notification.permission !== 'granted') {
      const permissionGranted = await requestPermission();
      if (!permissionGranted) {
        return false;
      }
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const vapidKey = urlBase64ToUint8Array(options.vapidPublicKey);
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });

        log('info', 'Created new push subscription', subscription);
      }

      // Register subscription with server
      if (options.registerEndpoint && subscription) {
        try {
          const response = await fetch(options.registerEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription: subscription.toJSON(),
              userAgent: navigator.userAgent,
            }),
          });

          if (!response.ok) {
            throw new Error(`Server registration failed: ${response.status}`);
          }

          log('info', 'Push subscription registered with server');
        } catch (error) {
          log('error', 'Failed to register subscription with server:', error);
          // Continue anyway - subscription is still valid locally
        }
      }

      setState(prev => ({
        ...prev,
        subscription,
        isSubscribed: true,
      }));

      return true;
    } catch (error) {
      log('error', 'Failed to subscribe to push notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to subscribe to push notifications' 
      }));
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isSupported, requestPermission, options.vapidPublicKey, options.registerEndpoint, log]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.subscription) {
      log('warn', 'No active subscription to unsubscribe from');
      return true;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Unregister from server first
      if (options.unregisterEndpoint) {
        try {
          const response = await fetch(options.unregisterEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription: state.subscription.toJSON(),
            }),
          });

          if (!response.ok) {
            log('warn', `Server unregistration failed: ${response.status}`);
          } else {
            log('info', 'Push subscription unregistered from server');
          }
        } catch (error) {
          log('error', 'Failed to unregister subscription from server:', error);
          // Continue with local unsubscription
        }
      }

      // Unsubscribe locally
      const success = await state.subscription.unsubscribe();
      
      if (success) {
        setState(prev => ({
          ...prev,
          subscription: null,
          isSubscribed: false,
        }));
        log('info', 'Unsubscribed from push notifications');
        return true;
      } else {
        throw new Error('Failed to unsubscribe locally');
      }
    } catch (error) {
      log('error', 'Failed to unsubscribe from push notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to unsubscribe from push notifications' 
      }));
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.subscription, options.unregisterEndpoint, log]);

  // Send a test notification
  const sendTestNotification = useCallback((
    title: string, 
    options: NotificationOptions = {}
  ): boolean => {
    if (!isSupported() || Notification.permission !== 'granted') {
      log('warn', 'Cannot send notification: permission not granted');
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        // vibrate: [200, 100, 200], // Not supported in NotificationOptions
        ...options,
      });

      // Auto-close notification after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      log('info', 'Test notification sent:', title);
      return true;
    } catch (error) {
      log('error', 'Failed to send test notification:', error);
      return false;
    }
  }, [isSupported, log]);

  return {
    state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    isSupported,
  };
}

// Hook for handling incoming push notifications
export function usePushNotificationHandler() {
  const [lastNotification, setLastNotification] = useState<any>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
        setLastNotification(event.data.notification);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return {
    lastNotification,
    clearLastNotification: () => setLastNotification(null),
  };
}

// Utility function to check if running as PWA
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
}

// Utility function to get notification preferences
export function getNotificationPreferences() {
  const preferences = localStorage.getItem('notification-preferences');
  return preferences ? JSON.parse(preferences) : {
    bookingReminders: true,
    promotionalOffers: false,
    systemUpdates: true,
    soundEnabled: true,
    vibrationEnabled: true,
  };
}

// Utility function to save notification preferences
export function saveNotificationPreferences(preferences: any) {
  localStorage.setItem('notification-preferences', JSON.stringify(preferences));
}