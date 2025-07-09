import { ApiError, NetworkError, TimeoutError, ValidationError } from './errors';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  getAuthToken?: () => Promise<string | null>;
  onTokenRefresh?: (token: string) => void;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retryAttempts?: number;
}

export class ApiClient {
  private config: Required<ApiClientConfig>;
  private refreshingToken = false;
  private tokenRefreshPromise: Promise<string | null> | null = null;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      getAuthToken: async () => null,
      onTokenRefresh: () => {},
      ...config,
    };
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.timeout,
      retryAttempts = this.config.retryAttempts,
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const token = await this.getValidToken();
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...headers,
        };

        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${this.config.baseURL}${endpoint}`, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 401 && token) {
          await this.handleTokenRefresh();
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          
          if (response.status === 422 && errorData?.errors) {
            throw new ValidationError(
              'Validation failed',
              errorData.errors
            );
          }

          throw new ApiError(
            errorData?.message || `HTTP ${response.status}`,
            response.status,
            errorData
          );
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new TimeoutError();
        }

        if (
          error instanceof ApiError ||
          error instanceof ValidationError ||
          error instanceof TimeoutError
        ) {
          throw error;
        }

        if (attempt === retryAttempts) {
          throw new NetworkError(
            `Network request failed after ${retryAttempts + 1} attempts`,
            error as Error
          );
        }

        await this.delay(this.config.retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError || new NetworkError('Unknown error occurred');
  }

  private async getValidToken(): Promise<string | null> {
    if (this.refreshingToken && this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    return this.config.getAuthToken();
  }

  private async handleTokenRefresh(): Promise<void> {
    if (this.refreshingToken) {
      return;
    }

    this.refreshingToken = true;
    this.tokenRefreshPromise = this.config.getAuthToken();

    try {
      const newToken = await this.tokenRefreshPromise;
      if (newToken) {
        this.config.onTokenRefresh(newToken);
      }
    } finally {
      this.refreshingToken = false;
      this.tokenRefreshPromise = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}