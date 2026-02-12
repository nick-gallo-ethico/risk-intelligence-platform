"use client";

/**
 * ProjectTaskTable Component
 *
 * Monday.com-style grouped task table with inline editing.
 * Groups tasks by their groupId and renders group headers,
 * task rows, and add-task rows for each group.
 * Supports custom columns via Column Center.
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
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectGroupHeader } from "./ProjectGroupHeader";
import { AddTaskRow } from "./AddTaskRow";
import { TaskRow } from "./TaskRow";
import { ColumnCenterDialog } from "./ColumnCenterDialog";
import {
  useReorderTasks,
  useReorderColumns,
  useUpdateTask,
} from "@/hooks/use-project-detail";
import type { ProjectDetailResponse } from "@/hooks/use-project-detail";
import type { ProjectTask, ProjectGroup, ProjectColumn } from "@/types/project";

interface ProjectTaskTableProps {
  project: ProjectDetailResponse | null;
  isLoading: boolean;
  onTaskClick: (task: ProjectTask) => void;
  onRefresh: () => void;
}

/**
 * Get column icon for header display.
 */
function getColumnTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    STATUS: "circle",
    PERSON: "user",
    DATE: "calendar",
    TIMELINE: "clock",
    TEXT: "type",
    LONG_TEXT: "align-left",
    NUMBER: "hash",
    DROPDOWN: "chevron-down",
    CHECKBOX: "check-square",
    LINK: "link",
    TAGS: "tag",
    FILES: "paperclip",
    DEPENDENCY: "git-branch",
    CONNECTED_ENTITY: "external-link",
    PROGRESS: "trending-up",
  };
  return icons[type] || "circle";
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
  const [columnCenterOpen, setColumnCenterOpen] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const reorderTasks = useReorderTasks(project?.id ?? "");
  const reorderColumns = useReorderColumns(project?.id ?? "");

  // Get sorted custom columns
  const sortedColumns = useMemo(() => {
    if (!project?.columns) return [];
    return [...project.columns].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [project?.columns]);

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
                  <div className="border-t overflow-x-auto">
                    {/* Column headers */}
                    <ColumnHeaders
                      columns={sortedColumns}
                      columnWidths={columnWidths}
                      onOpenColumnCenter={() => setColumnCenterOpen(true)}
                      projectId={project.id}
                      onRefresh={onRefresh}
                    />

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
                          columns={sortedColumns}
                          columnWidths={columnWidths}
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
                  <div className="border-t overflow-x-auto">
                    {/* Column headers */}
                    <ColumnHeaders
                      columns={sortedColumns}
                      columnWidths={columnWidths}
                      onOpenColumnCenter={() => setColumnCenterOpen(true)}
                      projectId={project.id}
                      onRefresh={onRefresh}
                    />

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
                          columns={sortedColumns}
                          columnWidths={columnWidths}
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

      {/* Column Center Dialog */}
      <ColumnCenterDialog
        open={columnCenterOpen}
        onOpenChange={setColumnCenterOpen}
        projectId={project.id}
        columns={project.columns || []}
        onRefresh={onRefresh}
      />
    </div>
  );
}

/**
 * ColumnHeaders - renders the table header row with custom columns.
 */
interface ColumnHeadersProps {
  columns: ProjectColumn[];
  columnWidths: Record<string, number>;
  onOpenColumnCenter: () => void;
  projectId: string;
  onRefresh: () => void;
}

function ColumnHeaders({
  columns,
  columnWidths,
  onOpenColumnCenter,
  projectId,
  onRefresh,
}: ColumnHeadersProps) {
  const reorderColumns = useReorderColumns(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = [...columns];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      await reorderColumns.mutateAsync({
        orderedIds: reordered.map((c) => c.id),
      });
      onRefresh();
    }
  };

  // Calculate grid template columns based on fixed columns + custom columns
  const gridCols = [
    "40px", // Checkbox/drag
    "1fr", // Task title (flexible)
    "120px", // Status
    "100px", // Priority
    "140px", // Assignee
    "120px", // Due Date
    "80px", // Subtasks
    ...columns.map((col) =>
      columnWidths[col.id]
        ? `${columnWidths[col.id]}px`
        : `${col.width || 120}px`,
    ),
    "40px", // Add column button
  ].join(" ");

  return (
    <div
      className="grid gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-gray-50 border-b"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div></div>
      <div>Task</div>
      <div>Status</div>
      <div>Priority</div>
      <div>Assignee</div>
      <div>Due Date</div>
      <div>Subtasks</div>

      {/* Custom column headers with drag to reorder */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <SortableColumnHeader
              key={column.id}
              column={column}
              width={columnWidths[column.id] || column.width || 120}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add column button */}
      <div className="flex items-center justify-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onOpenColumnCenter}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Column</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/**
 * SortableColumnHeader - draggable column header.
 */
interface SortableColumnHeaderProps {
  column: ProjectColumn;
  width: number;
}

function SortableColumnHeader({ column, width }: SortableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${width}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 cursor-grab group",
        isDragging && "opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
      <span className="truncate">{column.name}</span>
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
