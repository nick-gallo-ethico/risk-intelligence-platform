/**
 * Report visualization types supported by the report designer.
 * Each type maps to a different chart or display component.
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
 * Report visibility controls who can see a saved report.
 * PRIVATE: Only the creator
 * TEAM: Creator's team members
 * EVERYONE: All users in the organization
 */
export const ReportVisibility = {
  PRIVATE: "PRIVATE",
  TEAM: "TEAM",
  EVERYONE: "EVERYONE",
} as const;

export type ReportVisibility =
  (typeof ReportVisibility)[keyof typeof ReportVisibility];

/**
 * Entity types that can be the data source for a report.
 * Each maps to a Prisma model with its own field registry.
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

/**
 * Template categories for pre-built compliance reports.
 */
export const ReportTemplateCategory = {
  COMPLIANCE: "compliance",
  OPERATIONS: "operations",
  EXECUTIVE: "executive",
  INVESTIGATIONS: "investigations",
  HR: "hr",
} as const;

export type ReportTemplateCategory =
  (typeof ReportTemplateCategory)[keyof typeof ReportTemplateCategory];

/**
 * Sort order direction for report results.
 */
export const ReportSortOrder = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type ReportSortOrder =
  (typeof ReportSortOrder)[keyof typeof ReportSortOrder];

/**
 * Aggregation functions available for report data.
 */
export const ReportAggregationFunction = {
  COUNT: "count",
  SUM: "sum",
  AVG: "avg",
  MIN: "min",
  MAX: "max",
} as const;

export type ReportAggregationFunction =
  (typeof ReportAggregationFunction)[keyof typeof ReportAggregationFunction];

/**
 * Field data types for report columns.
 */
export const ReportFieldType = {
  STRING: "string",
  NUMBER: "number",
  DATE: "date",
  DATETIME: "datetime",
  BOOLEAN: "boolean",
  ENUM: "enum",
  UUID: "uuid",
} as const;

export type ReportFieldType =
  (typeof ReportFieldType)[keyof typeof ReportFieldType];

/**
 * Aggregation configuration for a report column.
 */
export interface ReportAggregationConfig {
  field: string;
  function: ReportAggregationFunction;
  alias?: string;
}

/**
 * Chart configuration for non-table visualizations.
 */
export interface ReportChartConfig {
  /** X-axis field (for bar/line charts) */
  xAxisField?: string;
  /** Y-axis field (for bar/line charts) */
  yAxisField?: string;
  /** Series field for grouping (creates multiple lines/bars) */
  seriesField?: string;
  /** Custom colors by series name or value */
  colors?: Record<string, string>;
  /** Show data labels on chart elements */
  showDataLabels?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Stack bars (for stacked_bar visualization) */
  stacked?: boolean;
  /** KPI comparison period (for kpi visualization) */
  comparisonPeriod?: "previous_period" | "same_period_last_year";
  /** Funnel conversion metric (for funnel visualization) */
  funnelMetric?: string;
}

/**
 * Filter condition for report queries.
 * Matches the AdvancedFiltersPanel format from Phase 13.
 */
export interface ReportFilterCondition {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "in"
    | "notIn"
    | "isNull"
    | "isNotNull"
    | "between";
  value: unknown;
  valueTo?: unknown;
}

/**
 * Filter group with AND/OR logic.
 */
export interface ReportFilterGroup {
  logic: "AND" | "OR";
  conditions: (ReportFilterCondition | ReportFilterGroup)[];
}

/**
 * Type guard for filter conditions vs groups.
 */
export function isFilterCondition(
  filter: ReportFilterCondition | ReportFilterGroup,
): filter is ReportFilterCondition {
  return "field" in filter && "operator" in filter;
}

/**
 * SavedReport entity represents a user's saved report configuration.
 * This type maps to the Prisma SavedReport model.
 */
export interface SavedReportEntity {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  entityType: ReportEntityType;
  columns: string[];
  filters: ReportFilterGroup[];
  groupBy: string[] | null;
  aggregation: ReportAggregationConfig[] | null;
  visualization: ReportVisualizationType;
  chartConfig: ReportChartConfig | null;
  sortBy: string | null;
  sortOrder: ReportSortOrder | null;
  isTemplate: boolean;
  templateCategory: ReportTemplateCategory | null;
  visibility: ReportVisibility;
  lastRunAt: Date | null;
  lastRunDuration: number | null;
  lastRunRowCount: number | null;
  isFavorite: boolean;
  scheduledExportId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
