"use client";

/**
 * useAiActions Hook
 *
 * Hook for the preview-then-execute AI action pattern.
 * Provides functions to preview, execute, and undo AI actions.
 *
 * Endpoints:
 * - GET /ai/actions?entityType=case - List available actions
 * - POST /ai/actions/:actionId/preview - Preview changes
 * - POST /ai/actions/:actionId/execute - Execute action
 * - POST /ai/actions/:actionId/undo - Undo action (within window)
 * - GET /ai/actions/:actionId/can-undo - Check undo availability
 *
 * @see AiActionPreview for the confirmation dialog component
 * @see ActionExecutorService (backend) for execution logic
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { apiClient } from "@/lib/api";

/**
 * Change preview showing field-level before/after values.
 */
export interface ActionChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Preview result from backend action executor.
 * Shows what the action will change before execution.
 */
export interface ActionPreview {
  description: string;
  changes: ActionChange[];
  warnings?: string[];
  estimatedDuration?: string;
}

/**
 * Available action from catalog.
 */
export interface AvailableAction {
  id: string;
  name: string;
  description: string;
  category: "quick" | "standard" | "critical" | "external";
  requiresPreview: boolean;
  undoable: boolean;
  undoWindowSeconds: number;
}

/**
 * Result from action execution.
 */
export interface ActionExecutionResult {
  success: boolean;
  actionId: string;
  result?: {
    success: boolean;
    message?: string;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
  };
  error?: string;
  undoAvailable: boolean;
  undoExpiresAt?: string;
}

/**
 * Undo availability check result.
 */
export interface CanUndoResult {
  canUndo: boolean;
  remainingSeconds?: number;
}

/**
 * Return type for useAiActions hook.
 */
export interface UseAiActionsReturn {
  /** List available actions for an entity type */
  listActions: (entityType?: string) => Promise<AvailableAction[]>;
  /** Preview an action before execution */
  preview: (
    actionId: string,
    params: {
      input: Record<string, unknown>;
      entityType: string;
      entityId: string;
    },
  ) => Promise<ActionPreview | null>;
  /** Execute an action */
  execute: (
    actionId: string,
    params: {
      input: Record<string, unknown>;
      entityType: string;
      entityId: string;
      skipPreview?: boolean;
    },
  ) => Promise<ActionExecutionResult | null>;
  /** Undo an executed action */
  undo: (
    actionRecordId: string,
    params: { entityType: string; entityId: string },
  ) => Promise<boolean>;
  /** Check if an action can be undone */
  canUndo: (
    actionRecordId: string,
    entityType: string,
    entityId: string,
  ) => Promise<CanUndoResult>;
  /** Loading state */
  isLoading: boolean;
  /** Error message from last operation */
  error: string | null;
  /** Current preview (set after calling preview) */
  currentPreview: ActionPreview | null;
  /** Clear current preview and error */
  clearPreview: () => void;
  /** Last execution result (for undo tracking) */
  lastResult: ActionExecutionResult | null;
}

/**
 * Hook for AI action preview-then-execute pattern.
 *
 * @returns Action methods and state
 *
 * @example
 * ```tsx
 * const { preview, execute, isLoading, currentPreview, clearPreview } = useAiActions();
 *
 * // Preview changes before executing
 * const previewResult = await preview('change-status', {
 *   input: { newStatus: 'CLOSED' },
 *   entityType: 'case',
 *   entityId: 'case-123'
 * });
 *
 * // Show preview to user, then execute
 * if (previewResult && userConfirmed) {
 *   const result = await execute('change-status', {
 *     input: { newStatus: 'CLOSED' },
 *     entityType: 'case',
 *     entityId: 'case-123'
 *   });
 * }
 * ```
 */
export function useAiActions(): UseAiActionsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPreview, setCurrentPreview] = useState<ActionPreview | null>(
    null,
  );
  const [lastResult, setLastResult] = useState<ActionExecutionResult | null>(
    null,
  );

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * List available actions for an entity type.
   */
  const listActions = useCallback(
    async (entityType?: string): Promise<AvailableAction[]> => {
      try {
        const params = entityType
          ? `?entityType=${encodeURIComponent(entityType)}`
          : "";
        const response = await apiClient.get<AvailableAction[]>(
          `/ai/actions${params}`,
        );
        return response || [];
      } catch {
        return [];
      }
    },
    [],
  );

  /**
   * Preview an action before execution.
   * Sets currentPreview on success for use with AiActionPreview component.
   */
  const preview = useCallback(
    async (
      actionId: string,
      params: {
        input: Record<string, unknown>;
        entityType: string;
        entityId: string;
      },
    ): Promise<ActionPreview | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<ActionPreview>(
          `/ai/actions/${encodeURIComponent(actionId)}/preview`,
          params,
        );

        if (!isMountedRef.current) return null;

        setCurrentPreview(response);
        return response;
      } catch (err: unknown) {
        if (!isMountedRef.current) return null;

        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        const message =
          axiosError?.response?.data?.message || "Action preview failed";
        setError(message);
        return null;
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  /**
   * Execute an action.
   * Returns result with actionId for undo tracking.
   */
  const execute = useCallback(
    async (
      actionId: string,
      params: {
        input: Record<string, unknown>;
        entityType: string;
        entityId: string;
        skipPreview?: boolean;
      },
    ): Promise<ActionExecutionResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<ActionExecutionResult>(
          `/ai/actions/${encodeURIComponent(actionId)}/execute`,
          params,
        );

        if (!isMountedRef.current) return null;

        // Clear preview on successful execution
        setCurrentPreview(null);

        if (response.success) {
          setLastResult(response);
          return response;
        } else {
          setError(response.error || "Action execution failed");
          return response;
        }
      } catch (err: unknown) {
        if (!isMountedRef.current) return null;

        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        const message =
          axiosError?.response?.data?.message || "Action execution failed";
        setError(message);
        return null;
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  /**
   * Undo an executed action within its undo window.
   */
  const undo = useCallback(
    async (
      actionRecordId: string,
      params: { entityType: string; entityId: string },
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<{ success: boolean }>(
          `/ai/actions/${encodeURIComponent(actionRecordId)}/undo`,
          params,
        );

        if (!isMountedRef.current) return false;

        if (response?.success) {
          setLastResult(null); // Clear last result after undo
          return true;
        }
        return false;
      } catch (err: unknown) {
        if (!isMountedRef.current) return false;

        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        const message = axiosError?.response?.data?.message || "Undo failed";
        setError(message);
        return false;
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  /**
   * Check if an action can be undone.
   */
  const canUndo = useCallback(
    async (
      actionRecordId: string,
      entityType: string,
      entityId: string,
    ): Promise<CanUndoResult> => {
      try {
        const params = new URLSearchParams({
          entityType,
          entityId,
        });
        const response = await apiClient.get<CanUndoResult>(
          `/ai/actions/${encodeURIComponent(actionRecordId)}/can-undo?${params.toString()}`,
        );
        return response || { canUndo: false };
      } catch {
        return { canUndo: false };
      }
    },
    [],
  );

  /**
   * Clear current preview and error state.
   */
  const clearPreview = useCallback(() => {
    setCurrentPreview(null);
    setError(null);
  }, []);

  return {
    listActions,
    preview,
    execute,
    undo,
    canUndo,
    isLoading,
    error,
    currentPreview,
    clearPreview,
    lastResult,
  };
}
