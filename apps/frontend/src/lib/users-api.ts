/**
 * Users API client
 */
import { apiClient } from './api';
import type {
  User,
  UserListResponse,
  UserQueryParams,
  CreateUserInput,
  UpdateUserInput,
} from '@/types/user';

export const usersApi = {
  /**
   * List users with optional filtering and pagination
   */
  list: (params?: UserQueryParams): Promise<UserListResponse> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return apiClient.get<UserListResponse>(`/users${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single user by ID
   */
  getById: (id: string): Promise<User> => {
    return apiClient.get<User>(`/users/${id}`);
  },

  /**
   * Create a new user
   */
  create: (input: CreateUserInput): Promise<User> => {
    return apiClient.post<User>('/users', input);
  },

  /**
   * Update a user
   */
  update: (id: string, input: UpdateUserInput): Promise<User> => {
    return apiClient.patch<User>(`/users/${id}`, input);
  },

  /**
   * Deactivate a user (soft delete)
   */
  deactivate: (id: string): Promise<User> => {
    return apiClient.patch<User>(`/users/${id}`, { isActive: false });
  },

  /**
   * Reactivate a user
   */
  reactivate: (id: string): Promise<User> => {
    return apiClient.patch<User>(`/users/${id}`, { isActive: true });
  },
};
