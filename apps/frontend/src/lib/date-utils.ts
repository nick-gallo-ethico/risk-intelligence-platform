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
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'Yesterday';
  }

  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
}

/**
 * Returns a date group label for timeline grouping
 */
export function getDateGroupLabel(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  // Reset time components for date comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffInDays = Math.floor((todayOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return 'Today';
  }

  if (diffInDays === 1) {
    return 'Yesterday';
  }

  if (diffInDays < 7) {
    return 'Earlier this week';
  }

  if (diffInDays < 14) {
    return 'Last week';
  }

  if (diffInDays < 30) {
    return 'Earlier this month';
  }

  if (diffInDays < 60) {
    return 'Last month';
  }

  // Return month and year for older entries
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Formats a date string to a display format
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats just the time portion
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
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
  getDate: (item: T) => string
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
