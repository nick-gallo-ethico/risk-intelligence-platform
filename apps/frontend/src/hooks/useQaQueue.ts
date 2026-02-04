'use client';

/**
 * useQaQueue Hook
 *
 * Hook for managing the QA review queue in the Operator Console.
 *
 * Features:
 * - Paginated queue fetching with filters
 * - Auto-refresh every 30 seconds
 * - Claim items for review
 * - Uses React Query for caching and state management
 */

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import * as operatorApi from '@/services/operator-api';
import type {
  QaQueueItem,
  QaQueueFilters,
  PaginatedQaQueueResult,
} from '@/types/operator.types';

/**
 * Query key factory for QA queue queries.
 */
const qaQueueKeys = {
  all: ['operator', 'qaQueue'] as const,
  list: (filters: QaQueueFilters) =>
    [...qaQueueKeys.all, 'list', filters] as const,
  detail: (riuId: string) => [...qaQueueKeys.all, 'detail', riuId] as const,
};

/**
 * Default QA queue filters.
 */
const DEFAULT_FILTERS: QaQueueFilters = {
  page: 1,
  limit: 20,
};

/**
 * Auto-refresh interval in milliseconds (30 seconds).
 */
const AUTO_REFRESH_INTERVAL = 30 * 1000;

export interface UseQaQueueReturn {
  /** Current page of queue items */
  items: QaQueueItem[];
  /** Total items in queue */
  total: number;
  /** Current page number */
  page: number;
  /** Total pages */
  totalPages: number;
  /** Whether queue is loading */
  isLoading: boolean;
  /** Error if queue fetch failed */
  error: Error | null;
  /** Whether a claim operation is in progress */
  isClaiming: boolean;
  /** Refresh the queue */
  refresh: () => void;
  /** Claim an item for review */
  claim: (riuId: string) => Promise<void>;
  /** Set filter values */
  setFilters: (filters: Partial<QaQueueFilters>) => void;
  /** Current filters */
  filters: QaQueueFilters;
}

/**
 * Hook for managing the QA review queue.
 *
 * @param initialFilters - Initial filter values
 * @returns Queue state and methods
 */
export function useQaQueue(
  initialFilters: Partial<QaQueueFilters> = {}
): UseQaQueueReturn {
  const queryClient = useQueryClient();

  // Merge initial filters with defaults
  const filters: QaQueueFilters = {
    ...DEFAULT_FILTERS,
    ...initialFilters,
  };

  // Fetch queue with current filters
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: qaQueueKeys.list(filters),
    queryFn: () => operatorApi.getQaQueue(filters),
    refetchInterval: AUTO_REFRESH_INTERVAL,
    staleTime: 10 * 1000, // Consider stale after 10 seconds
  });

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: (riuId: string) => operatorApi.claimQaItem(riuId),
    onSuccess: () => {
      // Refresh queue after claiming
      queryClient.invalidateQueries({ queryKey: qaQueueKeys.all });
    },
  });

  // Refresh callback
  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Claim callback
  const claim = useCallback(
    async (riuId: string) => {
      await claimMutation.mutateAsync(riuId);
    },
    [claimMutation]
  );

  // Set filters callback - invalidates queries with new filters
  const setFilters = useCallback(
    (newFilters: Partial<QaQueueFilters>) => {
      // This will trigger a new query with updated filters
      queryClient.invalidateQueries({ queryKey: qaQueueKeys.all });
    },
    [queryClient]
  );

  return {
    items: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    error: error instanceof Error ? error : null,
    isClaiming: claimMutation.isPending,
    refresh,
    claim,
    setFilters,
    filters,
  };
}

/**
 * Hook for QA queue statistics.
 * Separate from main queue to avoid re-rendering list on stat changes.
 */
export interface QaQueueStats {
  totalItems: number;
  highSeverityCount: number;
  myClaims: number;
  releasedToday: number;
}

export function useQaQueueStats(): {
  stats: QaQueueStats | null;
  isLoading: boolean;
} {
  // For now, derive stats from the queue data
  // In production, this could be a separate optimized endpoint
  const { items, total, isLoading } = useQaQueue({ limit: 100 });

  const stats: QaQueueStats | null = isLoading
    ? null
    : {
        totalItems: total,
        highSeverityCount: items.filter(
          (item) =>
            item.severityScore === 'HIGH' || item.severityScore === 'CRITICAL'
        ).length,
        myClaims: 0, // Would need current user context to calculate
        releasedToday: 0, // Would need separate endpoint
      };

  return { stats, isLoading };
}
