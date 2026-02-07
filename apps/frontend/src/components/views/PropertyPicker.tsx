/**
 * PropertyPicker Component
 *
 * A searchable, grouped property picker for selecting which columns to display.
 * Used in the ColumnSelectionModal to let users toggle column visibility.
 *
 * Features:
 * - Search box to filter available columns
 * - Collapsible groups for organizing columns
 * - Checkbox selection with visual feedback
 */
"use client";

import React, { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ColumnDefinition } from "@/types/view-config";
import type { PropertyGroup } from "@/lib/views/types";
import { cn } from "@/lib/utils";

interface PropertyPickerProps {
  columns: ColumnDefinition[];
  selectedColumnIds: string[];
  onToggleColumn: (columnId: string) => void;
  groups?: PropertyGroup[];
}

export function PropertyPicker({
  columns,
  selectedColumnIds,
  onToggleColumn,
  groups = [],
}: PropertyPickerProps) {
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(groups.map((g) => g.id)),
  );

  // Filter columns by search
  const filteredColumns = useMemo(() => {
    if (!search.trim()) return columns;
    const lower = search.toLowerCase();
    return columns.filter(
      (col) =>
        col.header.toLowerCase().includes(lower) ||
        col.id.toLowerCase().includes(lower),
    );
  }, [columns, search]);

  // Group columns by their group property
  const groupedColumns = useMemo(() => {
    const result = new Map<string, ColumnDefinition[]>();

    // Initialize groups
    groups.forEach((g) => result.set(g.id, []));
    result.set("other", []); // For ungrouped columns

    filteredColumns.forEach((col) => {
      const groupId = col.group || "other";
      if (!result.has(groupId)) {
        result.set(groupId, []);
      }
      result.get(groupId)!.push(col);
    });

    return result;
  }, [filteredColumns, groups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const renderColumnItem = (col: ColumnDefinition) => {
    const isSelected = selectedColumnIds.includes(col.id);

    return (
      <div
        key={col.id}
        className={cn(
          "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent rounded-md",
          isSelected && "bg-accent/50",
        )}
        onClick={() => onToggleColumn(col.id)}
      >
        <Checkbox checked={isSelected} />
        <span className="text-sm flex-1">{col.header}</span>
        {isSelected && <Check className="h-4 w-4 text-primary" />}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search columns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grouped columns */}
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {groups.map((group) => {
            const groupColumns = groupedColumns.get(group.id) || [];
            if (groupColumns.length === 0) return null;

            return (
              <Collapsible
                key={group.id}
                open={expandedGroups.has(group.id)}
                onOpenChange={() => toggleGroup(group.id)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                  {expandedGroups.has(group.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {group.label}
                  <span className="ml-auto text-xs">
                    ({groupColumns.length})
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-2 space-y-0.5">
                    {groupColumns.map(renderColumnItem)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Ungrouped columns */}
          {(groupedColumns.get("other")?.length ?? 0) > 0 && (
            <div className="space-y-0.5">
              {groups.length > 0 && (
                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                  Other
                </div>
              )}
              {groupedColumns.get("other")?.map(renderColumnItem)}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
