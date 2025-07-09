import { useState, useEffect, useRef, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface WebSocketOptions {
  /** WebSocket server URL */
  url: string;
  /** Reconnection options */
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
    backoffMultiplier: number;
  };
  /** Heartbeat options */
  heartbeat?: {
    enabled: boolean;
    interval: number;
    message: any;
  };
  /** Authentication token */
  authToken?: string;
  /** Custom protocols */
  protocols?: string[];
  /** Debug mode */
  debug?: boolean;
}

export interface WebSocketState {
  /** Current connection status */
  status: 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';
  /** Last error if any */
  error: Event | null;
  /** Connection attempt count */
  reconnectAttempt: number;
  /** Last message received */
  lastMessage: WebSocketMessage | null;
  /** Messages history */
  messages: WebSocketMessage[];
  /** Round trip time for heartbeat */
  latency: number | null;
}

export interface UseWebSocketReturn {
  /** Current WebSocket state */
  state: WebSocketState;
  /** Send a message through the WebSocket */
  sendMessage: (message: any) => boolean;
  /** Send a JSON message */
  sendJSON: (data: any) => boolean;
  /** Connect to WebSocket */
  connect: () => void;
  /** Disconnect from WebSocket */
  disconnect: () => void;
  /** Subscribe to specific message types */
  subscribe: (messageType: string, callback: (payload: any) => void) => () => void;
  /** Clear message history */
  clearHistory: () => void;
  /** Get connection statistics */
  getStats: () => {
    totalMessages: number;
    averageLatency: number | null;
    uptime: number;
  };
}

const defaultOptions: Partial<WebSocketOptions> = {
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
  debug: false,
};

export function useWebSocket(options: WebSocketOptions): UseWebSocketReturn {
  const opts = { ...defaultOptions, ...options };
  
  // Refs for WebSocket and timers
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatStart = useRef<number | null>(null);
  const connectTime = useRef<number | null>(null);
  
  // Subscription management
  const subscribers = useRef<Map<string, ((payload: any) => void)[]>>(new Map());

  // State
  const [state, setState] = useState<WebSocketState>({
    status: 'disconnected',
    error: null,
    reconnectAttempt: 0,
    lastMessage: null,
    messages: [],
    latency: null,
  });

  // Logging utility
  const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    if (opts.debug) {
      console[level](`[WebSocket] ${message}`, data || '');
    }
  }, [opts.debug]);

  // Clear timers
  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (!opts.heartbeat?.enabled || !ws.current) return;

    heartbeatTimer.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        heartbeatStart.current = Date.now();
        ws.current.send(JSON.stringify(opts.heartbeat!.message));
        log('info', 'Heartbeat sent');
      }
    }, opts.heartbeat.interval);
  }, [opts.heartbeat, log]);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      let messageData: any;
      
      try {
        messageData = JSON.parse(event.data);
      } catch {
        // Handle non-JSON messages
        messageData = { type: 'raw', payload: event.data };
      }

      const message: WebSocketMessage = {
        type: messageData.type || 'unknown',
        payload: messageData.payload || messageData,
        timestamp: new Date(),
      };

      // Handle heartbeat response
      if (message.type === 'pong' && heartbeatStart.current) {
        const latency = Date.now() - heartbeatStart.current;
        setState(prev => ({ ...prev, latency }));
        heartbeatStart.current = null;
        log('info', `Heartbeat response received, latency: ${latency}ms`);
        return;
      }

      // Update state
      setState(prev => ({
        ...prev,
        lastMessage: message,
        messages: [...prev.messages.slice(-99), message], // Keep last 100 messages
      }));

      // Notify subscribers
      const typeSubscribers = subscribers.current.get(message.type);
      if (typeSubscribers) {
        typeSubscribers.forEach(callback => {
          try {
            callback(message.payload);
          } catch (error) {
            log('error', `Subscriber error for type ${message.type}:`, error);
          }
        });
      }

      // Notify wildcard subscribers
      const wildcardSubscribers = subscribers.current.get('*');
      if (wildcardSubscribers) {
        wildcardSubscribers.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            log('error', 'Wildcard subscriber error:', error);
          }
        });
      }

      log('info', `Message received: ${message.type}`, message.payload);
    } catch (error) {
      log('error', 'Error handling message:', error);
    }
  }, [log]);

  // Reconnect logic
  const reconnect = useCallback(() => {
    if (!opts.reconnect?.enabled) return;

    setState(prev => {
      if (prev.reconnectAttempt >= opts.reconnect!.maxAttempts) {
        log('error', 'Max reconnection attempts reached');
        return { ...prev, status: 'error' };
      }

      const delay = opts.reconnect!.delay * Math.pow(opts.reconnect!.backoffMultiplier, prev.reconnectAttempt);
      log('info', `Reconnecting in ${delay}ms (attempt ${prev.reconnectAttempt + 1})`);

      reconnectTimer.current = setTimeout(() => {
        connect();
      }, delay);

      return {
        ...prev,
        status: 'connecting',
        reconnectAttempt: prev.reconnectAttempt + 1,
      };
    });
  }, [opts.reconnect, log]);

  // Connect function
  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      log('warn', 'Already connected');
      return;
    }

    clearTimers();

    try {
      setState(prev => ({ ...prev, status: 'connecting', error: null }));
      
      let url = opts.url;
      if (opts.authToken) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}token=${encodeURIComponent(opts.authToken)}`;
      }

      ws.current = new WebSocket(url, opts.protocols);

      ws.current.onopen = () => {
        log('info', 'WebSocket connected');
        connectTime.current = Date.now();
        setState(prev => ({ 
          ...prev, 
          status: 'connected', 
          reconnectAttempt: 0,
          error: null 
        }));
        startHeartbeat();
      };

      ws.current.onmessage = handleMessage;

      ws.current.onclose = (event) => {
        log('info', `WebSocket closed: ${event.code} ${event.reason}`);
        clearTimers();
        setState(prev => ({ ...prev, status: 'disconnected' }));
        
        if (event.code !== 1000) { // Not a normal closure
          reconnect();
        }
      };

      ws.current.onerror = (error) => {
        log('error', 'WebSocket error:', error);
        setState(prev => ({ ...prev, status: 'error', error }));
      };

    } catch (error) {
      log('error', 'Failed to create WebSocket:', error);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error as Event 
      }));
    }
  }, [opts.url, opts.authToken, opts.protocols, clearTimers, log, handleMessage, startHeartbeat, reconnect]);

  // Disconnect function
  const disconnect = useCallback(() => {
    clearTimers();
    
    if (ws.current) {
      setState(prev => ({ ...prev, status: 'disconnecting' }));
      ws.current.close(1000, 'User disconnected');
      ws.current = null;
    }
    
    setState(prev => ({ ...prev, status: 'disconnected' }));
    log('info', 'WebSocket disconnected');
  }, [clearTimers, log]);

  // Send message function
  const sendMessage = useCallback((message: any): boolean => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      log('warn', 'Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      ws.current.send(message);
      log('info', 'Message sent:', message);
      return true;
    } catch (error) {
      log('error', 'Failed to send message:', error);
      return false;
    }
  }, [log]);

  // Send JSON message function
  const sendJSON = useCallback((data: any): boolean => {
    try {
      const message = JSON.stringify(data);
      return sendMessage(message);
    } catch (error) {
      log('error', 'Failed to serialize JSON message:', error);
      return false;
    }
  }, [sendMessage, log]);

  // Subscribe to message types
  const subscribe = useCallback((messageType: string, callback: (payload: any) => void) => {
    if (!subscribers.current.has(messageType)) {
      subscribers.current.set(messageType, []);
    }
    subscribers.current.get(messageType)!.push(callback);

    log('info', `Subscribed to message type: ${messageType}`);

    // Return unsubscribe function
    return () => {
      const typeSubscribers = subscribers.current.get(messageType);
      if (typeSubscribers) {
        const index = typeSubscribers.indexOf(callback);
        if (index > -1) {
          typeSubscribers.splice(index, 1);
          log('info', `Unsubscribed from message type: ${messageType}`);
        }
      }
    };
  }, [log]);

  // Clear message history
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, messages: [], lastMessage: null }));
    log('info', 'Message history cleared');
  }, [log]);

  // Get connection statistics
  const getStats = useCallback(() => {
    const uptime = connectTime.current ? Date.now() - connectTime.current : 0;
    const totalMessages = state.messages.length;
    const latencyValues = state.messages
      .map((_, i) => state.latency)
      .filter((l): l is number => l !== null);
    const averageLatency = latencyValues.length > 0 
      ? latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length 
      : null;

    return {
      totalMessages,
      averageLatency,
      uptime,
    };
  }, [state.messages, state.latency]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    sendMessage,
    sendJSON,
    connect,
    disconnect,
    subscribe,
    clearHistory,
    getStats,
  };
}