/**
 * useCasesView Hook
 *
 * Provides data fetching, mutations, and bulk action handlers
 * for the Cases module when used with the saved views system.
 */
"use client";

import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { CASES_VIEW_CONFIG } from "@/lib/views/configs/cases.config";
import { useSavedViewContext } from "./useSavedViewContext";
import { toast } from "sonner";
import type { FilterGroup } from "@/lib/views/types";

/**
 * Case entity type matching the backend model
 */
export interface Case extends Record<string, unknown> {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  team?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  closedAt?: string;
  sourceChannel?: string;
  businessUnit?: {
    id: string;
    name: string;
  };
  location?: string;
  investigationsCount: number;
  hasOpenInvestigation: boolean;
  aiSummary?: string;
  aiRiskScore?: number;
}

interface CasesResponse {
  data: Case[];
  total: number;
  page: number;
  pageSize: number;
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
  filters: FilterGroup[],
  quickFilters: Record<string, unknown>,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  // Collect all conditions from filter groups
  const allConditions = filters.flatMap((group) => group.conditions);

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
 * Hook for Cases-specific view logic
 *
 * Provides:
 * - Fetching cases based on current view state (filters, sort, search)
 * - Bulk action mutations (assign, status, priority, delete)
 * - Board view status change handler
 */
export function useCasesView() {
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
    const params: Record<string, unknown> = {
      page,
      pageSize,
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

  // Fetch cases
  const {
    data: casesData,
    isLoading,
    error,
    refetch,
  } = useQuery<CasesResponse>({
    queryKey: ["cases", queryParams],
    queryFn: async () => {
      const response = await apiClient.get<CasesResponse>("/cases", {
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

  // Bulk status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const payload: BulkActionPayload = {
        action: "status",
        ids,
        data: { status },
      };
      await apiClient.post("/cases/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Updated ${variables.ids.length} case(s) status`);
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
    onError: () => {
      toast.error("Failed to update case status");
    },
  });

  // Bulk priority change mutation
  const priorityMutation = useMutation({
    mutationFn: async ({
      ids,
      priority,
    }: {
      ids: string[];
      priority: string;
    }) => {
      const payload: BulkActionPayload = {
        action: "priority",
        ids,
        data: { priority },
      };
      await apiClient.post("/cases/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Updated ${variables.ids.length} case(s) priority`);
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
    onError: () => {
      toast.error("Failed to update case priority");
    },
  });

  // Bulk assign mutation
  const assignMutation = useMutation({
    mutationFn: async ({
      ids,
      assigneeId,
    }: {
      ids: string[];
      assigneeId: string;
    }) => {
      const payload: BulkActionPayload = {
        action: "assign",
        ids,
        data: { assigneeId },
      };
      await apiClient.post("/cases/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Assigned ${variables.ids.length} case(s)`);
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
    onError: () => {
      toast.error("Failed to assign cases");
    },
  });

  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const payload: BulkActionPayload = {
        action: "delete",
        ids,
      };
      await apiClient.post("/cases/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Deleted ${variables.length} case(s)`);
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
    onError: () => {
      toast.error("Failed to delete cases");
    },
  });

  /**
   * Handle bulk actions from the toolbar
   */
  const handleBulkAction = useCallback(
    (actionId: string, selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        toast.error("No cases selected");
        return;
      }

      // Export action
      if (actionId === "export") {
        const exportUrl = `/api/v1/cases/export?ids=${selectedIds.join(",")}`;
        window.open(exportUrl, "_blank");
        return;
      }

      // Delete action
      if (actionId === "delete") {
        if (
          window.confirm(
            `Are you sure you want to delete ${selectedIds.length} case(s)?`,
          )
        ) {
          deleteMutation.mutate(selectedIds);
        }
        return;
      }

      // Status changes (e.g., "status-open", "status-closed")
      if (actionId.startsWith("status-")) {
        const status = actionId.replace("status-", "");
        statusMutation.mutate({ ids: selectedIds, status });
        return;
      }

      // Priority changes (e.g., "priority-high", "priority-critical")
      if (actionId.startsWith("priority-")) {
        const priority = actionId.replace("priority-", "");
        priorityMutation.mutate({ ids: selectedIds, priority });
        return;
      }

      // Assignment (e.g., "assign-user123")
      if (actionId.startsWith("assign-")) {
        const assigneeId = actionId.replace("assign-", "");
        assignMutation.mutate({ ids: selectedIds, assigneeId });
        return;
      }
    },
    [statusMutation, priorityMutation, assignMutation, deleteMutation],
  );

  /**
   * Handle status change from board drag-and-drop
   */
  const handleStatusChange = useCallback(
    (caseId: string, newStatus: string) => {
      statusMutation.mutate({ ids: [caseId], status: newStatus });
    },
    [statusMutation],
  );

  return {
    config: CASES_VIEW_CONFIG,
    cases: casesData?.data || [],
    totalRecords: casesData?.total || 0,
    isLoading,
    error,
    refetch,
    handleBulkAction,
    handleStatusChange,
    // Expose mutation loading states for UI feedback
    isMutating:
      statusMutation.isPending ||
      priorityMutation.isPending ||
      assignMutation.isPending ||
      deleteMutation.isPending,
  };
}
