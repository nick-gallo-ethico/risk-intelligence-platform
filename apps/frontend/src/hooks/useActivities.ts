/**
 * useActivities Hook
 *
 * Manages activity state for entity timelines with HubSpot-style filtering:
 * - Checkbox-based type filtering (8 types)
 * - User/team filter dropdowns
 * - Search query filtering
 * - Pinned activities section
 * - Activity CRUD operations (pin, unpin, delete)
 */
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import type {
  Activity,
  ActivityTypeFilter,
  ACTIVITY_TYPE_FILTER_ACTIONS,
} from "@/types/activity";

// Re-export the mapping for consumers
export { ACTIVITY_TYPE_FILTER_ACTIONS } from "@/types/activity";

/**
 * All 8 activity type filters - used for "select all" behavior
 */
export const ALL_ACTIVITY_TYPES: ActivityTypeFilter[] = [
  "notes",
  "emails",
  "calls",
  "tasks",
  "interviews",
  "documents",
  "status_changes",
  "system_events",
];

/**
 * Backend TimelineResponseDto shape from ActivityTimelineController
 */
interface TimelineResponse {
  entries: Array<{
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    actionDescription: string;
    actorUserId: string | null;
    actorName: string | null;
    createdAt: string;
    isRelatedEntity: boolean;
    relatedEntityInfo?: {
      parentEntityType: string;
      parentEntityId: string;
      relationship: string;
    };
    changes?: Record<string, { old: unknown; new: unknown }> | null;
    context?: Record<string, unknown> | null;
  }>;
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

interface UseActivitiesOptions {
  entityType: string;
  entityId: string;
  /** Skip fetching if entityId is not yet available */
  enabled?: boolean;
}

interface UseActivitiesReturn {
  // Data
  activities: Activity[];
  filteredActivities: Activity[];
  pinnedActivities: Activity[];
  upcomingActivities: Activity[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Filters
  activeTypes: Set<ActivityTypeFilter>;
  toggleType: (type: ActivityTypeFilter) => void;
  selectAllTypes: () => void;
  deselectAllTypes: () => void;
  userFilter: string;
  setUserFilter: (userId: string) => void;
  teamFilter: string;
  setTeamFilter: (teamId: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Counts
  visibleCount: number;
  totalCount: number;

  // Actions
  pinActivity: (activityId: string) => void;
  unpinActivity: (activityId: string) => void;
  deleteActivity: (activityId: string) => void;
  isPinned: (activityId: string) => boolean;

  // Filter dropdown data
  uniqueUsers: Array<{ id: string; name: string }>;
  uniqueTeams: Array<{ id: string; name: string }>;
}

/**
 * Get pinned activity IDs from localStorage
 */
function getPinnedActivityIds(entityId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(`pinned-activities-${entityId}`);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // Ignore parsing errors
  }
  return new Set();
}

/**
 * Save pinned activity IDs to localStorage
 */
function savePinnedActivityIds(entityId: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `pinned-activities-${entityId}`,
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if an activity action matches a type filter
 */
function actionMatchesTypeFilter(
  action: string,
  typeFilter: ActivityTypeFilter,
): boolean {
  // Import the mapping at runtime to avoid circular deps
  const mappings: Record<ActivityTypeFilter, string[]> = {
    notes: ["note", "commented"],
    emails: ["email_sent", "email_received"],
    calls: ["call_logged"],
    tasks: ["task_created", "task_assigned", "task_completed"],
    interviews: ["interview_logged"],
    documents: ["file_uploaded", "document_uploaded"],
    status_changes: [
      "status_changed",
      "assignment_change",
      "assigned",
      "unassigned",
    ],
    system_events: [
      "created",
      "updated",
      "viewed",
      "exported",
      "approved",
      "rejected",
      "ai_generated",
      "synced",
      "sla_warning",
      "sla_updated",
      "sla_breached",
      "system_event",
    ],
  };

  return mappings[typeFilter]?.includes(action) ?? false;
}

/**
 * Hook for managing activities with HubSpot-style filtering
 */
export function useActivities({
  entityType,
  entityId,
  enabled = true,
}: UseActivitiesOptions): UseActivitiesReturn {
  const queryClient = useQueryClient();

  // Filter state
  const [activeTypes, setActiveTypes] = useState<Set<ActivityTypeFilter>>(
    () => new Set(ALL_ACTIVITY_TYPES),
  );
  const [userFilter, setUserFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pinned state (localStorage-backed)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() =>
    getPinnedActivityIds(entityId),
  );

  // Sync pinned IDs when entityId changes
  useEffect(() => {
    setPinnedIds(getPinnedActivityIds(entityId));
  }, [entityId]);

  // Fetch activities from backend
  const {
    data: activitiesData,
    isLoading,
    error,
    refetch,
  } = useQuery<Activity[]>({
    queryKey: ["activities", entityType, entityId],
    queryFn: async () => {
      // Try primary endpoint first
      try {
        const response = await apiClient.get<TimelineResponse>(
          `/activity/${entityType}/${entityId}?includeRelated=true&limit=100`,
        );

        // Transform response to Activity[]
        return response.entries.map((entry) => ({
          id: entry.id,
          entityType: entry.entityType as Activity["entityType"],
          entityId: entry.entityId,
          action: entry.action as Activity["action"],
          actionDescription: entry.actionDescription,
          changes: entry.changes || null,
          actorUserId: entry.actorUserId,
          actorType: entry.actorUserId ? "USER" : "SYSTEM",
          actorName: entry.actorName,
          createdAt:
            typeof entry.createdAt === "string"
              ? entry.createdAt
              : new Date(entry.createdAt).toISOString(),
          context: entry.context || null,
          isPinned: pinnedIds.has(entry.id),
        })) as Activity[];
      } catch {
        // Fallback to entity-specific endpoint
        if (entityType === "CASE") {
          const fallbackResponse = await apiClient.get<{ data: Activity[] }>(
            `/cases/${entityId}/activity`,
          );
          return (fallbackResponse.data || []).map((a) => ({
            ...a,
            isPinned: pinnedIds.has(a.id),
          }));
        }
        throw new Error("Failed to fetch activities");
      }
    },
    enabled: enabled && !!entityId,
    staleTime: 30_000, // 30 seconds
  });

  const activities = activitiesData || [];

  // Extract unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const users = new Map<string, string>();
    activities.forEach((a) => {
      if (a.actorUserId && a.actorName) {
        users.set(a.actorUserId, a.actorName);
      }
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [activities]);

  // Extract unique teams (placeholder - would come from API in real impl)
  const uniqueTeams = useMemo(() => {
    // Teams would be extracted from activity metadata if available
    // For now, return empty array as teams are not in activity data
    return [] as Array<{ id: string; name: string }>;
  }, []);

  // Compute upcoming items (tasks due, SLA deadlines in the future)
  const upcomingActivities = useMemo(() => {
    const now = new Date();
    return activities
      .filter((a) => {
        if (a.action === "task_created" || a.action === "task_assigned") {
          const dueDate =
            (a.changes?.dueDate?.new as string) ||
            (a.context?.dueDate as string);
          if (dueDate && new Date(dueDate) > now) return true;
        }
        if (a.action === "sla_warning" || a.action === "sla_updated") {
          const slaDate = a.context?.slaDueAt as string;
          if (slaDate && new Date(slaDate) > now) return true;
        }
        return false;
      })
      .sort((a, b) => {
        const dateA =
          (a.context?.dueDate as string) ||
          (a.context?.slaDueAt as string) ||
          a.createdAt;
        const dateB =
          (b.context?.dueDate as string) ||
          (b.context?.slaDueAt as string) ||
          b.createdAt;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
  }, [activities]);

  // Separate pinned activities
  const pinnedActivities = useMemo(() => {
    return activities.filter((a) => pinnedIds.has(a.id));
  }, [activities, pinnedIds]);

  // Apply all filters to get filtered activities (excluding pinned, which show separately)
  const filteredActivities = useMemo(() => {
    let filtered = activities.filter((a) => !pinnedIds.has(a.id));

    // Filter by active type checkboxes
    if (activeTypes.size < ALL_ACTIVITY_TYPES.length) {
      filtered = filtered.filter((a) => {
        return Array.from(activeTypes).some((typeFilter) =>
          actionMatchesTypeFilter(a.action, typeFilter),
        );
      });
    }

    // Filter by user
    if (userFilter !== "all") {
      filtered = filtered.filter((a) => a.actorUserId === userFilter);
    }

    // Filter by team (placeholder - not yet implemented in data model)
    // if (teamFilter !== "all") {
    //   filtered = filtered.filter((a) => a.context?.teamId === teamFilter);
    // }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.actionDescription?.toLowerCase().includes(query) ||
          a.actorName?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [activities, pinnedIds, activeTypes, userFilter, searchQuery]);

  // Type toggle handlers
  const toggleType = useCallback((type: ActivityTypeFilter) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const selectAllTypes = useCallback(() => {
    setActiveTypes(new Set(ALL_ACTIVITY_TYPES));
  }, []);

  const deselectAllTypes = useCallback(() => {
    setActiveTypes(new Set());
  }, []);

  // Pin/unpin actions
  const pinActivity = useCallback(
    (activityId: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        next.add(activityId);
        savePinnedActivityIds(entityId, next);
        return next;
      });
      toast.success("Activity pinned");
    },
    [entityId],
  );

  const unpinActivity = useCallback(
    (activityId: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        savePinnedActivityIds(entityId, next);
        return next;
      });
      toast.success("Activity unpinned");
    },
    [entityId],
  );

  const isPinned = useCallback(
    (activityId: string) => {
      return pinnedIds.has(activityId);
    },
    [pinnedIds],
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (activityId: string) => {
      // Try API delete endpoint
      await apiClient.delete(`/activity/${activityId}`);
    },
    onSuccess: () => {
      toast.success("Activity deleted");
      queryClient.invalidateQueries({
        queryKey: ["activities", entityType, entityId],
      });
    },
    onError: () => {
      toast.error("Failed to delete activity");
    },
  });

  const deleteActivity = useCallback(
    (activityId: string) => {
      // Also remove from pinned if applicable
      setPinnedIds((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        savePinnedActivityIds(entityId, next);
        return next;
      });
      deleteMutation.mutate(activityId);
    },
    [entityId, deleteMutation],
  );

  return {
    // Data
    activities,
    filteredActivities,
    pinnedActivities,
    upcomingActivities,
    isLoading,
    error: error as Error | null,
    refetch,

    // Filters
    activeTypes,
    toggleType,
    selectAllTypes,
    deselectAllTypes,
    userFilter,
    setUserFilter,
    teamFilter,
    setTeamFilter,
    searchQuery,
    setSearchQuery,

    // Counts
    visibleCount: filteredActivities.length + pinnedActivities.length,
    totalCount: activities.length,

    // Actions
    pinActivity,
    unpinActivity,
    deleteActivity,
    isPinned,

    // Filter dropdown data
    uniqueUsers,
    uniqueTeams,
  };
}
