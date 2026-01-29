import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

/**
 * API client configured for the Ethico backend.
 *
 * Features:
 * - Automatic credentials inclusion (for HTTP-only cookies)
 * - Request/response interceptors for auth handling
 * - Typed error responses
 *
 * Usage:
 * import { api } from '@/lib/api';
 * const response = await api.get('/cases');
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
  withCredentials: true, // Include cookies for auth
  timeout: 30000, // 30 second timeout
});

// Request interceptor - add auth token from storage
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // TODO (Slice 1.1): Add token from auth context or localStorage
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // TODO (Slice 1.1): Implement token refresh logic
      // try {
      //   await refreshToken();
      //   return api(originalRequest);
      // } catch {
      //   // Redirect to login
      //   window.location.href = '/login';
      // }
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
