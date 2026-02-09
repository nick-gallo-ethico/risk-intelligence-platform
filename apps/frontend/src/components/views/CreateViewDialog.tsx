/**
 * CreateViewDialog Component
 *
 * Dialog for creating a new saved view with name and visibility options.
 * Saves the current filters, columns, and sort settings.
 */
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { VISIBILITY_OPTIONS } from "@/lib/views/constants";
import { toast } from "sonner";

interface CreateViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateViewDialog({ open, onOpenChange }: CreateViewDialogProps) {
  const { saveViewAs, setActiveView } = useSavedViewContext();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "team" | "everyone">(
    "private"
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const newView = await saveViewAs(name.trim(), visibility);
      await setActiveView(newView.id);
      toast.success(`Created "${newView.name}"`);
      onOpenChange(false);
      setName("");
      setVisibility("private");
    } catch (error) {
      toast.error("Failed to create view");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new view</DialogTitle>
          <DialogDescription>
            Save your current filters, columns, and sort settings as a reusable
            view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="view-name">Name</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My view"
              className="mt-1.5"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          <div>
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
                  <SelectItem key={opt.value} value={opt.value} className="py-2">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {opt.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isLoading}>
            {isLoading ? "Creating..." : "Create view"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
