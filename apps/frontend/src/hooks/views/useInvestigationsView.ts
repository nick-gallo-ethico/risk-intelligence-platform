/**
 * useInvestigationsView Hook
 *
 * Provides data fetching, mutations, and bulk action handlers
 * for the Investigations module when used with the saved views system.
 */
"use client";

import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { INVESTIGATIONS_VIEW_CONFIG } from "@/lib/views/configs/investigations.config";
import { useSavedViewContext } from "./useSavedViewContext";
import { toast } from "sonner";
import type { FilterGroup } from "@/lib/views/types";

/**
 * Investigation entity type matching the backend model
 */
export interface Investigation extends Record<string, unknown> {
  id: string;
  investigationNumber: string;
  title: string;
  stage: string;
  type: string;
  outcome?: string;
  leadInvestigator?: {
    id: string;
    name: string;
    avatar?: string;
  };
  team?: {
    id: string;
    name: string;
  };
  case?: {
    id: string;
    caseNumber: string;
  };
  startedAt: string;
  targetEndDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  interviewCount: number;
  checklistProgress: number;
  documentCount: number;
  subjectCount: number;
}

interface InvestigationsResponse {
  data: Investigation[];
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
 * Hook for Investigations-specific view logic
 *
 * Provides:
 * - Fetching investigations based on current view state (filters, sort, search)
 * - Bulk action mutations (assign, stage change, merge, delete)
 * - Board view stage change handler
 */
export function useInvestigationsView() {
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

  // Fetch investigations
  const {
    data: investigationsData,
    isLoading,
    error,
    refetch,
  } = useQuery<InvestigationsResponse>({
    queryKey: ["investigations", queryParams],
    queryFn: async () => {
      const response = await apiClient.get<InvestigationsResponse>(
        "/investigations",
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

  // Bulk stage change mutation
  const stageMutation = useMutation({
    mutationFn: async ({ ids, stage }: { ids: string[]; stage: string }) => {
      const payload: BulkActionPayload = {
        action: "stage",
        ids,
        data: { stage },
      };
      await apiClient.post("/investigations/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Updated ${variables.ids.length} investigation(s) stage`);
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
    },
    onError: () => {
      toast.error("Failed to update investigation stage");
    },
  });

  // Bulk assign mutation
  const assignMutation = useMutation({
    mutationFn: async ({
      ids,
      leadInvestigatorId,
    }: {
      ids: string[];
      leadInvestigatorId: string;
    }) => {
      const payload: BulkActionPayload = {
        action: "assign",
        ids,
        data: { leadInvestigatorId },
      };
      await apiClient.post("/investigations/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Assigned ${variables.ids.length} investigation(s)`);
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
    },
    onError: () => {
      toast.error("Failed to assign investigations");
    },
  });

  // Bulk merge mutation
  const mergeMutation = useMutation({
    mutationFn: async ({
      ids,
      primaryId,
    }: {
      ids: string[];
      primaryId: string;
    }) => {
      const payload: BulkActionPayload = {
        action: "merge",
        ids,
        data: { primaryId },
      };
      await apiClient.post("/investigations/bulk", payload);
    },
    onSuccess: () => {
      toast.success("Investigations merged successfully");
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
    },
    onError: () => {
      toast.error("Failed to merge investigations");
    },
  });

  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const payload: BulkActionPayload = {
        action: "delete",
        ids,
      };
      await apiClient.post("/investigations/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Deleted ${variables.length} investigation(s)`);
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
    },
    onError: () => {
      toast.error("Failed to delete investigations");
    },
  });

  /**
   * Handle bulk actions from the toolbar
   */
  const handleBulkAction = useCallback(
    (actionId: string, selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        toast.error("No investigations selected");
        return;
      }

      // Export action
      if (actionId === "export") {
        const exportUrl = `/api/v1/investigations/export?ids=${selectedIds.join(",")}`;
        window.open(exportUrl, "_blank");
        return;
      }

      // Delete action
      if (actionId === "delete") {
        if (
          window.confirm(
            `Are you sure you want to delete ${selectedIds.length} investigation(s)?`,
          )
        ) {
          deleteMutation.mutate(selectedIds);
        }
        return;
      }

      // Stage changes (e.g., "stage-planning", "stage-closed")
      if (actionId.startsWith("stage-")) {
        const stage = actionId.replace("stage-", "");
        stageMutation.mutate({ ids: selectedIds, stage });
        return;
      }

      // Assignment (e.g., "assign-user123")
      if (actionId.startsWith("assign-")) {
        const leadInvestigatorId = actionId.replace("assign-", "");
        assignMutation.mutate({ ids: selectedIds, leadInvestigatorId });
        return;
      }

      // Merge (requires primary selection - handled by UI)
      if (actionId === "merge") {
        if (selectedIds.length < 2) {
          toast.error("Select at least 2 investigations to merge");
          return;
        }
        // The first selected is treated as primary
        mergeMutation.mutate({ ids: selectedIds, primaryId: selectedIds[0] });
        return;
      }
    },
    [stageMutation, assignMutation, deleteMutation, mergeMutation],
  );

  /**
   * Handle stage change from board drag-and-drop
   */
  const handleStageChange = useCallback(
    (investigationId: string, newStage: string) => {
      stageMutation.mutate({ ids: [investigationId], stage: newStage });
    },
    [stageMutation],
  );

  return {
    config: INVESTIGATIONS_VIEW_CONFIG,
    investigations: investigationsData?.data || [],
    totalRecords: investigationsData?.total || 0,
    isLoading,
    error,
    refetch,
    handleBulkAction,
    handleStageChange,
    // Expose mutation loading states for UI feedback
    isMutating:
      stageMutation.isPending ||
      assignMutation.isPending ||
      deleteMutation.isPending ||
      mergeMutation.isPending,
  };
}
