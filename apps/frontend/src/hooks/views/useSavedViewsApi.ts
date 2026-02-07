/**
 * Saved Views API Hooks
 *
 * TanStack Query hooks for saved views CRUD operations.
 * Provides type-safe API interactions with automatic cache invalidation.
 */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SavedView,
  SavedViewsResponse,
  ApplySavedViewResponse,
  CreateSavedViewInput,
  UpdateSavedViewInput,
  ViewEntityType,
} from "@/lib/views/types";
import { api } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/views/constants";

interface UseSavedViewsOptions {
  /** Include views shared by other users */
  includeShared?: boolean;
  /** Enable/disable the query */
  enabled?: boolean;
}

/**
 * Fetch all saved views for an entity type
 */
export function useSavedViews(
  entityType?: ViewEntityType,
  options: UseSavedViewsOptions = {}
) {
  const { includeShared = true, enabled = true } = options;

  return useQuery({
    queryKey: [QUERY_KEYS.savedViews, entityType, { includeShared }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType) params.set("entityType", entityType);
      if (includeShared) params.set("includeShared", "true");

      const response = await api.get<SavedViewsResponse>(
        `/saved-views?${params.toString()}`
      );
      return response.data;
    },
    enabled,
  });
}

/**
 * Fetch a single saved view by ID
 */
export function useSavedView(id: string | null) {
  return useQuery({
    queryKey: [QUERY_KEYS.savedView, id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<SavedView>(`/saved-views/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Create a new saved view
 */
export function useCreateSavedView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSavedViewInput) => {
      const response = await api.post<SavedView>("/saved-views", input);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate views list for this entity type
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.savedViews, data.entityType],
      });
      // Also invalidate generic savedViews query
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.savedViews],
        exact: false,
      });
    },
  });
}

/**
 * Update an existing saved view
 */
export function useUpdateSavedView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string } & UpdateSavedViewInput) => {
      const response = await api.put<SavedView>(`/saved-views/${id}`, input);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate both the specific view and the list
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.savedViews],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.savedView, data.id],
      });
    },
  });
}

/**
 * Delete a saved view
 */
export function useDeleteSavedView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/saved-views/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      // Invalidate list
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.savedViews],
      });
      // Remove from cache
      queryClient.removeQueries({
        queryKey: [QUERY_KEYS.savedView, deletedId],
      });
    },
  });
}

/**
 * Clone/duplicate a saved view
 */
export function useCloneSavedView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName?: string }) => {
      const response = await api.post<SavedView>(
        `/saved-views/${id}/duplicate`,
        { newName }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.savedViews, data.entityType],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.savedViews],
        exact: false,
      });
    },
  });
}

/**
 * Reorder saved view tabs
 */
export function useReorderSavedViews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (viewOrders: { id: string; displayOrder: number }[]) => {
      await api.post("/saved-views/reorder", { viewOrders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.savedViews],
      });
    },
  });
}

/**
 * Apply a saved view - returns validated filter configuration
 *
 * Invalid filters (e.g., referencing deleted properties) are
 * returned in invalidFilters array for graceful degradation.
 */
export function useApplySavedView() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<ApplySavedViewResponse>(
        `/saved-views/${id}/apply`
      );
      return response.data;
    },
  });
}
