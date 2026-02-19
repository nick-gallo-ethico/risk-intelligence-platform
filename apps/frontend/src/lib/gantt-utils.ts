import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  differenceInDays,
  format,
  isWithinInterval,
  min,
  max,
  addDays,
  subDays,
} from "date-fns";

export type TimelineZoom = "week" | "month" | "quarter";

export interface TimelineColumn {
  date: Date;
  label: string;
  isToday: boolean;
  isWeekend: boolean;
}

export interface MilestoneBar {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "AT_RISK" | "COMPLETED" | "CANCELLED";
  left: number; // Percentage
  width: number; // Percentage
  row: number;
}

export interface TimelineRange {
  start: Date;
  end: Date;
  columns: TimelineColumn[];
}

/**
 * Calculate timeline range based on milestones and zoom level.
 */
export function calculateTimelineRange(
  milestones: { targetDate: Date; createdAt: Date }[],
  zoom: TimelineZoom,
  paddingDays: number = 14,
): TimelineRange {
  if (milestones.length === 0) {
    const now = new Date();
    return createTimelineForRange(subDays(now, 30), addDays(now, 60), zoom);
  }

  const dates = milestones.flatMap((m) => [m.targetDate, m.createdAt]);
  const minDate = min(dates);
  const maxDate = max(dates);

  const start = subDays(minDate, paddingDays);
  const end = addDays(maxDate, paddingDays);

  return createTimelineForRange(start, end, zoom);
}

function createTimelineForRange(
  start: Date,
  end: Date,
  zoom: TimelineZoom,
): TimelineRange {
  let columns: TimelineColumn[];
  const today = new Date();

  switch (zoom) {
    case "week": {
      // Daily columns for week view
      const days = eachDayOfInterval({ start, end });
      columns = days.map((date) => ({
        date,
        label: format(date, "EEE d"),
        isToday: format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      }));
      break;
    }

    case "month": {
      // Weekly columns for month view
      const weeks = eachWeekOfInterval({ start, end });
      columns = weeks.map((date) => ({
        date,
        label: format(date, "MMM d"),
        isToday: isWithinInterval(today, { start: date, end: endOfWeek(date) }),
        isWeekend: false,
      }));
      break;
    }

    case "quarter": {
      // Monthly columns for quarter view
      const months = eachMonthOfInterval({ start, end });
      columns = months.map((date) => ({
        date,
        label: format(date, "MMM yyyy"),
        isToday: format(date, "yyyy-MM") === format(today, "yyyy-MM"),
        isWeekend: false,
      }));
      break;
    }
  }

  return { start, end, columns };
}

/**
 * Calculate bar position and width for a milestone.
 */
export function calculateMilestoneBar(
  milestone: {
    id: string;
    name: string;
    createdAt: Date;
    targetDate: Date;
    progressPercent: number;
    status: string;
  },
  timeline: TimelineRange,
  row: number,
): MilestoneBar {
  const totalDays = differenceInDays(timeline.end, timeline.start);

  // Start from creation date, end at target date
  const startOffset = differenceInDays(milestone.createdAt, timeline.start);
  const endOffset = differenceInDays(milestone.targetDate, timeline.start);

  const left = Math.max(0, (startOffset / totalDays) * 100);
  const right = Math.min(100, (endOffset / totalDays) * 100);
  const width = Math.max(2, right - left); // Minimum 2% width for visibility

  return {
    id: milestone.id,
    name: milestone.name,
    startDate: milestone.createdAt,
    endDate: milestone.targetDate,
    progress: milestone.progressPercent,
    status: milestone.status as MilestoneBar["status"],
    left,
    width,
    row,
  };
}

/**
 * Get color pair (light/dark) for milestone status.
 */
export function getStatusColorPair(status: MilestoneBar["status"]): {
  light: string;
  dark: string;
} {
  switch (status) {
    case "COMPLETED":
      return { light: "#22c55e", dark: "#4ade80" }; // green-500 / green-400
    case "IN_PROGRESS":
      return { light: "#3b82f6", dark: "#60a5fa" }; // blue-500 / blue-400
    case "AT_RISK":
      return { light: "#f59e0b", dark: "#fbbf24" }; // amber-500 / amber-400
    case "CANCELLED":
      return { light: "#6b7280", dark: "#9ca3af" }; // gray-500 / gray-400
    default:
      return { light: "#94a3b8", dark: "#cbd5e1" }; // slate-400 / slate-300
  }
}

/**
 * Get background color pair (light/dark) for milestone status.
 */
export function getStatusBgColorPair(status: MilestoneBar["status"]): {
  light: string;
  dark: string;
} {
  switch (status) {
    case "COMPLETED":
      return { light: "#dcfce7", dark: "rgba(34, 197, 94, 0.2)" }; // green-100 / green-500 at 20%
    case "IN_PROGRESS":
      return { light: "#dbeafe", dark: "rgba(59, 130, 246, 0.2)" }; // blue-100 / blue-500 at 20%
    case "AT_RISK":
      return { light: "#fef3c7", dark: "rgba(245, 158, 11, 0.2)" }; // amber-100 / amber-500 at 20%
    case "CANCELLED":
      return { light: "#f3f4f6", dark: "rgba(107, 114, 128, 0.2)" }; // gray-100 / gray-500 at 20%
    default:
      return { light: "#f1f5f9", dark: "rgba(148, 163, 184, 0.2)" }; // slate-100 / slate-400 at 20%
  }
}

/**
 * Get color for milestone status.
 * @deprecated Use getStatusColorPair() for dark mode support
 */
export function getStatusColor(status: MilestoneBar["status"]): string {
  return getStatusColorPair(status).light;
}

/**
 * Get lighter color for milestone background.
 * @deprecated Use getStatusBgColorPair() for dark mode support
 */
export function getStatusBgColor(status: MilestoneBar["status"]): string {
  return getStatusBgColorPair(status).light;
}

/**
 * Format date range for tooltip.
 */
export function formatDateRange(start: Date, end: Date): string {
  const startStr = format(start, "MMM d, yyyy");
  const endStr = format(end, "MMM d, yyyy");
  return `${startStr} - ${endStr}`;
}

/**
 * Calculate today line position.
 */
export function getTodayPosition(timeline: TimelineRange): number | null {
  const today = new Date();
  if (!isWithinInterval(today, { start: timeline.start, end: timeline.end })) {
    return null;
  }
  const totalDays = differenceInDays(timeline.end, timeline.start);
  const todayOffset = differenceInDays(today, timeline.start);
  return (todayOffset / totalDays) * 100;
}
