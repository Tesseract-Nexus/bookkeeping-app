import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { offlineCache, syncQueue, syncStatus } from '../lib/storage';
import { api } from '../lib/api';

// Hook to check network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isInternetReachable ?? state.isConnected ?? true);
      setIsConnected(state.isConnected ?? null);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, isConnected };
}

// Hook for offline-capable dashboard data
export function useOfflineDashboard() {
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      if (isOnline) {
        const response = await api.reports.getDashboard();
        // Cache the data
        await offlineCache.setDashboard(response.data);
        return response.data;
      } else {
        // Return cached data when offline
        const cached = await offlineCache.getDashboard();
        if (cached) {
          return cached.data;
        }
        throw new Error('No offline data available');
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook for offline-capable transactions
export function useOfflineTransactions(params?: Record<string, string>) {
  const { isOnline } = useNetworkStatus();

  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      if (isOnline) {
        const response = await api.transactions.list(params);
        // Cache without filters for offline
        if (!params || Object.keys(params).length === 0) {
          await offlineCache.setTransactions(response.data.transactions || []);
        }
        return response.data;
      } else {
        const cached = await offlineCache.getTransactions();
        return { transactions: cached };
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook for offline-capable customers
export function useOfflineCustomers(params?: Record<string, string>) {
  const { isOnline } = useNetworkStatus();

  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      if (isOnline) {
        const response = await api.customers.list(params);
        if (!params || Object.keys(params).length === 0) {
          await offlineCache.setCustomers(response.data.customers || []);
        }
        return response.data;
      } else {
        const cached = await offlineCache.getCustomers();
        return { customers: cached };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for offline-capable invoices
export function useOfflineInvoices(params?: Record<string, string>) {
  const { isOnline } = useNetworkStatus();

  return useQuery({
    queryKey: ['invoices', params],
    queryFn: async () => {
      if (isOnline) {
        const response = await api.invoices.list(params);
        if (!params || Object.keys(params).length === 0) {
          await offlineCache.setInvoices(response.data.invoices || []);
        }
        return response.data;
      } else {
        const cached = await offlineCache.getInvoices();
        return { invoices: cached };
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook for pending sync operations
export function usePendingSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadPendingCount();
  }, []);

  useEffect(() => {
    if (isOnline) {
      syncPendingOperations();
    }
  }, [isOnline]);

  const loadPendingCount = async () => {
    const count = await syncQueue.count();
    setPendingCount(count);
  };

  const syncPendingOperations = async () => {
    const pending = await syncQueue.getAll();
    if (pending.length === 0) return;

    setIsSyncing(true);

    for (const operation of pending) {
      try {
        switch (operation.entity) {
          case 'transaction':
            if (operation.type === 'create') {
              await api.transactions.create(operation.data);
            }
            break;
          case 'invoice':
            if (operation.type === 'create') {
              await api.invoices.create(operation.data);
            }
            break;
          case 'customer':
            if (operation.type === 'create') {
              await api.customers.create(operation.data);
            }
            break;
        }

        // Remove successful operation
        await syncQueue.remove(operation.id);
      } catch (error) {
        // Increment retry count
        await syncQueue.incrementRetry(operation.id);

        // Remove if too many retries
        if (operation.retryCount >= 3) {
          await syncQueue.remove(operation.id);
        }
      }
    }

    // Refresh data
    await queryClient.invalidateQueries();
    await syncStatus.setLastSync();
    await loadPendingCount();
    setIsSyncing(false);
  };

  const addPendingOperation = async (
    type: 'create' | 'update' | 'delete',
    entity: 'transaction' | 'invoice' | 'customer',
    data: any
  ) => {
    await syncQueue.add({ type, entity, data });
    await loadPendingCount();
  };

  return {
    pendingCount,
    isSyncing,
    syncPendingOperations,
    addPendingOperation,
  };
}

// Hook for last sync time
export function useLastSync() {
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    loadLastSync();
  }, []);

  const loadLastSync = async () => {
    const sync = await syncStatus.getLastSync();
    setLastSync(sync);
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Never';

    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return lastSync.toLocaleDateString();
  };

  return { lastSync, formatLastSync };
}
