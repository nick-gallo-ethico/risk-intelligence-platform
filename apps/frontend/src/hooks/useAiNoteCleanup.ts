'use client';

/**
 * useAiNoteCleanup Hook
 *
 * Hook for AI-powered note cleanup via the note-cleanup skill.
 *
 * Features:
 * - Calls /api/v1/ai/skills/note-cleanup endpoint
 * - Handles rate limiting gracefully
 * - Returns cleaned content and metadata
 *
 * @see AiNoteCleanup for primary consumer
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';

/**
 * Cleanup style options.
 */
export type CleanupStyle = 'light' | 'full';

/**
 * Cleanup result from API.
 */
export interface CleanupResult {
  success: boolean;
  data?: {
    cleanedContent: string;
    changes: Array<{
      type: 'grammar' | 'formatting' | 'clarity' | 'structure';
      count: number;
    }>;
    originalLength: number;
    cleanedLength: number;
  };
  error?: string;
  metadata?: {
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    model: string;
  };
}

/**
 * Return type for useAiNoteCleanup hook.
 */
export interface UseAiNoteCleanupReturn {
  /** Execute cleanup */
  cleanup: (content: string, style: CleanupStyle) => Promise<CleanupResult>;
  /** Cleaned content from last cleanup */
  cleanedContent: string | null;
  /** Whether cleanup is in progress */
  isProcessing: boolean;
  /** Error from last cleanup */
  error: Error | null;
  /** Rate limit retry after (ms) - null if not rate limited */
  rateLimitRetryAfter: number | null;
  /** Clear state */
  reset: () => void;
}

/**
 * Hook for AI note cleanup.
 *
 * @returns Cleanup methods and state
 */
export function useAiNoteCleanup(): UseAiNoteCleanupReturn {
  const [cleanedContent, setCleanedContent] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(
    null
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
   * Execute note cleanup.
   */
  const cleanup = useCallback(
    async (content: string, style: CleanupStyle): Promise<CleanupResult> => {
      if (!content || content.length < 10) {
        const emptyError = new Error('Content too short for cleanup');
        setError(emptyError);
        return { success: false, error: emptyError.message };
      }

      setIsProcessing(true);
      setError(null);
      setRateLimitRetryAfter(null);

      try {
        const result = await apiClient.post<CleanupResult>(
          '/ai/skills/note-cleanup/execute',
          {
            input: {
              content,
              style,
              context: 'hotline intake notes',
            },
          }
        );

        if (!isMountedRef.current) {
          return result;
        }

        if (result.success && result.data) {
          setCleanedContent(result.data.cleanedContent);
          return result;
        } else {
          // Check for rate limit error
          if (
            result.error &&
            result.error.toLowerCase().includes('rate limit')
          ) {
            // Extract retry after from error message
            const retryMatch = result.error.match(/(\d+)\s*seconds/);
            const retrySeconds = retryMatch ? parseInt(retryMatch[1], 10) : 60;
            setRateLimitRetryAfter(retrySeconds * 1000);
            setError(new Error('Rate limit exceeded'));
          } else {
            setError(new Error(result.error || 'Cleanup failed'));
          }
          return result;
        }
      } catch (err) {
        if (!isMountedRef.current) {
          return { success: false, error: 'Component unmounted' };
        }

        // Check for rate limit error in response
        const axiosError = err as {
          response?: { status: number; data?: { message?: string } };
        };
        if (axiosError.response?.status === 429) {
          const retryAfter = 60000; // Default 60 seconds
          setRateLimitRetryAfter(retryAfter);
          setError(new Error('Rate limit exceeded'));
          return { success: false, error: 'Rate limit exceeded' };
        }

        const error =
          err instanceof Error ? err : new Error('Note cleanup failed');
        setError(error);
        return { success: false, error: error.message };
      } finally {
        if (isMountedRef.current) {
          setIsProcessing(false);
        }
      }
    },
    []
  );

  /**
   * Reset state.
   */
  const reset = useCallback(() => {
    setCleanedContent(null);
    setIsProcessing(false);
    setError(null);
    setRateLimitRetryAfter(null);
  }, []);

  return {
    cleanup,
    cleanedContent,
    isProcessing,
    error,
    rateLimitRetryAfter,
    reset,
  };
}
