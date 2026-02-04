'use client';

/**
 * useEmployeeProfile Hook
 *
 * Hook for loading and caching the authenticated user's employee profile.
 *
 * Features:
 * - Fetches profile from /api/v1/employee/overview
 * - Determines isManager from team endpoint
 * - 5-minute stale time for caching
 * - Pending task count from task counts endpoint
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

/**
 * Employee profile with role and compliance info.
 */
export interface EmployeeProfile {
  /** User's display name */
  name: string;
  /** User's email */
  email: string;
  /** Job title */
  jobTitle: string | null;
  /** Department name */
  department: string | null;
  /** Whether user is a manager (has direct reports) */
  isManager: boolean;
  /** Count of pending tasks */
  pendingTaskCount: number;
  /** Count of overdue tasks */
  overdueTaskCount: number;
  /** Overall compliance score (0-100) */
  complianceScore: number;
}

/**
 * Compliance overview from backend.
 */
interface ComplianceOverview {
  reports: { total: number; pending: number };
  disclosures: { total: number; upcomingReviews: number };
  attestations: { total: number; pending: number; overdue: number };
  complianceScore: number;
}

/**
 * Task counts from backend.
 */
interface TaskCounts {
  total: number;
  pending: number;
  overdue: number;
  completed: number;
}

/**
 * Team member from backend.
 */
interface TeamMember {
  id: string;
  name: string;
  email: string | null;
  jobTitle: string | null;
  department: string | null;
}

/**
 * Query key factory for employee profile queries.
 */
export const employeeProfileKeys = {
  all: ['employee', 'profile'] as const,
  overview: () => [...employeeProfileKeys.all, 'overview'] as const,
  taskCounts: () => [...employeeProfileKeys.all, 'taskCounts'] as const,
  team: () => [...employeeProfileKeys.all, 'team'] as const,
};

export interface UseEmployeeProfileReturn {
  /** Loaded employee profile */
  profile: EmployeeProfile | null;
  /** Whether profile is loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refetch profile */
  refetch: () => void;
}

/**
 * Hook for managing authenticated user's employee profile.
 *
 * Combines data from:
 * - /api/v1/employee/overview (compliance score)
 * - /api/v1/employee/tasks/counts (pending/overdue counts)
 * - /api/v1/employee/team (manager status)
 *
 * @returns Employee profile state and methods
 */
export function useEmployeeProfile(): UseEmployeeProfileReturn {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch compliance overview
  const overviewQuery = useQuery({
    queryKey: employeeProfileKeys.overview(),
    queryFn: async () => {
      return apiClient.get<ComplianceOverview>('/employee/overview');
    },
    enabled: isAuthenticated && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch task counts
  const taskCountsQuery = useQuery({
    queryKey: employeeProfileKeys.taskCounts(),
    queryFn: async () => {
      return apiClient.get<TaskCounts>('/employee/tasks/counts');
    },
    enabled: isAuthenticated && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch team members to determine manager status
  const teamQuery = useQuery({
    queryKey: employeeProfileKeys.team(),
    queryFn: async () => {
      return apiClient.get<TeamMember[]>('/employee/team');
    },
    enabled: isAuthenticated && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Combine loading states
  const isLoading =
    authLoading ||
    overviewQuery.isLoading ||
    taskCountsQuery.isLoading ||
    teamQuery.isLoading;

  // Combine errors
  const error = overviewQuery.error || taskCountsQuery.error || teamQuery.error;

  // Build profile from combined data
  const profile: EmployeeProfile | null =
    user && overviewQuery.data && taskCountsQuery.data && teamQuery.data !== undefined
      ? {
          name: `${user.firstName} ${user.lastName}`.trim() || user.email.split('@')[0],
          email: user.email,
          jobTitle: null, // Would come from Person record via separate endpoint
          department: null, // Would come from Person record
          isManager: (teamQuery.data?.length ?? 0) > 0,
          pendingTaskCount: taskCountsQuery.data.pending,
          overdueTaskCount: taskCountsQuery.data.overdue,
          complianceScore: overviewQuery.data.complianceScore,
        }
      : null;

  // Refetch function
  const refetch = () => {
    overviewQuery.refetch();
    taskCountsQuery.refetch();
    teamQuery.refetch();
  };

  return {
    profile,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
