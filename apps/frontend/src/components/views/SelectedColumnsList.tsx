/**
 * SelectedColumnsList Component
 *
 * A drag-and-drop sortable list of selected columns for the column picker.
 * Uses @dnd-kit for accessibility-friendly reordering.
 *
 * Features:
 * - Drag handles for reordering columns
 * - Frozen column visual indicator (blue background)
 * - Lock icon for primary column that cannot be removed
 * - Remove button for other columns
 */
"use client";

import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ColumnDefinition } from "@/types/view-config";
import { cn } from "@/lib/utils";

interface SortableColumnItemProps {
  column: ColumnDefinition;
  isLocked: boolean;
  isFrozen: boolean;
  onRemove: (columnId: string) => void;
}

function SortableColumnItem({
  column,
  isLocked,
  isFrozen,
  onRemove,
}: SortableColumnItemProps) {
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-2 bg-background border rounded-md",
        isDragging && "opacity-50 shadow-lg",
        isFrozen &&
          "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
      )}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Column name */}
      <span className="flex-1 text-sm truncate">{column.header}</span>

      {/* Frozen indicator */}
      {isFrozen && (
        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          Frozen
        </span>
      )}

      {/* Lock or remove button */}
      {isLocked ? (
        <Lock className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onRemove(column.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface SelectedColumnsListProps {
  columns: ColumnDefinition[];
  selectedColumnIds: string[];
  frozenCount: number;
  lockedColumnId?: string; // First column that can't be removed
  onReorder: (newOrder: string[]) => void;
  onRemove: (columnId: string) => void;
}

export function SelectedColumnsList({
  columns,
  selectedColumnIds,
  frozenCount,
  lockedColumnId,
  onReorder,
  onRemove,
}: SelectedColumnsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Get selected columns in order
  const selectedColumns = selectedColumnIds
    .map((id) => columns.find((c) => c.id === id))
    .filter((c): c is ColumnDefinition => c !== undefined);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedColumnIds.indexOf(active.id as string);
      const newIndex = selectedColumnIds.indexOf(over.id as string);
      const newOrder = arrayMove(selectedColumnIds, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  return (
    <ScrollArea className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={selectedColumnIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1 pr-4">
            {selectedColumns.map((column, index) => (
              <SortableColumnItem
                key={column.id}
                column={column}
                isLocked={column.id === lockedColumnId}
                isFrozen={index < frozenCount}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </ScrollArea>
  );
}
