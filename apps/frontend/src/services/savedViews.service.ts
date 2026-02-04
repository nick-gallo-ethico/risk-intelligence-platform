/**
 * Saved Views API Service
 *
 * Provides CRUD operations for saved views (filter configurations).
 * Uses the apiClient pattern established in @/lib/api.ts.
 */
import { apiClient } from '@/lib/api';

export interface SavedView {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  filters: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: string;
  columns?: { key: string; visible: boolean; order: number }[];
  isDefault: boolean;
  isPinned: boolean;
  isShared: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedViewListResponse {
  data: SavedView[];
  grouped: Record<string, SavedView[]>;
}

export interface ApplyViewResponse {
  filters: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: string;
  invalidFilters: string[];
}

export interface CreateSavedViewInput {
  name: string;
  entityType: string;
  filters: Record<string, unknown>;
  description?: string;
  sortBy?: string;
  sortOrder?: string;
  columns?: { key: string; visible: boolean; order: number }[];
  isDefault?: boolean;
  isPinned?: boolean;
  isShared?: boolean;
}

export interface UpdateSavedViewInput {
  name?: string;
  description?: string;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: string;
  columns?: { key: string; visible: boolean; order: number }[];
  isDefault?: boolean;
  isPinned?: boolean;
  isShared?: boolean;
}

export const savedViewsService = {
  /**
   * List saved views, optionally filtered by entity type
   */
  list: (entityType?: string): Promise<SavedViewListResponse> => {
    const params = new URLSearchParams();
    if (entityType) {
      params.append('entityType', entityType);
    }
    params.append('includeShared', 'true');
    const query = params.toString();
    return apiClient.get<SavedViewListResponse>(`/saved-views${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single saved view by ID
   */
  get: (id: string): Promise<SavedView> => {
    return apiClient.get<SavedView>(`/saved-views/${id}`);
  },

  /**
   * Create a new saved view
   */
  create: (data: CreateSavedViewInput): Promise<SavedView> => {
    return apiClient.post<SavedView>('/saved-views', data);
  },

  /**
   * Update an existing saved view
   */
  update: (id: string, data: UpdateSavedViewInput): Promise<SavedView> => {
    return apiClient.put<SavedView>(`/saved-views/${id}`, data);
  },

  /**
   * Delete a saved view
   */
  delete: (id: string): Promise<void> => {
    return apiClient.delete(`/saved-views/${id}`);
  },

  /**
   * Apply a saved view - returns validated filters
   * Invalid filters are returned in the invalidFilters array for graceful degradation
   */
  apply: (id: string): Promise<ApplyViewResponse> => {
    return apiClient.post<ApplyViewResponse>(`/saved-views/${id}/apply`);
  },

  /**
   * Duplicate a saved view with optional new name
   */
  duplicate: (id: string, name?: string): Promise<SavedView> => {
    return apiClient.post<SavedView>(`/saved-views/${id}/duplicate`, { name });
  },

  /**
   * Get the default view for an entity type
   */
  getDefault: (entityType: string): Promise<SavedView | null> => {
    return apiClient.get<SavedView | null>(`/saved-views/default/${entityType}`);
  },
};
