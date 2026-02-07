/**
 * SortableViewTab Component
 *
 * Individual sortable tab for the ViewTabsBar.
 * Uses dnd-kit for drag-and-drop functionality.
 */
"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SavedView } from "@/lib/views/types";
import { ViewTabContextMenu } from "./ViewTabContextMenu";
import { RECORD_COUNT_STALE_MINUTES } from "@/lib/views/constants";

interface SortableViewTabProps {
  view: SavedView;
  isActive: boolean;
  hasUnsavedChanges: boolean;
  onSelect: () => void;
}

export function SortableViewTab({
  view,
  isActive,
  hasUnsavedChanges,
  onSelect,
}: SortableViewTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: view.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Check if record count is stale
  const isRecordCountStale = view.recordCountAt
    ? Date.now() - new Date(view.recordCountAt).getTime() >
      RECORD_COUNT_STALE_MINUTES * 60 * 1000
    : true;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 px-3 py-2 cursor-pointer border-b-2 transition-colors select-none",
        "hover:bg-accent",
        isActive
          ? "border-primary bg-background font-medium"
          : "border-transparent",
        isDragging && "opacity-50 z-50",
      )}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <button
        className="p-0.5 hover:bg-muted rounded cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Tab name */}
      <span
        className={cn(
          "whitespace-nowrap",
          hasUnsavedChanges && isActive && "italic",
        )}
      >
        {view.name}
        {hasUnsavedChanges && isActive && " \u2022"}
      </span>

      {/* Record count badge */}
      {view.recordCount !== undefined && view.recordCount !== null && (
        <Badge
          variant="secondary"
          className={cn("ml-1 text-xs", isRecordCountStale && "opacity-60")}
        >
          {view.recordCount.toLocaleString()}
        </Badge>
      )}

      {/* Context menu */}
      <ViewTabContextMenu view={view} isActive={isActive} />
    </div>
  );
}
