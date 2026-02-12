"use client";

/**
 * ProjectGroupHeader Component
 *
 * Header for a task group in the project table.
 * Shows group name with color bar, task count, collapse toggle,
 * and context menu for rename/delete operations.
 */

import React, { useState, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Edit2,
  Palette,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateGroup, useDeleteGroup } from "@/hooks/use-project-detail";
import type { ProjectGroup } from "@/types/project";

/**
 * Preset colors for groups.
 */
const GROUP_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#6b7280", // gray
];

interface ProjectGroupHeaderProps {
  group: ProjectGroup;
  taskCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectionState: "none" | "some" | "all";
  onToggleSelectAll: (select: boolean) => void;
  projectId: string;
  onRefresh: () => void;
}

/**
 * ProjectGroupHeader - header row for a task group.
 */
export function ProjectGroupHeader({
  group,
  taskCount,
  isCollapsed,
  onToggleCollapse,
  selectionState,
  onToggleSelectAll,
  projectId,
  onRefresh,
}: ProjectGroupHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(group.name);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateGroup = useUpdateGroup(projectId);
  const deleteGroup = useDeleteGroup(projectId);

  // Handle name edit
  const handleStartEditName = useCallback(() => {
    setEditedName(group.name);
    setIsEditingName(true);
  }, [group.name]);

  const handleSaveName = useCallback(async () => {
    if (editedName.trim() && editedName !== group.name) {
      await updateGroup.mutateAsync({
        groupId: group.id,
        dto: { name: editedName.trim() },
      });
      onRefresh();
    }
    setIsEditingName(false);
  }, [editedName, group.id, group.name, updateGroup, onRefresh]);

  const handleCancelEditName = useCallback(() => {
    setEditedName(group.name);
    setIsEditingName(false);
  }, [group.name]);

  // Handle color change
  const handleColorChange = useCallback(
    async (color: string) => {
      await updateGroup.mutateAsync({
        groupId: group.id,
        dto: { color },
      });
      setColorPopoverOpen(false);
      onRefresh();
    },
    [group.id, updateGroup, onRefresh],
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    await deleteGroup.mutateAsync(group.id);
    setDeleteDialogOpen(false);
    onRefresh();
  }, [group.id, deleteGroup, onRefresh]);

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/50">
      {/* Selection checkbox */}
      <Checkbox
        checked={selectionState === "all"}
        ref={(node) => {
          if (node && selectionState === "some") {
            (node as unknown as HTMLButtonElement).dataset.state =
              "indeterminate";
          }
        }}
        onCheckedChange={(checked) => {
          onToggleSelectAll(checked === true);
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="p-0.5 rounded hover:bg-gray-200 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Color bar */}
      <div
        className="w-1 h-5 rounded-full"
        style={{ backgroundColor: group.color || "#6b7280" }}
      />

      {/* Group name - editable */}
      {isEditingName ? (
        <div className="flex items-center gap-1">
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName();
              if (e.key === "Escape") handleCancelEditName();
            }}
            autoFocus
            className="h-7 w-48 text-sm font-medium"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleSaveName}
            disabled={updateGroup.isPending}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleCancelEditName}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          onClick={handleStartEditName}
          className="group flex items-center gap-1 font-medium text-gray-800 hover:text-primary transition-colors"
        >
          {group.name}
          <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        </button>
      )}

      {/* Task count */}
      <span className="text-sm text-muted-foreground ml-2">
        {taskCount} {taskCount === 1 ? "task" : "tasks"}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleStartEditName}>
            <Edit2 className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>

          <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
            <PopoverTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setColorPopoverOpen(true);
                }}
              >
                <Palette className="h-4 w-4 mr-2" />
                Change Color
              </DropdownMenuItem>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start" side="right">
              <div className="grid grid-cols-4 gap-2">
                {GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                      group.color === color
                        ? "border-foreground"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onSelect={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the group &quot;{group.name}
              &quot;?
              {taskCount > 0 && (
                <>
                  {" "}
                  The {taskCount} {taskCount === 1 ? "task" : "tasks"} in this
                  group will be moved to Ungrouped.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteGroup.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
