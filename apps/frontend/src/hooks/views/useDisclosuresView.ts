/**
 * useDisclosuresView Hook
 *
 * Provides data fetching, mutations, and bulk action handlers
 * for the Disclosures module when used with the saved views system.
 */
"use client";

import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { DISCLOSURES_VIEW_CONFIG } from "@/lib/views/configs/disclosures.config";
import { useSavedViewContext } from "./useSavedViewContext";
import { toast } from "sonner";
import type { FilterGroup } from "@/lib/views/types";

/**
 * Disclosure entity type matching the backend model
 */
export interface Disclosure extends Record<string, unknown> {
  id: string;
  disclosureNumber: string;
  type: string;
  status: string;
  riskLevel?: string;
  submitter?: {
    id: string;
    name: string;
    email?: string;
    department?: {
      id: string;
      name: string;
    };
    title?: string;
  };
  reviewer?: {
    id: string;
    name: string;
  };
  reviewNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
  dueDate?: string;
  // Gift/Entertainment fields
  giftValue?: number;
  giftDescription?: string;
  giftGiver?: string;
  // Relationship fields
  thirdParty?: string;
  relationship?: string;
  conflictNature?: string;
  // Outside activity fields
  activityName?: string;
  hoursPerWeek?: number;
  compensation?: boolean;
  // Campaign info
  campaign?: {
    id: string;
    name: string;
    year?: number;
  };
  // Outcome
  createdCase?: boolean;
  linkedCase?: {
    id: string;
    caseNumber: string;
  };
}

interface DisclosuresResponse {
  data: Disclosure[];
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
 * Hook for Disclosures-specific view logic
 *
 * Provides:
 * - Fetching disclosures based on current view state (filters, sort, search)
 * - Bulk action mutations (assign, status, risk level, delete)
 * - Board view status change handler
 */
export function useDisclosuresView() {
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
    // Backend expects limit/offset, not page/pageSize
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

  // Fetch disclosures
  const {
    data: disclosuresData,
    isLoading,
    error,
    refetch,
  } = useQuery<DisclosuresResponse>({
    queryKey: ["disclosures", queryParams],
    queryFn: async () => {
      const response = await apiClient.get<DisclosuresResponse>(
        "/disclosures",
        {
          params: queryParams,
        },
      );
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
      await apiClient.post("/disclosures/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Updated ${variables.ids.length} disclosure(s) status`);
      queryClient.invalidateQueries({ queryKey: ["disclosures"] });
    },
    onError: () => {
      toast.error("Failed to update disclosure status");
    },
  });

  // Bulk risk level change mutation
  const riskMutation = useMutation({
    mutationFn: async ({
      ids,
      riskLevel,
    }: {
      ids: string[];
      riskLevel: string;
    }) => {
      const payload: BulkActionPayload = {
        action: "risk",
        ids,
        data: { riskLevel },
      };
      await apiClient.post("/disclosures/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Updated ${variables.ids.length} disclosure(s) risk level`);
      queryClient.invalidateQueries({ queryKey: ["disclosures"] });
    },
    onError: () => {
      toast.error("Failed to update risk level");
    },
  });

  // Bulk assign mutation
  const assignMutation = useMutation({
    mutationFn: async ({
      ids,
      reviewerId,
    }: {
      ids: string[];
      reviewerId: string;
    }) => {
      const payload: BulkActionPayload = {
        action: "assign",
        ids,
        data: { reviewerId },
      };
      await apiClient.post("/disclosures/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Assigned ${variables.ids.length} disclosure(s)`);
      queryClient.invalidateQueries({ queryKey: ["disclosures"] });
    },
    onError: () => {
      toast.error("Failed to assign disclosures");
    },
  });

  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const payload: BulkActionPayload = {
        action: "delete",
        ids,
      };
      await apiClient.post("/disclosures/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Deleted ${variables.length} disclosure(s)`);
      queryClient.invalidateQueries({ queryKey: ["disclosures"] });
    },
    onError: () => {
      toast.error("Failed to delete disclosures");
    },
  });

  /**
   * Handle bulk actions from the toolbar
   */
  const handleBulkAction = useCallback(
    (actionId: string, selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        toast.error("No disclosures selected");
        return;
      }

      // Export action
      if (actionId === "export") {
        const exportUrl = `/api/v1/disclosures/export?ids=${selectedIds.join(",")}`;
        window.open(exportUrl, "_blank");
        return;
      }

      // Delete action
      if (actionId === "delete") {
        if (
          window.confirm(
            `Are you sure you want to delete ${selectedIds.length} disclosure(s)?`,
          )
        ) {
          deleteMutation.mutate(selectedIds);
        }
        return;
      }

      // Status changes (e.g., "status-pending_review", "status-approved")
      if (actionId.startsWith("status-")) {
        const status = actionId.replace("status-", "");
        statusMutation.mutate({ ids: selectedIds, status });
        return;
      }

      // Risk level changes (e.g., "risk-high", "risk-low")
      if (actionId.startsWith("risk-")) {
        const riskLevel = actionId.replace("risk-", "");
        riskMutation.mutate({ ids: selectedIds, riskLevel });
        return;
      }

      // Assignment (e.g., "assign-user123")
      if (actionId.startsWith("assign-")) {
        const reviewerId = actionId.replace("assign-", "");
        assignMutation.mutate({ ids: selectedIds, reviewerId });
        return;
      }
    },
    [statusMutation, riskMutation, assignMutation, deleteMutation],
  );

  /**
   * Handle status change from board drag-and-drop
   */
  const handleStatusChange = useCallback(
    (disclosureId: string, newStatus: string) => {
      statusMutation.mutate({ ids: [disclosureId], status: newStatus });
    },
    [statusMutation],
  );

  return {
    config: DISCLOSURES_VIEW_CONFIG,
    disclosures: disclosuresData?.data || [],
    totalRecords: disclosuresData?.total || 0,
    isLoading,
    error,
    refetch,
    handleBulkAction,
    handleStatusChange,
    // Expose mutation loading states for UI feedback
    isMutating:
      statusMutation.isPending ||
      riskMutation.isPending ||
      assignMutation.isPending ||
      deleteMutation.isPending,
  };
}
