import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for different data types
const STORAGE_KEYS = {
  DASHBOARD: 'offline:dashboard',
  TRANSACTIONS: 'offline:transactions',
  INVOICES: 'offline:invoices',
  CUSTOMERS: 'offline:customers',
  ACCOUNTS: 'offline:accounts',
  PENDING_SYNC: 'sync:pending',
  LAST_SYNC: 'sync:last',
  USER_PREFERENCES: 'user:preferences',
} as const;

// Generic storage operations
export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing ${key}:`, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

// Offline data cache
export const offlineCache = {
  // Dashboard data
  async getDashboard() {
    return storage.get(STORAGE_KEYS.DASHBOARD);
  },

  async setDashboard(data: any) {
    await storage.set(STORAGE_KEYS.DASHBOARD, {
      data,
      timestamp: Date.now(),
    });
  },

  // Transactions
  async getTransactions() {
    const cached = await storage.get<{ data: any[]; timestamp: number }>(
      STORAGE_KEYS.TRANSACTIONS
    );
    return cached?.data || [];
  },

  async setTransactions(data: any[]) {
    await storage.set(STORAGE_KEYS.TRANSACTIONS, {
      data,
      timestamp: Date.now(),
    });
  },

  // Invoices
  async getInvoices() {
    const cached = await storage.get<{ data: any[]; timestamp: number }>(
      STORAGE_KEYS.INVOICES
    );
    return cached?.data || [];
  },

  async setInvoices(data: any[]) {
    await storage.set(STORAGE_KEYS.INVOICES, {
      data,
      timestamp: Date.now(),
    });
  },

  // Customers
  async getCustomers() {
    const cached = await storage.get<{ data: any[]; timestamp: number }>(
      STORAGE_KEYS.CUSTOMERS
    );
    return cached?.data || [];
  },

  async setCustomers(data: any[]) {
    await storage.set(STORAGE_KEYS.CUSTOMERS, {
      data,
      timestamp: Date.now(),
    });
  },

  // Check if cache is stale (older than 5 minutes)
  async isCacheStale(key: string, maxAge = 5 * 60 * 1000): Promise<boolean> {
    const cached = await storage.get<{ timestamp: number }>(key);
    if (!cached?.timestamp) return true;
    return Date.now() - cached.timestamp > maxAge;
  },
};

// Pending sync queue for offline operations
interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'transaction' | 'invoice' | 'customer';
  data: any;
  timestamp: number;
  retryCount: number;
}

export const syncQueue = {
  async add(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) {
    const pending = await this.getAll();
    const newOp: PendingOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    pending.push(newOp);
    await storage.set(STORAGE_KEYS.PENDING_SYNC, pending);
    return newOp;
  },

  async getAll(): Promise<PendingOperation[]> {
    return (await storage.get<PendingOperation[]>(STORAGE_KEYS.PENDING_SYNC)) || [];
  },

  async remove(id: string) {
    const pending = await this.getAll();
    const filtered = pending.filter((op) => op.id !== id);
    await storage.set(STORAGE_KEYS.PENDING_SYNC, filtered);
  },

  async incrementRetry(id: string) {
    const pending = await this.getAll();
    const updated = pending.map((op) =>
      op.id === id ? { ...op, retryCount: op.retryCount + 1 } : op
    );
    await storage.set(STORAGE_KEYS.PENDING_SYNC, updated);
  },

  async clear() {
    await storage.remove(STORAGE_KEYS.PENDING_SYNC);
  },

  async count(): Promise<number> {
    const pending = await this.getAll();
    return pending.length;
  },
};

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  dateFormat: string;
  notifications: boolean;
  biometricEnabled: boolean;
  defaultPaymentMode: 'cash' | 'bank' | 'upi';
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  notifications: true,
  biometricEnabled: false,
  defaultPaymentMode: 'cash',
};

export const userPreferences = {
  async get(): Promise<UserPreferences> {
    const prefs = await storage.get<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES);
    return { ...defaultPreferences, ...prefs };
  },

  async set(preferences: Partial<UserPreferences>) {
    const current = await this.get();
    await storage.set(STORAGE_KEYS.USER_PREFERENCES, {
      ...current,
      ...preferences,
    });
  },

  async reset() {
    await storage.set(STORAGE_KEYS.USER_PREFERENCES, defaultPreferences);
  },
};

// Last sync tracking
export const syncStatus = {
  async getLastSync(): Promise<Date | null> {
    const timestamp = await storage.get<number>(STORAGE_KEYS.LAST_SYNC);
    return timestamp ? new Date(timestamp) : null;
  },

  async setLastSync() {
    await storage.set(STORAGE_KEYS.LAST_SYNC, Date.now());
  },
};
