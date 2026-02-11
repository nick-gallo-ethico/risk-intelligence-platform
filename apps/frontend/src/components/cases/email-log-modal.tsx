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

interface EmailLogModalProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmailLogged: () => void;
}

type EmailDirection = "sent" | "received";

/**
 * EmailLogModal - Modal for logging external email communications
 *
 * This does NOT send emails - it records that an email was sent or
 * received externally and logs it to the case activity feed.
 */
export function EmailLogModal({
  caseId,
  open,
  onOpenChange,
  onEmailLogged,
}: EmailLogModalProps) {
  const [direction, setDirection] = useState<EmailDirection>("sent");
  const [emailAddress, setEmailAddress] = useState("");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [emailDate, setEmailDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setDirection("sent");
      setEmailAddress("");
      setSubject("");
      setSummary("");
      setEmailDate(new Date().toISOString().split("T")[0]);
      setError(null);
    }
  }, [open]);

  const isValid =
    emailAddress.trim().length > 0 &&
    subject.trim().length > 0 &&
    summary.trim().length >= 5;

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    const actionDescription =
      direction === "sent"
        ? `Sent email to ${emailAddress}: ${subject}`
        : `Received email from ${emailAddress}: ${subject}`;

    try {
      // Log the email as an activity entry
      await apiClient.post(`/cases/${caseId}/activity`, {
        action: "emailed",
        description: summary.trim(),
        actionDescription: actionDescription,
        metadata: {
          direction,
          emailAddress: emailAddress.trim(),
          subject: subject.trim(),
          emailDate,
        },
      });

      onEmailLogged();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to log email:", err);
      // Fallback: try a different endpoint structure
      try {
        await apiClient.post(`/cases/${caseId}/communications`, {
          type: "email",
          direction,
          address: emailAddress.trim(),
          subject: subject.trim(),
          content: summary.trim(),
          date: emailDate,
        });
        onEmailLogged();
        onOpenChange(false);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
        setError("Failed to log email. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Email</DialogTitle>
          <DialogDescription>
            Record an email that was sent or received related to this case. This
            does not send an email - it logs an existing communication.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Direction */}
          <div className="grid gap-2">
            <Label htmlFor="direction">Direction</Label>
            <Select
              value={direction}
              onValueChange={(value) => setDirection(value as EmailDirection)}
            >
              <SelectTrigger id="direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email Address */}
          <div className="grid gap-2">
            <Label htmlFor="emailAddress">
              {direction === "sent" ? "To" : "From"}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="emailAddress"
              type="email"
              placeholder="email@example.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
            />
          </div>

          {/* Subject */}
          <div className="grid gap-2">
            <Label htmlFor="subject">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="Email subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Summary */}
          <div className="grid gap-2">
            <Label htmlFor="summary">
              Summary <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="summary"
              placeholder="Brief summary of the email content (min 5 characters)"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
            />
            {summary.length > 0 && summary.trim().length < 5 && (
              <p className="text-xs text-gray-500">
                {5 - summary.trim().length} more characters required
              </p>
            )}
          </div>

          {/* Date */}
          <div className="grid gap-2">
            <Label htmlFor="emailDate">Date</Label>
            <Input
              id="emailDate"
              type="date"
              value={emailDate}
              onChange={(e) => setEmailDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
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
            Log Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
