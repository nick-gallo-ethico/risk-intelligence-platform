/**
 * ViewModeToggle Component
 *
 * Select dropdown for switching between Table and Board view modes.
 * Only renders when board view is configured for the module.
 */
"use client";

import React from "react";
import { Table2, Kanban } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { ViewMode } from "@/lib/views/types";

export function ViewModeToggle() {
  const { config, viewMode, setViewMode } = useSavedViewContext();

  // Only show toggle if board view is configured
  if (!config.boardConfig) {
    return null;
  }

  return (
    <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
      <SelectTrigger className="w-[130px] h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="table">
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Table view
          </div>
        </SelectItem>
        <SelectItem value="board">
          <div className="flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            Board view
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
