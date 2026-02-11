/**
 * Report Types
 *
 * TypeScript types for the report system, matching backend SavedReport and related entities.
 */

// =========================================================================
// Enums (matching backend constants)
// =========================================================================

/**
 * Report visualization types (matching backend visualization field)
 */
export const ReportVisualizationType = {
  TABLE: "table",
  BAR: "bar",
  LINE: "line",
  PIE: "pie",
  KPI: "kpi",
  FUNNEL: "funnel",
  STACKED_BAR: "stacked_bar",
} as const;
export type ReportVisualizationType =
  (typeof ReportVisualizationType)[keyof typeof ReportVisualizationType];

/**
 * Report visibility levels (matching backend visibility field)
 */
export const ReportVisibility = {
  PRIVATE: "PRIVATE",
  TEAM: "TEAM",
  EVERYONE: "EVERYONE",
} as const;
export type ReportVisibility =
  (typeof ReportVisibility)[keyof typeof ReportVisibility];

/**
 * Report entity types (data sources - matching backend ReportEntityType)
 */
export const ReportEntityType = {
  CASES: "cases",
  RIUS: "rius",
  PERSONS: "persons",
  CAMPAIGNS: "campaigns",
  POLICIES: "policies",
  DISCLOSURES: "disclosures",
  INVESTIGATIONS: "investigations",
} as const;
export type ReportEntityType =
  (typeof ReportEntityType)[keyof typeof ReportEntityType];

// =========================================================================
// Field Registry Types
// =========================================================================

/**
 * Report field definition for field picker.
 * Returned by GET /reports/fields/:entityType
 */
export interface ReportField {
  /** Field ID (e.g., 'status', 'category.name') */
  id: string;

  /** Human-readable label */
  label: string;

  /** Data type for formatting and filtering */
  type: "string" | "number" | "date" | "boolean" | "enum";

  /** Group name for field organization */
  group: string;

  /** Whether this field can be used in filters */
  filterable: boolean;

  /** Whether this field can be sorted */
  sortable: boolean;

  /** Whether this field can be used in groupBy */
  groupable: boolean;

  /** Whether this field can be aggregated (sum, avg, etc.) */
  aggregatable: boolean;

  /** Enum values for enum-type fields */
  enumValues?: string[];

  /** Whether this is a custom property field */
  isCustomProperty?: boolean;
}

/**
 * Grouped fields for field picker UI
 */
export interface ReportFieldGroup {
  /** Group name (e.g., 'Case Details', 'Category', 'Custom Properties') */
  groupName: string;

  /** Fields in this group */
  fields: ReportField[];
}

// =========================================================================
// Filter and Aggregation Types
// =========================================================================

/**
 * Report filter definition
 */
export interface ReportFilter {
  /** Field ID to filter on */
  field: string;

  /** Comparison operator */
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "contains"
    | "between";

  /** Value to compare against */
  value: unknown;

  /** End value for 'between' operator */
  valueTo?: unknown;
}

/**
 * Report aggregation configuration
 */
export interface ReportAggregation {
  /** Aggregation function */
  function: "count" | "sum" | "avg" | "min" | "max";

  /** Field to aggregate (optional for count) */
  field?: string;
}

// =========================================================================
// Saved Report Types
// =========================================================================

/**
 * Saved report entity (matching Prisma SavedReport model)
 */
export interface SavedReport {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  entityType: string;
  columns: string[];
  filters: ReportFilter[];
  groupBy?: string[];
  aggregation?: ReportAggregation;
  visualization: string;
  chartConfig?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isTemplate: boolean;
  templateCategory?: string;
  visibility: string;
  lastRunAt?: string;
  lastRunDuration?: number;
  lastRunRowCount?: number;
  isFavorite: boolean;
  scheduledExportId?: string;
  createdById: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// Report Execution Types
// =========================================================================

/**
 * Column metadata in report results
 */
export interface ReportResultColumn {
  key: string;
  label: string;
  type: string;
}

/**
 * Grouped data item for chart visualizations
 */
export interface ReportGroupedItem {
  label: string;
  value: number;
  metadata?: Record<string, unknown>;
}

/**
 * Report execution result
 */
export interface ReportResult {
  /** Column definitions */
  columns: ReportResultColumn[];

  /** Data rows */
  rows: Array<Record<string, unknown>>;

  /** Total count (before pagination) */
  totalCount: number;

  /** Grouped data for chart visualizations */
  groupedData?: ReportGroupedItem[];

  /** Execution summary */
  summary?: {
    totalRows: number;
    executionTimeMs: number;
  };
}

// =========================================================================
// API Input Types
// =========================================================================

/**
 * Input for creating a new report
 */
export interface CreateReportInput {
  name: string;
  description?: string;
  entityType: string;
  columns: string[];
  filters?: ReportFilter[];
  groupBy?: string[];
  aggregation?: ReportAggregation;
  visualization?: string;
  chartConfig?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  visibility?: string;
}

/**
 * Input for running a report with optional overrides
 */
export interface RunReportInput {
  /** Override filters for this execution */
  overrideFilters?: ReportFilter[];

  /** Maximum rows to return */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

/**
 * AI-generated report result
 */
export interface AiGeneratedReport {
  /** Generated report configuration (unsaved) */
  report: Partial<SavedReport>;

  /** Execution results */
  results: ReportResult;

  /** How the AI interpreted the query */
  interpretation: string;
}

// =========================================================================
// List Response Types
// =========================================================================

/**
 * Paginated list response for reports
 */
export interface ReportListResponse {
  data: SavedReport[];
  total: number;
  page?: number;
  pageSize?: number;
}

/**
 * Query parameters for listing reports
 */
export interface ReportListParams {
  visibility?: string;
  isTemplate?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}
