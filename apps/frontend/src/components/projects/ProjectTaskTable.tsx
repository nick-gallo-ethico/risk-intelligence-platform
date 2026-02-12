"use client";

/**
 * ProjectTaskTable Component
 *
 * Monday.com-style grouped task table with inline editing.
 * Groups tasks by their groupId and renders group headers,
 * task rows, and add-task rows for each group.
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectGroupHeader } from "./ProjectGroupHeader";
import { AddTaskRow } from "./AddTaskRow";
import { TaskRow } from "./TaskRow";
import { useReorderTasks } from "@/hooks/use-project-detail";
import type { ProjectDetailResponse } from "@/hooks/use-project-detail";
import type { ProjectTask, ProjectGroup } from "@/types/project";

interface ProjectTaskTableProps {
  project: ProjectDetailResponse | null;
  isLoading: boolean;
  onTaskClick: (task: ProjectTask) => void;
  onRefresh: () => void;
}

/**
 * ProjectTaskTable - the main grouped task table component.
 */
export function ProjectTaskTable({
  project,
  isLoading,
  onTaskClick,
  onRefresh,
}: ProjectTaskTableProps) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const reorderTasks = useReorderTasks(project?.id ?? "");

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Group tasks by groupId
  const tasksByGroup = useMemo(() => {
    if (!project) return new Map<string | null, ProjectTask[]>();

    const map = new Map<string | null, ProjectTask[]>();

    // Initialize groups
    project.groups.forEach((group) => {
      map.set(group.id, []);
    });
    map.set(null, []); // Ungrouped

    // Distribute tasks
    project.tasks.forEach((task) => {
      const groupId = task.groupId ?? null;
      const groupTasks = map.get(groupId) ?? [];
      groupTasks.push(task);
      map.set(groupId, groupTasks);
    });

    // Sort by sortOrder within each group
    map.forEach((tasks) => {
      tasks.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return map;
  }, [project]);

  // Get sorted groups (by sortOrder)
  const sortedGroups = useMemo(() => {
    if (!project) return [];
    return [...project.groups].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [project]);

  // Toggle group collapse
  const handleToggleCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Toggle task selection
  const handleToggleSelect = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // Select all tasks in a group
  const handleSelectAllInGroup = useCallback(
    (groupId: string | null, select: boolean) => {
      const groupTasks = tasksByGroup.get(groupId) ?? [];
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        groupTasks.forEach((task) => {
          if (select) {
            next.add(task.id);
          } else {
            next.delete(task.id);
          }
        });
        return next;
      });
    },
    [tasksByGroup],
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTaskId(null);

      if (!over || active.id === over.id || !project) return;

      // Find the group containing the dragged task
      const activeTask = project.tasks.find((t) => t.id === active.id);
      if (!activeTask) return;

      const groupId = activeTask.groupId;
      const groupTasks = tasksByGroup.get(groupId ?? null) ?? [];

      const oldIndex = groupTasks.findIndex((t) => t.id === active.id);
      const newIndex = groupTasks.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        // Reorder tasks within group
        const reorderedTasks = [...groupTasks];
        const [movedTask] = reorderedTasks.splice(oldIndex, 1);
        reorderedTasks.splice(newIndex, 0, movedTask);

        await reorderTasks.mutateAsync({
          orderedIds: reorderedTasks.map((t) => t.id),
        });
        onRefresh();
      }
    },
    [project, tasksByGroup, reorderTasks, onRefresh],
  );

  if (isLoading) {
    return <ProjectTaskTableSkeleton />;
  }

  if (!project) {
    return null;
  }

  // Check if any group has selected tasks
  const getGroupSelectionState = (groupId: string | null) => {
    const groupTasks = tasksByGroup.get(groupId) ?? [];
    if (groupTasks.length === 0) return "none";
    const selectedCount = groupTasks.filter((t) =>
      selectedTaskIds.has(t.id),
    ).length;
    if (selectedCount === 0) return "none";
    if (selectedCount === groupTasks.length) return "all";
    return "some";
  };

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {/* Render each group */}
          {sortedGroups.map((group) => {
            const groupTasks = tasksByGroup.get(group.id) ?? [];
            const isCollapsed = collapsedGroups.has(group.id);
            const selectionState = getGroupSelectionState(group.id);
            const taskIds = groupTasks.map((t) => t.id);

            return (
              <div
                key={group.id}
                className="bg-white rounded-lg border shadow-sm"
              >
                {/* Group header */}
                <ProjectGroupHeader
                  group={group}
                  taskCount={groupTasks.length}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => handleToggleCollapse(group.id)}
                  selectionState={selectionState}
                  onToggleSelectAll={(select) =>
                    handleSelectAllInGroup(group.id, select)
                  }
                  projectId={project.id}
                  onRefresh={onRefresh}
                />

                {/* Tasks and add row */}
                {!isCollapsed && (
                  <div className="border-t">
                    {/* Column headers */}
                    <div className="grid grid-cols-[40px_1fr_120px_100px_140px_120px_80px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-gray-50 border-b">
                      <div></div>
                      <div>Task</div>
                      <div>Status</div>
                      <div>Priority</div>
                      <div>Assignee</div>
                      <div>Due Date</div>
                      <div>Subtasks</div>
                    </div>

                    {/* Task rows */}
                    <SortableContext
                      items={taskIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {groupTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          projectId={project.id}
                          isSelected={selectedTaskIds.has(task.id)}
                          onToggleSelect={() => handleToggleSelect(task.id)}
                          onClick={() => onTaskClick(task)}
                          onRefresh={onRefresh}
                        />
                      ))}
                    </SortableContext>

                    {/* Add task row */}
                    <AddTaskRow
                      projectId={project.id}
                      groupId={group.id}
                      onTaskCreated={onRefresh}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Ungrouped tasks section */}
          {(() => {
            const ungroupedTasks = tasksByGroup.get(null) ?? [];
            if (ungroupedTasks.length === 0 && sortedGroups.length > 0) {
              return null;
            }

            const isCollapsed = collapsedGroups.has("_ungrouped");
            const selectionState = getGroupSelectionState(null);
            const taskIds = ungroupedTasks.map((t) => t.id);

            return (
              <div className="bg-white rounded-lg border shadow-sm">
                {/* Ungrouped header */}
                <div
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleToggleCollapse("_ungrouped")}
                >
                  <Checkbox
                    checked={selectionState === "all"}
                    ref={(node) => {
                      if (node && selectionState === "some") {
                        (node as unknown as HTMLButtonElement).dataset.state =
                          "indeterminate";
                      }
                    }}
                    onCheckedChange={(checked) => {
                      handleSelectAllInGroup(null, checked === true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="w-1 h-5 rounded-full bg-gray-400 mr-2" />
                  <span className="font-medium text-gray-700">Ungrouped</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {ungroupedTasks.length}{" "}
                    {ungroupedTasks.length === 1 ? "task" : "tasks"}
                  </span>
                </div>

                {!isCollapsed && (
                  <div className="border-t">
                    {/* Column headers */}
                    <div className="grid grid-cols-[40px_1fr_120px_100px_140px_120px_80px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-gray-50 border-b">
                      <div></div>
                      <div>Task</div>
                      <div>Status</div>
                      <div>Priority</div>
                      <div>Assignee</div>
                      <div>Due Date</div>
                      <div>Subtasks</div>
                    </div>

                    <SortableContext
                      items={taskIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {ungroupedTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          projectId={project.id}
                          isSelected={selectedTaskIds.has(task.id)}
                          onToggleSelect={() => handleToggleSelect(task.id)}
                          onClick={() => onTaskClick(task)}
                          onRefresh={onRefresh}
                        />
                      ))}
                    </SortableContext>

                    <AddTaskRow
                      projectId={project.id}
                      groupId={undefined}
                      onTaskCreated={onRefresh}
                    />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Empty state */}
          {sortedGroups.length === 0 &&
            (tasksByGroup.get(null)?.length ?? 0) === 0 && (
              <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground">
                <p className="mb-2">No tasks yet</p>
                <p className="text-sm">
                  Add a group or create a task to get started
                </p>
              </div>
            )}
        </div>
      </DndContext>
    </div>
  );
}

/**
 * Skeleton for the task table.
 */
function ProjectTaskTableSkeleton() {
  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-1 rounded-full" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="border-t">
              <div className="px-4 py-2 bg-gray-50 border-b">
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
              {[1, 2, 3].map((j) => (
                <div key={j} className="px-4 py-3 border-b last:border-b-0">
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
