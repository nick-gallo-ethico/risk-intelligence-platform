/**
 * ColumnSelectionModal Component
 *
 * Two-panel dialog for managing which columns appear in the view.
 * Left panel: searchable, grouped property picker with checkboxes.
 * Right panel: drag-reorderable selected columns with frozen column control.
 *
 * Features:
 * - Search columns by name
 * - Collapsible property groups
 * - Drag-and-drop column reordering
 * - Frozen column count selector (0-3)
 * - First column locked (cannot be removed)
 * - Apply/Cancel with local state management
 */
"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { PropertyPicker } from "./PropertyPicker";
import { SelectedColumnsList } from "./SelectedColumnsList";

interface ColumnSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ColumnSelectionModal({
  open,
  onOpenChange,
}: ColumnSelectionModalProps) {
  const {
    config,
    visibleColumns,
    frozenColumnCount,
    setColumns,
    setFrozenColumns,
  } = useSavedViewContext();

  // Local state for editing
  const [localColumns, setLocalColumns] = useState<string[]>(visibleColumns);
  const [localFrozenCount, setLocalFrozenCount] = useState(frozenColumnCount);

  // Reset local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalColumns(visibleColumns);
      setLocalFrozenCount(frozenColumnCount);
    }
  }, [open, visibleColumns, frozenColumnCount]);

  // Get the locked column (primary column from config)
  const lockedColumnId = config.primaryColumnId;

  const handleToggleColumn = useCallback(
    (columnId: string) => {
      // Don't allow removing the locked column
      if (columnId === lockedColumnId) return;

      setLocalColumns((prev) => {
        if (prev.includes(columnId)) {
          return prev.filter((id) => id !== columnId);
        } else {
          return [...prev, columnId];
        }
      });
    },
    [lockedColumnId],
  );

  const handleReorder = useCallback((newOrder: string[]) => {
    setLocalColumns(newOrder);
  }, []);

  const handleRemove = useCallback((columnId: string) => {
    setLocalColumns((prev) => prev.filter((id) => id !== columnId));
  }, []);

  const handleRemoveAll = useCallback(() => {
    // Keep only the locked column
    setLocalColumns(lockedColumnId ? [lockedColumnId] : []);
    setLocalFrozenCount(0);
  }, [lockedColumnId]);

  const handleApply = () => {
    setColumns(localColumns);
    setFrozenColumns(localFrozenCount);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose which columns you see</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
          {/* Left panel - Available columns */}
          <div className="flex flex-col min-h-0">
            <PropertyPicker
              columns={config.columns}
              selectedColumnIds={localColumns}
              onToggleColumn={handleToggleColumn}
              groups={config.propertyGroups}
            />
          </div>

          {/* Right panel - Selected columns */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">
                SELECTED COLUMNS ({localColumns.length})
              </Label>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Frozen:</Label>
                <Select
                  value={String(localFrozenCount)}
                  onValueChange={(v) => setLocalFrozenCount(Number(v))}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SelectedColumnsList
              columns={config.columns}
              selectedColumnIds={localColumns}
              frozenCount={localFrozenCount}
              lockedColumnId={lockedColumnId}
              onReorder={handleReorder}
              onRemove={handleRemove}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleRemoveAll}>
            Remove All Columns
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
