import getConfig from 'next/config';

const { serverRuntimeConfig } = getConfig() || { serverRuntimeConfig: {} };

// Service URLs for server-side API calls (BFF)
export const SERVICE_URLS = {
  auth: serverRuntimeConfig.AUTH_SERVICE_URL || 'http://localhost:8080',
  core: serverRuntimeConfig.CORE_SERVICE_URL || 'http://localhost:8081',
  invoice: serverRuntimeConfig.INVOICE_SERVICE_URL || 'http://localhost:8082',
  customer: serverRuntimeConfig.CUSTOMER_SERVICE_URL || 'http://localhost:8083',
  tax: serverRuntimeConfig.TAX_SERVICE_URL || 'http://localhost:8084',
  report: serverRuntimeConfig.REPORT_SERVICE_URL || 'http://localhost:8085',
};

export type ServiceName = keyof typeof SERVICE_URLS;

interface FetchOptions extends RequestInit {
  timeout?: number;
}

// Server-side API client for calling internal microservices
export async function fetchFromService<T>(
  service: ServiceName,
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const baseUrl = SERVICE_URLS[service];
  const url = `${baseUrl}${path}`;

  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error?.message || 'An error occurred',
        response.status,
        errorData.error?.code
      );
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408, 'TIMEOUT');
    }

    throw new ApiError('Service unavailable', 503, 'SERVICE_UNAVAILABLE');
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Response type for paginated data
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Response type for single item
export interface SingleResponse<T> {
  success: boolean;
  data: T;
}
