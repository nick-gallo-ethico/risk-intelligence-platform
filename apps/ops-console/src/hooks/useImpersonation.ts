'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Impersonation session data returned from the API
 */
export interface ImpersonationSession {
  sessionId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  reason: string;
  ticketId?: string;
  expiresAt: string;
  remainingSeconds: number;
  operatorUserId: string;
  operatorName: string;
}

/**
 * Validation response from the API
 */
interface ValidationResponse {
  valid: boolean;
  organizationId?: string;
  organizationName?: string;
  organizationSlug?: string;
  expiresAt?: string;
  remainingSeconds?: number;
  reason?: string;
}

/**
 * Start session request payload
 */
interface StartSessionPayload {
  organizationId: string;
  reason: string;
  ticketId?: string;
}

const STORAGE_KEY = 'impersonation_session_id';

/**
 * Hook for managing impersonation sessions in the Ops Console.
 *
 * Provides:
 * - Session validation with automatic refresh
 * - Start/end session mutations
 * - Headers for API requests
 * - Remaining time tracking
 *
 * Per CONTEXT.md: Explicit impersonation with audit trail, time limits, and reason requirement.
 */
export function useImpersonation() {
  const queryClient = useQueryClient();

  // Get session ID from localStorage (client-side only)
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  // Track remaining seconds locally for countdown display
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState<number>(0);

  /**
   * Validate current session with the backend
   * Refreshes every 60 seconds to update remaining time
   */
  const { data: validationData, isLoading } = useQuery({
    queryKey: ['impersonation', 'validate', sessionId],
    queryFn: async (): Promise<ValidationResponse | null> => {
      if (!sessionId) return null;

      try {
        const res = await fetch(`/api/v1/internal/impersonation/sessions/${sessionId}/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          // Session expired or invalid - clear it
          localStorage.removeItem(STORAGE_KEY);
          setSessionId(null);
          return null;
        }

        const data = await res.json();
        return data as ValidationResponse;
      } catch (error) {
        console.error('Failed to validate impersonation session:', error);
        return null;
      }
    },
    enabled: !!sessionId,
    refetchInterval: 60 * 1000, // Refresh every minute
    staleTime: 30 * 1000, // Consider stale after 30 seconds
  });

  // Update local remaining seconds when validation data changes
  useEffect(() => {
    if (validationData?.valid && validationData.remainingSeconds) {
      setLocalRemainingSeconds(validationData.remainingSeconds);
    } else {
      setLocalRemainingSeconds(0);
    }
  }, [validationData]);

  // Countdown timer for remaining seconds
  useEffect(() => {
    if (localRemainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setLocalRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Session expired - clear it
          localStorage.removeItem(STORAGE_KEY);
          setSessionId(null);
          queryClient.invalidateQueries({ queryKey: ['impersonation'] });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [localRemainingSeconds, queryClient]);

  /**
   * Start a new impersonation session
   */
  const startMutation = useMutation({
    mutationFn: async (payload: StartSessionPayload): Promise<ImpersonationSession> => {
      const res = await fetch('/api/v1/internal/impersonation/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to start impersonation session');
      }

      return res.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      localStorage.setItem(STORAGE_KEY, data.sessionId);
      queryClient.invalidateQueries({ queryKey: ['impersonation'] });
    },
  });

  /**
   * End the current impersonation session
   */
  const endMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) return;

      const res = await fetch(`/api/v1/internal/impersonation/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 404) {
        throw new Error('Failed to end impersonation session');
      }
    },
    onSuccess: () => {
      setSessionId(null);
      localStorage.removeItem(STORAGE_KEY);
      setLocalRemainingSeconds(0);
      queryClient.invalidateQueries({ queryKey: ['impersonation'] });
    },
    onError: () => {
      // Even on error, clear the local session
      setSessionId(null);
      localStorage.removeItem(STORAGE_KEY);
      setLocalRemainingSeconds(0);
    },
  });

  /**
   * Start an impersonation session for a specific organization
   */
  const startSession = useCallback(
    async (organizationId: string, reason: string, ticketId?: string) => {
      return startMutation.mutateAsync({ organizationId, reason, ticketId });
    },
    [startMutation]
  );

  /**
   * End the current impersonation session
   */
  const endSession = useCallback(() => {
    return endMutation.mutateAsync();
  }, [endMutation]);

  /**
   * Get headers to include with API requests when impersonating
   * These headers tell the backend which tenant context to use
   */
  const getHeaders = useCallback((): Record<string, string> => {
    if (!sessionId) return {};
    return {
      'X-Impersonation-Session': sessionId,
    };
  }, [sessionId]);

  /**
   * Build the session object from validation data
   */
  const session = useMemo((): Partial<ImpersonationSession> | null => {
    if (!validationData?.valid) return null;

    return {
      sessionId: sessionId!,
      organizationId: validationData.organizationId,
      organizationName: validationData.organizationName,
      organizationSlug: validationData.organizationSlug,
      reason: validationData.reason,
      remainingSeconds: localRemainingSeconds,
    };
  }, [validationData, sessionId, localRemainingSeconds]);

  /**
   * Is there an active impersonation session?
   */
  const isImpersonating = useMemo(() => {
    return validationData?.valid === true && localRemainingSeconds > 0;
  }, [validationData, localRemainingSeconds]);

  return {
    // Session data
    session,
    sessionId,
    isImpersonating,
    remainingSeconds: localRemainingSeconds,

    // Loading states
    isLoading,
    isStarting: startMutation.isPending,
    isEnding: endMutation.isPending,

    // Errors
    startError: startMutation.error,
    endError: endMutation.error,

    // Actions
    startSession,
    endSession,
    getHeaders,
  };
}
