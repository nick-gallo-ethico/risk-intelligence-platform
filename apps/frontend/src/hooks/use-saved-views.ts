'use client';

/**
 * Hook for managing saved views state and API interactions.
 *
 * Provides:
 * - Loading and caching views for an entity type
 * - Applying views (loads filter configuration)
 * - Saving current filters as a new view
 * - Deleting views
 * - Auto-loading default view on mount
 */
import { useState, useEffect, useCallback } from 'react';
import {
  savedViewsService,
  SavedView,
  CreateSavedViewInput,
} from '@/services/savedViews.service';

export interface UseSavedViewsOptions {
  /** Whether to auto-apply the default view on mount */
  autoApplyDefault?: boolean;
}

export interface UseSavedViewsReturn {
  /** All views available to the user (owned + shared) */
  views: SavedView[];
  /** Whether views are currently loading */
  loading: boolean;
  /** The currently active/selected view */
  activeView: SavedView | null;
  /** Error message if loading failed */
  error: string | null;
  /** Apply a saved view by ID, returns the filter configuration */
  applyView: (viewId: string) => Promise<{
    filters: Record<string, unknown>;
    sortBy?: string;
    sortOrder?: string;
    invalidFilters: string[];
  }>;
  /** Save current filters as a new view */
  saveCurrentView: (
    name: string,
    filters: Record<string, unknown>,
    options?: Partial<CreateSavedViewInput>
  ) => Promise<SavedView>;
  /** Delete a view by ID */
  deleteView: (viewId: string) => Promise<void>;
  /** Refresh the views list */
  refreshViews: () => Promise<void>;
  /** Clear the active view selection */
  clearActiveView: () => void;
  /** Set a view as the active view without applying it */
  setActiveView: (view: SavedView | null) => void;
}

export function useSavedViews(
  entityType: string,
  options: UseSavedViewsOptions = {}
): UseSavedViewsReturn {
  const { autoApplyDefault = true } = options;

  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<SavedView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadViews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await savedViewsService.list(entityType);
      setViews(response.data);

      // Auto-apply default view if enabled and exists
      if (autoApplyDefault) {
        const defaultView = response.data.find((v) => v.isDefault);
        if (defaultView) {
          setActiveView(defaultView);
        }
      }
    } catch (err) {
      console.error('Failed to load saved views:', err);
      setError('Failed to load saved views');
    } finally {
      setLoading(false);
    }
  }, [entityType, autoApplyDefault]);

  useEffect(() => {
    loadViews();
  }, [loadViews]);

  const applyView = useCallback(
    async (viewId: string) => {
      const result = await savedViewsService.apply(viewId);
      const view = views.find((v) => v.id === viewId);
      if (view) {
        setActiveView(view);
      }

      // Log any invalid filters for debugging
      if (result.invalidFilters.length > 0) {
        console.warn(
          'Some filters in the saved view are no longer valid:',
          result.invalidFilters
        );
      }

      return result;
    },
    [views]
  );

  const saveCurrentView = useCallback(
    async (
      name: string,
      filters: Record<string, unknown>,
      options?: Partial<CreateSavedViewInput>
    ) => {
      const newView = await savedViewsService.create({
        name,
        entityType,
        filters,
        ...options,
      });
      setViews((prev) => [...prev, newView]);
      setActiveView(newView);
      return newView;
    },
    [entityType]
  );

  const deleteView = useCallback(
    async (viewId: string) => {
      await savedViewsService.delete(viewId);
      setViews((prev) => prev.filter((v) => v.id !== viewId));
      if (activeView?.id === viewId) {
        setActiveView(null);
      }
    },
    [activeView]
  );

  const clearActiveView = useCallback(() => {
    setActiveView(null);
  }, []);

  return {
    views,
    loading,
    activeView,
    error,
    applyView,
    saveCurrentView,
    deleteView,
    refreshViews: loadViews,
    clearActiveView,
    setActiveView,
  };
}
