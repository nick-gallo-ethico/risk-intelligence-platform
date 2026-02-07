/**
 * ViewToolbar Component
 *
 * Horizontal toolbar (Zone 2) with search, buttons, and action controls.
 * Provides quick access to:
 * - Search box with debounced input
 * - View mode toggle (table/board)
 * - Edit columns button
 * - Filter button with active count badge
 * - Sort button with column selection
 * - Export button with format options
 * - Duplicate button
 * - Save button with save-as option
 */
"use client";

import React, { useState } from "react";
import { Search, Columns, Filter, Copy, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { useDebounce } from "@/hooks/useDebounce";
import { ViewModeToggle } from "./ViewModeToggle";
import { SaveButton } from "./SaveButton";
import { SortButton } from "./SortButton";
import { ExportButton } from "./ExportButton";
import { toast } from "sonner";

interface ViewToolbarProps {
  /** Callback when Edit Columns button is clicked */
  onEditColumnsClick: () => void;
  /** Callback when Filter button is clicked */
  onFilterClick: () => void;
  /** Number of active filters to display in badge */
  filterCount: number;
  /** Whether the filter panel is currently visible */
  showFilters: boolean;
}

export function ViewToolbar({
  onEditColumnsClick,
  onFilterClick,
  filterCount,
  showFilters,
}: ViewToolbarProps) {
  const { searchQuery, setSearchQuery, duplicateView, activeView } =
    useSavedViewContext();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Debounce search input
  useDebounce(
    () => {
      setSearchQuery(localSearch);
    },
    300,
    [localSearch]
  );

  const handleDuplicate = async () => {
    if (activeView) {
      setIsDuplicating(true);
      try {
        const newView = await duplicateView(activeView.id);
        toast.success(`Created "${newView.name}"`);
      } catch (error) {
        toast.error("Failed to duplicate view");
      } finally {
        setIsDuplicating(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-background">
      {/* Search box */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* View mode toggle */}
      <ViewModeToggle />

      {/* Settings gear (placeholder for future configuration) */}
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Settings className="h-4 w-4" />
        <span className="sr-only">View settings</span>
      </Button>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Edit Columns button */}
      <Button variant="outline" size="sm" onClick={onEditColumnsClick}>
        <Columns className="h-4 w-4 mr-2" />
        Edit columns
      </Button>

      {/* Filter button */}
      <Button
        variant={showFilters ? "default" : "outline"}
        size="sm"
        onClick={onFilterClick}
      >
        <Filter className="h-4 w-4 mr-2" />
        Filter
        {filterCount > 0 && (
          <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
            {filterCount}
          </Badge>
        )}
      </Button>

      {/* Sort button */}
      <SortButton />

      <div className="h-6 w-px bg-border mx-1" />

      {/* Export button */}
      <ExportButton />

      {/* Duplicate button */}
      {activeView && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handleDuplicate}
          disabled={isDuplicating}
        >
          <Copy className="h-4 w-4" />
          <span className="sr-only">Duplicate view</span>
        </Button>
      )}

      {/* Save button */}
      <SaveButton />
    </div>
  );
}
