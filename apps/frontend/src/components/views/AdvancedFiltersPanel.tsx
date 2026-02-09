"use client";

/**
 * AdvancedFiltersPanel Component
 *
 * Right slide-out panel for advanced filter configuration.
 * Supports multiple filter groups joined by OR logic (max 2 groups),
 * with conditions within each group joined by AND logic.
 */

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { FilterGroupCard } from "./FilterGroupCard";
import { FilterGroup, PropertyType } from "@/lib/views/types";
import { generateId } from "@/lib/utils";
import { getOperatorsForType } from "@/lib/views/operators";

interface AdvancedFiltersPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILTER_GROUPS = 2;

export function AdvancedFiltersPanel({
  open,
  onOpenChange,
}: AdvancedFiltersPanelProps) {
  const { config, filters, setFilters, clearFilters } = useSavedViewContext();

  // Get filterable columns from config
  const filterableColumns = config.columns.filter((c) => c.filterable !== false);

  const handleGroupChange = (index: number, group: FilterGroup) => {
    const newFilters = [...filters];
    newFilters[index] = group;
    setFilters(newFilters);
  };

  const handleGroupDuplicate = (index: number) => {
    if (filters.length >= MAX_FILTER_GROUPS) return;

    const groupToDuplicate = filters[index];
    const duplicatedGroup: FilterGroup = {
      id: generateId(),
      conditions: groupToDuplicate.conditions.map((c) => ({
        ...c,
        id: generateId(),
      })),
    };
    setFilters([...filters, duplicatedGroup]);
  };

  const handleGroupDelete = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
  };

  const handleAddGroup = () => {
    if (filters.length >= MAX_FILTER_GROUPS) return;

    const defaultColumn = filterableColumns[0];
    const defaultOperators = defaultColumn
      ? getOperatorsForType(defaultColumn.type as PropertyType)
      : (["is"] as const);
    const newGroup: FilterGroup = {
      id: generateId(),
      conditions: [
        {
          id: generateId(),
          propertyId: defaultColumn?.id || "",
          operator: defaultOperators[0],
          value: undefined,
        },
      ],
    };
    setFilters([...filters, newGroup]);
  };

  const handleClearAll = () => {
    setFilters([]);
  };

  // Count total active conditions
  const totalConditions = filters.reduce(
    (sum, g) => sum + g.conditions.length,
    0,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle>Advanced Filters</SheetTitle>
            {totalConditions > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                Clear all
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Records matching any group will be shown (OR logic between groups,
            AND within each group).
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-6">
          <div className="space-y-4 pr-4">
            {filters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  No filters applied. Add a filter group to get started.
                </p>
                <Button variant="outline" onClick={handleAddGroup}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add filter group
                </Button>
              </div>
            ) : (
              filters.map((group, index) => (
                <React.Fragment key={group.id}>
                  {index > 0 && (
                    <div className="flex items-center gap-2 py-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs font-medium">
                        or
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <FilterGroupCard
                    group={group}
                    groupIndex={index}
                    columns={filterableColumns}
                    canDelete={filters.length > 1 || group.conditions.length > 0}
                    canDuplicate={filters.length < MAX_FILTER_GROUPS}
                    onChange={(g) => handleGroupChange(index, g)}
                    onDuplicate={() => handleGroupDuplicate(index)}
                    onDelete={() => handleGroupDelete(index)}
                  />
                </React.Fragment>
              ))
            )}

            {/* Add group button */}
            {filters.length > 0 && filters.length < MAX_FILTER_GROUPS && (
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-border" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddGroup}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add filter group
                </Button>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}

            {filters.length >= MAX_FILTER_GROUPS && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Maximum {MAX_FILTER_GROUPS} filter groups allowed
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Footer with info */}
        <div className="flex-shrink-0 pt-4 border-t mt-4">
          <p className="text-xs text-muted-foreground">
            Filters are applied automatically as you make changes.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
