"use client";

import { useState } from "react";
import { Phone, Clock, User } from "lucide-react";
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

interface LogCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSuccess?: () => void;
}

type CallDirection = "INBOUND" | "OUTBOUND";
type CallOutcome =
  | "CONNECTED"
  | "VOICEMAIL"
  | "NO_ANSWER"
  | "BUSY"
  | "WRONG_NUMBER";

export function LogCallModal({
  open,
  onOpenChange,
  caseId,
  onSuccess,
}: LogCallModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState<CallDirection>("OUTBOUND");
  const [outcome, setOutcome] = useState<CallOutcome>("CONNECTED");
  const [contactName, setContactName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!notes.trim()) return;

    setIsSubmitting(true);
    try {
      // Log call as activity
      await apiClient.post(`/cases/${caseId}/activity`, {
        action: "call_logged",
        actionDescription: `${direction === "INBOUND" ? "Received" : "Made"} call ${
          contactName ? `with ${contactName}` : ""
        } - ${outcome.replace("_", " ").toLowerCase()}`,
        context: {
          direction,
          outcome,
          contactName: contactName || null,
          phoneNumber: phoneNumber || null,
          durationMinutes: duration ? parseInt(duration) : null,
        },
        notes,
      });

      // Reset form
      setDirection("OUTBOUND");
      setOutcome("CONNECTED");
      setContactName("");
      setPhoneNumber("");
      setDuration("");
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to log call:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Log Call
          </DialogTitle>
          <DialogDescription>
            Record details of a phone call related to this case.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Direction and Outcome */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select
                value={direction}
                onValueChange={(v) => setDirection(v as CallDirection)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTBOUND">Outbound</SelectItem>
                  <SelectItem value="INBOUND">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select
                value={outcome}
                onValueChange={(v) => setOutcome(v as CallOutcome)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONNECTED">Connected</SelectItem>
                  <SelectItem value="VOICEMAIL">Voicemail</SelectItem>
                  <SelectItem value="NO_ANSWER">No Answer</SelectItem>
                  <SelectItem value="BUSY">Busy</SelectItem>
                  <SelectItem value="WRONG_NUMBER">Wrong Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">
                <User className="h-3 w-3 inline mr-1" />
                Contact Name
              </Label>
              <Input
                id="contactName"
                placeholder="John Smith"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                <Phone className="h-3 w-3 inline mr-1" />
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">
              <Clock className="h-3 w-3 inline mr-1" />
              Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              min="0"
              placeholder="15"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Call Notes *</Label>
            <Textarea
              id="notes"
              placeholder="Summary of the conversation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !notes.trim()}
          >
            {isSubmitting ? "Saving..." : "Log Call"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
