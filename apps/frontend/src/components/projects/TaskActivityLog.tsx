"use client";

/**
 * TaskActivityLog Component
 *
 * Chronological activity feed for task changes.
 * Monday.com's "Activity Log" - every field change tracked with who/when.
 */

import React, { useState, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Activity,
  GitCommitHorizontal,
  User,
  Calendar,
  FileText,
  MessageSquare,
  AtSign,
  Plus,
  Link2,
  Bell,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Upload,
  Trash2,
} from "lucide-react";
import type { TaskActivity } from "@/types/project";
import { useTaskActivity } from "@/hooks/use-project-detail";

interface TaskActivityLogProps {
  projectId: string;
  taskId: string;
}

// Activity type configuration
const ACTIVITY_CONFIG: Record<
  TaskActivity["activityType"],
  { icon: React.ElementType; color: string; label: string }
> = {
  STATUS_CHANGED: {
    icon: ArrowRightLeft,
    color: "text-blue-500",
    label: "Status",
  },
  PRIORITY_CHANGED: {
    icon: AlertCircle,
    color: "text-orange-500",
    label: "Priority",
  },
  ASSIGNEE_CHANGED: {
    icon: User,
    color: "text-purple-500",
    label: "Assignment",
  },
  DUE_DATE_CHANGED: {
    icon: Calendar,
    color: "text-green-500",
    label: "Due Date",
  },
  TITLE_CHANGED: {
    icon: FileText,
    color: "text-gray-500",
    label: "Title",
  },
  DESCRIPTION_CHANGED: {
    icon: FileText,
    color: "text-gray-500",
    label: "Description",
  },
  GROUP_CHANGED: {
    icon: GitCommitHorizontal,
    color: "text-indigo-500",
    label: "Group",
  },
  FILE_ADDED: {
    icon: Upload,
    color: "text-cyan-500",
    label: "File",
  },
  FILE_REMOVED: {
    icon: Trash2,
    color: "text-red-500",
    label: "File",
  },
  COMMENT_ADDED: {
    icon: MessageSquare,
    color: "text-yellow-500",
    label: "Update",
  },
  MENTION: {
    icon: AtSign,
    color: "text-blue-600",
    label: "Mention",
  },
  CREATED: {
    icon: Plus,
    color: "text-green-600",
    label: "Created",
  },
  DEPENDENCY_ADDED: {
    icon: Link2,
    color: "text-violet-500",
    label: "Dependency",
  },
  DEPENDENCY_REMOVED: {
    icon: Link2,
    color: "text-red-500",
    label: "Dependency",
  },
  SUBSCRIBER_ADDED: {
    icon: Bell,
    color: "text-amber-500",
    label: "Subscriber",
  },
  SUBSCRIBER_REMOVED: {
    icon: Bell,
    color: "text-gray-400",
    label: "Subscriber",
  },
};

// Filter categories
const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "updates", label: "Updates" },
  { id: "status", label: "Status Changes" },
  { id: "assignments", label: "Assignments" },
  { id: "files", label: "Files" },
] as const;

type FilterId = (typeof FILTER_OPTIONS)[number]["id"];

// Map filter to activity types
const FILTER_ACTIVITY_TYPES: Record<FilterId, TaskActivity["activityType"][]> =
  {
    all: [],
    updates: ["COMMENT_ADDED", "MENTION"],
    status: ["STATUS_CHANGED", "PRIORITY_CHANGED"],
    assignments: ["ASSIGNEE_CHANGED"],
    files: ["FILE_ADDED", "FILE_REMOVED"],
  };

/**
 * TaskActivityLog - Chronological activity feed for task changes.
 */
export function TaskActivityLog({ projectId, taskId }: TaskActivityLogProps) {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");

  // Fetch activity
  const { data: activities, isLoading } = useTaskActivity(
    projectId,
    taskId,
    activeFilter !== "all" ? activeFilter : undefined,
  );

  // Filter activities based on selected filter
  const filteredActivities = React.useMemo(() => {
    if (!activities) return [];
    if (activeFilter === "all") return activities;

    const allowedTypes = FILTER_ACTIVITY_TYPES[activeFilter];
    if (allowedTypes.length === 0) return activities;

    return activities.filter((a) => allowedTypes.includes(a.activityType));
  }, [activities, activeFilter]);

  // Render a single activity entry
  const renderActivity = (activity: TaskActivity) => {
    const config = ACTIVITY_CONFIG[activity.activityType] || {
      icon: Activity,
      color: "text-gray-500",
      label: "Activity",
    };
    const Icon = config.icon;

    return (
      <div key={activity.id} className="flex gap-3 py-3 border-b last:border-0">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100",
            config.color,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Actor */}
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">
                  {activity.actor?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">
                {activity.actor?.name || "Unknown"}
              </span>
            </div>

            {/* Timestamp */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {format(new Date(activity.createdAt), "PPpp")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mt-0.5">{activity.description}</p>

          {/* Change details */}
          {activity.changes && (
            <div className="mt-1 text-xs text-muted-foreground">
              {activity.changes.oldValue && activity.changes.newValue && (
                <span>
                  <span className="line-through text-red-500/70">
                    {typeof activity.changes.oldValue === "string"
                      ? activity.changes.oldValue
                      : JSON.stringify(activity.changes.oldValue)}
                  </span>
                  {" → "}
                  <span className="text-green-600">
                    {typeof activity.changes.newValue === "string"
                      ? activity.changes.newValue
                      : JSON.stringify(activity.changes.newValue)}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex gap-2 p-4 border-b overflow-x-auto">
        {FILTER_OPTIONS.map((filter) => (
          <Button
            key={filter.id}
            size="sm"
            variant={activeFilter === filter.id ? "default" : "outline"}
            onClick={() => setActiveFilter(filter.id)}
            className="whitespace-nowrap"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Activity list */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No activity yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Activity will appear here when changes are made to this task.
              </p>
            </div>
          ) : (
            <div>
              {filteredActivities.map((activity) => renderActivity(activity))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default TaskActivityLog;
