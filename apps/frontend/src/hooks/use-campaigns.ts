'use client';

/**
 * Campaigns React Query Hooks
 *
 * Provides data fetching hooks for campaigns with React Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi } from '@/lib/campaigns-api';
import type {
  CampaignQueryParams,
  CampaignDashboardStats,
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto,
} from '@/types/campaign';

// Query keys for cache management
export const campaignQueryKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignQueryKeys.all, 'list'] as const,
  list: (params?: CampaignQueryParams) => [...campaignQueryKeys.lists(), params] as const,
  details: () => [...campaignQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...campaignQueryKeys.details(), id] as const,
  stats: () => [...campaignQueryKeys.all, 'stats'] as const,
};

/**
 * Hook for fetching paginated campaign list with filters.
 */
export function useCampaigns(params?: CampaignQueryParams) {
  return useQuery({
    queryKey: campaignQueryKeys.list(params),
    queryFn: () => campaignsApi.list(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for fetching dashboard statistics.
 */
export function useCampaignStats() {
  return useQuery({
    queryKey: campaignQueryKeys.stats(),
    queryFn: () => campaignsApi.getStats(),
    staleTime: 60 * 1000, // 1 minute
    // Return placeholder stats if endpoint doesn't exist yet
    placeholderData: {
      totalCampaigns: 0,
      activeCampaigns: 0,
      completedCampaigns: 0,
      draftCampaigns: 0,
      scheduledCampaigns: 0,
      overallCompletionRate: 0,
      totalAssignments: 0,
      completedAssignments: 0,
      overdueAssignments: 0,
      assignmentsByStatus: {
        pending: 0,
        notified: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        skipped: 0,
      },
    } as CampaignDashboardStats,
  });
}

/**
 * Hook for fetching a single campaign by ID.
 */
export function useCampaign(id: string) {
  return useQuery({
    queryKey: campaignQueryKeys.detail(id),
    queryFn: () => campaignsApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for creating a new campaign.
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCampaignDto) => campaignsApi.create(dto),
    onSuccess: () => {
      // Invalidate campaign lists to refetch
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.stats() });
    },
  });
}

/**
 * Hook for updating a campaign.
 */
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCampaignDto }) =>
      campaignsApi.update(id, dto),
    onSuccess: (updatedCampaign) => {
      // Update the specific campaign in cache
      queryClient.setQueryData(
        campaignQueryKeys.detail(updatedCampaign.id),
        updatedCampaign
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() });
    },
  });
}

/**
 * Hook for launching a campaign.
 */
export function useLaunchCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notifyImmediately }: { id: string; notifyImmediately?: boolean }) =>
      campaignsApi.launch(id, notifyImmediately),
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(
        campaignQueryKeys.detail(updatedCampaign.id),
        updatedCampaign
      );
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.stats() });
    },
  });
}

/**
 * Hook for pausing a campaign.
 */
export function usePauseCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignsApi.pause(id),
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(
        campaignQueryKeys.detail(updatedCampaign.id),
        updatedCampaign
      );
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.stats() });
    },
  });
}

/**
 * Hook for resuming a campaign.
 */
export function useResumeCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignsApi.resume(id),
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(
        campaignQueryKeys.detail(updatedCampaign.id),
        updatedCampaign
      );
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.stats() });
    },
  });
}

/**
 * Hook for canceling a campaign.
 */
export function useCancelCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      campaignsApi.cancel(id, reason),
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(
        campaignQueryKeys.detail(updatedCampaign.id),
        updatedCampaign
      );
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.stats() });
    },
  });
}

/**
 * Hook for deleting a campaign.
 */
export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: campaignQueryKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.stats() });
    },
  });
}
