import { ReportDataSource } from "@prisma/client";

/**
 * Column definition for report templates.
 * Defines how data is selected, labeled, formatted, and optionally aggregated.
 */
export interface ColumnDefinition {
  /** Field name in the data source (e.g., 'status', 'createdAt') */
  field: string;

  /** Human-readable label for display */
  label: string;

  /** Data type for formatting */
  type: "string" | "number" | "date" | "boolean" | "currency";

  /** Format string (date format, number decimals, etc.) */
  format?: string;

  /** Column width in characters */
  width?: number;

  /** Aggregation to apply (for summary rows) */
  aggregation?: "sum" | "count" | "avg" | "min" | "max";
}

/**
 * Filter definition for report queries.
 * Supports various comparison operators.
 */
export interface FilterDefinition {
  /** Field name to filter on */
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
}

/**
 * Aggregation definition for grouped reports.
 */
export interface AggregationDefinition {
  /** Type of aggregation */
  type: "sum" | "count" | "avg" | "min" | "max" | "group";

  /** Field to aggregate */
  field: string;

  /** Optional alias for the result */
  alias?: string;

  /** Fields to group by (for 'group' type) */
  groupBy?: string[];
}

/**
 * Result from executing a report query.
 */
export interface ReportQueryResult {
  /** Data rows */
  data: Record<string, unknown>[];

  /** Total count of matching records (before pagination) */
  total: number;

  /** Optional aggregation results */
  aggregations?: Record<string, unknown>;
}

/**
 * Parameters for executing a report.
 */
export interface ReportExecutionParams {
  /** Organization (tenant) ID */
  organizationId: string;

  /** Report template ID */
  templateId: string;

  /** Optional filters to apply (overrides template defaults) */
  filters?: FilterDefinition[];

  /** Maximum rows to return */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Output format */
  format?: "json" | "excel" | "csv";
}

/**
 * Supported data sources for reports.
 * Maps to Prisma models.
 */
export { ReportDataSource };
