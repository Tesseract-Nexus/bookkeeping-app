import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useNetworkStatus } from './useOfflineData';

export interface RealtimeEvent {
  event: string;
  data: unknown;
  id?: string;
}

export interface UseRealtimeOptions {
  enabled?: boolean;
  onMessage?: (message: RealtimeEvent) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface UseRealtimeReturn {
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent: RealtimeEvent | null;
  reconnect: () => void;
}

// Polyfill for EventSource in React Native
class NativeEventSource {
  private url: string;
  private headers: Record<string, string>;
  private abortController: AbortController | null = null;
  private listeners: Map<string, Set<(data: string) => void>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isClosing = false;

  onopen: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  constructor(url: string, headers: Record<string, string> = {}) {
    this.url = url;
    this.headers = headers;
    this.connect();
  }

  private async connect() {
    if (this.isClosing) return;

    this.abortController = new AbortController();

    try {
      const response = await fetch(this.url, {
        method: 'GET',
        headers: {
          ...this.headers,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      this.reconnectAttempts = 0;
      this.onopen?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done || this.isClosing) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE messages from buffer
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep incomplete message in buffer

        for (const message of messages) {
          if (!message.trim()) continue;

          // Skip comments (keep-alive pings)
          if (message.startsWith(':')) continue;

          const lines = message.split('\n');
          let eventType = 'message';
          let data = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              data = line.slice(5).trim();
            }
          }

          if (data) {
            // Emit to typed listeners
            const listeners = this.listeners.get(eventType);
            if (listeners) {
              for (const listener of listeners) {
                listener(data);
              }
            }

            // Emit to onmessage for generic handling
            if (eventType === 'message') {
              this.onmessage?.({ data });
            }
          }
        }
      }
    } catch (error) {
      if (!this.isClosing && error instanceof Error && error.name !== 'AbortError') {
        this.onerror?.(error);
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.isClosing || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  addEventListener(type: string, listener: (data: string) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (data: string) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.isClosing = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.abortController?.abort();
    this.listeners.clear();
  }
}

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const {
    enabled = true,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<NativeEventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  const connect = useCallback(async () => {
    if (!enabled || !isOnline) return;

    setIsConnecting(true);

    try {
      // Get the SSE URL from API
      const baseUrl = api.getBaseURL();
      const sseUrl = `${baseUrl.replace('/api/v1', '')}/api/events`;

      // Get auth token
      const token = api.getAuthToken();

      const eventSource = new NativeEventSource(sseUrl, {
        'Authorization': token ? `Bearer ${token}` : '',
      });

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        onConnect?.();
      };

      eventSource.onerror = (error) => {
        setIsConnected(false);
        setIsConnecting(false);
        onError?.(error);
      };

      // Register event handlers
      const eventTypes = [
        'connected',
        'invoice.created',
        'invoice.updated',
        'invoice.paid',
        'bill.created',
        'bill.paid',
        'transaction.created',
        'customer.created',
        'customer.updated',
        'notification',
        'dashboard.update',
      ];

      eventTypes.forEach((eventType) => {
        eventSource.addEventListener(eventType, (data) => {
          try {
            const parsedData = JSON.parse(data);
            const event: RealtimeEvent = { event: eventType, data: parsedData };
            setLastEvent(event);
            onMessage?.(event);
            handleEvent(eventType, parsedData);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        });
      });
    } catch (error) {
      setIsConnecting(false);
      onError?.(error instanceof Error ? error : new Error('Connection failed'));
    }
  }, [enabled, isOnline, onMessage, onError, onConnect]);

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    onDisconnect?.();
  }, [onDisconnect]);

  const handleEvent = useCallback((eventType: string, data: unknown) => {
    // Invalidate relevant queries based on event type
    switch (eventType) {
      case 'invoice.created':
      case 'invoice.updated':
      case 'invoice.paid':
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        break;

      case 'bill.created':
      case 'bill.paid':
        queryClient.invalidateQueries({ queryKey: ['bills'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        break;

      case 'transaction.created':
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        break;

      case 'customer.created':
      case 'customer.updated':
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        break;

      case 'dashboard.update':
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        break;

      case 'connected':
        console.log('SSE connected:', data);
        break;
    }
  }, [queryClient]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && enabled && isOnline && !isConnected) {
        connect();
      } else if (state === 'background') {
        disconnect();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, isOnline, isConnected, connect, disconnect]);

  // Connect/disconnect based on enabled and network status
  useEffect(() => {
    if (enabled && isOnline) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, isOnline, connect, disconnect]);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    lastEvent,
    reconnect,
  };
}

// Specialized hooks

export function useInvoiceRealtime(onUpdate?: () => void) {
  const queryClient = useQueryClient();

  return useRealtime({
    onMessage: (event) => {
      if (event.event.startsWith('invoice.')) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        onUpdate?.();
      }
    },
  });
}

export function useTransactionRealtime(onUpdate?: () => void) {
  const queryClient = useQueryClient();

  return useRealtime({
    onMessage: (event) => {
      if (event.event.startsWith('transaction.')) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        onUpdate?.();
      }
    },
  });
}

export function useDashboardRealtime(onUpdate?: () => void) {
  const queryClient = useQueryClient();

  return useRealtime({
    onMessage: (event) => {
      if (event.event === 'dashboard.update') {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        onUpdate?.();
      }
    },
  });
}

export function useNotificationRealtime(
  onNotification: (notification: NotificationData) => void
) {
  return useRealtime({
    onMessage: (event) => {
      if (event.event === 'notification') {
        onNotification(event.data as NotificationData);
      }
    },
  });
}

export interface NotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  action?: string;
  link?: string;
}
