/**
 * BoardColumn Component
 *
 * A droppable column/lane for the board view. Cards can be dropped
 * onto this column to change the record's status.
 * Uses @dnd-kit for drop target functionality.
 */
"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BoardCard } from "./BoardCard";
import { BoardCardConfig, BoardColumnConfig } from "@/lib/views/types";
import { cn } from "@/lib/utils";

interface BoardColumnProps<T> {
  column: BoardColumnConfig;
  records: T[];
  cardConfig: BoardCardConfig;
  onCardClick?: (record: T) => void;
  getRecordId: (record: T) => string;
}

export function BoardColumn<T extends Record<string, unknown>>({
  column,
  records,
  cardConfig,
  onCardClick,
  getRecordId,
}: BoardColumnProps<T>) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { column },
  });

  const recordIds = records.map(getRecordId);

  return (
    <div
      className={cn(
        "flex flex-col min-w-[300px] max-w-[300px] bg-muted/30 rounded-lg border",
        isOver && "ring-2 ring-primary ring-offset-2",
      )}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between p-3 border-b"
        style={{
          borderLeftColor: column.color,
          borderLeftWidth: column.color ? "4px" : undefined,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{column.label}</span>
          <Badge variant="secondary" className="text-xs">
            {records.length}
          </Badge>
        </div>
      </div>

      {/* Cards container */}
      <ScrollArea className="flex-1 p-2">
        <div
          ref={setNodeRef}
          className={cn(
            "space-y-2 min-h-[100px]",
            records.length === 0 && "flex items-center justify-center",
          )}
        >
          <SortableContext
            items={recordIds}
            strategy={verticalListSortingStrategy}
          >
            {records.length === 0 ? (
              <p className="text-xs text-muted-foreground">No records</p>
            ) : (
              records.map((record) => (
                <BoardCard
                  key={getRecordId(record)}
                  record={record}
                  cardConfig={cardConfig}
                  onClick={onCardClick}
                  getRecordId={getRecordId}
                />
              ))
            )}
          </SortableContext>
        </div>
      </ScrollArea>

      {/* Column footer with count */}
      <div className="p-2 border-t text-xs text-muted-foreground text-center">
        {records.length} {records.length === 1 ? "record" : "records"}
      </div>
    </div>
  );
}
