/**
 * Saved Views Type Definitions
 *
 * Core types for the HubSpot-style saved views system.
 * Used across hooks, components, and API interactions.
 */

// Property types for filtering/sorting
export type PropertyType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "enum"
  | "user"
  | "status"
  | "severity";

// Entity types that support saved views
export type ViewEntityType =
  | "CASES"
  | "RIUS"
  | "INVESTIGATIONS"
  | "PERSONS"
  | "CAMPAIGNS"
  | "REMEDIATION_PLANS"
  | "DISCLOSURES"
  | "INTAKE_FORMS"
  | "POLICIES";

// View visibility options
export type ViewVisibility = "private" | "team" | "everyone";

// View mode (table vs board)
export type ViewMode = "table" | "board";

// Sort direction
export type SortOrder = "asc" | "desc";

// Filter operators by data type
export type TextFilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "does_not_contain"
  | "starts_with"
  | "ends_with"
  | "is_known"
  | "is_unknown";

export type NumberFilterOperator =
  | "is_equal_to"
  | "is_not_equal_to"
  | "is_greater_than"
  | "is_greater_than_or_equal_to"
  | "is_less_than"
  | "is_less_than_or_equal_to"
  | "is_between"
  | "is_known"
  | "is_unknown";

export type DateFilterOperator =
  | "is"
  | "is_before"
  | "is_after"
  | "is_between"
  | "is_less_than_n_ago"
  | "is_more_than_n_ago"
  | "is_known"
  | "is_unknown";

export type BooleanFilterOperator =
  | "is_true"
  | "is_false"
  | "is_known"
  | "is_unknown";

export type EnumFilterOperator =
  | "is_any_of"
  | "is_none_of"
  | "is_known"
  | "is_unknown";

export type FilterOperator =
  | TextFilterOperator
  | NumberFilterOperator
  | DateFilterOperator
  | BooleanFilterOperator
  | EnumFilterOperator;

// Time unit for relative date filters
export type DateUnit = "day" | "week" | "month" | "quarter" | "year";

// Individual filter condition
export interface FilterCondition {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value?: unknown;
  secondaryValue?: unknown; // For 'is_between' operator
  unit?: DateUnit; // For relative date operators
}

// Filter group (conditions within a group are AND-joined)
export interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
}

// Column configuration for saved views
export interface ColumnConfig {
  key: string;
  visible: boolean;
  order: number;
  width?: number;
}

// Quick filter value types
export type QuickFilterValue =
  | string
  | string[]
  | { from?: string; to?: string }
  | undefined;

// Quick filter state
export interface QuickFilterConfig {
  propertyId: string;
  value: unknown;
}

// Saved view entity
export interface SavedView {
  id: string;
  organizationId: string;
  createdById: string;
  name: string;
  description?: string;
  entityType: ViewEntityType;
  filters: FilterGroup[];
  sortBy?: string;
  sortOrder?: SortOrder;
  columns?: ColumnConfig[];
  frozenColumnCount: number;
  viewMode: ViewMode;
  boardGroupBy?: string;
  isDefault: boolean;
  isPinned: boolean;
  isShared: boolean;
  visibility: ViewVisibility;
  sharedWithTeamId?: string;
  displayOrder: number;
  recordCount?: number;
  recordCountAt?: string;
  lastUsedAt?: string;
  useCount: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

// Bulk action result
export interface BulkActionResult {
  success: boolean;
  affected: number;
  errors?: string[];
}

// Response from listing saved views
export interface SavedViewsResponse {
  data: SavedView[];
  grouped: Record<string, SavedView[]>;
  total: number;
}

// Response from applying a saved view
export interface ApplySavedViewResponse {
  filters: FilterGroup[];
  sortBy?: string;
  sortOrder?: SortOrder;
  columns?: ColumnConfig[];
  frozenColumnCount: number;
  viewMode: ViewMode;
  boardGroupBy?: string;
  invalidFilters: string[];
}

// Input for creating a saved view
export interface CreateSavedViewInput {
  name: string;
  description?: string;
  entityType: ViewEntityType;
  filters: FilterGroup[];
  sortBy?: string;
  sortOrder?: SortOrder;
  columns?: ColumnConfig[];
  frozenColumnCount?: number;
  viewMode?: ViewMode;
  boardGroupBy?: string;
  isShared?: boolean;
  sharedWithTeamId?: string;
  isDefault?: boolean;
  isPinned?: boolean;
  color?: string;
}

// Input for updating a saved view
export interface UpdateSavedViewInput extends Partial<CreateSavedViewInput> {
  displayOrder?: number;
}

// Property group for organizing columns in the column picker
export interface PropertyGroup {
  id: string;
  label: string;
}
