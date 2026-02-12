"use client";

/**
 * ProjectWorkloadView Component
 *
 * Monday.com-style Workload View showing team member task distribution
 * as horizontal stacked bars. Highlights overloaded team members and
 * provides capacity threshold visualization.
 */

import React, { useState, useMemo, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useProjectStats,
  type ProjectDetailResponse,
  type WorkloadEntry,
} from "@/hooks/use-project-detail";
import type { ProjectTask } from "@/types/project";

interface ProjectWorkloadViewProps {
  project: ProjectDetailResponse | null;
  isLoading: boolean;
  onTaskClick: (task: ProjectTask) => void;
  onRefresh: () => void;
}

/**
 * Status colors for stacked bar segments.
 */
const STATUS_COLORS = {
  done: "#22c55e", // green
  inProgress: "#3b82f6", // blue
  stuck: "#ef4444", // red
  notStarted: "#9ca3af", // gray
};

/**
 * Sort options for workload view.
 */
type SortOption = "name" | "total" | "overdue";

/**
 * ProjectWorkloadView - Shows team workload distribution.
 */
export function ProjectWorkloadView({
  project,
  isLoading,
  onTaskClick,
  onRefresh,
}: ProjectWorkloadViewProps) {
  const [capacityThreshold, setCapacityThreshold] = useState(10);
  const [sortBy, setSortBy] = useState<SortOption>("total");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const { data: stats, isLoading: statsLoading } = useProjectStats(project?.id);

  // Sort workload entries
  const sortedWorkload = useMemo(() => {
    if (!stats?.workload) return [];

    const sorted = [...stats.workload];
    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => a.user.name.localeCompare(b.user.name));
        break;
      case "total":
        sorted.sort((a, b) => b.total - a.total);
        break;
      case "overdue":
        sorted.sort((a, b) => b.overdue - a.overdue);
        break;
    }
    return sorted;
  }, [stats?.workload, sortBy]);

  // Find max task count for scaling bars
  const maxTasks = useMemo(() => {
    if (!sortedWorkload.length) return capacityThreshold;
    const maxWork = Math.max(...sortedWorkload.map((w) => w.total));
    return Math.max(maxWork, capacityThreshold);
  }, [sortedWorkload, capacityThreshold]);

  const toggleUserExpand = useCallback((userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  // Get tasks for expanded user
  const getTasksForUser = useCallback(
    (userId: string): ProjectTask[] => {
      if (!project?.tasks) return [];
      return project.tasks.filter((t) => t.assigneeId === userId);
    },
    [project?.tasks],
  );

  if (isLoading || statsLoading) {
    return <WorkloadSkeleton />;
  }

  if (!project || !stats) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Team Workload</CardTitle>
            </div>

            <div className="flex items-center gap-4">
              {/* Sort selector */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortOption)}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="total">Total Tasks</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Capacity threshold */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Capacity:</span>
                <Select
                  value={String(capacityThreshold)}
                  onValueChange={(v) => setCapacityThreshold(Number(v))}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Color legend */}
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: STATUS_COLORS.done }}
              />
              <span className="text-muted-foreground">Done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: STATUS_COLORS.inProgress }}
              />
              <span className="text-muted-foreground">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: STATUS_COLORS.stuck }}
              />
              <span className="text-muted-foreground">Stuck</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: STATUS_COLORS.notStarted }}
              />
              <span className="text-muted-foreground">Not Started</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-1">
          {sortedWorkload.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No assigned tasks yet
            </div>
          ) : (
            sortedWorkload.map((entry) => (
              <WorkloadRow
                key={entry.user.id}
                entry={entry}
                maxTasks={maxTasks}
                capacityThreshold={capacityThreshold}
                isExpanded={expandedUsers.has(entry.user.id)}
                onToggleExpand={() => toggleUserExpand(entry.user.id)}
                tasks={getTasksForUser(entry.user.id)}
                onTaskClick={onTaskClick}
              />
            ))
          )}

          {/* Unassigned tasks row */}
          {stats.unassignedTasks > 0 && (
            <div className="flex items-center gap-4 py-3 px-2 border-t mt-4">
              <div className="flex items-center gap-3 min-w-[180px]">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <UserX className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium text-sm">Unassigned</div>
                </div>
              </div>

              <div className="flex-1 flex items-center gap-4">
                <Badge variant="secondary" className="text-xs">
                  {stats.unassignedTasks} tasks
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * WorkloadRow - Individual team member's workload bar.
 */
interface WorkloadRowProps {
  entry: WorkloadEntry;
  maxTasks: number;
  capacityThreshold: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  tasks: ProjectTask[];
  onTaskClick: (task: ProjectTask) => void;
}

function WorkloadRow({
  entry,
  maxTasks,
  capacityThreshold,
  isExpanded,
  onToggleExpand,
  tasks,
  onTaskClick,
}: WorkloadRowProps) {
  const isOverloaded = entry.total > capacityThreshold;
  const notStarted = entry.total - entry.done - entry.inProgress - entry.stuck;

  // Calculate bar segment widths as percentages
  const totalWidth = (entry.total / maxTasks) * 100;
  const doneWidth = entry.total > 0 ? (entry.done / entry.total) * 100 : 0;
  const inProgressWidth =
    entry.total > 0 ? (entry.inProgress / entry.total) * 100 : 0;
  const stuckWidth = entry.total > 0 ? (entry.stuck / entry.total) * 100 : 0;
  const notStartedWidth =
    entry.total > 0 ? (notStarted / entry.total) * 100 : 0;

  // Calculate capacity line position
  const capacityLinePosition = (capacityThreshold / maxTasks) * 100;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        className={cn(
          "flex items-center gap-4 py-3 px-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
          isOverloaded && "bg-red-50",
        )}
      >
        {/* User info */}
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-3 min-w-[180px]">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {entry.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="font-medium text-sm">{entry.user.name}</div>
              {isOverloaded && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  Overloaded
                </div>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Stacked bar */}
        <div className="flex-1 relative">
          <div
            className="h-6 rounded-md overflow-hidden flex relative"
            style={{ width: `${totalWidth}%` }}
          >
            {/* Done segment */}
            {entry.done > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      style={{
                        width: `${doneWidth}%`,
                        backgroundColor: STATUS_COLORS.done,
                      }}
                      className="h-full"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Done: {entry.done} tasks</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* In Progress segment */}
            {entry.inProgress > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      style={{
                        width: `${inProgressWidth}%`,
                        backgroundColor: STATUS_COLORS.inProgress,
                      }}
                      className="h-full"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    In Progress: {entry.inProgress} tasks
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Stuck segment */}
            {entry.stuck > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      style={{
                        width: `${stuckWidth}%`,
                        backgroundColor: STATUS_COLORS.stuck,
                      }}
                      className="h-full"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Stuck: {entry.stuck} tasks</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Not Started segment */}
            {notStarted > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      style={{
                        width: `${notStartedWidth}%`,
                        backgroundColor: STATUS_COLORS.notStarted,
                      }}
                      className="h-full"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    Not Started: {notStarted} tasks
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Capacity threshold line */}
          <div
            className="absolute top-0 bottom-0 border-l-2 border-dashed border-gray-400"
            style={{ left: `${capacityLinePosition}%` }}
          />
        </div>

        {/* Total count */}
        <div className="flex items-center gap-2 min-w-[80px] justify-end">
          <Badge
            variant={isOverloaded ? "destructive" : "secondary"}
            className="text-xs"
          >
            {entry.total} tasks
          </Badge>
          {entry.overdue > 0 && (
            <Badge variant="destructive" className="text-xs">
              {entry.overdue} overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Expanded task list */}
      <CollapsibleContent>
        <div className="ml-[200px] pl-4 border-l-2 border-muted pb-2">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="w-full text-left py-1.5 px-2 rounded hover:bg-muted/50 transition-colors text-sm flex items-center gap-2"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    task.status === "DONE"
                      ? STATUS_COLORS.done
                      : task.status === "IN_PROGRESS"
                        ? STATUS_COLORS.inProgress
                        : task.status === "STUCK"
                          ? STATUS_COLORS.stuck
                          : STATUS_COLORS.notStarted,
                }}
              />
              <span className="truncate flex-1">{task.title}</span>
              {task.dueDate && (
                <span
                  className={cn(
                    "text-xs text-muted-foreground",
                    new Date(task.dueDate) < new Date() &&
                      task.status !== "DONE" &&
                      "text-red-600",
                  )}
                >
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
            </button>
          ))}
          {tasks.length === 0 && (
            <div className="text-sm text-muted-foreground py-2">No tasks</div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * WorkloadSkeleton - Loading state for workload view.
 */
function WorkloadSkeleton() {
  return (
    <div className="h-full overflow-auto p-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 flex-1" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
