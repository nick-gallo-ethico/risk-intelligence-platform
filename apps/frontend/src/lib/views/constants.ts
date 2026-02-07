/**
 * Saved Views Constants
 *
 * Default values and configuration constants for the saved views system.
 */
import type { ViewMode, SortOrder } from "./types";

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

// View mode defaults
export const DEFAULT_VIEW_MODE: ViewMode = "table";

// Column defaults
export const DEFAULT_FROZEN_COLUMNS = 1;
export const MAX_FROZEN_COLUMNS = 3;
export const MIN_COLUMN_WIDTH = 50;
export const DEFAULT_COLUMN_WIDTH = 150;

// Sort defaults
export const DEFAULT_SORT_ORDER: SortOrder = "asc";

// Filter limits
export const MAX_FILTER_GROUPS = 2;
export const MAX_CONDITIONS_PER_GROUP = 20;
export const MAX_SAVED_VIEWS = 50;
export const MAX_SAVED_VIEWS_PER_MODULE = 50;

// Debounce timing
export const FILTER_DEBOUNCE_MS = 300;
export const SEARCH_DEBOUNCE_MS = 300;

// Query keys for TanStack Query
export const QUERY_KEYS = {
  savedViews: "savedViews",
  savedView: "savedView",
} as const;

// Record count staleness
export const RECORD_COUNT_STALE_MINUTES = 5;

// Date range presets for quick filters
export const DATE_RANGE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom range" },
] as const;

// Time unit options for relative date filters
export const TIME_UNIT_OPTIONS = [
  { value: "day", label: "days" },
  { value: "week", label: "weeks" },
  { value: "month", label: "months" },
] as const;

// Visibility options
export const VISIBILITY_OPTIONS = [
  {
    value: "private",
    label: "Private",
    description: "Only you can see this view",
  },
  {
    value: "team",
    label: "My team",
    description: "Anyone on your team can see this view",
  },
  {
    value: "everyone",
    label: "Everyone",
    description: "Anyone in your organization can see this view",
  },
] as const;
