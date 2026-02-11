"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api";

interface AddNoteModalProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteAdded: () => void;
}

/**
 * AddNoteModal - Modal for adding a note to the case activity feed
 *
 * Creates an activity log entry with the note content. The note will
 * appear in the case's activity timeline.
 */
export function AddNoteModal({
  caseId,
  open,
  onOpenChange,
  onNoteAdded,
}: AddNoteModalProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setNote("");
      setError(null);
    }
  }, [open]);

  const isValidNote = note.trim().length >= 5;

  const handleSubmit = async () => {
    if (!isValidNote) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create an activity log entry for the note
      // Try the cases activity endpoint first
      await apiClient.post(`/cases/${caseId}/activity`, {
        action: "commented",
        description: note.trim(),
        actionDescription: `Added note: ${note.trim().substring(0, 100)}${note.trim().length > 100 ? "..." : ""}`,
      });

      onNoteAdded();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to add note:", err);
      // Fallback: try adding via case update with a notes field
      try {
        // Alternative approach if activity endpoint doesn't exist
        await apiClient.post(`/cases/${caseId}/notes`, {
          content: note.trim(),
        });
        onNoteAdded();
        onOpenChange(false);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
        setError("Failed to add note. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
          <DialogDescription>
            Add a note to this case. The note will be recorded in the activity
            feed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="note">
              Note <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="note"
              placeholder="Enter your note (min 5 characters)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              autoFocus
            />
            {note.length > 0 && !isValidNote && (
              <p className="text-xs text-gray-500">
                {5 - note.trim().length} more characters required
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValidNote || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
