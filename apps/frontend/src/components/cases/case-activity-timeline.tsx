"use client";

import { useCallback } from "react";
import {
  Plus,
  Phone,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Clock,
  Pin,
  ClipboardList,
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
import { ActivityTypeCheckboxes } from "./activity-filters";
import { ActivityEntry } from "./activity-entry";
import { groupByDate } from "@/lib/date-utils";
import { useActivities } from "@/hooks/useActivities";
import type { Case } from "@/types/case";

interface CaseActivityTimelineProps {
  caseData: Case | null;
  isLoading: boolean;
}

/**
 * CaseActivityTimeline - HubSpot-style activity timeline
 *
 * Features:
 * - Checkbox-style type filters (8 types)
 * - User/team filter dropdowns
 * - Search bar
 * - Pinned activities section (above chronological)
 * - Per-activity hover actions (pin, comment, edit, copy link, delete)
 * - Content expand/collapse for long entries
 * - Upcoming section for future tasks/SLA
 */
export function CaseActivityTimeline({
  caseData,
  isLoading,
}: CaseActivityTimelineProps) {
  const {
    filteredActivities,
    pinnedActivities,
    upcomingActivities,
    isLoading: activitiesLoading,
    error,
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
    visibleCount,
    totalCount,
    // Actions
    pinActivity,
    unpinActivity,
    deleteActivity,
    isPinned,
    // Filter data
    uniqueUsers,
    uniqueTeams,
  } = useActivities({
    entityType: "CASE",
    entityId: caseData?.id || "",
    enabled: !!caseData?.id,
  });

  // Group filtered activities by date
  const groupedActivities = groupByDate(
    filteredActivities,
    (activity) => activity.createdAt,
  );

  const handleAddNote = useCallback(() => {
    // TODO: Open add note modal
    console.log("Add note clicked");
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

      {/* Activity Timeline with HubSpot-style filter bar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter bar header */}
        <div className="px-6 py-4 border-b space-y-4">
          {/* Row 1: Count indicator + user/team dropdowns */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-gray-600">
              Filter activity ({visibleCount}/{totalCount})
            </span>

            {/* User filter */}
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

            {/* Team filter (placeholder) */}
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {uniqueTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Row 3: Type checkboxes */}
          <ActivityTypeCheckboxes
            activeTypes={activeTypes}
            onToggle={toggleType}
            onSelectAll={selectAllTypes}
            onDeselectAll={deselectAllTypes}
          />
        </div>

        {/* Activities list */}
        <div
          className="flex-1 p-6 overflow-auto"
          role="region"
          aria-label="Activity timeline"
        >
          {activitiesLoading ? (
            <ActivityTimelineSkeleton />
          ) : error ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-3">
                Failed to load activities. Please try again.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          ) : totalCount === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {/* Pinned section */}
              {pinnedActivities.length > 0 && (
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Pin className="h-4 w-4 text-blue-600" />
                    Pinned
                  </h3>
                  <div className="space-y-2">
                    {pinnedActivities.map((activity, index) => (
                      <ActivityEntry
                        key={`pinned-${activity.id}`}
                        activity={activity}
                        isLast={index === pinnedActivities.length - 1}
                        isPinned
                        onPin={pinActivity}
                        onUnpin={unpinActivity}
                        onDelete={deleteActivity}
                        canEdit={false}
                        canDelete={false}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming section */}
              {upcomingActivities.length > 0 && (
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Upcoming
                  </h3>
                  <div className="space-y-2">
                    {upcomingActivities.map((item, index) => (
                      <ActivityEntry
                        key={`upcoming-${item.id}`}
                        activity={item}
                        isLast={index === upcomingActivities.length - 1}
                        isUpcoming
                        isPinned={isPinned(item.id)}
                        onPin={pinActivity}
                        onUnpin={unpinActivity}
                        onDelete={deleteActivity}
                        canEdit={false}
                        canDelete={false}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Filtered activities empty state */}
              {filteredActivities.length === 0 && totalCount > 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">
                    No activities match your current filters.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={selectAllTypes}
                    className="mt-2"
                  >
                    Show all activity types
                  </Button>
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
                        isPinned={isPinned(activity.id)}
                        onPin={pinActivity}
                        onUnpin={unpinActivity}
                        onDelete={deleteActivity}
                        canEdit={false}
                        canDelete={false}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state when case has no activities at all
 */
function EmptyState() {
  return (
    <div className="text-center py-12" data-testid="empty-state">
      <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h4 className="text-sm font-medium text-gray-900 mb-1">
        No activities yet
      </h4>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">
        Use the quick actions to log notes, emails, calls, or other case
        activity.
      </p>
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

      {/* Filter bar skeleton */}
      <div className="px-6 py-4 border-b space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-9 w-full" />
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-5 w-24" />
          ))}
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="flex-1 p-6">
        <ActivityTimelineSkeleton />
      </div>
    </div>
  );
}
