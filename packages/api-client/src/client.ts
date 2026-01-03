import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ApiResponse, ApiError } from './types';

export interface ClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface TokenStorage {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
}

export class BookKeepClient {
  private client: AxiosInstance;
  private tokenStorage?: TokenStorage;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(config: ClientConfig, tokenStorage?: TokenStorage) {
    this.tokenStorage = tokenStorage;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.tokenStorage) {
          const token = this.tokenStorage.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // If 401 and we have refresh token, try to refresh
        if (error.response?.status === 401 && !originalRequest._retry && this.tokenStorage) {
          originalRequest._retry = true;

          try {
            const refreshed = await this.refreshToken();
            if (refreshed) {
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.tokenStorage.clearTokens();
            throw refreshError;
          }
        }

        // Transform error to our format
        const apiError: ApiError = {
          code: error.response?.status?.toString() || 'NETWORK_ERROR',
          message: (error.response?.data as any)?.error?.message || error.message,
          details: (error.response?.data as any)?.error?.details,
        };

        throw apiError;
      }
    );
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.tokenStorage) return false;

    // Prevent multiple refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) return false;

    this.refreshPromise = (async () => {
      try {
        const response = await axios.post(`${this.client.defaults.baseURL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        if (response.data?.data?.access_token) {
          this.tokenStorage!.setTokens(
            response.data.data.access_token,
            response.data.data.refresh_token
          );
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data;
  }

  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}
