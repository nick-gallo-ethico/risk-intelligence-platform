"use client";

/**
 * useAiSkills Hook
 *
 * Generic hook for executing any AI skill via the skill registry API.
 *
 * Features:
 * - Calls POST /api/v1/ai/skills/:skillId/execute
 * - Handles rate limiting gracefully
 * - Returns typed skill results with metadata
 *
 * @see useAiNoteCleanup for skill-specific consumer example
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { apiClient } from "@/lib/api";

/**
 * Metadata returned from skill execution.
 */
export interface SkillMetadata {
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  model?: string;
}

/**
 * Generic skill result structure.
 */
export interface SkillResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: SkillMetadata;
}

/**
 * Return type for useAiSkills hook.
 */
export interface UseAiSkillsReturn<T = unknown> {
  /** Execute a skill */
  executeSkill: (
    skillId: string,
    input: Record<string, unknown>,
  ) => Promise<SkillResult<T>>;
  /** Whether skill execution is in progress */
  isExecuting: boolean;
  /** Error from last execution */
  error: Error | null;
  /** Rate limit retry after (ms) - null if not rate limited */
  rateLimitRetryAfter: number | null;
  /** Clear state */
  reset: () => void;
}

/**
 * Hook for executing AI skills.
 *
 * @returns Skill execution methods and state
 *
 * @example
 * ```tsx
 * const { executeSkill, isExecuting, error } = useAiSkills<SummarizeOutput>();
 *
 * const handleSummarize = async () => {
 *   const result = await executeSkill('summarize', {
 *     content: 'My case content...',
 *     style: 'brief',
 *   });
 *   if (result.success && result.data) {
 *     setSummary(result.data.summary);
 *   }
 * };
 * ```
 */
export function useAiSkills<T = unknown>(): UseAiSkillsReturn<T> {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(
    null,
  );

  // Ref for tracking mounted state
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Clear rate limit after timeout
  useEffect(() => {
    if (rateLimitRetryAfter && rateLimitRetryAfter > 0) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setRateLimitRetryAfter(null);
        }
      }, rateLimitRetryAfter);

      return () => clearTimeout(timer);
    }
  }, [rateLimitRetryAfter]);

  /**
   * Execute an AI skill.
   *
   * @param skillId - Skill identifier (e.g., 'summarize', 'category-suggest', 'risk-score')
   * @param input - Skill input parameters (validated by backend schema)
   * @returns Skill result with data or error
   */
  const executeSkill = useCallback(
    async (
      skillId: string,
      input: Record<string, unknown>,
    ): Promise<SkillResult<T>> => {
      setIsExecuting(true);
      setError(null);
      setRateLimitRetryAfter(null);

      try {
        const result = await apiClient.post<SkillResult<T>>(
          `/ai/skills/${skillId}/execute`,
          { input },
        );

        if (!isMountedRef.current) {
          return result;
        }

        if (!result.success) {
          // Check for rate limit error
          if (
            result.error &&
            result.error.toLowerCase().includes("rate limit")
          ) {
            // Extract retry after from error message
            const retryMatch = result.error.match(/(\d+)\s*seconds/);
            const retrySeconds = retryMatch ? parseInt(retryMatch[1], 10) : 60;
            setRateLimitRetryAfter(retrySeconds * 1000);
            setError(new Error("Rate limit exceeded"));
          } else {
            setError(new Error(result.error || "Skill execution failed"));
          }
        }

        return result;
      } catch (err) {
        if (!isMountedRef.current) {
          return { success: false, error: "Component unmounted" };
        }

        // Check for rate limit error in response
        const axiosError = err as {
          response?: { status: number; data?: { message?: string } };
        };
        if (axiosError.response?.status === 429) {
          const retryAfter = 60000; // Default 60 seconds
          setRateLimitRetryAfter(retryAfter);
          setError(new Error("Rate limit exceeded"));
          return { success: false, error: "Rate limit exceeded" };
        }

        const error =
          err instanceof Error ? err : new Error("Skill execution failed");
        setError(error);
        return { success: false, error: error.message };
      } finally {
        if (isMountedRef.current) {
          setIsExecuting(false);
        }
      }
    },
    [],
  );

  /**
   * Reset state.
   */
  const reset = useCallback(() => {
    setIsExecuting(false);
    setError(null);
    setRateLimitRetryAfter(null);
  }, []);

  return {
    executeSkill,
    isExecuting,
    error,
    rateLimitRetryAfter,
    reset,
  };
}
