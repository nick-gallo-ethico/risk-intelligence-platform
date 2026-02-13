"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Single status change entry in the timeline.
 */
export interface StatusChange {
  /** Status name (e.g., "New", "Active", "Closed") */
  status: string;
  /** ISO date string when the change occurred */
  date: string;
  /** Name of the user who made the change */
  changedBy: string;
  /** Optional rationale for the status change */
  rationale?: string;
}

interface StatusHistoryTimelineProps {
  /** Array of status changes, most recent first */
  changes: StatusChange[];
  /** Optional className for the card */
  className?: string;
}

/**
 * Status color mapping by stage/status name.
 */
const STATUS_COLOR_MAP: Record<string, string> = {
  new: "#6B7280", // Gray
  assigned: "#3B82F6", // Blue
  active: "#8B5CF6", // Purple
  review: "#F59E0B", // Amber
  closed: "#10B981", // Green
  remediation: "#EF4444", // Red
  archived: "#9CA3AF", // Light gray
  // Generic status mappings
  open: "#8B5CF6",
  triage: "#3B82F6",
  investigation: "#8B5CF6",
};

/**
 * StatusHistoryTimeline - Vertical timeline showing status change history.
 *
 * Features:
 * - Colored dots by status (mapped to pipeline stage colors)
 * - Vertical connecting line between entries
 * - Date, user name, and optional rationale for each change
 * - Most recent at top, oldest at bottom
 *
 * @example
 * ```tsx
 * const changes: StatusChange[] = [
 *   { status: "Active", date: "2026-02-13T10:00:00Z", changedBy: "Jane Doe", rationale: "Investigation started" },
 *   { status: "Assigned", date: "2026-02-12T09:00:00Z", changedBy: "John Smith" },
 *   { status: "New", date: "2026-02-11T08:00:00Z", changedBy: "System" },
 * ];
 *
 * <StatusHistoryTimeline changes={changes} />
 * ```
 */
export function StatusHistoryTimeline({
  changes,
  className,
}: StatusHistoryTimelineProps) {
  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700">
          Status History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!changes || changes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No status changes recorded
          </p>
        ) : (
          <div className="relative">
            {changes.map((change, index) => (
              <TimelineEntry
                key={`${change.status}-${change.date}-${index}`}
                change={change}
                isFirst={index === 0}
                isLast={index === changes.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TimelineEntryProps {
  change: StatusChange;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Individual timeline entry with dot, connector line, and content.
 */
function TimelineEntry({ change, isFirst, isLast }: TimelineEntryProps) {
  const statusKey = change.status.toLowerCase().replace(/\s+/g, "_");
  const dotColor = STATUS_COLOR_MAP[statusKey] || "#6B7280";

  const formattedDate = formatDate(change.date);

  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {/* Dot and connector line */}
      <div className="flex flex-col items-center">
        {/* Dot */}
        <div
          className={cn(
            "w-3 h-3 rounded-full flex-shrink-0 z-10",
            isFirst && "ring-2 ring-offset-1",
          )}
          style={{
            backgroundColor: dotColor,
            // Ring color is handled via Tailwind ring utilities + inline background
            ...(isFirst &&
              ({ "--tw-ring-color": `${dotColor}40` } as React.CSSProperties)),
          }}
        />
        {/* Connector line */}
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0">
        {/* Status and date row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color: dotColor }}>
            {change.status}
          </span>
          <span className="text-xs text-gray-400">{formattedDate}</span>
        </div>

        {/* User */}
        <p className="text-xs text-gray-500 mt-0.5">by {change.changedBy}</p>

        {/* Rationale quote */}
        {change.rationale && (
          <blockquote className="mt-1.5 text-xs text-gray-600 italic border-l-2 border-gray-200 pl-2">
            &ldquo;{change.rationale}&rdquo;
          </blockquote>
        )}
      </div>
    </div>
  );
}

/**
 * Format date string for display.
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // For recent dates, show relative time
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 1) return "Just now";
      return `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older dates, show formatted date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default StatusHistoryTimeline;
