"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, User, FileText } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api";

interface LogInterviewModalProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInterviewLogged: () => void;
}

type IntervieweeType = "PERSON" | "EXTERNAL" | "ANONYMOUS";

interface LogInterviewFormData {
  intervieweeName: string;
  intervieweeType: IntervieweeType;
  scheduledAt: string;
  notes?: string;
  investigationId?: string;
}

/**
 * LogInterviewModal - Modal for logging/scheduling interviews from case context
 *
 * Records an interview as an activity log entry. The interview will appear
 * in the case's activity timeline with metadata for tracking.
 */
export function LogInterviewModal({
  caseId,
  open,
  onOpenChange,
  onInterviewLogged,
}: LogInterviewModalProps) {
  const [intervieweeName, setIntervieweeName] = useState("");
  const [intervieweeType, setIntervieweeType] =
    useState<IntervieweeType>("PERSON");
  const [scheduledAt, setScheduledAt] = useState(() => {
    // Default to today
    return new Date().toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setIntervieweeName("");
      setIntervieweeType("PERSON");
      setScheduledAt(new Date().toISOString().split("T")[0]);
      setNotes("");
      setError(null);
    }
  }, [open]);

  const isValid = intervieweeName.trim().length >= 2;

  const getIntervieweeTypeLabel = (type: IntervieweeType): string => {
    switch (type) {
      case "PERSON":
        return "Person in System";
      case "EXTERNAL":
        return "External";
      case "ANONYMOUS":
        return "Anonymous";
      default:
        return type;
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    const typeLabel = getIntervieweeTypeLabel(intervieweeType);
    const actionDescription = `Scheduled interview with ${intervieweeName.trim()} (${typeLabel})`;

    try {
      // Log the interview as an activity entry
      await apiClient.post(`/cases/${caseId}/activity`, {
        action: "interview_logged",
        description: `Interview with ${intervieweeName.trim()}`,
        actionDescription: actionDescription,
        metadata: {
          intervieweeName: intervieweeName.trim(),
          intervieweeType,
          scheduledAt,
          notes: notes.trim() || undefined,
        },
      });

      onInterviewLogged();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to log interview:", err);
      // Fallback: try via investigation interviews endpoint if it exists
      try {
        await apiClient.post(`/investigation-interviews`, {
          caseId,
          intervieweeName: intervieweeName.trim(),
          intervieweeType,
          scheduledAt,
          notes: notes.trim() || undefined,
        });
        onInterviewLogged();
        onOpenChange(false);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
        setError("Failed to log interview. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Log Interview
          </DialogTitle>
          <DialogDescription>
            Schedule or log an interview related to this case. The interview
            will be recorded in the case activity timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Interviewee Name */}
          <div className="grid gap-2">
            <Label htmlFor="intervieweeName">
              Interviewee Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="intervieweeName"
              placeholder="Enter the name of the person being interviewed"
              value={intervieweeName}
              onChange={(e) => setIntervieweeName(e.target.value)}
              autoFocus
            />
            {intervieweeName.length > 0 &&
              intervieweeName.trim().length < 2 && (
                <p className="text-xs text-gray-500">
                  Name must be at least 2 characters
                </p>
              )}
          </div>

          {/* Interviewee Type */}
          <div className="grid gap-2">
            <Label htmlFor="intervieweeType">Interviewee Type</Label>
            <Select
              value={intervieweeType}
              onValueChange={(value) =>
                setIntervieweeType(value as IntervieweeType)
              }
            >
              <SelectTrigger id="intervieweeType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERSON">Person in System</SelectItem>
                <SelectItem value="EXTERNAL">External</SelectItem>
                <SelectItem value="ANONYMOUS">Anonymous</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scheduled Date */}
          <div className="grid gap-2">
            <Label htmlFor="scheduledAt" className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Scheduled Date
            </Label>
            <Input
              id="scheduledAt"
              type="date"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes" className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Pre-Interview Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Topics to cover, questions to ask, relevant context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
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
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
