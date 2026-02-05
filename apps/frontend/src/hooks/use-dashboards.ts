'use client';

/**
 * useDashboards Hook
 *
 * React Query hooks for dashboard and report data management.
 *
 * Features:
 * - List dashboards with caching
 * - Dashboard templates for creation
 * - Toggle favorites
 * - Reports list
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/analytics-api';
import type {
  Dashboard,
  DashboardListResponse,
  DashboardQueryParams,
  DashboardTemplate,
  CreateDashboardInput,
  ReportListResponse,
  ReportQueryParams,
} from '@/types/analytics';

/**
 * Query key factory for analytics queries.
 */
const analyticsKeys = {
  all: ['analytics'] as const,
  dashboards: () => [...analyticsKeys.all, 'dashboards'] as const,
  dashboardList: (params?: DashboardQueryParams) =>
    [...analyticsKeys.dashboards(), 'list', params] as const,
  dashboard: (id: string) => [...analyticsKeys.dashboards(), id] as const,
  templates: () => [...analyticsKeys.all, 'templates'] as const,
  reports: () => [...analyticsKeys.all, 'reports'] as const,
  reportList: (params?: ReportQueryParams) =>
    [...analyticsKeys.reports(), 'list', params] as const,
};

/**
 * Hook for fetching dashboards list.
 *
 * @param params - Optional query parameters
 * @returns Query result with dashboards data
 */
export function useDashboards(params?: DashboardQueryParams) {
  return useQuery<DashboardListResponse>({
    queryKey: analyticsKeys.dashboardList(params),
    queryFn: () => analyticsApi.listDashboards(params),
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
  });
}

/**
 * Hook for fetching a single dashboard.
 *
 * @param id - Dashboard ID
 * @returns Query result with dashboard data
 */
export function useDashboard(id: string | undefined) {
  return useQuery<Dashboard>({
    queryKey: analyticsKeys.dashboard(id!),
    queryFn: () => analyticsApi.getDashboard(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching dashboard templates.
 *
 * @returns Query result with templates
 */
export function useDashboardTemplates() {
  return useQuery<DashboardTemplate[]>({
    queryKey: analyticsKeys.templates(),
    queryFn: () => analyticsApi.getDashboardTemplates(),
    staleTime: 30 * 60 * 1000, // Templates change infrequently
  });
}

/**
 * Hook for creating a new dashboard.
 *
 * @returns Mutation for creating dashboards
 */
export function useCreateDashboard() {
  const queryClient = useQueryClient();

  return useMutation<Dashboard, Error, CreateDashboardInput>({
    mutationFn: (input) => analyticsApi.createDashboard(input),
    onSuccess: () => {
      // Invalidate dashboards list to show the new dashboard
      queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboards() });
    },
  });
}

/**
 * Hook for toggling dashboard favorite status.
 *
 * @returns Mutation for toggling favorite
 */
export function useToggleDashboardFavorite() {
  const queryClient = useQueryClient();

  return useMutation<{ isFavorite: boolean }, Error, string>({
    mutationFn: (dashboardId) => analyticsApi.toggleDashboardFavorite(dashboardId),
    onSuccess: () => {
      // Invalidate dashboards to reflect favorite change
      queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboards() });
    },
  });
}

/**
 * Hook for deleting a dashboard.
 *
 * @returns Mutation for deleting dashboards
 */
export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (dashboardId) => analyticsApi.deleteDashboard(dashboardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboards() });
    },
  });
}

/**
 * Hook for fetching reports list.
 *
 * @param params - Optional query parameters
 * @returns Query result with reports data
 */
export function useReports(params?: ReportQueryParams) {
  return useQuery<ReportListResponse>({
    queryKey: analyticsKeys.reportList(params),
    queryFn: () => analyticsApi.listReports(params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for toggling report favorite status.
 *
 * @returns Mutation for toggling favorite
 */
export function useToggleReportFavorite() {
  const queryClient = useQueryClient();

  return useMutation<{ isFavorite: boolean }, Error, string>({
    mutationFn: (reportId) => analyticsApi.toggleReportFavorite(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.reports() });
    },
  });
}
