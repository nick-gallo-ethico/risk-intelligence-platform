/**
 * ReportFieldPicker Component
 *
 * Two-panel layout for selecting and ordering report fields.
 * Left panel: Available fields grouped by category with search.
 * Right panel: Selected fields with drag-to-reorder support.
 */
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  X,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Type,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { reportsApi } from "@/services/reports-api";
import type { ReportField, ReportFieldGroup } from "@/types/reports";

// Type badge icons for different field types
const TYPE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  string: Type,
  number: Hash,
  date: Calendar,
  boolean: ToggleLeft,
  enum: List,
};

interface SortableFieldItemProps {
  field: ReportField;
  onRemove: (fieldId: string) => void;
}

function SortableFieldItem({ field, onRemove }: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const TypeIcon = TYPE_ICONS[field.type] || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-2 bg-background border rounded-md",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      <button
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="flex-1 text-sm truncate">{field.label}</span>
      <Badge variant="outline" className="text-xs">
        <TypeIcon className="h-3 w-3 mr-1" />
        {field.type}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => onRemove(field.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ReportFieldPickerProps {
  entityType: string;
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
}

export function ReportFieldPicker({
  entityType,
  selectedFields,
  onFieldsChange,
}: ReportFieldPickerProps) {
  const [fieldGroups, setFieldGroups] = useState<ReportFieldGroup[]>([]);
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Flatten all fields for lookup
  const allFieldsMap = useMemo(() => {
    const map = new Map<string, ReportField>();
    fieldGroups.forEach((group) => {
      group.fields.forEach((field) => {
        map.set(field.id, field);
      });
    });
    return map;
  }, [fieldGroups]);

  // Load fields when entity type changes
  useEffect(() => {
    if (!entityType) return;

    setLoading(true);
    reportsApi
      .getFields(entityType)
      .then((groups) => {
        setFieldGroups(groups);
        // Expand all groups by default
        setExpandedGroups(new Set(groups.map((g) => g.groupName)));
      })
      .catch((err) => {
        console.error("Failed to load fields:", err);
        setFieldGroups([]);
      })
      .finally(() => setLoading(false));
  }, [entityType]);

  // Filter fields by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return fieldGroups;

    const lower = search.toLowerCase();
    return fieldGroups
      .map((group) => ({
        ...group,
        fields: group.fields.filter(
          (f) =>
            f.label.toLowerCase().includes(lower) ||
            f.id.toLowerCase().includes(lower),
        ),
      }))
      .filter((g) => g.fields.length > 0);
  }, [fieldGroups, search]);

  // Get selected field objects in order
  const selectedFieldObjects = useMemo(() => {
    return selectedFields
      .map((id) => allFieldsMap.get(id))
      .filter((f): f is ReportField => f !== undefined);
  }, [selectedFields, allFieldsMap]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleAddField = useCallback(
    (fieldId: string) => {
      if (!selectedFields.includes(fieldId)) {
        onFieldsChange([...selectedFields, fieldId]);
      }
    },
    [selectedFields, onFieldsChange],
  );

  const handleRemoveField = useCallback(
    (fieldId: string) => {
      onFieldsChange(selectedFields.filter((id) => id !== fieldId));
    },
    [selectedFields, onFieldsChange],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedFields.indexOf(active.id as string);
      const newIndex = selectedFields.indexOf(over.id as string);
      const newOrder = arrayMove(selectedFields, oldIndex, newIndex);
      onFieldsChange(newOrder);
    }
  };

  const renderFieldItem = (field: ReportField) => {
    const isSelected = selectedFields.includes(field.id);
    const TypeIcon = TYPE_ICONS[field.type] || Type;

    return (
      <div
        key={field.id}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md",
          isSelected
            ? "bg-muted/50 opacity-60"
            : "hover:bg-accent cursor-pointer",
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm truncate">{field.label}</span>
            <Badge variant="secondary" className="text-xs shrink-0">
              <TypeIcon className="h-3 w-3 mr-1" />
              {field.type}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => handleAddField(field.id)}
          disabled={isSelected}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading fields...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 h-full min-h-[400px]">
      {/* Left panel - Available fields */}
      <div className="flex flex-col min-h-0 border rounded-lg p-4">
        <h3 className="font-medium text-sm mb-3">Available Fields</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Grouped fields */}
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {filteredGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {search ? "No fields match your search" : "No fields available"}
              </p>
            ) : (
              filteredGroups.map((group) => (
                <Collapsible
                  key={group.groupName}
                  open={expandedGroups.has(group.groupName)}
                  onOpenChange={() => toggleGroup(group.groupName)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                    {expandedGroups.has(group.groupName) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {group.groupName}
                    <span className="ml-auto text-xs">
                      ({group.fields.length})
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-2 space-y-0.5">
                      {group.fields.map(renderFieldItem)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right panel - Selected fields */}
      <div className="flex flex-col min-h-0 border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">
            Selected Fields ({selectedFields.length})
          </h3>
          {selectedFields.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFieldsChange([])}
              className="text-xs"
            >
              Clear All
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          {selectedFieldObjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">No fields selected</p>
              <p className="text-xs mt-1">Add fields from the left panel</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={selectedFields}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1 pr-2">
                  {selectedFieldObjects.map((field) => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      onRemove={handleRemoveField}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </ScrollArea>

        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
          Drag to reorder columns in your report
        </p>
      </div>
    </div>
  );
}
