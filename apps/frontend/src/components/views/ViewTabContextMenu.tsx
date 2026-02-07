/**
 * ViewTabContextMenu Component
 *
 * Context menu for tab actions: Rename, Clone, Manage sharing, Delete.
 * Includes dialogs for rename, sharing, and delete confirmation.
 */
"use client";

import React, { useState } from "react";
import { MoreVertical, Pencil, Copy, Users, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SavedView } from "@/lib/views/types";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { VISIBILITY_OPTIONS } from "@/lib/views/constants";
import { toast } from "sonner";

interface ViewTabContextMenuProps {
  view: SavedView;
  isActive: boolean;
}

export function ViewTabContextMenu({
  view,
  isActive,
}: ViewTabContextMenuProps) {
  const { renameView, duplicateView, deleteView } = useSavedViewContext();

  const [renameOpen, setRenameOpen] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(view.name);
  const [visibility, setVisibility] = useState<"private" | "team" | "everyone">(
    view.isShared ? (view.sharedWithTeamId ? "team" : "everyone") : "private"
  );

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await renameView(view.id, newName.trim());
      toast.success("View renamed");
      setRenameOpen(false);
    } catch (error) {
      toast.error("Failed to rename view");
    }
  };

  const handleDuplicate = async () => {
    try {
      const newView = await duplicateView(view.id);
      toast.success(`Created "${newView.name}"`);
    } catch (error) {
      toast.error("Failed to duplicate view");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteView(view.id);
      toast.success("View deleted");
      setDeleteOpen(false);
    } catch (error) {
      toast.error("Failed to delete view");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 focus:opacity-100">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={() => {
              setNewName(view.name);
              setRenameOpen(true);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Clone
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSharingOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Manage sharing
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename view</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="View name"
              className="mt-1.5"
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sharing Dialog */}
      <Dialog open={sharingOpen} onOpenChange={setSharingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage sharing</DialogTitle>
            <DialogDescription>
              Control who can see this view.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v) =>
                setVisibility(v as "private" | "team" | "everyone")
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {opt.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSharingOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSharingOpen(false);
                toast.success("Sharing updated");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete view?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{view.name}&quot;? This
              action cannot be undone. This will not delete any records, only
              the saved view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
