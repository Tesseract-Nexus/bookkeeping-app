'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export interface SSEMessage {
  event: string;
  data: unknown;
  id?: string;
  retry?: number;
}

export interface UseSSEOptions {
  url?: string;
  onMessage?: (message: SSEMessage) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enabled?: boolean;
}

export interface UseSSEReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: Event | null;
  reconnectAttempts: number;
  lastMessage: SSEMessage | null;
  connect: () => void;
  disconnect: () => void;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    url = '/api/events',
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    enabled = true,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    cleanup();
    setIsConnecting(true);
    setError(null);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setReconnectAttempts(0);
      setError(null);
      onOpen?.();
    };

    eventSource.onerror = (event) => {
      setError(event);
      setIsConnected(false);
      setIsConnecting(false);
      onError?.(event);

      // Attempt reconnection
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connect();
        }, reconnectInterval * Math.pow(1.5, reconnectAttempts)); // Exponential backoff
      }
    };

    // Handle named events
    const eventTypes = [
      'connected',
      'invoice.created',
      'invoice.updated',
      'invoice.paid',
      'invoice.overdue',
      'bill.created',
      'bill.updated',
      'bill.paid',
      'payment.received',
      'transaction.created',
      'bank.reconciled',
      'customer.created',
      'customer.updated',
      'vendor.created',
      'vendor.updated',
      'report.generated',
      'notification',
      'dashboard.update',
    ];

    eventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const message: SSEMessage = {
            event: eventType,
            data,
            id: event.lastEventId,
          };
          setLastMessage(message);
          onMessage?.(message);
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      });
    });

    // Handle generic messages
    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          event: 'message',
          data,
          id: event.lastEventId,
        };
        setLastMessage(message);
        onMessage?.(message);
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };
  }, [url, onMessage, onError, onOpen, reconnectInterval, maxReconnectAttempts, reconnectAttempts, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
    setIsConnecting(false);
    setReconnectAttempts(0);
    onClose?.();
  }, [cleanup, onClose]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      cleanup();
    };
  }, [enabled, connect, disconnect, cleanup]);

  return {
    isConnected,
    isConnecting,
    error,
    reconnectAttempts,
    lastMessage,
    connect,
    disconnect,
  };
}

// Specialized hooks for specific event types

export function useInvoiceEvents(
  onEvent: (event: SSEMessage) => void,
  enabled = true
) {
  return useSSE({
    enabled,
    onMessage: (message) => {
      if (message.event.startsWith('invoice.')) {
        onEvent(message);
      }
    },
  });
}

export function useBillEvents(
  onEvent: (event: SSEMessage) => void,
  enabled = true
) {
  return useSSE({
    enabled,
    onMessage: (message) => {
      if (message.event.startsWith('bill.')) {
        onEvent(message);
      }
    },
  });
}

export function useNotifications(
  onNotification: (notification: NotificationData) => void,
  enabled = true
) {
  return useSSE({
    enabled,
    onMessage: (message) => {
      if (message.event === 'notification') {
        onNotification(message.data as NotificationData);
      }
    },
  });
}

export function useDashboardUpdates(
  onUpdate: (data: unknown) => void,
  enabled = true
) {
  return useSSE({
    enabled,
    onMessage: (message) => {
      if (message.event === 'dashboard.update') {
        onUpdate(message.data);
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
