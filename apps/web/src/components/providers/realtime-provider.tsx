'use client';

import * as React from 'react';
import { useSSE, SSEMessage, NotificationData } from '@/hooks/use-sse';
import { useAuth } from '@/lib/auth-context';

interface RealtimeContextType {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: SSEMessage | null;
  notifications: NotificationData[];
  clearNotification: (index: number) => void;
  clearAllNotifications: () => void;
}

const RealtimeContext = React.createContext<RealtimeContextType | undefined>(undefined);

export function useRealtime() {
  const context = React.useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = React.useState<NotificationData[]>([]);

  const handleMessage = React.useCallback((message: SSEMessage) => {
    // Handle different event types
    switch (message.event) {
      case 'notification':
        const notification = message.data as NotificationData;
        setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50

        // Show browser notification if supported and permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.svg',
          });
        }
        break;

      case 'invoice.created':
      case 'invoice.paid':
      case 'invoice.overdue':
        // Dispatch custom event for invoice components to listen to
        window.dispatchEvent(new CustomEvent('invoice:update', { detail: message.data }));
        break;

      case 'bill.created':
      case 'bill.paid':
        window.dispatchEvent(new CustomEvent('bill:update', { detail: message.data }));
        break;

      case 'transaction.created':
        window.dispatchEvent(new CustomEvent('transaction:update', { detail: message.data }));
        break;

      case 'bank.reconciled':
        window.dispatchEvent(new CustomEvent('bank:update', { detail: message.data }));
        break;

      case 'customer.created':
      case 'customer.updated':
        window.dispatchEvent(new CustomEvent('customer:update', { detail: message.data }));
        break;

      case 'vendor.created':
      case 'vendor.updated':
        window.dispatchEvent(new CustomEvent('vendor:update', { detail: message.data }));
        break;

      case 'dashboard.update':
        window.dispatchEvent(new CustomEvent('dashboard:update', { detail: message.data }));
        break;

      case 'connected':
        console.log('SSE connected:', message.data);
        break;

      default:
        console.log('Unhandled SSE event:', message.event, message.data);
    }
  }, []);

  const { isConnected, isConnecting, lastMessage } = useSSE({
    enabled: isAuthenticated && !!user,
    onMessage: handleMessage,
    onOpen: () => {
      console.log('Real-time connection established');
    },
    onError: (error) => {
      console.error('Real-time connection error:', error);
    },
  });

  const clearNotification = React.useCallback((index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllNotifications = React.useCallback(() => {
    setNotifications([]);
  }, []);

  // Request notification permission on mount
  React.useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const value = React.useMemo(
    () => ({
      isConnected,
      isConnecting,
      lastMessage,
      notifications,
      clearNotification,
      clearAllNotifications,
    }),
    [isConnected, isConnecting, lastMessage, notifications, clearNotification, clearAllNotifications]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

// Hook for subscribing to specific event types
export function useRealtimeEvent(
  eventType: string,
  callback: (data: unknown) => void
) {
  React.useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail);
    };

    window.addEventListener(eventType, handler);
    return () => window.removeEventListener(eventType, handler);
  }, [eventType, callback]);
}

// Convenience hooks for specific event types
export function useInvoiceUpdates(callback: (data: unknown) => void) {
  useRealtimeEvent('invoice:update', callback);
}

export function useBillUpdates(callback: (data: unknown) => void) {
  useRealtimeEvent('bill:update', callback);
}

export function useTransactionUpdates(callback: (data: unknown) => void) {
  useRealtimeEvent('transaction:update', callback);
}

export function useBankUpdates(callback: (data: unknown) => void) {
  useRealtimeEvent('bank:update', callback);
}

export function useCustomerUpdates(callback: (data: unknown) => void) {
  useRealtimeEvent('customer:update', callback);
}

export function useVendorUpdates(callback: (data: unknown) => void) {
  useRealtimeEvent('vendor:update', callback);
}

export function useDashboardUpdates(callback: (data: unknown) => void) {
  useRealtimeEvent('dashboard:update', callback);
}
