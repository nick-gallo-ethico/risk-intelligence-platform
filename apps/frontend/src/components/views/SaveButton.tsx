/**
 * SaveButton Component
 *
 * Dropdown button for saving view changes.
 * - When no active view: Single "Save view" button to create new
 * - When active view: Dropdown with "Save changes" and "Save as new view"
 *
 * Button is styled differently when there are unsaved changes.
 */
"use client";

import React, { useState } from "react";
import { Save, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { CreateViewDialog } from "./CreateViewDialog";
import { toast } from "sonner";

export function SaveButton() {
  const { hasUnsavedChanges, activeView, saveView } = useSavedViewContext();
  const [createOpen, setCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveView();
      toast.success("View saved");
    } catch (error) {
      toast.error("Failed to save view");
    } finally {
      setIsSaving(false);
    }
  };

  // If no active view, show "Save view" button
  if (!activeView) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasUnsavedChanges}
          onClick={() => setCreateOpen(true)}
        >
          <Save className="h-4 w-4 mr-2" />
          Save view
        </Button>
        <CreateViewDialog open={createOpen} onOpenChange={setCreateOpen} />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={hasUnsavedChanges ? "default" : "outline"}
            size="sm"
            disabled={!hasUnsavedChanges && !activeView}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            Save changes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            Save as new view...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateViewDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
