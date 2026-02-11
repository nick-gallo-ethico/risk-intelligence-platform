"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { format, addDays, isBefore, isAfter, startOfDay } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  X,
  ChevronDown,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

// Launch type enum
export type LaunchType = "immediate" | "scheduled" | "staggered";

// Staggered wave configuration
export interface StaggeredWave {
  id: string;
  type: "percentage" | "count";
  value: number;
  daysOffset: number;
}

// Reminder milestone configuration
export interface ReminderMilestone {
  id: string;
  daysBeforeDeadline: number;
  ccManager: boolean;
  ccHR: boolean;
}

// Deadline type
export type DeadlineType = "absolute" | "relative";

// Schedule configuration
export interface ScheduleConfiguration {
  launchType: LaunchType;
  launchDate?: Date;
  launchTime?: string;
  timezone: string;
  waves?: StaggeredWave[];
  deadlineType: DeadlineType;
  deadlineDate?: Date;
  relativeDays?: number;
  reminders: ReminderMilestone[];
}

// Props
interface ScheduleConfigProps {
  value?: ScheduleConfiguration;
  onChange: (config: ScheduleConfiguration) => void;
  audienceCount?: number;
  className?: string;
}

// Default reminder presets
const REMINDER_PRESETS = {
  standard: [
    { daysBeforeDeadline: 5, ccManager: false, ccHR: false },
    { daysBeforeDeadline: 10, ccManager: true, ccHR: false },
    { daysBeforeDeadline: 13, ccManager: true, ccHR: true },
  ],
  aggressive: [
    { daysBeforeDeadline: 3, ccManager: false, ccHR: false },
    { daysBeforeDeadline: 7, ccManager: true, ccHR: false },
    { daysBeforeDeadline: 10, ccManager: true, ccHR: false },
    { daysBeforeDeadline: 14, ccManager: true, ccHR: true },
  ],
  minimal: [
    { daysBeforeDeadline: 7, ccManager: false, ccHR: false },
    { daysBeforeDeadline: 14, ccManager: true, ccHR: false },
  ],
};

// Wave presets
const WAVE_PRESETS = {
  quarterDaily: [
    { type: "percentage" as const, value: 25, daysOffset: 0 },
    { type: "percentage" as const, value: 25, daysOffset: 1 },
    { type: "percentage" as const, value: 25, daysOffset: 2 },
    { type: "percentage" as const, value: 25, daysOffset: 3 },
  ],
  pilotFirst: [
    { type: "percentage" as const, value: 10, daysOffset: 0 },
    { type: "percentage" as const, value: 45, daysOffset: 2 },
    { type: "percentage" as const, value: 45, daysOffset: 4 },
  ],
  gradual: [
    { type: "percentage" as const, value: 10, daysOffset: 0 },
    { type: "percentage" as const, value: 20, daysOffset: 1 },
    { type: "percentage" as const, value: 30, daysOffset: 2 },
    { type: "percentage" as const, value: 40, daysOffset: 3 },
  ],
};

// Timezones
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Singapore", label: "Singapore Time (SGT)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)" },
];

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Wave visual timeline
interface WaveTimelineProps {
  waves: StaggeredWave[];
  audienceCount: number;
}

function WaveTimeline({ waves, audienceCount }: WaveTimelineProps) {
  if (waves.length === 0) return null;

  const maxOffset = Math.max(...waves.map((w) => w.daysOffset));
  const totalDays = maxOffset + 1;

  return (
    <div className="mt-4 space-y-2">
      <Label className="text-sm">Rollout Timeline</Label>
      <div className="relative h-12 rounded-md bg-muted">
        {waves.map((wave, index) => {
          const left = (wave.daysOffset / (totalDays || 1)) * 100;
          const width =
            wave.type === "percentage"
              ? wave.value
              : (wave.value / audienceCount) * 100;
          const count =
            wave.type === "percentage"
              ? Math.round((wave.value / 100) * audienceCount)
              : wave.value;

          return (
            <TooltipProvider key={wave.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="absolute bottom-0 flex items-end justify-center"
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 5)}%`,
                    }}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t-sm bg-primary/70 transition-all hover:bg-primary",
                        index === 0 && "bg-primary",
                      )}
                      style={{
                        height: `${Math.max((wave.value / 100) * 48, 8)}px`,
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Day {wave.daysOffset}: {count.toLocaleString()} people (
                    {wave.type === "percentage" ? `${wave.value}%` : wave.value}
                    )
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Day 0</span>
        {totalDays > 1 && <span>Day {maxOffset}</span>}
      </div>
    </div>
  );
}

// Reminder timeline visual
interface ReminderTimelineProps {
  reminders: ReminderMilestone[];
  deadlineDate?: Date;
}

function ReminderTimeline({ reminders, deadlineDate }: ReminderTimelineProps) {
  if (reminders.length === 0) return null;

  const sortedReminders = [...reminders].sort(
    (a, b) => b.daysBeforeDeadline - a.daysBeforeDeadline,
  );
  const maxDays = Math.max(...reminders.map((r) => r.daysBeforeDeadline));

  return (
    <div className="mt-4 space-y-2">
      <Label className="text-sm">Reminder Schedule</Label>
      <div className="relative">
        <div className="flex items-center gap-2">
          {/* Timeline line */}
          <div className="relative h-8 flex-1">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-muted-foreground/30" />
            {sortedReminders.map((reminder, index) => {
              const position =
                maxDays > 0
                  ? ((maxDays - reminder.daysBeforeDeadline) / maxDays) * 100
                  : 100;
              return (
                <TooltipProvider key={reminder.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center"
                        style={{ left: `${position}%` }}
                      >
                        <div
                          className={cn(
                            "h-3 w-3 rounded-full border-2 border-background",
                            reminder.ccHR
                              ? "bg-destructive"
                              : reminder.ccManager
                                ? "bg-amber-500"
                                : "bg-primary",
                          )}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {reminder.daysBeforeDeadline} days before deadline
                        {reminder.ccManager && " + CC Manager"}
                        {reminder.ccHR && " + CC HR"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
            {/* Deadline marker */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 rotate-45 border-2 border-destructive bg-destructive/20" />
            </div>
          </div>
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{maxDays} days before</span>
          <span className="font-medium text-destructive">Deadline</span>
        </div>
      </div>
    </div>
  );
}

/**
 * ScheduleConfig - Campaign scheduling interface per RS.53.
 *
 * Launch options: immediate, scheduled, staggered rollout.
 * Deadline settings with blackout date warnings.
 * Configurable reminder sequences with escalation.
 */
export function ScheduleConfig({
  value,
  onChange,
  audienceCount = 0,
  className,
}: ScheduleConfigProps) {
  // State
  const [config, setConfig] = useState<ScheduleConfiguration>(() => ({
    launchType: value?.launchType || "immediate",
    launchDate: value?.launchDate,
    launchTime: value?.launchTime || "09:00",
    timezone:
      value?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    waves: value?.waves,
    deadlineType: value?.deadlineType || "absolute",
    deadlineDate: value?.deadlineDate,
    relativeDays: value?.relativeDays || 14,
    reminders: value?.reminders || [
      {
        id: generateId(),
        daysBeforeDeadline: 7,
        ccManager: false,
        ccHR: false,
      },
      { id: generateId(), daysBeforeDeadline: 3, ccManager: true, ccHR: false },
      { id: generateId(), daysBeforeDeadline: 1, ccManager: true, ccHR: true },
    ],
  }));

  // Blackout dates
  const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);
  const [loadingBlackouts, setLoadingBlackouts] = useState(false);

  // Load blackout dates
  useEffect(() => {
    const loadBlackoutDates = async () => {
      setLoadingBlackouts(true);
      try {
        const response = await apiClient.get<{ dates: string[] }>(
          "/campaigns/blackout-dates",
        );
        setBlackoutDates(response.dates.map((d) => new Date(d)));
      } catch (error) {
        console.error("Failed to load blackout dates:", error);
        // Demo blackout dates
        const today = new Date();
        setBlackoutDates([
          addDays(today, 5),
          addDays(today, 6),
          addDays(today, 25),
          addDays(today, 26),
          addDays(today, 27),
        ]);
      } finally {
        setLoadingBlackouts(false);
      }
    };

    loadBlackoutDates();
  }, []);

  // Stable ref for onChange to avoid infinite loops
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  // Update parent on config change
  useEffect(() => {
    onChangeRef.current(config);
  }, [config]);

  // Check if date is blackout
  const isBlackoutDate = (date: Date): boolean => {
    return blackoutDates.some(
      (bd) => startOfDay(bd).getTime() === startOfDay(date).getTime(),
    );
  };

  // Check if deadline is in blackout
  const deadlineInBlackout = useMemo(() => {
    if (!config.deadlineDate) return false;
    return isBlackoutDate(config.deadlineDate);
  }, [config.deadlineDate, blackoutDates]);

  // Update config helper
  const updateConfig = (updates: Partial<ScheduleConfiguration>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  // Handle wave changes
  const handleAddWave = () => {
    const newWave: StaggeredWave = {
      id: generateId(),
      type: "percentage",
      value: 25,
      daysOffset: config.waves?.length || 0,
    };
    updateConfig({
      waves: [...(config.waves || []), newWave],
    });
  };

  const handleUpdateWave = (id: string, updates: Partial<StaggeredWave>) => {
    updateConfig({
      waves: config.waves?.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    });
  };

  const handleRemoveWave = (id: string) => {
    updateConfig({
      waves: config.waves?.filter((w) => w.id !== id),
    });
  };

  const handleApplyWavePreset = (preset: keyof typeof WAVE_PRESETS) => {
    updateConfig({
      waves: WAVE_PRESETS[preset].map((w) => ({
        ...w,
        id: generateId(),
      })),
    });
  };

  // Handle reminder changes
  const handleAddReminder = () => {
    const existingDays = config.reminders.map((r) => r.daysBeforeDeadline);
    let newDays = 7;
    while (existingDays.includes(newDays)) {
      newDays++;
    }

    const newReminder: ReminderMilestone = {
      id: generateId(),
      daysBeforeDeadline: newDays,
      ccManager: false,
      ccHR: false,
    };
    updateConfig({
      reminders: [...config.reminders, newReminder],
    });
  };

  const handleUpdateReminder = (
    id: string,
    updates: Partial<ReminderMilestone>,
  ) => {
    updateConfig({
      reminders: config.reminders.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    });
  };

  const handleRemoveReminder = (id: string) => {
    updateConfig({
      reminders: config.reminders.filter((r) => r.id !== id),
    });
  };

  const handleApplyReminderPreset = (preset: keyof typeof REMINDER_PRESETS) => {
    updateConfig({
      reminders: REMINDER_PRESETS[preset].map((r) => ({
        ...r,
        id: generateId(),
      })),
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Launch Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Launch Timing</CardTitle>
          <CardDescription>
            When should this campaign be sent to employees?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Launch type selection */}
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => updateConfig({ launchType: "immediate" })}
              className={cn(
                "flex flex-col items-center rounded-lg border p-4 text-center transition-colors",
                config.launchType === "immediate"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50",
              )}
            >
              <Clock className="mb-2 h-6 w-6" />
              <span className="font-medium">Immediate</span>
              <span className="text-xs text-muted-foreground">Launch now</span>
            </button>

            <button
              type="button"
              onClick={() => updateConfig({ launchType: "scheduled" })}
              className={cn(
                "flex flex-col items-center rounded-lg border p-4 text-center transition-colors",
                config.launchType === "scheduled"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50",
              )}
            >
              <CalendarIcon className="mb-2 h-6 w-6" />
              <span className="font-medium">Scheduled</span>
              <span className="text-xs text-muted-foreground">
                Pick date/time
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                updateConfig({
                  launchType: "staggered",
                  waves:
                    config.waves && config.waves.length > 0
                      ? config.waves
                      : WAVE_PRESETS.quarterDaily.map((w) => ({
                          ...w,
                          id: generateId(),
                        })),
                });
              }}
              className={cn(
                "flex flex-col items-center rounded-lg border p-4 text-center transition-colors",
                config.launchType === "staggered"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50",
              )}
            >
              <div className="mb-2 flex gap-0.5">
                <div className="h-6 w-1.5 rounded bg-current" />
                <div className="h-4 w-1.5 self-end rounded bg-current opacity-70" />
                <div className="h-3 w-1.5 self-end rounded bg-current opacity-50" />
              </div>
              <span className="font-medium">Staggered</span>
              <span className="text-xs text-muted-foreground">
                Roll out in waves
              </span>
            </button>
          </div>

          {/* Scheduled date/time picker */}
          {config.launchType === "scheduled" && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Launch Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !config.launchDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {config.launchDate
                          ? format(config.launchDate, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={config.launchDate}
                        onSelect={(date) => updateConfig({ launchDate: date })}
                        disabled={(date) =>
                          isBefore(date, startOfDay(new Date())) ||
                          isBlackoutDate(date)
                        }
                        modifiers={{
                          blackout: blackoutDates,
                        }}
                        modifiersClassNames={{
                          blackout:
                            "bg-muted text-muted-foreground line-through",
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Launch Time</Label>
                  <Input
                    type="time"
                    value={config.launchTime}
                    onChange={(e) =>
                      updateConfig({ launchTime: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={config.timezone}
                    onValueChange={(value) => updateConfig({ timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
              </div>

              {config.launchDate && isBlackoutDate(config.launchDate) && (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    This date is marked as a blackout period. Consider choosing
                    a different date.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Staggered rollout configuration */}
          {config.launchType === "staggered" && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Wave Configuration
                </Label>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(value) =>
                      handleApplyWavePreset(value as keyof typeof WAVE_PRESETS)
                    }
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Apply preset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quarterDaily">25% per day</SelectItem>
                      <SelectItem value="pilotFirst">
                        Pilot first (10%)
                      </SelectItem>
                      <SelectItem value="gradual">Gradual ramp-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                {config.waves?.map((wave, index) => (
                  <div
                    key={wave.id}
                    className="flex items-center gap-2 rounded border p-2"
                  >
                    <span className="w-16 text-sm font-medium">
                      Wave {index + 1}
                    </span>
                    <Select
                      value={wave.type}
                      onValueChange={(value) =>
                        handleUpdateWave(wave.id, {
                          type: value as "percentage" | "count",
                        })
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={wave.value}
                      onChange={(e) =>
                        handleUpdateWave(wave.id, {
                          value: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20"
                      min={1}
                      max={wave.type === "percentage" ? 100 : audienceCount}
                    />
                    <span className="text-sm text-muted-foreground">
                      {wave.type === "percentage" ? "%" : "people"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      on day
                    </span>
                    <Input
                      type="number"
                      value={wave.daysOffset}
                      onChange={(e) =>
                        handleUpdateWave(wave.id, {
                          daysOffset: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-16"
                      min={0}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveWave(wave.id)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={handleAddWave}>
                <Plus className="mr-2 h-4 w-4" />
                Add Wave
              </Button>

              <WaveTimeline
                waves={config.waves || []}
                audienceCount={audienceCount}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deadline Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deadline</CardTitle>
          <CardDescription>
            When must employees complete this campaign?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateConfig({ deadlineType: "absolute" })}
              className={cn(
                "flex flex-col items-start rounded-lg border p-4 text-left transition-colors",
                config.deadlineType === "absolute"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50",
              )}
            >
              <span className="font-medium">Specific Date</span>
              <span className="text-xs text-muted-foreground">
                All employees have the same deadline
              </span>
            </button>

            <button
              type="button"
              onClick={() => updateConfig({ deadlineType: "relative" })}
              className={cn(
                "flex flex-col items-start rounded-lg border p-4 text-left transition-colors",
                config.deadlineType === "relative"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50",
              )}
            >
              <span className="font-medium">Relative</span>
              <span className="text-xs text-muted-foreground">
                Days after assignment
              </span>
            </button>
          </div>

          {config.deadlineType === "absolute" && (
            <div className="space-y-2">
              <Label>Deadline Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal sm:w-[280px]",
                      !config.deadlineDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {config.deadlineDate
                      ? format(config.deadlineDate, "PPP")
                      : "Pick a deadline"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={config.deadlineDate}
                    onSelect={(date) => updateConfig({ deadlineDate: date })}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    modifiers={{
                      blackout: blackoutDates,
                    }}
                    modifiersClassNames={{
                      blackout: "bg-amber-100 text-amber-800",
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {deadlineInBlackout && (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    This deadline falls during a blackout period. The deadline
                    will be automatically extended.
                  </span>
                </div>
              )}
            </div>
          )}

          {config.deadlineType === "relative" && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={config.relativeDays}
                onChange={(e) =>
                  updateConfig({ relativeDays: parseInt(e.target.value) || 14 })
                }
                className="w-20"
                min={1}
                max={365}
              />
              <span className="text-sm text-muted-foreground">
                days after assignment
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reminders</CardTitle>
          <CardDescription>
            Configure when to send reminder emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Reminder Schedule</Label>
            <Select
              onValueChange={(value) =>
                handleApplyReminderPreset(
                  value as keyof typeof REMINDER_PRESETS,
                )
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Apply preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (5, 10, 13)</SelectItem>
                <SelectItem value="aggressive">
                  Aggressive (3, 7, 10, 14)
                </SelectItem>
                <SelectItem value="minimal">Minimal (7, 14)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {config.reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center gap-3 rounded border p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={reminder.daysBeforeDeadline}
                    onChange={(e) =>
                      handleUpdateReminder(reminder.id, {
                        daysBeforeDeadline: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-16"
                    min={1}
                    max={90}
                  />
                  <span className="text-sm text-muted-foreground">
                    days before deadline
                  </span>
                </div>

                <div className="flex items-center gap-4 border-l pl-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`cc-manager-${reminder.id}`}
                      checked={reminder.ccManager}
                      onCheckedChange={(checked) =>
                        handleUpdateReminder(reminder.id, {
                          ccManager: !!checked,
                        })
                      }
                    />
                    <Label
                      htmlFor={`cc-manager-${reminder.id}`}
                      className="text-sm"
                    >
                      CC Manager
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`cc-hr-${reminder.id}`}
                      checked={reminder.ccHR}
                      onCheckedChange={(checked) =>
                        handleUpdateReminder(reminder.id, {
                          ccHR: !!checked,
                        })
                      }
                    />
                    <Label htmlFor={`cc-hr-${reminder.id}`} className="text-sm">
                      CC HR
                    </Label>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveReminder(reminder.id)}
                  className="ml-auto h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleAddReminder}>
            <Plus className="mr-2 h-4 w-4" />
            Add Reminder
          </Button>

          <ReminderTimeline
            reminders={config.reminders}
            deadlineDate={config.deadlineDate}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default ScheduleConfig;
