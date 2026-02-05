import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  MilestoneResponseDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  MilestoneQueryDto,
  CreateMilestoneItemDto,
  UpdateMilestoneItemDto,
} from '@/types/milestone';

const MILESTONES_KEY = 'milestones';

interface UseMilestonesOptions extends MilestoneQueryDto {}

/**
 * Hook for fetching milestones with optional filtering.
 */
export function useMilestones(options: UseMilestonesOptions = {}) {
  return useQuery({
    queryKey: [MILESTONES_KEY, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.status) params.set('status', options.status);
      if (options.category) params.set('category', options.category);
      if (options.ownerId) params.set('ownerId', options.ownerId);
      if (options.targetDateFrom)
        params.set('targetDateFrom', options.targetDateFrom.toISOString());
      if (options.targetDateTo)
        params.set('targetDateTo', options.targetDateTo.toISOString());
      if (options.offset) params.set('offset', String(options.offset));
      if (options.limit) params.set('limit', String(options.limit));

      const response = await api.get<{
        items: MilestoneResponseDto[];
        total: number;
      }>(`/milestones?${params}`);
      return response.data;
    },
  });
}

/**
 * Hook for fetching a single milestone by ID.
 */
export function useMilestone(milestoneId: string | undefined) {
  return useQuery({
    queryKey: [MILESTONES_KEY, milestoneId],
    queryFn: async () => {
      if (!milestoneId) return null;
      const response = await api.get<MilestoneResponseDto>(
        `/milestones/${milestoneId}`
      );
      return response.data;
    },
    enabled: !!milestoneId,
  });
}

/**
 * Hook for creating a new milestone.
 */
export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateMilestoneDto) => {
      const response = await api.post<MilestoneResponseDto>('/milestones', dto);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MILESTONES_KEY] });
    },
  });
}

/**
 * Hook for updating an existing milestone.
 */
export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateMilestoneDto }) => {
      const response = await api.patch<MilestoneResponseDto>(
        `/milestones/${id}`,
        dto
      );
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [MILESTONES_KEY] });
      queryClient.invalidateQueries({ queryKey: [MILESTONES_KEY, id] });
    },
  });
}

/**
 * Hook for deleting a milestone.
 */
export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/milestones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MILESTONES_KEY] });
    },
  });
}

/**
 * Hook for adding an item to a milestone.
 */
export function useAddMilestoneItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      milestoneId,
      dto,
    }: {
      milestoneId: string;
      dto: CreateMilestoneItemDto;
    }) => {
      const response = await api.post(
        `/milestones/${milestoneId}/items`,
        dto
      );
      return response.data;
    },
    onSuccess: (_, { milestoneId }) => {
      queryClient.invalidateQueries({ queryKey: [MILESTONES_KEY, milestoneId] });
      queryClient.invalidateQueries({ queryKey: [MILESTONES_KEY] });
    },
  });
}

/**
 * Hook for updating a milestone item.
 */
export function useUpdateMilestoneItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      milestoneId,
      itemId,
      dto,
    }: {
      milestoneId: string;
      itemId: string;
      dto: UpdateMilestoneItemDto;
    }) => {
      const response = await api.patch(
        `/milestones/${milestoneId}/items/${itemId}`,
        dto
      );
      return response.data;
    },
    onSuccess: (_, { milestoneId }) => {
      queryClient.invalidateQueries({ queryKey: [MILESTONES_KEY, milestoneId] });
      queryClient.invalidateQueries({ queryKey: [MILESTONES_KEY] });
    },
  });
}

/**
 * Hook for deleting a milestone item.
 */
export function useDeleteMilestoneItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      milestoneId,
      itemId,
    }: {
      milestoneId: string;
      itemId: string;
    }) => {
      await api.delete(`/milestones/${milestoneId}/items/${itemId}`);
    },
    onSuccess: (_, { milestoneId }) => {
      queryClient.invalidateQueries({ queryKey: [MILESTONES_KEY, milestoneId] });
      queryClient.invalidateQueries({ queryKey: [MILESTONES_KEY] });
    },
  });
}
