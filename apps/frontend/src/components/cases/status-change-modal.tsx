"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { casesApi } from "@/lib/cases-api";
import type { CaseStatus } from "@/types/case";

interface StatusChangeModalProps {
  caseId: string;
  currentStatus: CaseStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: () => void;
}

/**
 * Available case statuses with labels
 */
const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

/**
 * StatusChangeModal - Modal for changing case status with rationale
 *
 * Shows a dropdown with available statuses (excluding current) and
 * requires a rationale. Displays a warning when closing a case.
 */
export function StatusChangeModal({
  caseId,
  currentStatus,
  open,
  onOpenChange,
  onStatusChanged,
}: StatusChangeModalProps) {
  const [status, setStatus] = useState<CaseStatus | "">("");
  const [rationale, setRationale] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setStatus("");
      setRationale("");
      setError(null);
    }
  }, [open]);

  const isClosing = status === "CLOSED";
  const isValidRationale = rationale.trim().length >= 10;
  const canSubmit = status && status !== currentStatus && isValidRationale;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await casesApi.updateStatus(caseId, status, rationale.trim());
      onStatusChanged();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("Failed to update status. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusLabel = (s: CaseStatus) => {
    return STATUS_OPTIONS.find((opt) => opt.value === s)?.label || s;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Case Status</DialogTitle>
          <DialogDescription>
            Update the status of this case. A rationale is required for all
            status changes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Current Status Display */}
          <div className="grid gap-2">
            <Label className="text-gray-500">Current Status</Label>
            <div className="text-sm font-medium">
              {getStatusLabel(currentStatus)}
            </div>
          </div>

          {/* New Status Select */}
          <div className="grid gap-2">
            <Label htmlFor="status">
              New Status <span className="text-red-500">*</span>
            </Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as CaseStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter(
                  (opt) => opt.value !== currentStatus,
                ).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Close Case Warning */}
          {isClosing && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Closing this case will mark it as resolved. This action can be
                reversed by reopening the case later.
              </AlertDescription>
            </Alert>
          )}

          {/* Rationale Textarea */}
          <div className="grid gap-2">
            <Label htmlFor="rationale">
              Rationale <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rationale"
              placeholder="Explain why you are changing the status (min 10 characters)"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={3}
            />
            {rationale.length > 0 && !isValidRationale && (
              <p className="text-xs text-gray-500">
                {10 - rationale.trim().length} more characters required
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
            disabled={!canSubmit || isSubmitting}
            variant={isClosing ? "destructive" : "default"}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isClosing ? "Close Case" : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
