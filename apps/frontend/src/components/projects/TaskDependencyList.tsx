"use client";

/**
 * TaskDependencyList Component
 *
 * Task dependency management - shows both prerequisites and dependents.
 * Supports adding/removing dependencies with type selection.
 */

import React, { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Link2,
  Plus,
  X,
  AlertTriangle,
  Search,
  ArrowRight,
  ArrowLeft,
  Loader2,
  GitBranch,
} from "lucide-react";
import type {
  TaskDependency,
  TaskDependencyType,
  ProjectTask,
} from "@/types/project";
import {
  useTaskDependencies,
  useCreateTaskDependency,
  useDeleteTaskDependency,
  useProjectDetail,
} from "@/hooks/use-project-detail";

interface TaskDependencyListProps {
  projectId: string;
  taskId: string;
  onNavigateToTask?: (taskId: string) => void;
}

// Dependency type configuration
const DEPENDENCY_TYPE_CONFIG: Record<
  TaskDependencyType,
  { label: string; description: string; shortLabel: string }
> = {
  FINISH_TO_START: {
    label: "Finish to Start",
    description: "Task must finish before this can start",
    shortLabel: "FS",
  },
  START_TO_START: {
    label: "Start to Start",
    description: "Task must start before this can start",
    shortLabel: "SS",
  },
  FINISH_TO_FINISH: {
    label: "Finish to Finish",
    description: "Task must finish before this can finish",
    shortLabel: "FF",
  },
  START_TO_FINISH: {
    label: "Start to Finish",
    description: "Task must start before this can finish",
    shortLabel: "SF",
  },
};

// Status badge configuration
const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  NOT_STARTED: { bg: "bg-gray-100", text: "text-gray-700" },
  IN_PROGRESS: { bg: "bg-blue-100", text: "text-blue-700" },
  STUCK: { bg: "bg-red-100", text: "text-red-700" },
  DONE: { bg: "bg-green-100", text: "text-green-700" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-400" },
};

/**
 * TaskDependencyList - Task dependency management.
 */
export function TaskDependencyList({
  projectId,
  taskId,
  onNavigateToTask,
}: TaskDependencyListProps) {
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDependencyType, setSelectedDependencyType] =
    useState<TaskDependencyType>("FINISH_TO_START");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Fetch dependencies and project tasks
  const { data: dependencies, isLoading } = useTaskDependencies(
    projectId,
    taskId,
  );
  const { data: projectDetail } = useProjectDetail(projectId);

  // Mutations
  const createDependency = useCreateTaskDependency(projectId, taskId);
  const deleteDependency = useDeleteTaskDependency(projectId, taskId);

  // Get all tasks except current one
  const allTasks = projectDetail?.tasks?.filter((t) => t.id !== taskId) || [];

  // Filter tasks for search
  const existingDependencyIds = new Set([
    ...(dependencies?.dependsOn?.map((d) => d.dependsOnTaskId) || []),
    ...(dependencies?.blocking?.map((d) => d.taskId) || []),
  ]);

  const availableTasks = allTasks.filter(
    (t) =>
      !existingDependencyIds.has(t.id) &&
      (searchQuery === "" ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Handle add dependency
  const handleAddDependency = useCallback(
    (dependsOnTaskId: string) => {
      createDependency.mutate(
        {
          dependsOnTaskId,
          type: selectedDependencyType,
        },
        {
          onSuccess: () => {
            setSearchQuery("");
            setAddPopoverOpen(false);
          },
        },
      );
    },
    [createDependency, selectedDependencyType],
  );

  // Handle delete dependency
  const handleDelete = useCallback(() => {
    if (!deleteTargetId) return;
    deleteDependency.mutate(deleteTargetId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeleteTargetId(null);
      },
    });
  }, [deleteDependency, deleteTargetId]);

  // Render a dependency row
  const renderDependency = (
    dependency: TaskDependency,
    direction: "depends_on" | "blocking",
  ) => {
    const statusConfig = STATUS_CONFIG[dependency.dependsOnTask.status] || {
      bg: "bg-gray-100",
      text: "text-gray-700",
    };
    const typeConfig = DEPENDENCY_TYPE_CONFIG[dependency.type];

    return (
      <div
        key={dependency.id}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
      >
        {/* Direction icon */}
        <div
          className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
            direction === "depends_on" ? "bg-amber-100" : "bg-blue-100",
          )}
        >
          {direction === "depends_on" ? (
            <ArrowLeft className="h-3.5 w-3.5 text-amber-600" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
          )}
        </div>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onNavigateToTask?.(dependency.dependsOnTask.id)}
            className="text-sm font-medium hover:text-blue-600 hover:underline truncate block text-left"
          >
            {dependency.dependsOnTask.title}
          </button>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge
              variant="outline"
              className={cn(
                "h-5 text-[10px]",
                statusConfig.bg,
                statusConfig.text,
              )}
            >
              {dependency.dependsOnTask.status.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {typeConfig.shortLabel}
            </span>
          </div>
        </div>

        {/* Violation indicator */}
        {dependency.isViolated && (
          <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
            <AlertTriangle className="h-3 w-3 mr-0.5" />
            Violated
          </Badge>
        )}

        {/* Remove button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => {
            setDeleteTargetId(dependency.id);
            setDeleteDialogOpen(true);
          }}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  const dependsOn = dependencies?.dependsOn || [];
  const blocking = dependencies?.blocking || [];
  const hasAnyDependencies = dependsOn.length > 0 || blocking.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Dependencies</span>
        </div>

        {/* Add dependency button */}
        <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-7">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b space-y-3">
              {/* Dependency type selector */}
              <div className="space-y-1.5">
                <Label className="text-xs">Dependency Type</Label>
                <Select
                  value={selectedDependencyType}
                  onValueChange={(v) =>
                    setSelectedDependencyType(v as TaskDependencyType)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPENDENCY_TYPE_CONFIG).map(
                      ([type, config]) => (
                        <SelectItem key={type} value={type}>
                          <div>
                            <div className="font-medium">{config.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {config.description}
                            </div>
                          </div>
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8"
                />
              </div>
            </div>

            <ScrollArea className="max-h-48">
              <div className="p-1">
                {availableTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchQuery
                      ? "No tasks found"
                      : "No available tasks to link"}
                  </p>
                ) : (
                  availableTasks.map((task) => {
                    const statusConfig = STATUS_CONFIG[task.status] || {
                      bg: "bg-gray-100",
                      text: "text-gray-700",
                    };
                    return (
                      <button
                        key={task.id}
                        onClick={() => handleAddDependency(task.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-left"
                        disabled={createDependency.isPending}
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 text-[10px] flex-shrink-0",
                            statusConfig.bg,
                            statusConfig.text,
                          )}
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                        <span className="flex-1 truncate">{task.title}</span>
                        {createDependency.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* No dependencies state */}
      {!hasAnyDependencies && (
        <div className="flex flex-col items-center justify-center py-6 text-center border rounded-lg bg-gray-50/50">
          <Link2 className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">No dependencies</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
            Link this task to other tasks to define the order of work.
          </p>
        </div>
      )}

      {/* Depends on section */}
      {dependsOn.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Depends on ({dependsOn.length})
            </span>
          </div>
          <div className="border rounded-lg divide-y">
            {dependsOn.map((dep) => renderDependency(dep, "depends_on"))}
          </div>
        </div>
      )}

      {/* Blocking section */}
      {blocking.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Blocking ({blocking.length})
            </span>
          </div>
          <div className="border rounded-lg divide-y">
            {blocking.map((dep) => renderDependency(dep, "blocking"))}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Dependency</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this dependency? This may affect
              task scheduling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteDependency.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TaskDependencyList;
