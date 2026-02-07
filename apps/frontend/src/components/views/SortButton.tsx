/**
 * SortButton Component
 *
 * Popover button for sorting column selection.
 * Displays current sort column and direction, with controls to change them.
 */
"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { SortOrder } from "@/lib/views/types";

export function SortButton() {
  const { config, sortBy, sortOrder, setSort } = useSavedViewContext();

  const sortableColumns = config.columns.filter((c) => c.sortable);
  const activeColumn = sortBy
    ? config.columns.find((c) => c.id === sortBy)
    : null;

  const handleColumnChange = (columnId: string) => {
    if (columnId === "none") {
      setSort(null, "asc");
    } else {
      setSort(columnId, sortOrder);
    }
  };

  const handleOrderChange = (order: SortOrder) => {
    if (sortBy) {
      setSort(sortBy, order);
    }
  };

  const clearSort = () => {
    setSort(null, "asc");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {sortBy ? (
            sortOrder === "asc" ? (
              <ArrowUp className="h-4 w-4 mr-2" />
            ) : (
              <ArrowDown className="h-4 w-4 mr-2" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 mr-2" />
          )}
          Sort
          {activeColumn && (
            <span className="ml-1 text-muted-foreground">
              : {activeColumn.header}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div>
            <Label>Sort by</Label>
            <Select value={sortBy || "none"} onValueChange={handleColumnChange}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {sortableColumns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sortBy && (
            <div>
              <Label>Direction</Label>
              <div className="flex gap-2 mt-1.5">
                <Button
                  variant={sortOrder === "asc" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOrderChange("asc")}
                >
                  <ArrowUp className="h-4 w-4 mr-1" />
                  Ascending
                </Button>
                <Button
                  variant={sortOrder === "desc" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOrderChange("desc")}
                >
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Descending
                </Button>
              </div>
            </div>
          )}

          {sortBy && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={clearSort}
            >
              <X className="h-4 w-4 mr-2" />
              Clear sort
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
