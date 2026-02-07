/**
 * useIntakeFormsView Hook
 *
 * Provides data fetching, mutations, and bulk action handlers
 * for the Intake Forms module when used with the saved views system.
 */
"use client";

import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { INTAKE_FORMS_VIEW_CONFIG } from "@/lib/views/configs/intake-forms.config";
import { useSavedViewContext } from "./useSavedViewContext";
import { toast } from "sonner";
import type { FilterGroup } from "@/lib/views/types";

/**
 * Intake form submission entity type matching the backend model
 */
export interface IntakeFormSubmission extends Record<string, unknown> {
  id: string;
  submissionId: string;
  form?: {
    id: string;
    name: string;
    type: string;
  };
  status: string;
  sourceChannel?: string;
  submitter?: {
    id: string;
    name: string;
    email?: string;
    department?: {
      id: string;
      name: string;
    };
  };
  isAnonymous?: boolean;
  submittedAt: string;
  processedAt?: string;
  createdAt: string;
  assignee?: {
    id: string;
    name: string;
  };
  team?: {
    id: string;
    name: string;
  };
  // Outcome fields
  createdRiu?: boolean;
  createdCase?: boolean;
  linkedCase?: {
    id: string;
    caseNumber: string;
  };
  linkedRiu?: {
    id: string;
    riuNumber: string;
  };
  // AI Triage fields
  aiCategory?: string;
  aiPriority?: string;
  aiSummary?: string;
  aiConfidence?: number;
}

interface IntakeFormsResponse {
  data: IntakeFormSubmission[];
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
 * Hook for Intake Forms-specific view logic
 *
 * Provides:
 * - Fetching submissions based on current view state (filters, sort, search)
 * - Bulk action mutations (assign, status, create cases, delete)
 * - Board view status change handler
 */
export function useIntakeFormsView() {
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

  // Fetch submissions
  const {
    data: submissionsData,
    isLoading,
    error,
    refetch,
  } = useQuery<IntakeFormsResponse>({
    queryKey: ["intake-forms", queryParams],
    queryFn: async () => {
      const response = await apiClient.get<IntakeFormsResponse>(
        "/intake-forms/submissions",
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
      await apiClient.post("/intake-forms/submissions/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Updated ${variables.ids.length} submission(s) status`);
      queryClient.invalidateQueries({ queryKey: ["intake-forms"] });
    },
    onError: () => {
      toast.error("Failed to update submission status");
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
      await apiClient.post("/intake-forms/submissions/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Assigned ${variables.ids.length} submission(s)`);
      queryClient.invalidateQueries({ queryKey: ["intake-forms"] });
    },
    onError: () => {
      toast.error("Failed to assign submissions");
    },
  });

  // Bulk create cases mutation
  const createCasesMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const payload: BulkActionPayload = {
        action: "create-cases",
        ids,
      };
      await apiClient.post("/intake-forms/submissions/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Created cases from ${variables.length} submission(s)`);
      queryClient.invalidateQueries({ queryKey: ["intake-forms"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
    onError: () => {
      toast.error("Failed to create cases");
    },
  });

  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const payload: BulkActionPayload = {
        action: "delete",
        ids,
      };
      await apiClient.post("/intake-forms/submissions/bulk", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(`Deleted ${variables.length} submission(s)`);
      queryClient.invalidateQueries({ queryKey: ["intake-forms"] });
    },
    onError: () => {
      toast.error("Failed to delete submissions");
    },
  });

  /**
   * Handle bulk actions from the toolbar
   */
  const handleBulkAction = useCallback(
    (actionId: string, selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        toast.error("No submissions selected");
        return;
      }

      // Export action
      if (actionId === "export") {
        const exportUrl = `/api/v1/intake-forms/submissions/export?ids=${selectedIds.join(",")}`;
        window.open(exportUrl, "_blank");
        return;
      }

      // Delete action
      if (actionId === "delete") {
        if (
          window.confirm(
            `Are you sure you want to delete ${selectedIds.length} submission(s)?`,
          )
        ) {
          deleteMutation.mutate(selectedIds);
        }
        return;
      }

      // Create cases action
      if (actionId === "create-cases") {
        if (
          window.confirm(
            `Create cases from ${selectedIds.length} submission(s)?`,
          )
        ) {
          createCasesMutation.mutate(selectedIds);
        }
        return;
      }

      // Status changes (e.g., "status-submitted", "status-processed")
      if (actionId.startsWith("status-")) {
        const status = actionId.replace("status-", "");
        statusMutation.mutate({ ids: selectedIds, status });
        return;
      }

      // Assignment (e.g., "assign-user123")
      if (actionId.startsWith("assign-")) {
        const assigneeId = actionId.replace("assign-", "");
        assignMutation.mutate({ ids: selectedIds, assigneeId });
        return;
      }
    },
    [statusMutation, assignMutation, createCasesMutation, deleteMutation],
  );

  /**
   * Handle status change from board drag-and-drop
   */
  const handleStatusChange = useCallback(
    (submissionId: string, newStatus: string) => {
      statusMutation.mutate({ ids: [submissionId], status: newStatus });
    },
    [statusMutation],
  );

  return {
    config: INTAKE_FORMS_VIEW_CONFIG,
    submissions: submissionsData?.data || [],
    totalRecords: submissionsData?.total || 0,
    isLoading,
    error,
    refetch,
    handleBulkAction,
    handleStatusChange,
    // Expose mutation loading states for UI feedback
    isMutating:
      statusMutation.isPending ||
      assignMutation.isPending ||
      createCasesMutation.isPending ||
      deleteMutation.isPending,
  };
}
