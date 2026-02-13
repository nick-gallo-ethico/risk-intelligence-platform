"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityEntry } from "@/components/cases/activity-entry";
import { groupByDate } from "@/lib/date-utils";
import { apiClient } from "@/lib/api";
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
    changes?: Record<string, { old: unknown; new: unknown }> | null;
    context?: Record<string, unknown> | null;
  }>;
  total: number;
  hasMore: boolean;
}

interface InvestigationActivityTimelineProps {
  investigationId: string;
  isLoading?: boolean;
}

const FILTER_TYPES: { id: ActivityFilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "notes", label: "Notes" },
  { id: "status", label: "Status" },
  { id: "files", label: "Evidence" },
];

export function InvestigationActivityTimeline({
  investigationId,
  isLoading: parentLoading,
}: InvestigationActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActivityFilterType>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  // Fetch activities from backend
  const fetchActivities = useCallback(async () => {
    if (!investigationId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<TimelineResponse>(
        `/activity/INVESTIGATION/${investigationId}?includeRelated=true&limit=100`,
      );

      const transformed: ActivityWithContext[] = response.entries.map(
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
          createdAt: entry.createdAt,
          context: entry.context,
        }),
      );

      setActivities(transformed);
    } catch (err) {
      console.error("Failed to fetch investigation activities:", err);
      setError("Failed to load activities");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [investigationId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Upcoming items (tasks, SLA deadlines, scheduled interviews)
  const upcomingItems = useMemo(() => {
    const now = new Date();
    return activities
      .filter((a) => {
        if (a.action === "task_created" || a.action === "task_assigned") {
          const dueDate = a.context?.dueDate;
          if (dueDate && new Date(dueDate as string) > now) return true;
        }
        if (
          a.action === ("interview_scheduled" as Activity["action"]) ||
          a.actionDescription?.toLowerCase().includes("interview scheduled")
        ) {
          const scheduledDate = a.context?.scheduledAt;
          if (scheduledDate && new Date(scheduledDate as string) > now)
            return true;
        }
        return false;
      })
      .sort((a, b) => {
        const dateA =
          a.context?.dueDate || a.context?.scheduledAt || a.createdAt;
        const dateB =
          b.context?.dueDate || b.context?.scheduledAt || b.createdAt;
        return (
          new Date(dateA as string).getTime() -
          new Date(dateB as string).getTime()
        );
      });
  }, [activities]);

  // Unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const users = new Map<string, string>();
    activities.forEach((a) => {
      if (a.actorUserId && a.actorName) {
        users.set(a.actorUserId, a.actorName);
      }
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [activities]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Type filter
    if (activeFilter !== "all") {
      filtered = filtered.filter((a) => {
        switch (activeFilter) {
          case "notes":
            return (
              a.action === "commented" ||
              a.actionDescription?.toLowerCase().includes("note")
            );
          case "status":
            return a.action === "status_changed";
          case "files":
            return (
              a.action === "file_uploaded" ||
              a.actionDescription?.toLowerCase().includes("evidence") ||
              a.actionDescription?.toLowerCase().includes("file")
            );
          default:
            return true;
        }
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.actionDescription?.toLowerCase().includes(query) ||
          a.actorName?.toLowerCase().includes(query),
      );
    }

    // User filter
    if (userFilter !== "all") {
      filtered = filtered.filter((a) => a.actorUserId === userFilter);
    }

    return filtered;
  }, [activities, activeFilter, searchQuery, userFilter]);

  // Grouped by date
  const groupedActivities = useMemo(
    () => groupByDate(filteredActivities, (activity) => activity.createdAt),
    [filteredActivities],
  );

  if (parentLoading || loading) {
    return <InvestigationActivityTimelineSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button variant="outline" onClick={fetchActivities}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
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

      {/* Filters */}
      <div className="px-4 py-2 border-b flex items-center justify-between gap-4">
        <Tabs
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as ActivityFilterType)}
        >
          <TabsList className="h-8">
            {FILTER_TYPES.map((f) => (
              <TabsTrigger key={f.id} value={f.id} className="text-xs px-3 h-7">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[150px] h-8">
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

      {/* Filter count */}
      <div className="px-4 py-1 text-xs text-gray-500 border-b">
        Showing {filteredActivities.length} of {activities.length} activities
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-y-auto p-4">
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

        {/* Date-grouped history */}
        {groupedActivities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No activities found</p>
          </div>
        ) : (
          groupedActivities.map((group) => (
            <div key={group.label} className="mb-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {group.label}
              </h4>
              <div className="space-y-3">
                {group.items.map((activity, index) => (
                  <ActivityEntry
                    key={activity.id}
                    activity={activity}
                    isLast={index === group.items.length - 1}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton for loading state
 */
function InvestigationActivityTimelineSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-4 w-48" />
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
