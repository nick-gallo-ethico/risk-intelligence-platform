'use client';

/**
 * useQaItem Hook
 *
 * Hook for managing a single QA item during review.
 *
 * Features:
 * - Fetch full item detail
 * - Release (approve) with optional edits
 * - Reject back to operator
 * - Abandon claim (return to queue)
 *
 * @see QaReviewPanel for primary consumer
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import * as operatorApi from '@/services/operator-api';
import type { QaItemDetail, QaEditsDto } from '@/types/operator.types';

/**
 * Query key factory for QA item queries.
 */
const qaItemKeys = {
  all: ['operator', 'qaQueue'] as const,
  detail: (riuId: string) => [...qaItemKeys.all, 'detail', riuId] as const,
};

export interface UseQaItemReturn {
  /** Full item detail */
  item: QaItemDetail | null;
  /** Whether detail is loading */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Whether release is in progress */
  isReleasing: boolean;
  /** Whether reject is in progress */
  isRejecting: boolean;
  /** Whether abandon is in progress */
  isAbandoning: boolean;
  /** Release (approve) the item with optional edits */
  release: (edits?: QaEditsDto) => Promise<void>;
  /** Reject the item back to operator */
  reject: (reason: string) => Promise<void>;
  /** Abandon the claim (return to queue) */
  abandon: () => Promise<void>;
  /** Refresh item detail */
  refresh: () => void;
}

/**
 * Hook for managing a single QA item during review.
 *
 * @param riuId - RIU ID to load
 * @returns Item state and action methods
 */
export function useQaItem(riuId: string | null): UseQaItemReturn {
  const queryClient = useQueryClient();

  // Fetch item detail
  const {
    data: item,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: qaItemKeys.detail(riuId || ''),
    queryFn: () => (riuId ? operatorApi.getQaItemDetail(riuId) : null),
    enabled: !!riuId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Release mutation
  const releaseMutation = useMutation({
    mutationFn: async (edits?: QaEditsDto) => {
      if (!riuId) throw new Error('No RIU ID');
      await operatorApi.releaseQaItem(riuId, edits);
    },
    onSuccess: () => {
      // Invalidate both list and detail
      queryClient.invalidateQueries({ queryKey: qaItemKeys.all });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!riuId) throw new Error('No RIU ID');
      await operatorApi.rejectQaItem(riuId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qaItemKeys.all });
    },
  });

  // Abandon mutation
  const abandonMutation = useMutation({
    mutationFn: async () => {
      if (!riuId) throw new Error('No RIU ID');
      await operatorApi.abandonQaItem(riuId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qaItemKeys.all });
    },
  });

  // Action callbacks
  const release = useCallback(
    async (edits?: QaEditsDto) => {
      await releaseMutation.mutateAsync(edits);
    },
    [releaseMutation]
  );

  const reject = useCallback(
    async (reason: string) => {
      await rejectMutation.mutateAsync(reason);
    },
    [rejectMutation]
  );

  const abandon = useCallback(async () => {
    await abandonMutation.mutateAsync();
  }, [abandonMutation]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    item: item || null,
    isLoading,
    error: error instanceof Error ? error : null,
    isReleasing: releaseMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isAbandoning: abandonMutation.isPending,
    release,
    reject,
    abandon,
    refresh,
  };
}
