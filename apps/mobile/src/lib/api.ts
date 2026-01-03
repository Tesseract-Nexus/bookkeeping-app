import { BookKeepApi, TokenStorage } from '@bookkeep/api-client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const ACCESS_TOKEN_KEY = 'bookkeep_access_token';
const REFRESH_TOKEN_KEY = 'bookkeep_refresh_token';

// Token storage using Expo SecureStore
const tokenStorage: TokenStorage = {
  getAccessToken: () => {
    // Note: SecureStore is async, but our interface is sync
    // We'll handle this with a cached value
    return tokenCache.accessToken;
  },
  getRefreshToken: () => {
    return tokenCache.refreshToken;
  },
  setTokens: async (accessToken: string, refreshToken: string) => {
    tokenCache.accessToken = accessToken;
    tokenCache.refreshToken = refreshToken;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearTokens: async () => {
    tokenCache.accessToken = null;
    tokenCache.refreshToken = null;
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};

// Cache for sync access
const tokenCache: { accessToken: string | null; refreshToken: string | null } = {
  accessToken: null,
  refreshToken: null,
};

// Initialize token cache from storage
export async function initializeTokenCache(): Promise<boolean> {
  try {
    tokenCache.accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    tokenCache.refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    return !!tokenCache.accessToken;
  } catch (error) {
    console.error('Failed to initialize token cache:', error);
    return false;
  }
}

// Get API base URL from environment
const getApiBaseUrl = (): string => {
  const extra = Constants.expoConfig?.extra;
  if (extra?.apiUrl) {
    return extra.apiUrl;
  }
  // Default to localhost for development
  return __DEV__ ? 'http://localhost:3080/api/v1' : 'https://api.bookkeep.app/v1';
};

// Create and export API instance
export const api = new BookKeepApi({
  baseURL: getApiBaseUrl(),
  tokenStorage,
});

// Helper to check if user is authenticated
export function isAuthenticated(): boolean {
  return !!tokenCache.accessToken;
}

// Helper to save tokens after login
export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  tokenCache.accessToken = accessToken;
  tokenCache.refreshToken = refreshToken;
  api.setAuthToken(accessToken);
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

// Helper to clear tokens on logout
export async function clearTokens(): Promise<void> {
  tokenCache.accessToken = null;
  tokenCache.refreshToken = null;
  api.clearAuthToken();
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
