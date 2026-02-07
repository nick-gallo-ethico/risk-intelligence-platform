/**
 * QuickFiltersRow Component
 *
 * Horizontal row of quick filter dropdowns (Zone 3 in the view layout).
 * Shows common filterable properties, More button to add filters,
 * and Advanced Filters button.
 */
"use client";

import React, { useState, useMemo } from "react";
import { Plus, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { QuickFilterDropdown } from "./QuickFilterDropdown";
import type { FilterCondition } from "@/lib/views/types";
import type { QuickFilterProperty } from "@/types/view-config";

interface QuickFiltersRowProps {
  onAdvancedFiltersClick: () => void;
  advancedFilterCount: number;
}

// Default quick filter slots to show
const DEFAULT_QUICK_FILTER_COUNT = 4;

export function QuickFiltersRow({
  onAdvancedFiltersClick,
  advancedFilterCount,
}: QuickFiltersRowProps) {
  const { config, quickFilters, setQuickFilter, clearFilters } =
    useSavedViewContext();

  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [extraFilterIds, setExtraFilterIds] = useState<string[]>([]);

  // Get the quick filterable properties from config
  const quickFilterableProperties = config.quickFilterProperties || [];

  // Separate default shown filters from extras
  const defaultFilters = quickFilterableProperties.slice(
    0,
    DEFAULT_QUICK_FILTER_COUNT,
  );
  const availableExtraFilters = quickFilterableProperties.slice(
    DEFAULT_QUICK_FILTER_COUNT,
  );

  // Properties currently shown (default + extra added ones)
  const shownProperties = useMemo(() => {
    const shown = [...defaultFilters];
    extraFilterIds.forEach((id) => {
      const prop = availableExtraFilters.find((p) => p.propertyId === id);
      if (prop && !shown.some((s) => s.propertyId === id)) {
        shown.push(prop);
      }
    });
    return shown;
  }, [defaultFilters, availableExtraFilters, extraFilterIds]);

  // Properties available to add (not already shown)
  const addableProperties = availableExtraFilters.filter(
    (p) => !shownProperties.some((s) => s.propertyId === p.propertyId),
  );

  // Convert quickFilters record to FilterCondition for a property
  const getConditionForProperty = (
    propertyId: string,
  ): FilterCondition | undefined => {
    const value = quickFilters[propertyId];
    if (value === undefined || value === null) return undefined;

    // Reconstruct the condition from the stored value
    return {
      id: `quick-${propertyId}`,
      propertyId,
      operator: "is_any_of", // Default - actual operator stored with value
      value,
    };
  };

  const handleConditionChange = (
    property: QuickFilterProperty,
    condition: FilterCondition | undefined,
  ) => {
    if (condition) {
      setQuickFilter(property.propertyId, condition.value);
    } else {
      setQuickFilter(property.propertyId, undefined);
    }
  };

  const handleAddQuickFilter = (propertyId: string) => {
    setExtraFilterIds((prev) => [...prev, propertyId]);
    setAddFilterOpen(false);
  };

  const handleRemoveExtraFilter = (propertyId: string) => {
    setExtraFilterIds((prev) => prev.filter((id) => id !== propertyId));
    // Also clear the filter value
    setQuickFilter(propertyId, undefined);
  };

  // Count active quick filters
  const activeQuickFilterCount = Object.values(quickFilters).filter(
    (v) => v !== undefined && v !== null,
  ).length;
  const totalActiveFilters = activeQuickFilterCount + advancedFilterCount;

  const handleClearAll = () => {
    clearFilters();
    setExtraFilterIds([]);
  };

  if (quickFilterableProperties.length === 0) {
    // No quick filters configured for this module
    return (
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-b bg-muted/30">
        <Button
          variant={advancedFilterCount > 0 ? "secondary" : "outline"}
          size="sm"
          onClick={onAdvancedFiltersClick}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {advancedFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {advancedFilterCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
      {/* Quick filter dropdowns */}
      {shownProperties.map((property) => {
        const isExtraFilter = extraFilterIds.includes(property.propertyId);
        return (
          <div key={property.propertyId} className="flex items-center">
            <QuickFilterDropdown
              property={property}
              condition={getConditionForProperty(property.propertyId)}
              onConditionChange={(condition) =>
                handleConditionChange(property, condition)
              }
              onRemove={
                isExtraFilter
                  ? () => handleRemoveExtraFilter(property.propertyId)
                  : undefined
              }
            />
          </div>
        );
      })}

      {/* Add more quick filters button */}
      {addableProperties.length > 0 && (
        <Popover open={addFilterOpen} onOpenChange={setAddFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-1" />
              More
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <ScrollArea className="max-h-64">
              <div className="py-1">
                {addableProperties.map((property) => (
                  <button
                    key={property.propertyId}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-accent"
                    onClick={() => handleAddQuickFilter(property.propertyId)}
                  >
                    {property.label}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clear all filters button */}
      {totalActiveFilters > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={handleClearAll}
        >
          <X className="h-4 w-4 mr-1" />
          Clear all ({totalActiveFilters})
        </Button>
      )}

      {/* Advanced filters button */}
      <Button
        variant={advancedFilterCount > 0 ? "secondary" : "outline"}
        size="sm"
        className="h-8"
        onClick={onAdvancedFiltersClick}
      >
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        Advanced filters
        {advancedFilterCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {advancedFilterCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}
