"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Mail,
  Phone,
  CheckSquare,
  Mic,
  FileUp,
  ArrowRightLeft,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityTypeFilter } from "@/types/activity";

/**
 * Configuration for each activity type checkbox
 */
interface ActivityTypeConfig {
  id: ActivityTypeFilter;
  label: string;
  icon: React.ElementType;
}

const ACTIVITY_TYPES: ActivityTypeConfig[] = [
  { id: "notes", label: "Notes", icon: FileText },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "interviews", label: "Interviews", icon: Mic },
  { id: "documents", label: "Documents", icon: FileUp },
  { id: "status_changes", label: "Status Changes", icon: ArrowRightLeft },
  { id: "system_events", label: "System Events", icon: Settings },
];

interface ActivityTypeCheckboxesProps {
  activeTypes: Set<ActivityTypeFilter>;
  onToggle: (type: ActivityTypeFilter) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  className?: string;
}

/**
 * Checkbox-style activity type filters (HubSpot pattern)
 *
 * Displays 8 activity type checkboxes in a flex-wrap grid.
 * Clicking a checkbox toggles that type filter on/off.
 */
export function ActivityTypeCheckboxes({
  activeTypes,
  onToggle,
  onSelectAll,
  onDeselectAll,
  className,
}: ActivityTypeCheckboxesProps) {
  const allSelected = activeTypes.size === ACTIVITY_TYPES.length;
  const noneSelected = activeTypes.size === 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Quick select/deselect actions */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={onSelectAll}
          className={cn(
            "hover:text-foreground transition-colors",
            allSelected && "text-foreground font-medium",
          )}
          aria-pressed={allSelected}
        >
          Select all
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={onDeselectAll}
          className={cn(
            "hover:text-foreground transition-colors",
            noneSelected && "text-foreground font-medium",
          )}
          aria-pressed={noneSelected}
        >
          Deselect all
        </button>
      </div>

      {/* Activity type checkboxes */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-2"
        role="group"
        aria-label="Activity type filters"
      >
        {ACTIVITY_TYPES.map((type) => {
          const Icon = type.icon;
          const isChecked = activeTypes.has(type.id);

          return (
            <div key={type.id} className="flex items-center gap-1.5">
              <Checkbox
                id={`activity-type-${type.id}`}
                checked={isChecked}
                onCheckedChange={() => onToggle(type.id)}
                aria-describedby={`activity-type-${type.id}-label`}
              />
              <Label
                htmlFor={`activity-type-${type.id}`}
                id={`activity-type-${type.id}-label`}
                className={cn(
                  "flex items-center gap-1 text-sm cursor-pointer select-none",
                  isChecked ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {type.label}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * @deprecated Use ActivityTypeCheckboxes for HubSpot-style filtering
 *
 * Legacy tab-style activity filters. Kept for backwards compatibility
 * but will be removed in a future update.
 */
export type ActivityFilterType = "all" | "notes" | "status" | "files";

interface LegacyActivityFiltersProps {
  activeFilter: ActivityFilterType;
  onFilterChange: (filter: ActivityFilterType) => void;
  counts?: {
    all: number;
    notes: number;
    status: number;
    files: number;
  };
}

const legacyFilters: { value: ActivityFilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "notes", label: "Notes" },
  { value: "status", label: "Status Changes" },
  { value: "files", label: "Files" },
];

/**
 * @deprecated Use ActivityTypeCheckboxes instead
 */
export function ActivityFilters({
  activeFilter,
  onFilterChange,
  counts,
}: LegacyActivityFiltersProps) {
  return (
    <div
      className="flex items-center gap-1 border-b"
      role="tablist"
      aria-label="Activity filter tabs"
    >
      {legacyFilters.map(({ value, label }) => {
        const isActive = activeFilter === value;
        const count = counts?.[value];

        return (
          <button
            key={value}
            onClick={() => onFilterChange(value)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`activity-panel-${value}`}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors",
              "border-b-2 -mb-px",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              isActive
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
            )}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  "ml-1.5 px-1.5 py-0.5 text-xs rounded-full",
                  isActive
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-600",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
