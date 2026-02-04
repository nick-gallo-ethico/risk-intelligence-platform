'use client';

/**
 * useClientProfile Hook
 *
 * Hook for loading and caching client profiles in the Operator Console.
 *
 * Features:
 * - Phone number lookup with 404 handling
 * - Direct client ID loading
 * - AbortController pattern to cancel stale requests
 * - 5-minute stale time for caching
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as operatorApi from '@/services/operator-api';
import type { ClientProfile } from '@/types/operator.types';

/**
 * Query key factory for client profile queries.
 */
const clientProfileKeys = {
  all: ['operator', 'clientProfile'] as const,
  byId: (clientId: string) =>
    [...clientProfileKeys.all, 'byId', clientId] as const,
  byPhone: (phone: string) =>
    [...clientProfileKeys.all, 'byPhone', phone] as const,
};

export interface UseClientProfileReturn {
  /** Currently loaded client profile */
  clientProfile: ClientProfile | null;
  /** Whether a lookup is in progress */
  isLoading: boolean;
  /** Error if lookup failed (not 404) */
  error: Error | null;
  /** Look up client by phone number */
  lookupByPhone: (phoneNumber: string) => Promise<ClientProfile | null>;
  /** Load client directly by ID */
  loadClient: (clientId: string) => Promise<ClientProfile>;
  /** Clear the current client */
  clearClient: () => void;
}

/**
 * Hook for managing client profile state in the Operator Console.
 *
 * Uses AbortController to cancel stale requests when a new lookup starts
 * (per RESEARCH.md pitfall #5 - race condition prevention).
 *
 * @returns Client profile state and methods
 */
export function useClientProfile(): UseClientProfileReturn {
  const queryClient = useQueryClient();

  // Current client state
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // AbortController ref for cancelling stale requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch client profile when currentClientId changes
  const { data: clientProfile } = useQuery({
    queryKey: clientProfileKeys.byId(currentClientId || ''),
    queryFn: async () => {
      if (!currentClientId) return null;
      return operatorApi.getClientProfile(currentClientId);
    },
    enabled: !!currentClientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Look up client by phone number.
   * Cancels any previous pending lookup to prevent race conditions.
   */
  const lookupByPhone = useCallback(
    async (phoneNumber: string): Promise<ClientProfile | null> => {
      // Cancel any previous pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const profile = await operatorApi.lookupByPhone(phoneNumber);

        // Check if this request was aborted
        if (controller.signal.aborted) {
          return null;
        }

        if (profile) {
          // Cache the profile
          queryClient.setQueryData(
            clientProfileKeys.byId(profile.id),
            profile
          );
          setCurrentClientId(profile.id);
        } else {
          setCurrentClientId(null);
        }

        setIsLoading(false);
        return profile;
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }

        // Check if this request was aborted
        if (controller.signal.aborted) {
          return null;
        }

        setError(err instanceof Error ? err : new Error('Lookup failed'));
        setIsLoading(false);
        throw err;
      }
    },
    [queryClient]
  );

  /**
   * Load client directly by ID.
   */
  const loadClient = useCallback(
    async (clientId: string): Promise<ClientProfile> => {
      // Cancel any pending phone lookup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const profile = await operatorApi.getClientProfile(clientId);

        // Cache the profile
        queryClient.setQueryData(
          clientProfileKeys.byId(profile.id),
          profile
        );
        setCurrentClientId(profile.id);
        setIsLoading(false);

        return profile;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Load failed'));
        setIsLoading(false);
        throw err;
      }
    },
    [queryClient]
  );

  /**
   * Clear the current client.
   */
  const clearClient = useCallback(() => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setCurrentClientId(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    clientProfile: clientProfile || null,
    isLoading,
    error,
    lookupByPhone,
    loadClient,
    clearClient,
  };
}
