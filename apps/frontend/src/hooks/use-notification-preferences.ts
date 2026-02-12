"use client";

/**
 * Notification Preferences React Query Hooks
 *
 * Provides data fetching and mutation hooks for user notification preferences.
 * Uses optimistic updates for toggle switches (HubSpot pattern).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationPreferencesApi } from "@/services/notification-preferences";
import type {
  NotificationPreferences,
  UpdatePreferencesDto,
  SetOOODto,
  OOOResponse,
  OrgNotificationSettings,
} from "@/types/notification-preferences";

// Query keys for cache management
export const notificationPreferencesKeys = {
  all: ["notification-preferences"] as const,
  me: () => [...notificationPreferencesKeys.all, "me"] as const,
  orgSettings: () =>
    [...notificationPreferencesKeys.all, "org-settings"] as const,
};

/**
 * Hook for fetching current user's notification preferences.
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationPreferencesKeys.me(),
    queryFn: notificationPreferencesApi.getMyPreferences,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for fetching organization notification settings.
 */
export function useOrgNotificationSettings() {
  return useQuery({
    queryKey: notificationPreferencesKeys.orgSettings(),
    queryFn: notificationPreferencesApi.getOrgSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for updating notification preferences with optimistic updates.
 * Used for toggle switches that update immediately (HubSpot pattern).
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdatePreferencesDto) =>
      notificationPreferencesApi.updateMyPreferences(dto),
    onMutate: async (dto) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: notificationPreferencesKeys.me(),
      });

      // Snapshot the previous value
      const previousPreferences =
        queryClient.getQueryData<NotificationPreferences>(
          notificationPreferencesKeys.me(),
        );

      // Optimistically update
      if (previousPreferences) {
        queryClient.setQueryData<NotificationPreferences>(
          notificationPreferencesKeys.me(),
          {
            ...previousPreferences,
            ...(dto.preferences && {
              preferences: {
                ...previousPreferences.preferences,
                ...dto.preferences,
              },
            }),
            ...(dto.quietHoursStart !== undefined && {
              quietHoursStart: dto.quietHoursStart,
            }),
            ...(dto.quietHoursEnd !== undefined && {
              quietHoursEnd: dto.quietHoursEnd,
            }),
            ...(dto.timezone !== undefined && {
              timezone: dto.timezone,
            }),
          },
        );
      }

      return { previousPreferences };
    },
    onError: (_err, _dto, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          notificationPreferencesKeys.me(),
          context.previousPreferences,
        );
      }
    },
    onSettled: () => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({
        queryKey: notificationPreferencesKeys.me(),
      });
    },
  });
}

/**
 * Hook for setting out-of-office status.
 */
export function useSetOOO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SetOOODto) => notificationPreferencesApi.setOOO(dto),
    onSuccess: (data) => {
      // Update preferences cache with new OOO status
      const previousPreferences =
        queryClient.getQueryData<NotificationPreferences>(
          notificationPreferencesKeys.me(),
        );

      if (previousPreferences) {
        queryClient.setQueryData<NotificationPreferences>(
          notificationPreferencesKeys.me(),
          {
            ...previousPreferences,
            oooUntil: data.oooUntil,
            backupUserId: data.backupUserId,
          },
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: notificationPreferencesKeys.me(),
      });
    },
  });
}

/**
 * Hook for clearing out-of-office status.
 */
export function useClearOOO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationPreferencesApi.clearOOO(),
    onSuccess: () => {
      // Update preferences cache to clear OOO status
      const previousPreferences =
        queryClient.getQueryData<NotificationPreferences>(
          notificationPreferencesKeys.me(),
        );

      if (previousPreferences) {
        queryClient.setQueryData<NotificationPreferences>(
          notificationPreferencesKeys.me(),
          {
            ...previousPreferences,
            oooUntil: undefined,
            backupUserId: undefined,
          },
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: notificationPreferencesKeys.me(),
      });
    },
  });
}
