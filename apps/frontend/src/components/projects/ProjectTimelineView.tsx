"use client";

/**
 * ProjectTimelineView Component
 *
 * A Gantt chart timeline view for project tasks within the project detail page.
 * Tasks are displayed as bars on a time axis, grouped by their project groups.
 * Supports dependency arrows between linked tasks.
 *
 * Features:
 * - Timeline zoom (week/month/quarter views)
 * - Task bars colored by status
 * - Today line marker
 * - Dependency arrows between tasks
 * - Tasks grouped by project group
 * - Tooltips with task details
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  differenceInDays,
  format,
  min,
  max,
  addDays,
  subDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  endOfWeek,
  isWithinInterval,
} from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoomIn, ZoomOut, Calendar, Circle } from "lucide-react";
import type { ProjectDetailResponse } from "@/hooks/use-project-detail";
import type {
  ProjectTask,
  ProjectTaskStatus,
  ProjectGroup,
} from "@/types/project";

/**
 * Timeline zoom levels.
 */
type TimelineZoom = "week" | "month" | "quarter";

/**
 * Timeline column for rendering grid.
 */
interface TimelineColumn {
  date: Date;
  label: string;
  isToday: boolean;
  isWeekend: boolean;
}

/**
 * Timeline range with columns.
 */
interface TimelineRange {
  start: Date;
  end: Date;
  columns: TimelineColumn[];
}

/**
 * Task bar with position info.
 */
interface TaskBar {
  id: string;
  task: ProjectTask;
  left: number; // Percentage
  width: number; // Percentage
  row: number;
  groupId: string | null;
  isMilestone: boolean; // No end date = milestone dot
}

/**
 * Task dependency for rendering arrows.
 */
interface TaskDependency {
  fromTaskId: string;
  toTaskId: string;
  type: "finish-to-start" | "start-to-start" | "finish-to-finish";
  isViolated: boolean; // Dependent task started before prerequisite finished
}

/**
 * Status colors for task bars.
 */
const STATUS_COLORS: Record<ProjectTaskStatus, { bar: string; bg: string }> = {
  NOT_STARTED: { bar: "#94a3b8", bg: "#f1f5f9" }, // slate
  IN_PROGRESS: { bar: "#3b82f6", bg: "#dbeafe" }, // blue
  STUCK: { bar: "#ef4444", bg: "#fee2e2" }, // red
  DONE: { bar: "#22c55e", bg: "#dcfce7" }, // green
  CANCELLED: { bar: "#6b7280", bg: "#f3f4f6" }, // gray
};

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 50;
const LEFT_COLUMN_WIDTH = 200;

interface ProjectTimelineViewProps {
  project: ProjectDetailResponse | null;
  isLoading: boolean;
  onTaskClick: (task: ProjectTask) => void;
  onRefresh: () => void;
}

/**
 * ProjectTimelineView - Gantt chart timeline for project tasks.
 */
export function ProjectTimelineView({
  project,
  isLoading,
  onTaskClick,
}: ProjectTimelineViewProps) {
  const [zoom, setZoom] = useState<TimelineZoom>("month");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  // Measure chart width for absolute positioning
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setChartWidth(entry.contentRect.width);
      }
    });
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Get tasks organized by group
  const { groupedTasks, flatTaskList, groupList } = useMemo(() => {
    if (!project?.tasks) {
      return { groupedTasks: new Map(), flatTaskList: [], groupList: [] };
    }

    // Filter out subtasks - only show parent tasks on timeline
    const parentTasks = project.tasks.filter((t) => !t.parentTaskId);

    // Group tasks by groupId
    const grouped = new Map<string | null, ProjectTask[]>();

    // Initialize groups
    project.groups.forEach((g) => {
      grouped.set(g.id, []);
    });
    grouped.set(null, []); // Ungrouped tasks

    // Assign tasks to groups
    parentTasks.forEach((task) => {
      const groupId = task.groupId ?? null;
      const existing = grouped.get(groupId) || [];
      grouped.set(groupId, [...existing, task]);
    });

    // Create flat list with group headers for row positioning
    const flat: Array<{
      type: "group" | "task";
      item: ProjectGroup | ProjectTask;
    }> = [];
    const groups: ProjectGroup[] = [];

    // Add grouped tasks first
    project.groups.forEach((group) => {
      const tasks = grouped.get(group.id) || [];
      if (tasks.length > 0) {
        flat.push({ type: "group", item: group });
        groups.push(group);
        tasks.forEach((task) => {
          flat.push({ type: "task", item: task });
        });
      }
    });

    // Add ungrouped tasks
    const ungrouped = grouped.get(null) || [];
    if (ungrouped.length > 0) {
      const ungroupedGroup: ProjectGroup = {
        id: "_ungrouped",
        projectId: project.id,
        name: "Ungrouped",
        sortOrder: 999,
        isCollapsed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      flat.push({ type: "group", item: ungroupedGroup });
      groups.push(ungroupedGroup);
      ungrouped.forEach((task) => {
        flat.push({ type: "task", item: task });
      });
    }

    return { groupedTasks: grouped, flatTaskList: flat, groupList: groups };
  }, [project?.tasks, project?.groups, project?.id]);

  // Calculate timeline range based on tasks
  const timeline = useMemo(() => {
    const tasks = project?.tasks || [];
    if (tasks.length === 0) {
      const now = new Date();
      return createTimelineRange(subDays(now, 30), addDays(now, 60), zoom);
    }

    const dates: Date[] = [];
    tasks.forEach((t) => {
      if (t.startDate) dates.push(new Date(t.startDate));
      if (t.dueDate) dates.push(new Date(t.dueDate));
      dates.push(new Date(t.createdAt));
    });

    const minDate = min(dates);
    const maxDate = max(dates);

    const start = subDays(minDate, 14);
    const end = addDays(maxDate, 14);

    return createTimelineRange(start, end, zoom);
  }, [project?.tasks, zoom]);

  // Calculate bar positions for each task
  const taskBars = useMemo(() => {
    const bars: Map<string, TaskBar> = new Map();
    let row = 0;

    flatTaskList.forEach((entry) => {
      if (entry.type === "group") {
        row++; // Group header takes a row
      } else {
        const task = entry.item as ProjectTask;
        const totalDays = differenceInDays(timeline.end, timeline.start);

        // Determine start and end dates
        const startDate = task.startDate
          ? new Date(task.startDate)
          : new Date(task.createdAt);
        const endDate = task.dueDate ? new Date(task.dueDate) : null;

        const startOffset = differenceInDays(startDate, timeline.start);
        const endOffset = endDate
          ? differenceInDays(endDate, timeline.start)
          : startOffset + 1; // Milestone = 1 day width

        const left = Math.max(0, (startOffset / totalDays) * 100);
        const right = Math.min(100, (endOffset / totalDays) * 100);
        const width = Math.max(1, right - left); // Minimum 1% width

        bars.set(task.id, {
          id: task.id,
          task,
          left,
          width,
          row,
          groupId: task.groupId ?? null,
          isMilestone: !endDate,
        });

        row++;
      }
    });

    return bars;
  }, [flatTaskList, timeline]);

  // Mock dependencies - in real implementation would come from API
  const dependencies = useMemo<TaskDependency[]>(() => {
    // For demo purposes, return empty array
    // Real implementation would fetch from /projects/:id/tasks/:id/dependencies
    return [];
  }, []);

  // Calculate today line position
  const todayPosition = useMemo(() => {
    const today = new Date();
    if (
      !isWithinInterval(today, { start: timeline.start, end: timeline.end })
    ) {
      return null;
    }
    const totalDays = differenceInDays(timeline.end, timeline.start);
    const todayOffset = differenceInDays(today, timeline.start);
    return (todayOffset / totalDays) * 100;
  }, [timeline]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      if (prev === "quarter") return "month";
      if (prev === "month") return "week";
      return prev;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      if (prev === "week") return "month";
      if (prev === "month") return "quarter";
      return prev;
    });
  }, []);

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Project not found
      </div>
    );
  }

  const totalRows = flatTaskList.length;
  const totalHeight = HEADER_HEIGHT + totalRows * ROW_HEIGHT + 20;
  const columnWidth = zoom === "week" ? 40 : zoom === "month" ? 80 : 120;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-slate-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          disabled={zoom === "week"}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          disabled={zoom === "quarter"}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            View:{" "}
            {zoom === "week"
              ? "Daily"
              : zoom === "month"
                ? "Weekly"
                : "Monthly"}
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-max">
          {/* Left column - task names */}
          <div
            className="flex-shrink-0 border-r bg-white sticky left-0 z-20"
            style={{ width: LEFT_COLUMN_WIDTH }}
          >
            {/* Header */}
            <div
              className="border-b bg-slate-100 flex items-center px-3 font-medium text-sm"
              style={{ height: HEADER_HEIGHT }}
            >
              Tasks
            </div>

            {/* Task list */}
            <div>
              {flatTaskList.map((entry, index) => (
                <div
                  key={
                    entry.type === "group"
                      ? `g-${(entry.item as ProjectGroup).id}`
                      : (entry.item as ProjectTask).id
                  }
                  className={cn(
                    "flex items-center px-3 border-b",
                    entry.type === "group" && "bg-slate-50 font-medium",
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  {entry.type === "group" ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            (entry.item as ProjectGroup).color || "#6b7280",
                        }}
                      />
                      <span className="text-sm truncate">
                        {(entry.item as ProjectGroup).name}
                      </span>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-2 text-sm truncate w-full text-left hover:text-primary transition-colors"
                      onClick={() => onTaskClick(entry.item as ProjectTask)}
                    >
                      {(entry.item as ProjectTask).assignee && (
                        <Avatar className="h-5 w-5 flex-shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {(entry.item as ProjectTask).assignee?.name.charAt(
                              0,
                            )}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="truncate">
                        {(entry.item as ProjectTask).title}
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right column - timeline chart */}
          <div
            ref={chartContainerRef}
            className="flex-1 relative"
            style={{ minWidth: timeline.columns.length * columnWidth }}
          >
            {/* Timeline header */}
            <div
              className="sticky top-0 z-10 flex border-b bg-slate-100"
              style={{ height: HEADER_HEIGHT }}
            >
              {timeline.columns.map((col, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center border-r text-xs font-medium",
                    col.isToday && "bg-blue-50",
                    col.isWeekend && "bg-slate-50",
                  )}
                  style={{ width: columnWidth }}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Chart body */}
            <div
              className="relative"
              style={{ height: totalRows * ROW_HEIGHT }}
            >
              {/* Grid lines */}
              {timeline.columns.map((col, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute top-0 bottom-0 border-r border-slate-100",
                    col.isToday && "bg-blue-50/30",
                    col.isWeekend && "bg-slate-50/50",
                  )}
                  style={{
                    left: (i / timeline.columns.length) * 100 + "%",
                    width: 100 / timeline.columns.length + "%",
                  }}
                />
              ))}

              {/* Row backgrounds */}
              {flatTaskList.map((entry, index) => (
                <div
                  key={
                    entry.type === "group"
                      ? `row-g-${(entry.item as ProjectGroup).id}`
                      : `row-${(entry.item as ProjectTask).id}`
                  }
                  className={cn(
                    "absolute left-0 right-0 border-b",
                    entry.type === "group" && "bg-slate-50/50",
                  )}
                  style={{
                    top: index * ROW_HEIGHT,
                    height: ROW_HEIGHT,
                  }}
                />
              ))}

              {/* Today line */}
              {todayPosition !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: `${todayPosition}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1 py-0.5 text-[10px] bg-red-500 text-white rounded whitespace-nowrap">
                    Today
                  </div>
                </div>
              )}

              {/* Dependency arrows SVG overlay */}
              {dependencies.length > 0 && chartWidth > 0 && (
                <svg
                  className="absolute inset-0 pointer-events-none z-5"
                  style={{ width: "100%", height: totalRows * ROW_HEIGHT }}
                >
                  {dependencies.map((dep, index) => {
                    const fromBar = taskBars.get(dep.fromTaskId);
                    const toBar = taskBars.get(dep.toTaskId);

                    if (!fromBar || !toBar) return null;

                    // Calculate arrow coordinates
                    const fromX =
                      ((fromBar.left + fromBar.width) / 100) * chartWidth;
                    const fromY = fromBar.row * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const toX = (toBar.left / 100) * chartWidth;
                    const toY = toBar.row * ROW_HEIGHT + ROW_HEIGHT / 2;

                    // Create bezier curve path
                    const midX = (fromX + toX) / 2;
                    const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

                    return (
                      <g key={index}>
                        <path
                          d={path}
                          fill="none"
                          stroke={dep.isViolated ? "#ef4444" : "#9ca3af"}
                          strokeWidth={1.5}
                          markerEnd="url(#arrowhead)"
                        />
                      </g>
                    );
                  })}
                  {/* Arrow marker definition */}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
                    </marker>
                  </defs>
                </svg>
              )}

              {/* Task bars */}
              <TooltipProvider>
                {Array.from(taskBars.values()).map((bar) => {
                  const statusColors = STATUS_COLORS[bar.task.status];

                  return (
                    <Tooltip key={bar.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute cursor-pointer transition-all hover:scale-y-110",
                            bar.isMilestone
                              ? "flex items-center justify-center"
                              : "rounded",
                          )}
                          style={{
                            top: bar.row * ROW_HEIGHT + 8,
                            left: `${bar.left}%`,
                            width: bar.isMilestone ? 20 : `${bar.width}%`,
                            height: ROW_HEIGHT - 16,
                            backgroundColor: bar.isMilestone
                              ? "transparent"
                              : statusColors.bg,
                            border: bar.isMilestone
                              ? "none"
                              : `1px solid ${statusColors.bar}`,
                          }}
                          onClick={() => onTaskClick(bar.task)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              onTaskClick(bar.task);
                            }
                          }}
                        >
                          {bar.isMilestone ? (
                            <div
                              className="w-4 h-4 transform rotate-45"
                              style={{ backgroundColor: statusColors.bar }}
                            />
                          ) : (
                            <span
                              className="absolute inset-0 flex items-center px-2 text-xs font-medium truncate"
                              style={{ color: statusColors.bar }}
                            >
                              {bar.task.title}
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">{bar.task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {bar.task.startDate
                              ? format(new Date(bar.task.startDate), "MMM d")
                              : format(new Date(bar.task.createdAt), "MMM d")}
                            {bar.task.dueDate &&
                              ` - ${format(new Date(bar.task.dueDate), "MMM d")}`}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: statusColors.bar,
                                color: statusColors.bar,
                              }}
                            >
                              {bar.task.status.replace("_", " ")}
                            </Badge>
                            {bar.task.assignee && (
                              <span className="text-xs text-muted-foreground">
                                {bar.task.assignee.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>

            {/* Empty state */}
            {flatTaskList.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                No tasks to display. Create a task to start tracking progress.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Create timeline range with columns for the given date range and zoom level.
 */
function createTimelineRange(
  start: Date,
  end: Date,
  zoom: TimelineZoom,
): TimelineRange {
  const today = new Date();
  let columns: TimelineColumn[];

  switch (zoom) {
    case "week": {
      const days = eachDayOfInterval({ start, end });
      columns = days.map((date) => ({
        date,
        label: format(date, "EEE d"),
        isToday: format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      }));
      break;
    }

    case "month": {
      const weeks = eachWeekOfInterval({ start, end });
      columns = weeks.map((date) => ({
        date,
        label: format(date, "MMM d"),
        isToday: isWithinInterval(today, { start: date, end: endOfWeek(date) }),
        isWeekend: false,
      }));
      break;
    }

    case "quarter": {
      const months = eachMonthOfInterval({ start, end });
      columns = months.map((date) => ({
        date,
        label: format(date, "MMM yyyy"),
        isToday: format(date, "yyyy-MM") === format(today, "yyyy-MM"),
        isWeekend: false,
      }));
      break;
    }
  }

  return { start, end, columns };
}

/**
 * TimelineSkeleton - Loading state for the timeline view.
 */
function TimelineSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center gap-2 p-2 border-b">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex-1 flex">
        <div className="w-[200px] border-r">
          <Skeleton className="h-[50px] w-full border-b" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[36px] w-full border-b" />
          ))}
        </div>
        <div className="flex-1">
          <Skeleton className="h-[50px] w-full border-b" />
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton
                key={i}
                className="h-5 w-32"
                style={{ marginLeft: `${i * 10}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
