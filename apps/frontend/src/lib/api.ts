import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { authStorage } from './auth-storage';
import type { AuthResponse } from '@/types/auth';

/**
 * API client configured for the Ethico backend.
 *
 * Features:
 * - Automatic Bearer token from localStorage
 * - Token refresh on 401
 * - Typed error responses
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

// Create axios instance with default config
export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Track if we're currently refreshing to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err: unknown) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = authStorage.getRefreshToken();
      if (!refreshToken) {
        // No refresh token, redirect to login
        authStorage.clearAll();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<AuthResponse>(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        authStorage.setAccessToken(accessToken);
        authStorage.setRefreshToken(newRefreshToken);

        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        authStorage.clearAll();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Type-safe API helper functions
 */
export const apiClient = {
  get: <T>(url: string, config?: Parameters<typeof api.get>[1]) =>
    api.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: unknown, config?: Parameters<typeof api.post>[2]) =>
    api.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: unknown, config?: Parameters<typeof api.put>[2]) =>
    api.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: Parameters<typeof api.patch>[2]) =>
    api.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: Parameters<typeof api.delete>[1]) =>
    api.delete<T>(url, config).then((res) => res.data),
};

export default api;
