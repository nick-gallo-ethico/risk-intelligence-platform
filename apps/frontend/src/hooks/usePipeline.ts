"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { PipelineStage } from "@/types/record-detail";

/**
 * Options for configuring the usePipeline hook.
 */
interface UsePipelineOptions {
  /** The ID of the case to manage pipeline state for */
  caseId: string;
  /** The current stage ID of the case */
  currentStage: string;
  /** Array of all pipeline stages in order */
  stages: PipelineStage[];
  /** ISO date string when the current stage was entered */
  stageEnteredAt?: string;
  /** Callback fired when stage successfully changes */
  onStageChange?: (newStage: string) => void;
}

/**
 * Return type for the usePipeline hook.
 */
interface UsePipelineReturn {
  /** Array of all pipeline stages */
  stages: PipelineStage[];
  /** The current stage object (undefined if not found) */
  currentStage: PipelineStage | undefined;
  /** Index of current stage in the stages array (-1 if not found) */
  currentStageIndex: number;
  /** Number of days the case has been in the current stage */
  daysInCurrentStage: number;
  /** Check if transition to a specific stage is allowed */
  canTransitionTo: (stageId: string) => boolean;
  /** Request a stage transition with optional rationale */
  requestTransition: (stageId: string, rationale?: string) => Promise<void>;
  /** Whether a transition is currently in progress */
  isTransitioning: boolean;
}

/**
 * Hook for managing pipeline stage state and transitions.
 *
 * Provides:
 * - Current stage information and index
 * - Days in current stage calculation
 * - Transition validation via allowedTransitions
 * - API mutation for stage changes with cache invalidation
 *
 * @example
 * ```tsx
 * const { currentStage, daysInCurrentStage, canTransitionTo, requestTransition } = usePipeline({
 *   caseId: 'case-123',
 *   currentStage: 'active',
 *   stages: DEFAULT_CASE_PIPELINE,
 *   stageEnteredAt: '2026-02-01T00:00:00Z',
 * });
 *
 * if (canTransitionTo('review')) {
 *   await requestTransition('review', 'Investigation complete');
 * }
 * ```
 */
export function usePipeline({
  caseId,
  currentStage,
  stages,
  stageEnteredAt,
  onStageChange,
}: UsePipelineOptions): UsePipelineReturn {
  const queryClient = useQueryClient();

  // Find the current stage object from stages array
  const currentStageObj = useMemo(
    () => stages.find((s) => s.id === currentStage),
    [stages, currentStage],
  );

  // Find the index of the current stage
  const currentStageIndex = useMemo(
    () => stages.findIndex((s) => s.id === currentStage),
    [stages, currentStage],
  );

  // Calculate days in current stage from stageEnteredAt
  const daysInCurrentStage = useMemo(() => {
    if (!stageEnteredAt) return 0;
    const entered = new Date(stageEnteredAt);
    const now = new Date();
    const diffMs = now.getTime() - entered.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }, [stageEnteredAt]);

  // Check if transition to a stage is allowed based on allowedTransitions
  const canTransitionTo = useCallback(
    (stageId: string): boolean => {
      if (!currentStageObj) return false;
      // Cannot transition to current stage
      if (stageId === currentStage) return false;
      return currentStageObj.allowedTransitions.includes(stageId);
    },
    [currentStageObj, currentStage],
  );

  // Mutation for updating pipeline stage via API
  const transitionMutation = useMutation({
    mutationFn: async ({
      stageId,
      rationale,
    }: {
      stageId: string;
      rationale?: string;
    }) => {
      // PATCH the case with new pipeline stage and optional rationale
      await apiClient.patch(`/cases/${caseId}`, {
        pipelineStage: stageId,
        statusRationale: rationale,
      });
    },
    onSuccess: (_, { stageId }) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      onStageChange?.(stageId);
    },
  });

  // Wrapper function for requesting a stage transition
  const requestTransition = useCallback(
    async (stageId: string, rationale?: string) => {
      await transitionMutation.mutateAsync({ stageId, rationale });
    },
    [transitionMutation],
  );

  return {
    stages,
    currentStage: currentStageObj,
    currentStageIndex,
    daysInCurrentStage,
    canTransitionTo,
    requestTransition,
    isTransitioning: transitionMutation.isPending,
  };
}
