"use client";

/**
 * ProjectBoardView Component
 *
 * A Kanban board view for project tasks within the project detail page.
 * Tasks are displayed as cards in status columns, with drag-to-move
 * functionality for changing task status.
 *
 * Uses @dnd-kit for drag-and-drop between status columns.
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  ArrowDown,
  Minus,
  ArrowUp,
  ChevronsUp,
  Calendar,
  MessageSquare,
  Paperclip,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useBulkUpdateTasks,
  useCreateTask,
  type ProjectDetailResponse,
} from "@/hooks/use-project-detail";
import type {
  ProjectTask,
  ProjectTaskStatus,
  ProjectTaskPriority,
} from "@/types/project";

/**
 * Status column configuration.
 */
interface StatusColumnConfig {
  id: ProjectTaskStatus;
  label: string;
  color: string;
  bgColor: string;
  defaultCollapsed?: boolean;
}

const STATUS_COLUMNS: StatusColumnConfig[] = [
  {
    id: "NOT_STARTED",
    label: "Not Started",
    color: "#6b7280",
    bgColor: "bg-gray-50",
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
  },
  { id: "STUCK", label: "Stuck", color: "#ef4444", bgColor: "bg-red-50" },
  { id: "DONE", label: "Done", color: "#22c55e", bgColor: "bg-green-50" },
  {
    id: "CANCELLED",
    label: "Cancelled",
    color: "#9ca3af",
    bgColor: "bg-gray-50",
    defaultCollapsed: true,
  },
];

/**
 * Priority icon configuration.
 */
const PRIORITY_CONFIG: Record<
  ProjectTaskPriority,
  { icon: React.ElementType; color: string }
> = {
  LOW: { icon: ArrowDown, color: "text-gray-500" },
  MEDIUM: { icon: Minus, color: "text-yellow-600" },
  HIGH: { icon: ArrowUp, color: "text-orange-500" },
  CRITICAL: { icon: ChevronsUp, color: "text-red-600" },
};

interface ProjectBoardViewProps {
  project: ProjectDetailResponse | null;
  isLoading: boolean;
  onTaskClick: (task: ProjectTask) => void;
  onRefresh: () => void;
}

/**
 * ProjectBoardView - Kanban board for project tasks.
 */
export function ProjectBoardView({
  project,
  isLoading,
  onTaskClick,
  onRefresh,
}: ProjectBoardViewProps) {
  const [activeTask, setActiveTask] = useState<ProjectTask | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    () =>
      new Set(
        STATUS_COLUMNS.filter((c) => c.defaultCollapsed).map((c) => c.id),
      ),
  );

  const bulkUpdateTasks = useBulkUpdateTasks(project?.id ?? "");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped = new Map<ProjectTaskStatus, ProjectTask[]>();

    // Initialize all status columns with empty arrays
    STATUS_COLUMNS.forEach((col) => {
      grouped.set(col.id, []);
    });

    // Group tasks
    if (project?.tasks) {
      project.tasks.forEach((task) => {
        // Skip subtasks - only show parent tasks on board
        if (task.parentTaskId) return;

        const existing = grouped.get(task.status) || [];
        grouped.set(task.status, [...existing, task]);
      });
    }

    return grouped;
  }, [project?.tasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as ProjectTask | undefined;
    if (task) {
      setActiveTask(task);
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over || !project) return;

      const taskId = active.id as string;
      const newStatus = over.id as ProjectTaskStatus;

      // Find the task and check if status changed
      const task = project.tasks.find((t) => t.id === taskId);
      if (task && task.status !== newStatus) {
        await bulkUpdateTasks.mutateAsync({
          taskIds: [taskId],
          updates: { status: newStatus },
        });
        onRefresh();
      }
    },
    [project, bulkUpdateTasks, onRefresh],
  );

  const toggleColumnCollapse = useCallback((columnId: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  if (isLoading) {
    return <BoardSkeleton />;
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="h-full">
        <div className="flex gap-4 p-4 min-h-full">
          {STATUS_COLUMNS.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={tasksByStatus.get(column.id) || []}
              project={project}
              isCollapsed={collapsedColumns.has(column.id)}
              onToggleCollapse={() => toggleColumnCollapse(column.id)}
              onTaskClick={onTaskClick}
              onRefresh={onRefresh}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Drag overlay for smooth dragging */}
      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            groupColor={
              project.groups.find((g) => g.id === activeTask.groupId)?.color
            }
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * BoardColumn - A droppable status column.
 */
interface BoardColumnProps {
  column: StatusColumnConfig;
  tasks: ProjectTask[];
  project: ProjectDetailResponse;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onTaskClick: (task: ProjectTask) => void;
  onRefresh: () => void;
}

function BoardColumn({
  column,
  tasks,
  project,
  isCollapsed,
  onToggleCollapse,
  onTaskClick,
  onRefresh,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const createTask = useCreateTask(project.id);

  const handleAddTask = useCallback(async () => {
    await createTask.mutateAsync({
      title: "New Task",
      status: column.id,
    });
    onRefresh();
  }, [createTask, column.id, onRefresh]);

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] max-w-[280px] bg-muted/30 rounded-lg border transition-all",
        isOver && "ring-2 ring-primary ring-offset-2",
        isCollapsed && "min-w-[50px] max-w-[50px]",
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          "flex items-center gap-2 p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors",
          isCollapsed && "flex-col py-4",
        )}
        style={{ borderLeftColor: column.color, borderLeftWidth: "4px" }}
        onClick={onToggleCollapse}
      >
        {isCollapsed ? (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span
              className="font-medium text-sm writing-mode-vertical"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {column.label}
            </span>
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            <span className="font-medium text-sm">{column.label}</span>
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
            <div className="flex-1" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddTask();
                    }}
                    disabled={createTask.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add task</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>

      {/* Cards container */}
      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div
            ref={setNodeRef}
            className={cn(
              "p-2 space-y-2 min-h-[100px]",
              tasks.length === 0 && "flex items-center justify-center",
            )}
          >
            <SortableContext
              items={taskIds}
              strategy={verticalListSortingStrategy}
            >
              {tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8">No tasks</p>
              ) : (
                tasks.map((task) => (
                  <DraggableTaskCard
                    key={task.id}
                    task={task}
                    groupColor={
                      project.groups.find((g) => g.id === task.groupId)?.color
                    }
                    onClick={() => onTaskClick(task)}
                  />
                ))
              )}
            </SortableContext>
          </div>
        </ScrollArea>
      )}

      {/* Column footer */}
      {!isCollapsed && (
        <div className="p-2 border-t text-xs text-muted-foreground text-center">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </div>
      )}
    </div>
  );
}

/**
 * DraggableTaskCard - A draggable task card wrapper.
 */
interface DraggableTaskCardProps {
  task: ProjectTask;
  groupColor?: string;
  onClick: () => void;
}

function DraggableTaskCard({
  task,
  groupColor,
  onClick,
}: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { task },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-50")}
    >
      <TaskCard task={task} groupColor={groupColor} onClick={onClick} />
    </div>
  );
}

/**
 * TaskCard - Visual representation of a task on the board.
 */
interface TaskCardProps {
  task: ProjectTask;
  groupColor?: string;
  onClick?: () => void;
  isDragging?: boolean;
}

function TaskCard({ task, groupColor, onClick, isDragging }: TaskCardProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const PriorityIcon = priorityConfig.icon;

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE" &&
    task.status !== "CANCELLED";

  // Mock update/file counts - in real implementation these would come from the API
  const updateCount = 0;
  const fileCount = 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isDragging && "shadow-lg ring-2 ring-primary rotate-2",
      )}
      style={{
        borderLeftColor: groupColor || "transparent",
        borderLeftWidth: groupColor ? "3px" : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "flex-1 text-sm font-medium line-clamp-2",
              task.status === "CANCELLED" &&
                "line-through text-muted-foreground",
            )}
          >
            {task.title}
          </span>
        </div>

        {/* Meta row: priority, assignee */}
        <div className="flex items-center justify-between gap-2">
          {/* Priority icon */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <PriorityIcon
                    className={cn("h-4 w-4", priorityConfig.color)}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}{" "}
                priority
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Assignee */}
          {task.assignee ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {task.assignee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{task.assignee.name}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
        </div>

        {/* Bottom row: due date, subtasks, activity */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {/* Due date */}
          <div className="flex items-center gap-1">
            {task.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-600",
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
          </div>

          {/* Subtask progress, updates, files */}
          <div className="flex items-center gap-2">
            {/* Subtask progress */}
            {task.subtaskCount && task.subtaskCount > 0 && (
              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                {task.completedSubtaskCount ?? 0}/{task.subtaskCount}
              </span>
            )}

            {/* Update count */}
            {updateCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="h-3 w-3" />
                      {updateCount}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{updateCount} updates</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* File count */}
            {fileCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5">
                      <Paperclip className="h-3 w-3" />
                      {fileCount}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{fileCount} files</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * BoardSkeleton - Loading state for the board view.
 */
function BoardSkeleton() {
  return (
    <div className="flex gap-4 p-4">
      {STATUS_COLUMNS.slice(0, 4).map((col) => (
        <div key={col.id} className="min-w-[280px] space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
