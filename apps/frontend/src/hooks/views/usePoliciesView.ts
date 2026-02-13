/**
 * usePoliciesView Hook
 *
 * Provides data fetching, mutations, and bulk action handlers
 * for the Policies module when used with the saved views system.
 */
"use client";

import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { POLICIES_VIEW_CONFIG } from "@/lib/views/configs/policies.config";
import { useSavedViewContext } from "./useSavedViewContext";
import { toast } from "sonner";
import type { FilterGroup } from "@/lib/views/types";

/**
 * Policy entity type matching the backend model
 */
export interface Policy extends Record<string, unknown> {
  id: string;
  policyNumber: string;
  title: string;
  status: string;
  category: string;
  version: string;
  owner?: {
    id: string;
    name: string;
    avatar?: string;
  };
  department?: {
    id: string;
    name: string;
  };
  createdBy?: {
    id: string;
    name: string;
  };
  effectiveDate?: string;
  lastReviewDate?: string;
  nextReviewDate?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  attestationRate?: number;
  totalAttestations?: number;
  pendingAttestations?: number;
  translationsCount?: number;
  wordCount?: number;
}

interface PoliciesResponse {
  data: Policy[];
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
 * Hook for Policies-specific view logic
 *
 * Provides:
 * - Fetching policies based on current view state (filters, sort, search)
 * - Bulk action mutations (assign, status change, publish, archive, delete)
 * - Board view status change handler
 */
export function usePoliciesView() {
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
    // Backend expects page/limit (not offset)
    const params: Record<string, unknown> = {
      limit: pageSize,
      page,
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

  // Fetch policies
  const {
    data: policiesData,
    isLoading,
    error,
    refetch,
  } = useQuery<PoliciesResponse>({
    queryKey: ["policies", queryParams],
    queryFn: async () => {
      const response = await apiClient.get<PoliciesResponse>("/policies", {
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
      await apiClient.post("/policies/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Updated ${variables.ids.length} policy/policies status`);
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
    onError: () => {
      toast.error("Failed to update policy status");
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
      const payload: BulkActionPayload = {
        action: "assign",
        ids,
        data: { ownerId },
      };
      await apiClient.post("/policies/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Assigned ${variables.ids.length} policy/policies`);
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
    onError: () => {
      toast.error("Failed to assign policies");
    },
  });

  // Bulk publish mutation
  const publishMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const payload: BulkActionPayload = {
        action: "publish",
        ids,
      };
      await apiClient.post("/policies/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Published ${variables.length} policy/policies`);
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
    onError: () => {
      toast.error("Failed to publish policies");
    },
  });

  // Bulk archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const payload: BulkActionPayload = {
        action: "archive",
        ids,
      };
      await apiClient.post("/policies/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Archived ${variables.length} policy/policies`);
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
    onError: () => {
      toast.error("Failed to archive policies");
    },
  });

  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const payload: BulkActionPayload = {
        action: "delete",
        ids,
      };
      await apiClient.post("/policies/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Deleted ${variables.length} policy/policies`);
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
    onError: () => {
      toast.error("Failed to delete policies");
    },
  });

  /**
   * Handle bulk actions from the toolbar
   */
  const handleBulkAction = useCallback(
    (actionId: string, selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        toast.error("No policies selected");
        return;
      }

      // Export action
      if (actionId === "export") {
        const exportUrl = `/api/v1/policies/export?ids=${selectedIds.join(",")}`;
        window.open(exportUrl, "_blank");
        return;
      }

      // Delete action
      if (actionId === "delete") {
        if (
          window.confirm(
            `Are you sure you want to delete ${selectedIds.length} policy/policies?`,
          )
        ) {
          deleteMutation.mutate(selectedIds);
        }
        return;
      }

      // Publish action
      if (actionId === "publish") {
        if (
          window.confirm(
            `Publish ${selectedIds.length} policy/policies? This will make them visible to employees.`,
          )
        ) {
          publishMutation.mutate(selectedIds);
        }
        return;
      }

      // Archive action
      if (actionId === "archive") {
        if (
          window.confirm(
            `Archive ${selectedIds.length} policy/policies? This will mark them as inactive.`,
          )
        ) {
          archiveMutation.mutate(selectedIds);
        }
        return;
      }

      // Status changes (e.g., "status-draft", "status-published")
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
    [
      statusMutation,
      assignMutation,
      deleteMutation,
      publishMutation,
      archiveMutation,
    ],
  );

  /**
   * Handle status change from board drag-and-drop
   */
  const handleStatusChange = useCallback(
    (policyId: string, newStatus: string) => {
      statusMutation.mutate({ ids: [policyId], status: newStatus });
    },
    [statusMutation],
  );

  return {
    config: POLICIES_VIEW_CONFIG,
    policies: policiesData?.data || [],
    totalRecords: policiesData?.total || 0,
    isLoading,
    error,
    refetch,
    handleBulkAction,
    handleStatusChange,
    // Expose mutation loading states for UI feedback
    isMutating:
      statusMutation.isPending ||
      assignMutation.isPending ||
      deleteMutation.isPending ||
      publishMutation.isPending ||
      archiveMutation.isPending,
  };
}
