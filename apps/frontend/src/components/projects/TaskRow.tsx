"use client";

/**
 * TaskRow Component
 *
 * A single task row in the project task table.
 * Supports inline editing for status, priority, assignee, and due date.
 * Draggable for reordering within groups.
 */

import React, { useState, useCallback, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  GripVertical,
  ArrowDown,
  Minus,
  ArrowUp,
  ChevronsUp,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateTask } from "@/hooks/use-project-detail";
import { apiClient } from "@/lib/api";
import type {
  ProjectTask,
  ProjectTaskStatus,
  ProjectTaskPriority,
} from "@/types/project";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Status display configuration.
 */
const STATUS_CONFIG: Record<
  ProjectTaskStatus,
  { bg: string; text: string; label: string }
> = {
  NOT_STARTED: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: "Not Started",
  },
  IN_PROGRESS: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    label: "In Progress",
  },
  STUCK: { bg: "bg-red-100", text: "text-red-700", label: "Stuck" },
  DONE: { bg: "bg-green-100", text: "text-green-700", label: "Done" },
  CANCELLED: {
    bg: "bg-gray-100",
    text: "text-gray-400 line-through",
    label: "Cancelled",
  },
};

/**
 * Priority display configuration.
 */
const PRIORITY_CONFIG: Record<
  ProjectTaskPriority,
  { icon: React.ElementType; color: string; label: string }
> = {
  LOW: { icon: ArrowDown, color: "text-gray-500", label: "Low" },
  MEDIUM: { icon: Minus, color: "text-yellow-600", label: "Medium" },
  HIGH: { icon: ArrowUp, color: "text-orange-500", label: "High" },
  CRITICAL: { icon: ChevronsUp, color: "text-red-600", label: "Critical" },
};

interface TaskRowProps {
  task: ProjectTask;
  projectId: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
  onRefresh: () => void;
}

/**
 * TaskRow - renders a single task row with inline editing.
 */
export function TaskRow({
  task,
  projectId,
  isSelected,
  onToggleSelect,
  onClick,
  onRefresh,
}: TaskRowProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const updateTask = useUpdateTask(projectId);

  // Sortable hook for drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Fetch users when assignee popover opens
  useEffect(() => {
    if (assigneeOpen) {
      apiClient
        .get<User[]>("/users")
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch(() => setUsers([]));
    }
  }, [assigneeOpen]);

  // Handle title double-click to edit
  const handleTitleDoubleClick = useCallback(() => {
    setEditedTitle(task.title);
    setIsEditingTitle(true);
  }, [task.title]);

  const handleTitleSave = useCallback(async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { title: editedTitle.trim() },
      });
      onRefresh();
    }
    setIsEditingTitle(false);
  }, [editedTitle, task.id, task.title, updateTask, onRefresh]);

  const handleTitleCancel = useCallback(() => {
    setEditedTitle(task.title);
    setIsEditingTitle(false);
  }, [task.title]);

  // Handle status change
  const handleStatusChange = useCallback(
    async (status: ProjectTaskStatus) => {
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { status },
      });
      setStatusOpen(false);
      onRefresh();
    },
    [task.id, updateTask, onRefresh],
  );

  // Handle priority change
  const handlePriorityChange = useCallback(
    async (priority: ProjectTaskPriority) => {
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { priority },
      });
      setPriorityOpen(false);
      onRefresh();
    },
    [task.id, updateTask, onRefresh],
  );

  // Handle assignee change
  const handleAssigneeChange = useCallback(
    async (assigneeId: string | null) => {
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { assigneeId },
      });
      setAssigneeOpen(false);
      onRefresh();
    },
    [task.id, updateTask, onRefresh],
  );

  // Handle due date change
  const handleDueDateChange = useCallback(
    async (date: Date | undefined) => {
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { dueDate: date?.toISOString() ?? null },
      });
      setDueDateOpen(false);
      onRefresh();
    },
    [task.id, updateTask, onRefresh],
  );

  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const PriorityIcon = priorityConfig.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid grid-cols-[40px_1fr_120px_100px_140px_120px_80px] gap-2 items-center px-4 py-2 border-b last:border-b-0 hover:bg-gray-50 transition-colors group",
        isDragging && "opacity-50 bg-blue-50",
        isSelected && "bg-blue-50/50",
      )}
    >
      {/* Checkbox and drag handle */}
      <div className="flex items-center gap-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Task title - click to open panel, double-click to edit */}
      <div
        className="min-w-0 cursor-pointer"
        onClick={onClick}
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleTitleDoubleClick();
        }}
      >
        {isEditingTitle ? (
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") handleTitleCancel();
            }}
            onBlur={handleTitleSave}
            autoFocus
            className="h-7 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={cn(
              "text-sm truncate block",
              task.status === "CANCELLED" &&
                "line-through text-muted-foreground",
            )}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Status - dropdown */}
      <div onClick={(e) => e.stopPropagation()}>
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <button className="w-full">
              <Badge
                className={cn(
                  statusConfig.bg,
                  statusConfig.text,
                  "hover:opacity-80 cursor-pointer text-xs w-full justify-center",
                )}
              >
                {statusConfig.label}
              </Badge>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="start">
            {(Object.keys(STATUS_CONFIG) as ProjectTaskStatus[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors",
                    task.status === status && "bg-muted",
                  )}
                >
                  {STATUS_CONFIG[status].label}
                </button>
              ),
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Priority - dropdown */}
      <div onClick={(e) => e.stopPropagation()}>
        <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition-colors">
              <PriorityIcon className={cn("h-4 w-4", priorityConfig.color)} />
              <span className="text-xs">{priorityConfig.label}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-1" align="start">
            {(Object.keys(PRIORITY_CONFIG) as ProjectTaskPriority[]).map(
              (priority) => {
                const config = PRIORITY_CONFIG[priority];
                const Icon = config.icon;
                return (
                  <button
                    key={priority}
                    onClick={() => handlePriorityChange(priority)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors",
                      task.priority === priority && "bg-muted",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                    {config.label}
                  </button>
                );
              },
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Assignee - dropdown */}
      <div onClick={(e) => e.stopPropagation()}>
        <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted transition-colors min-w-0">
              {task.assignee ? (
                <>
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {task.assignee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate">{task.assignee.name}</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Unassigned
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="start">
            <button
              onClick={() => handleAssigneeChange(null)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
              Unassigned
            </button>
            <div className="my-1 border-t" />
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleAssigneeChange(user.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors",
                  task.assigneeId === user.id && "bg-muted",
                )}
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {user.firstName.charAt(0)}
                    {user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">
                  {user.firstName} {user.lastName}
                </span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Due date - date picker */}
      <div onClick={(e) => e.stopPropagation()}>
        <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-xs">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              {task.dueDate ? (
                <span
                  className={cn(
                    new Date(task.dueDate) < new Date() &&
                      task.status !== "DONE" &&
                      "text-red-600",
                  )}
                >
                  {format(new Date(task.dueDate), "MMM d")}
                </span>
              ) : (
                <span className="text-muted-foreground">No date</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={task.dueDate ? new Date(task.dueDate) : undefined}
              onSelect={handleDueDateChange}
              initialFocus
            />
            {task.dueDate && (
              <div className="p-2 border-t">
                <button
                  onClick={() => handleDueDateChange(undefined)}
                  className="w-full text-sm text-red-600 hover:underline"
                >
                  Clear date
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Subtask count */}
      <div className="text-xs text-muted-foreground">
        {task.subtaskCount && task.subtaskCount > 0 ? (
          <span className="px-2 py-0.5 bg-gray-100 rounded-full">
            {task.completedSubtaskCount ?? 0}/{task.subtaskCount}
          </span>
        ) : (
          <span>-</span>
        )}
      </div>
    </div>
  );
}
