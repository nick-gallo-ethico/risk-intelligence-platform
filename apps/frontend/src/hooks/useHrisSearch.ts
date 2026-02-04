'use client';

/**
 * useHrisSearch Hook
 *
 * Hook for searching HRIS for employees in the Operator Console.
 *
 * Features:
 * - Debounced search (300ms)
 * - Min 2 characters to search
 * - AbortController for cancelling stale requests
 *
 * @see SubjectSelector for primary consumer
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { HrisResult } from '@/types/operator.types';

/**
 * Return type for useHrisSearch hook.
 */
export interface UseHrisSearchReturn {
  /** Execute search with query */
  search: (query: string) => void;
  /** Search results */
  results: HrisResult[] | null;
  /** Whether search is in progress */
  isSearching: boolean;
  /** Clear search results */
  clearResults: () => void;
}

/**
 * Hook for searching HRIS employees.
 *
 * @param clientId - Client organization ID to search within
 * @returns Search methods and state
 */
export function useHrisSearch(clientId: string): UseHrisSearchReturn {
  const [results, setResults] = useState<HrisResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Refs for debouncing and abort control
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Track clientId changes
  const clientIdRef = useRef(clientId);
  useEffect(() => {
    if (clientIdRef.current !== clientId) {
      // Clear results when client changes
      setResults(null);
      clientIdRef.current = clientId;
    }
  }, [clientId]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Execute search with debouncing.
   */
  const search = useCallback(
    (query: string) => {
      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Min 2 characters required
      if (query.length < 2) {
        setResults(null);
        setIsSearching(false);
        return;
      }

      // Debounce the search
      debounceTimerRef.current = setTimeout(async () => {
        if (!isMountedRef.current || !clientId) return;

        // Create new abort controller
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsSearching(true);

        try {
          const data = await apiClient.get<HrisResult[]>(
            `/operator/clients/${clientId}/hris/search`,
            { params: { query } }
          );

          // Check if request was aborted or component unmounted
          if (controller.signal.aborted || !isMountedRef.current) {
            return;
          }

          setResults(data);
        } catch (err) {
          // Ignore abort errors
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }

          // Check if component still mounted
          if (!isMountedRef.current) {
            return;
          }

          // On error, clear results
          setResults(null);
        } finally {
          if (isMountedRef.current) {
            setIsSearching(false);
          }
        }
      }, 300);
    },
    [clientId]
  );

  /**
   * Clear search results.
   */
  const clearResults = useCallback(() => {
    // Cancel any pending operations
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setResults(null);
    setIsSearching(false);
  }, []);

  return {
    search,
    results,
    isSearching,
    clearResults,
  };
}
