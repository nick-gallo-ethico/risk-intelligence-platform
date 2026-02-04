'use client';

/**
 * useTeamMembers Hook
 *
 * Hook for fetching and managing the current user's team members.
 * Used in the proxy reporting feature for managers.
 *
 * Features:
 * - Fetches team members from /api/v1/employee/team
 * - Handles empty team (not a manager) gracefully
 * - Uses React Query for caching and background refresh
 * - Returns team member array with loading/error states
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { TeamMember } from '@/types/employee-portal.types';

/**
 * Query key factory for team members.
 */
const teamMembersKeys = {
  all: ['employee', 'team'] as const,
  list: () => [...teamMembersKeys.all, 'list'] as const,
  search: (query: string) => [...teamMembersKeys.all, 'search', query] as const,
};

/**
 * Team members API response.
 */
interface TeamMembersResponse {
  teamMembers: TeamMember[];
  total: number;
  isManager: boolean;
}

/**
 * Fetch team members from the API.
 */
async function fetchTeamMembers(): Promise<TeamMembersResponse> {
  try {
    return await apiClient.get<TeamMembersResponse>('/employee/team');
  } catch (error: any) {
    // 404 means not a manager or no team
    if (error?.response?.status === 404) {
      return {
        teamMembers: [],
        total: 0,
        isManager: false,
      };
    }
    throw error;
  }
}

export interface UseTeamMembersReturn {
  /** List of team members */
  teamMembers: TeamMember[];
  /** Total count of team members */
  total: number;
  /** Whether the current user is a manager */
  isManager: boolean;
  /** Whether the data is loading */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Refetch team members */
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching the current user's team members.
 *
 * Returns an empty array (not an error) if the user is not a manager.
 *
 * @example
 * ```tsx
 * const { teamMembers, isLoading, isManager, error } = useTeamMembers();
 *
 * if (!isManager) {
 *   return <p>You don't have any direct reports.</p>;
 * }
 *
 * return (
 *   <ul>
 *     {teamMembers.map((member) => (
 *       <li key={member.id}>{member.displayName}</li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useTeamMembers(): UseTeamMembersReturn {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: teamMembersKeys.list(),
    queryFn: fetchTeamMembers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 403 (not authorized) or 404 (not a manager)
      if (error?.response?.status === 403 || error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  return {
    teamMembers: data?.teamMembers ?? [],
    total: data?.total ?? 0,
    isManager: data?.isManager ?? false,
    isLoading,
    error: error as Error | null,
    refetch: async () => {
      await refetch();
    },
  };
}
