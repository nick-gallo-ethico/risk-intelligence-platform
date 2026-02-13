"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Phone,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivityFilters } from "./activity-filters";
import { ActivityEntry } from "./activity-entry";
import { groupByDate } from "@/lib/date-utils";
import { apiClient } from "@/lib/api";
import type { Case } from "@/types/case";
import type { Activity, ActivityFilterType } from "@/types/activity";

/**
 * Extended Activity type with context for upcoming items
 */
interface ActivityWithContext extends Activity {
  context?: Record<string, unknown> | null;
}

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

interface CaseActivityTimelineProps {
  caseData: Case | null;
  isLoading: boolean;
}

export function CaseActivityTimeline({
  caseData,
  isLoading,
}: CaseActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityWithContext[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActivityFilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);

  // Fetch activities from backend
  const fetchActivities = useCallback(async () => {
    if (!caseData?.id) {
      setActivities([]);
      return;
    }

    setActivitiesLoading(true);
    setActivitiesError(null);

    try {
      // Correct API path: /activity/CASE/:id (not /activity/entity/CASE/:id)
      const response = await apiClient.get<TimelineResponse>(
        `/activity/CASE/${caseData.id}?includeRelated=true&limit=50`,
      );

      // Transform TimelineResponse.entries to ActivityWithContext[] format
      const transformedActivities: ActivityWithContext[] = response.entries.map(
        (entry) => ({
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
        }),
      );

      setActivities(transformedActivities);
    } catch (error) {
      console.error("Failed to fetch activities:", error);

      // Try fallback endpoint: /cases/:id/activity (CasesController)
      try {
        const fallbackResponse = await apiClient.get<{ data: Activity[] }>(
          `/cases/${caseData.id}/activity`,
        );
        if (fallbackResponse.data) {
          setActivities(fallbackResponse.data);
          return;
        }
      } catch (fallbackError) {
        console.error("Fallback activity fetch also failed:", fallbackError);
      }

      // No fake fallback - show error with retry option
      setActivitiesError("Failed to load activities. Please try again.");
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [caseData?.id]);

  // Fetch activities when case data is available
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Compute upcoming items (tasks due, SLA deadlines in the future)
  const upcomingItems = useMemo(() => {
    const now = new Date();
    return activities
      .filter((a) => {
        // Check if activity has a due date in the future
        // Task activities or SLA-related activities
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
        // Sort by due date ascending (soonest first)
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

  // Extract unique users from activities for filter dropdown
  const uniqueUsers = useMemo(() => {
    const users = new Map<string, string>();
    activities.forEach((a) => {
      if (a.actorUserId && a.actorName) {
        users.set(a.actorUserId, a.actorName);
      }
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [activities]);

  // Filter activities based on active filter, search query, and user filter
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filter by type
    if (activeFilter !== "all") {
      filtered = filtered.filter((activity) => {
        switch (activeFilter) {
          case "notes":
            return activity.action === "commented";
          case "status":
            return activity.action === "status_changed";
          case "files":
            return activity.action === "file_uploaded";
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.actionDescription?.toLowerCase().includes(query) ||
          a.actorName?.toLowerCase().includes(query),
      );
    }

    // Filter by user
    if (userFilter !== "all") {
      filtered = filtered.filter((a) => a.actorUserId === userFilter);
    }

    return filtered;
  }, [activities, activeFilter, searchQuery, userFilter]);

  // Count activities by type for filter badges
  const filterCounts = useMemo(() => {
    return {
      all: activities.length,
      notes: activities.filter((a) => a.action === "commented").length,
      status: activities.filter((a) => a.action === "status_changed").length,
      files: activities.filter((a) => a.action === "file_uploaded").length,
    };
  }, [activities]);

  // Group filtered activities by date
  const groupedActivities = useMemo(() => {
    return groupByDate(filteredActivities, (activity) => activity.createdAt);
  }, [filteredActivities]);

  const handleAddNote = useCallback(() => {
    setAddNoteModalOpen(true);
    // TODO: Implement modal in future task
    console.log("Add note clicked - modal placeholder");
  }, []);

  if (isLoading) {
    return <CaseActivityTimelineSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Actions Bar */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddNote}
            aria-label="Add a note to this case"
          >
            <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Add Note
          </Button>
          <Button variant="outline" size="sm">
            <Phone className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Log Call
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Send Email
          </Button>
        </div>
      </div>

      {/* Case Details */}
      <div className="p-6 border-b">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Case Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">
              {caseData.details}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter tabs and user dropdown */}
        <div className="px-6 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <ActivityFilters
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              counts={filterCounts}
            />
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Filter count indicator */}
          <div className="text-xs text-gray-500 mt-2">
            Showing {filteredActivities.length} of {activities.length}{" "}
            activities
          </div>
        </div>

        {/* Activities list */}
        <div
          className="flex-1 p-6 overflow-auto"
          role="tabpanel"
          id={`activity-panel-${activeFilter}`}
          aria-label={`${activeFilter} activities`}
        >
          {activitiesLoading ? (
            <ActivityTimelineSkeleton />
          ) : activitiesError && activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-3">{activitiesError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchActivities}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          ) : filteredActivities.length === 0 ? (
            <EmptyState filter={activeFilter} />
          ) : (
            <div className="space-y-6">
              {/* Upcoming section */}
              {upcomingItems.length > 0 && (
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Upcoming
                  </h3>
                  <div className="space-y-2">
                    {upcomingItems.map((item, index) => (
                      <ActivityEntry
                        key={`upcoming-${item.id}`}
                        activity={item}
                        isLast={index === upcomingItems.length - 1}
                        isUpcoming
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Date-grouped activities */}
              {groupedActivities.map((group) => (
                <div key={group.label}>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    {group.label}
                  </h4>
                  <div className="space-y-0">
                    {group.items.map((activity, index) => (
                      <ActivityEntry
                        key={activity.id}
                        activity={activity}
                        isLast={index === group.items.length - 1}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Note Modal Placeholder */}
      {addNoteModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setAddNoteModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Add Note</h2>
            <p className="text-gray-500 text-sm mb-4">
              Note creation will be implemented in a future task.
            </p>
            <Button onClick={() => setAddNoteModalOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EmptyStateProps {
  filter: ActivityFilterType;
}

function EmptyState({ filter }: EmptyStateProps) {
  const messages: Record<
    ActivityFilterType,
    { title: string; description: string }
  > = {
    all: {
      title: "No activity yet",
      description:
        "Activity will appear here as changes are made to this case.",
    },
    notes: {
      title: "No notes yet",
      description: 'Click "Add Note" to add the first note to this case.',
    },
    status: {
      title: "No status changes",
      description: "Status change history will appear here.",
    },
    files: {
      title: "No files uploaded",
      description: "Uploaded files will appear here.",
    },
  };

  const { title, description } = messages[filter];

  return (
    <div className="text-center py-12" data-testid="empty-state">
      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h4 className="text-sm font-medium text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CaseActivityTimelineSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Actions Bar skeleton */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Case details skeleton */}
      <div className="p-6 border-b">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>

      {/* Activity section skeleton */}
      <div className="flex-1 p-6">
        <Skeleton className="h-4 w-20 mb-3" />
        {/* Filter tabs skeleton */}
        <div className="flex gap-2 mb-6 border-b pb-2">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-14" />
        </div>
        {/* Timeline skeleton */}
        <ActivityTimelineSkeleton />
      </div>
    </div>
  );
}
