/**
 * ScheduleReportDialog
 *
 * Dialog for configuring scheduled report delivery.
 * Supports daily, weekly, and monthly schedules with timezone,
 * format selection, and recipient management.
 */
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { X, Loader2, Mail, Trash2 } from "lucide-react";
import { reportsApi } from "@/services/reports-api";

// =========================================================================
// Types
// =========================================================================

/**
 * Schedule type for delivery frequency
 */
export type ScheduleType = "DAILY" | "WEEKLY" | "MONTHLY";

/**
 * Export format for scheduled delivery
 */
export type ExportFormat = "EXCEL" | "CSV" | "PDF";

/**
 * Configuration for a scheduled export
 */
export interface ScheduledExportConfig {
  id?: string;
  name: string;
  scheduleType: ScheduleType;
  time: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly (0=Sunday)
  dayOfMonth?: number; // 1-31 for monthly
  timezone: string;
  format: ExportFormat;
  recipients: string[];
  isActive: boolean;
}

/**
 * Props for ScheduleReportDialog
 */
export interface ScheduleReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  reportName: string;
  existingSchedule?: ScheduledExportConfig | null;
  onScheduleCreated: (schedule: ScheduledExportConfig) => void;
}

// =========================================================================
// Constants
// =========================================================================

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString().padStart(2, "0"),
  label: i.toString().padStart(2, "0"),
}));

const MINUTES = ["00", "15", "30", "45"].map((m) => ({
  value: m,
  label: m,
}));

// =========================================================================
// Component
// =========================================================================

export function ScheduleReportDialog({
  open,
  onOpenChange,
  reportId,
  reportName,
  existingSchedule,
  onScheduleCreated,
}: ScheduleReportDialogProps) {
  // Form state
  const [name, setName] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("WEEKLY");
  const [hours, setHours] = useState("08");
  const [minutes, setMinutes] = useState("00");
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [timezone, setTimezone] = useState("America/New_York");
  const [format, setFormat] = useState<ExportFormat>("EXCEL");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Editing mode
  const isEditing = !!existingSchedule?.id;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (existingSchedule) {
        // Load existing schedule data
        setName(existingSchedule.name);
        setScheduleType(existingSchedule.scheduleType);
        const [h, m] = (existingSchedule.time || "08:00").split(":");
        setHours(h || "08");
        setMinutes(m || "00");
        setDayOfWeek(existingSchedule.dayOfWeek ?? 1);
        setDayOfMonth(existingSchedule.dayOfMonth ?? 1);
        setTimezone(existingSchedule.timezone || "America/New_York");
        setFormat(existingSchedule.format || "EXCEL");
        setRecipients(existingSchedule.recipients || []);
      } else {
        // Default values for new schedule
        setName(`${reportName} Schedule`);
        setScheduleType("WEEKLY");
        setHours("08");
        setMinutes("00");
        setDayOfWeek(1);
        setDayOfMonth(1);
        setTimezone("America/New_York");
        setFormat("EXCEL");
        setRecipients([]);
      }
      setEmailInput("");
      setEmailError("");
    }
  }, [open, existingSchedule, reportName]);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Add recipient
  const handleAddRecipient = useCallback(() => {
    const trimmedEmail = emailInput.trim().toLowerCase();

    if (!trimmedEmail) {
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (recipients.includes(trimmedEmail)) {
      setEmailError("This email is already added");
      return;
    }

    setRecipients([...recipients, trimmedEmail]);
    setEmailInput("");
    setEmailError("");
  }, [emailInput, recipients]);

  // Remove recipient
  const handleRemoveRecipient = useCallback((email: string) => {
    setRecipients((prev) => prev.filter((e) => e !== email));
  }, []);

  // Handle Enter key in email input
  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddRecipient();
    }
  };

  // Save schedule
  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Please enter a schedule name");
      return;
    }

    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    setIsSaving(true);

    try {
      const config: Omit<ScheduledExportConfig, "id" | "isActive"> = {
        name: name.trim(),
        scheduleType,
        time: `${hours}:${minutes}`,
        dayOfWeek: scheduleType === "WEEKLY" ? dayOfWeek : undefined,
        dayOfMonth: scheduleType === "MONTHLY" ? dayOfMonth : undefined,
        timezone,
        format,
        recipients,
      };

      let result: ScheduledExportConfig;

      if (isEditing) {
        result = await reportsApi.updateSchedule(reportId, config);
        toast.success("Schedule updated successfully");
      } else {
        result = await reportsApi.scheduleReport(reportId, config);
        toast.success("Schedule created successfully");
      }

      onScheduleCreated(result);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save schedule:", error);
      toast.error(
        isEditing ? "Failed to update schedule" : "Failed to create schedule",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Delete schedule
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await reportsApi.deleteSchedule(reportId);
      toast.success("Schedule deleted");
      onScheduleCreated(null as unknown as ScheduledExportConfig); // Signal deletion
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      toast.error("Failed to delete schedule");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Schedule" : "Schedule Report"}
            </DialogTitle>
            <DialogDescription>
              Configure automatic delivery for this report. Recipients will
              receive the report via email at the scheduled time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Schedule Name */}
            <div className="space-y-2">
              <Label htmlFor="schedule-name">Schedule Name</Label>
              <Input
                id="schedule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter schedule name"
              />
            </div>

            {/* Frequency */}
            <div className="space-y-3">
              <Label>Frequency</Label>
              <RadioGroup
                value={scheduleType}
                onValueChange={(v) => setScheduleType(v as ScheduleType)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="DAILY" id="freq-daily" />
                  <Label htmlFor="freq-daily" className="cursor-pointer">
                    Daily
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="WEEKLY" id="freq-weekly" />
                  <Label htmlFor="freq-weekly" className="cursor-pointer">
                    Weekly
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MONTHLY" id="freq-monthly" />
                  <Label htmlFor="freq-monthly" className="cursor-pointer">
                    Monthly
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Day Selection (Weekly) */}
            {scheduleType === "WEEKLY" && (
              <div className="space-y-2">
                <Label htmlFor="day-of-week">Day of Week</Label>
                <Select
                  value={dayOfWeek.toString()}
                  onValueChange={(v) => setDayOfWeek(parseInt(v, 10))}
                >
                  <SelectTrigger id="day-of-week">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Day Selection (Monthly) */}
            {scheduleType === "MONTHLY" && (
              <div className="space-y-2">
                <Label htmlFor="day-of-month">Day of Month</Label>
                <Select
                  value={dayOfMonth.toString()}
                  onValueChange={(v) => setDayOfMonth(parseInt(v, 10))}
                >
                  <SelectTrigger id="day-of-month">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time */}
            <div className="space-y-2">
              <Label>Time</Label>
              <div className="flex items-center gap-2">
                <Select value={hours} onValueChange={setHours}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="HH" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">:</span>
                <Select value={minutes} onValueChange={setMinutes}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format */}
            <div className="space-y-3">
              <Label>Format</Label>
              <RadioGroup
                value={format}
                onValueChange={(v) => setFormat(v as ExportFormat)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="EXCEL" id="fmt-excel" />
                  <Label htmlFor="fmt-excel" className="cursor-pointer">
                    Excel (.xlsx)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CSV" id="fmt-csv" />
                  <Label htmlFor="fmt-csv" className="cursor-pointer">
                    CSV
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PDF" id="fmt-pdf" />
                  <Label htmlFor="fmt-pdf" className="cursor-pointer">
                    PDF
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Recipients */}
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipients</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="recipient-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setEmailError("");
                    }}
                    onKeyDown={handleEmailKeyDown}
                    placeholder="Enter email address"
                  />
                  {emailError && (
                    <p className="text-sm text-destructive mt-1">
                      {emailError}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddRecipient}
                >
                  Add
                </Button>
              </div>

              {/* Recipient badges */}
              {recipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {recipients.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      <Mail className="h-3 w-3" />
                      <span>{email}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-destructive/20"
                        onClick={() => handleRemoveRecipient(email)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              {recipients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add at least one recipient email address
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving || isDeleting}
                className="sm:mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Schedule
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isDeleting}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Update Schedule" : "Save Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
