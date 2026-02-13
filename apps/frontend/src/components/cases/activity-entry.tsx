"use client";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/date-utils";
import { getActivityIconConfig } from "@/lib/activity-icons";
import type { Activity } from "@/types/activity";

interface ActivityEntryProps {
  activity: Activity;
  isLast?: boolean;
  /** Show upcoming style (amber accent for future items) */
  isUpcoming?: boolean;
}

export function ActivityEntry({
  activity,
  isLast = false,
  isUpcoming = false,
}: ActivityEntryProps) {
  const { icon: Icon, color, bgColor } = getActivityIconConfig(activity.action);

  const actorDisplay = activity.actorName || "System";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUpcoming && "bg-amber-50 -mx-2 px-2 py-1 rounded-lg",
      )}
      data-testid="activity-entry"
    >
      {/* Timeline indicator */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full",
            isUpcoming ? "bg-amber-100" : bgColor,
          )}
        >
          <Icon
            className={cn("w-4 h-4", isUpcoming ? "text-amber-600" : color)}
            aria-hidden="true"
          />
        </div>
        {!isLast && (
          <div
            className={cn(
              "flex-1 w-px my-2",
              isUpcoming ? "bg-amber-200" : "bg-gray-200",
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className="text-sm text-gray-900"
              data-testid="activity-description"
            >
              {activity.actionDescription}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              by <span className="font-medium">{actorDisplay}</span>
            </p>
          </div>
          <time
            className={cn(
              "text-xs whitespace-nowrap flex-shrink-0",
              isUpcoming ? "text-amber-600 font-medium" : "text-gray-400",
            )}
            dateTime={activity.createdAt}
            title={new Date(activity.createdAt).toLocaleString()}
            data-testid="activity-timestamp"
          >
            {formatRelativeTime(activity.createdAt)}
          </time>
        </div>

        {/* Show changes if available */}
        {activity.changes && Object.keys(activity.changes).length > 0 && (
          <div className="mt-2 text-xs bg-gray-50 rounded-md p-2 border">
            <ActivityChangesDisplay changes={activity.changes} />
          </div>
        )}
      </div>
    </div>
  );
}

interface ActivityChangesDisplayProps {
  changes: Record<string, { old: unknown; new: unknown }>;
}

function ActivityChangesDisplay({ changes }: ActivityChangesDisplayProps) {
  const entries = Object.entries(changes).filter(
    ([key]) => key !== "fields_changed",
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {entries.map(([field, { old: oldValue, new: newValue }]) => (
        <div key={field} className="flex items-center gap-2">
          <span className="text-gray-500 capitalize">
            {formatFieldName(field)}:
          </span>
          <span className="text-gray-400 line-through">
            {formatValue(oldValue)}
          </span>
          <span className="text-gray-400">→</span>
          <span className="text-gray-700 font-medium">
            {formatValue(newValue)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "none";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
