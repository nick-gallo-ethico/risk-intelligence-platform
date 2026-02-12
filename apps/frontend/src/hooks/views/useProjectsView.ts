/**
 * useProjectsView Hook
 *
 * Provides data fetching, mutations, and bulk action handlers
 * for the Projects module when used with the saved views system.
 */
"use client";

import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { PROJECTS_VIEW_CONFIG } from "@/lib/views/configs/projects.config";
import { useSavedViewContext } from "./useSavedViewContext";
import { toast } from "sonner";
import type { FilterGroup } from "@/lib/views/types";

/**
 * Project entity type matching the backend model
 */
export interface Project extends Record<string, unknown> {
  id: string;
  name: string;
  description?: string;
  category: string;
  status: string;
  targetDate: string;
  completedAt?: string;
  progressPercent: number;
  totalItems: number;
  completedItems: number;
  owner?: {
    id: string;
    name: string;
    email?: string;
  };
  ownerId?: string;
  taskCount?: number;
  completedTaskCount?: number;
  notes?: string;
  lastStatusUpdate?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectsResponse {
  data: Project[];
  total: number;
  page?: number;
  pageSize?: number;
}

interface BulkActionPayload {
  action: string;
  ids: string[];
  data?: Record<string, unknown>;
}

/**
 * Convert filter groups to API-compatible format
 */
function buildFilterParams(
  filters: FilterGroup[] | Record<string, unknown>,
  quickFilters: Record<string, unknown>,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  // Defensive check: ensure filters is an array (may be object from legacy view)
  const safeFilters = Array.isArray(filters) ? filters : [];

  // Collect all conditions from filter groups
  const allConditions = safeFilters.flatMap((group) => group.conditions);

  // Add quick filter conditions
  Object.entries(quickFilters).forEach(([propertyId, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      allConditions.push({
        id: `quick-${propertyId}`,
        propertyId,
        operator: Array.isArray(value) ? "is_any_of" : "is",
        value,
      });
    }
  });

  if (allConditions.length > 0) {
    params.filters = JSON.stringify(allConditions);
  }

  return params;
}

/**
 * Hook for Projects-specific view logic
 *
 * Provides:
 * - Fetching projects based on current view state (filters, sort, search)
 * - Bulk action mutations (status change, assign, delete)
 * - Board view status change handler
 */
export function useProjectsView() {
  const queryClient = useQueryClient();
  const {
    filters,
    quickFilters,
    searchQuery,
    sortBy,
    sortOrder,
    page,
    pageSize,
    setTotal,
  } = useSavedViewContext();

  // Build query params from view state
  const queryParams = useMemo(() => {
    // Backend expects limit/offset
    const limit = pageSize;
    const offset = (page - 1) * pageSize;
    const params: Record<string, unknown> = {
      limit,
      offset,
    };

    // Search
    if (searchQuery) {
      params.search = searchQuery;
    }

    // Sort
    if (sortBy) {
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
    }

    // Filters
    const filterParams = buildFilterParams(filters, quickFilters);
    Object.assign(params, filterParams);

    return params;
  }, [filters, quickFilters, searchQuery, sortBy, sortOrder, page, pageSize]);

  // Fetch projects
  const {
    data: projectsData,
    isLoading,
    error,
    refetch,
  } = useQuery<ProjectsResponse>({
    queryKey: ["projects", queryParams],
    queryFn: async () => {
      const response = await apiClient.get<ProjectsResponse>("/projects", {
        params: queryParams,
      });
      // Update total in view state
      if (response.total !== undefined) {
        setTotal(response.total);
      }
      return response;
    },
    staleTime: 30_000, // 30 seconds
  });

  // Single project status change mutation (for board drag-drop)
  const singleStatusMutation = useMutation({
    mutationFn: async ({
      projectId,
      status,
    }: {
      projectId: string;
      status: string;
    }) => {
      await apiClient.patch(`/projects/${projectId}`, { status });
    },
    onSuccess: () => {
      toast.success("Project status updated");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => {
      toast.error("Failed to update project status");
    },
  });

  // Bulk status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      // Update each project individually since bulk endpoint may not exist
      await Promise.all(
        ids.map((id) => apiClient.patch(`/projects/${id}`, { status })),
      );
    },
    onSuccess: (_, variables) => {
      toast.success(`Updated ${variables.ids.length} project(s) status`);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => {
      toast.error("Failed to update project status");
    },
  });

  // Bulk assign mutation
  const assignMutation = useMutation({
    mutationFn: async ({
      ids,
      ownerId,
    }: {
      ids: string[];
      ownerId: string;
    }) => {
      // Update each project individually
      await Promise.all(
        ids.map((id) => apiClient.patch(`/projects/${id}`, { ownerId })),
      );
    },
    onSuccess: (_, variables) => {
      toast.success(`Assigned ${variables.ids.length} project(s)`);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => {
      toast.error("Failed to assign projects");
    },
  });

  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete each project individually
      await Promise.all(ids.map((id) => apiClient.delete(`/projects/${id}`)));
    },
    onSuccess: (_, variables) => {
      toast.success(`Deleted ${variables.length} project(s)`);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => {
      toast.error("Failed to delete projects");
    },
  });

  /**
   * Handle bulk actions from the toolbar
   */
  const handleBulkAction = useCallback(
    (actionId: string, selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        toast.error("No projects selected");
        return;
      }

      // Export action
      if (actionId === "export") {
        const exportUrl = `/api/v1/projects/export?ids=${selectedIds.join(",")}`;
        window.open(exportUrl, "_blank");
        return;
      }

      // Delete action
      if (actionId === "delete") {
        if (
          window.confirm(
            `Are you sure you want to delete ${selectedIds.length} project(s)?`,
          )
        ) {
          deleteMutation.mutate(selectedIds);
        }
        return;
      }

      // Status changes (e.g., "status-IN_PROGRESS", "status-COMPLETED")
      if (actionId.startsWith("status-")) {
        const status = actionId.replace("status-", "");
        statusMutation.mutate({ ids: selectedIds, status });
        return;
      }

      // Assignment (e.g., "assign-user123")
      if (actionId.startsWith("assign-")) {
        const ownerId = actionId.replace("assign-", "");
        assignMutation.mutate({ ids: selectedIds, ownerId });
        return;
      }
    },
    [statusMutation, assignMutation, deleteMutation],
  );

  /**
   * Handle status change from board drag-and-drop
   */
  const handleStatusChange = useCallback(
    (projectId: string, newStatus: string) => {
      singleStatusMutation.mutate({ projectId, status: newStatus });
    },
    [singleStatusMutation],
  );

  return {
    config: PROJECTS_VIEW_CONFIG,
    projects: projectsData?.data || [],
    totalRecords: projectsData?.total || 0,
    isLoading,
    error,
    refetch,
    handleBulkAction,
    handleStatusChange,
    // Expose mutation loading states for UI feedback
    isMutating:
      singleStatusMutation.isPending ||
      statusMutation.isPending ||
      assignMutation.isPending ||
      deleteMutation.isPending,
  };
}
