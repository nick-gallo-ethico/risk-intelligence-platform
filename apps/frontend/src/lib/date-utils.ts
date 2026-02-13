/**
 * Date utilities for activity timeline grouping and formatting
 */

/**
 * Returns a relative time string (e.g., "2 hours ago", "Yesterday")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return "Yesterday";
  }

  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? "" : "s"} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? "" : "s"} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears === 1 ? "" : "s"} ago`;
}

/**
 * Returns a date group label for timeline grouping
 * Uses descriptive labels: Today, Yesterday, This Week, Last Week, month/year
 */
export function getDateGroupLabel(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  // Reset time components for date comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Calculate start of this week (Sunday)
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - today.getDay());

  // Calculate start of last week
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  // Today
  if (targetDate.getTime() === today.getTime()) {
    return "Today";
  }

  // Yesterday
  if (targetDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  // This Week (but not today or yesterday)
  if (targetDate >= thisWeekStart && targetDate < today) {
    return "This Week";
  }

  // Last Week
  if (targetDate >= lastWeekStart && targetDate < thisWeekStart) {
    return "Last Week";
  }

  // Otherwise return month/year
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Formats a date string to a display format
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats just the time portion
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface DateGroup<T> {
  label: string;
  items: T[];
}

/**
 * Groups items by date using a date field extractor
 */
export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => string,
): DateGroup<T>[] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const label = getDateGroupLabel(getDate(item));
    const existing = groups.get(label) || [];
    existing.push(item);
    groups.set(label, existing);
  }

  // Convert to array maintaining insertion order (which should be chronological)
  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items,
  }));
}
