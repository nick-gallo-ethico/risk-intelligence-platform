/**
 * BoardCard Component
 *
 * A draggable card for the board view displaying a summary of record fields.
 * Uses @dnd-kit for drag-and-drop functionality.
 */
"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BoardCardConfig } from "@/lib/views/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface BoardCardProps<T> {
  record: T;
  cardConfig: BoardCardConfig;
  onClick?: (record: T) => void;
  getRecordId: (record: T) => string;
}

export function BoardCard<T extends Record<string, unknown>>({
  record,
  cardConfig,
  onClick,
  getRecordId,
}: BoardCardProps<T>) {
  const id = getRecordId(record);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: { record },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const getValue = (field: string): unknown => record[field];
  const getStringValue = (field: string): string | undefined => {
    const value = record[field];
    return value != null ? String(value) : undefined;
  };

  const title = getStringValue(cardConfig.titleField) ?? "";
  const subtitle = cardConfig.subtitleField
    ? getStringValue(cardConfig.subtitleField)
    : undefined;
  const priorityValue = cardConfig.priorityField
    ? getStringValue(cardConfig.priorityField)
    : undefined;
  const ownerValue = cardConfig.ownerField
    ? getStringValue(cardConfig.ownerField)
    : undefined;
  const dateValue = cardConfig.dateField
    ? getStringValue(cardConfig.dateField)
    : undefined;

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger click when dragging or clicking the drag handle
    if (isDragging) return;
    onClick?.(record);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
      )}
      onClick={handleClick}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start gap-2">
          {/* Drag handle */}
          <button
            type="button"
            className="mt-0.5 cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {/* Priority badge if configured */}
          {priorityValue && (
            <Badge
              variant="outline"
              className={cn("text-xs", getPriorityColor(priorityValue))}
            >
              {priorityValue}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 space-y-2">
        {/* Additional fields */}
        {cardConfig.displayFields?.map((field) => {
          const value = getValue(field.key);
          if (!value) return null;

          return (
            <div key={field.key} className="flex items-center gap-2 text-xs">
              {field.icon && (
                <field.icon className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-muted-foreground truncate">
                {formatValue(value, field.type)}
              </span>
            </div>
          );
        })}

        {/* Owner/assignee if configured */}
        {ownerValue && (
          <div className="flex items-center gap-2 pt-1">
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={getStringValue(`${cardConfig.ownerField}Avatar`)}
              />
              <AvatarFallback className="text-[10px]">
                {getInitials(ownerValue)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {ownerValue}
            </span>
          </div>
        )}

        {/* Date if configured */}
        {dateValue && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(dateValue), "MMM d, yyyy")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions
function getPriorityColor(priority: string): string {
  const lower = priority.toLowerCase();
  if (lower === "high" || lower === "critical")
    return "border-red-500 text-red-600";
  if (lower === "medium") return "border-yellow-500 text-yellow-600";
  if (lower === "low") return "border-green-500 text-green-600";
  return "";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatValue(value: unknown, type?: string): string {
  if (type === "date" && value) {
    return format(new Date(value as string), "MMM d");
  }
  return String(value);
}
