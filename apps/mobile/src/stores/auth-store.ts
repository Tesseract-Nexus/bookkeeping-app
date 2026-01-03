import { create } from 'zustand';
import { User, Tenant } from '@bookkeep/api-client';
import { api, saveTokens, clearTokens, initializeTokenCache } from '../lib/api';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (phone: string, otp: string) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  requestOTP: (phone: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const hasToken = await initializeTokenCache();
      if (hasToken) {
        // Validate token by fetching profile
        const response = await api.auth.getProfile();
        if (response.success && response.data) {
          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      }
      set({ isLoading: false, isAuthenticated: false });
    } catch (error) {
      console.error('Auth initialization failed:', error);
      await clearTokens();
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  login: async (phone: string, otp: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.auth.verifyOTP({ phone, otp, purpose: 'login' });
      if (response.success && response.data) {
        await saveTokens(response.data.access_token, response.data.refresh_token);
        set({
          user: response.data.user,
          tenant: response.data.tenant,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
      set({ isLoading: false, error: 'Login failed' });
      return false;
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Login failed' });
      return false;
    }
  },

  loginWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.auth.login({ email, password });
      if (response.success && response.data) {
        await saveTokens(response.data.access_token, response.data.refresh_token);
        set({
          user: response.data.user,
          tenant: response.data.tenant,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
      set({ isLoading: false, error: 'Login failed' });
      return false;
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Login failed' });
      return false;
    }
  },

  requestOTP: async (phone: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.auth.requestOTP({ phone, purpose: 'login' });
      set({ isLoading: false });
      return response.success;
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to send OTP' });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      await clearTokens();
      set({
        user: null,
        tenant: null,
        isAuthenticated: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
