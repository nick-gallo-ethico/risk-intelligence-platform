/**
 * BoardView Component
 *
 * Main board view that displays records as draggable cards in status lanes.
 * Uses @dnd-kit for drag-and-drop between columns to update record status.
 */
"use client";

import React, { useMemo, useCallback } from "react";
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
} from "@dnd-kit/core";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { BoardColumn } from "./BoardColumn";
import { BoardCard } from "./BoardCard";
import { BoardColumnConfig } from "@/lib/views/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface BoardViewProps<T> {
  data: T[];
  isLoading?: boolean;
  onRecordClick?: (record: T) => void;
  onStatusChange?: (recordId: string, newStatus: string) => void;
  getRecordId: (record: T) => string;
  emptyMessage?: string;
}

export function BoardView<T extends Record<string, unknown>>({
  data,
  isLoading = false,
  onRecordClick,
  onStatusChange,
  getRecordId,
  emptyMessage = "No records found",
}: BoardViewProps<T>) {
  const { config, boardGroupBy } = useSavedViewContext();

  const [activeRecord, setActiveRecord] = React.useState<T | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before activating
      },
    }),
    useSensor(KeyboardSensor),
  );

  // Get board configuration
  const boardConfig = config.boardConfig;
  const cardConfig = boardConfig?.cardConfig;
  const columns: BoardColumnConfig[] = boardConfig?.columns || [];

  // Group records by the groupBy field
  const groupedRecords = useMemo(() => {
    const groupField = boardGroupBy || boardConfig?.defaultGroupBy;
    if (!groupField) return new Map<string, T[]>();

    const grouped = new Map<string, T[]>();

    // Initialize all columns with empty arrays
    columns.forEach((col) => {
      grouped.set(col.id, []);
    });

    // Group records
    data.forEach((record) => {
      const groupValue = record[groupField] as string;
      const existing = grouped.get(groupValue) || [];
      grouped.set(groupValue, [...existing, record]);
    });

    return grouped;
  }, [data, boardGroupBy, boardConfig?.defaultGroupBy, columns]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const record = event.active.data.current?.record as T | undefined;
    if (record) {
      setActiveRecord(record);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveRecord(null);

      if (!over) return;

      const recordId = active.id as string;
      const newStatus = over.id as string;

      // Check if dropped on a different column
      const record = data.find((r) => getRecordId(r) === recordId);
      const groupField = boardGroupBy || boardConfig?.defaultGroupBy;

      if (record && groupField) {
        const currentStatus = record[groupField] as string;
        if (currentStatus !== newStatus) {
          onStatusChange?.(recordId, newStatus);
        }
      }
    },
    [
      data,
      getRecordId,
      boardGroupBy,
      boardConfig?.defaultGroupBy,
      onStatusChange,
    ],
  );

  if (!boardConfig || !cardConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          Board view is not configured for this module.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {columns.map((col) => (
          <div key={col.id} className="min-w-[300px] space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your filters or search criteria.
          </p>
        </div>
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
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              records={groupedRecords.get(column.id) || []}
              cardConfig={cardConfig}
              onCardClick={onRecordClick}
              getRecordId={getRecordId}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Drag overlay for smooth dragging */}
      <DragOverlay>
        {activeRecord && cardConfig && (
          <BoardCard
            record={activeRecord}
            cardConfig={cardConfig}
            getRecordId={getRecordId}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
