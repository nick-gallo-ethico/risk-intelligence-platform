"use client";

import React from "react";
import { X, Trash2, Download, UserPlus, Tag, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BulkAction } from "@/lib/views/types";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
  onSelectAll: () => void;
  onAction: (actionId: string, selectedIds: string[]) => void;
  selectedIds: string[];
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  assign: <UserPlus className="h-4 w-4 mr-2" />,
  status: <CheckCircle className="h-4 w-4 mr-2" />,
  category: <Tag className="h-4 w-4 mr-2" />,
  export: <Download className="h-4 w-4 mr-2" />,
  delete: <Trash2 className="h-4 w-4 mr-2" />,
};

export function BulkActionsBar({
  selectedCount,
  totalCount,
  actions,
  onClearSelection,
  onSelectAll,
  onAction,
  selectedIds,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  const allSelected = selectedCount === totalCount;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary text-primary-foreground">
      {/* Selection info */}
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="bg-primary-foreground text-primary"
        >
          {selectedCount}
        </Badge>
        <span className="text-sm font-medium">selected</span>
      </div>

      {/* Select all link */}
      {!allSelected && (
        <Button
          variant="link"
          size="sm"
          className="text-primary-foreground underline"
          onClick={onSelectAll}
        >
          Select all {totalCount}
        </Button>
      )}

      <div className="h-4 w-px bg-primary-foreground/30" />

      {/* Bulk action buttons */}
      {actions.map((action) => {
        if (action.children) {
          // Dropdown for actions with sub-options
          return (
            <DropdownMenu key={action.id}>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  {ACTION_ICONS[action.id] || null}
                  {action.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {action.children.map((child) => (
                  <DropdownMenuItem
                    key={child.id}
                    onClick={() => onAction(child.id, selectedIds)}
                  >
                    {child.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <Button
            key={action.id}
            variant={action.destructive ? "destructive" : "secondary"}
            size="sm"
            onClick={() => onAction(action.id, selectedIds)}
          >
            {ACTION_ICONS[action.id] || null}
            {action.label}
          </Button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clear selection */}
      <Button
        variant="ghost"
        size="sm"
        className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20"
        onClick={onClearSelection}
      >
        <X className="h-4 w-4 mr-1" />
        Clear
      </Button>
    </div>
  );
}
