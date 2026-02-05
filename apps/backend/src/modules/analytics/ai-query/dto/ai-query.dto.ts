import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  ValidateNested,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Visualization types supported by the AI query system.
 * AI selects the appropriate visualization based on result type.
 */
export enum VisualizationType {
  /** Single value with comparison (e.g., total cases this month) */
  KPI = "KPI",
  /** Tabular data with columns and rows */
  TABLE = "TABLE",
  /** Time series data (e.g., cases over time) */
  LINE_CHART = "LINE_CHART",
  /** Comparison data (e.g., cases by category) */
  BAR_CHART = "BAR_CHART",
  /** Proportion data (e.g., case status distribution) */
  PIE_CHART = "PIE_CHART",
  /** Plain text response for non-data questions */
  TEXT = "TEXT",
}

/**
 * Query intent types that AI can identify from natural language.
 */
export enum QueryIntent {
  /** Count records matching criteria */
  COUNT = "COUNT",
  /** List records with details */
  LIST = "LIST",
  /** Aggregate values (sum, avg, min, max) */
  AGGREGATE = "AGGREGATE",
  /** Time-based trend analysis */
  TREND = "TREND",
  /** Group by and count distribution */
  DISTRIBUTION = "DISTRIBUTION",
  /** Compare two or more groups */
  COMPARISON = "COMPARISON",
}

/**
 * Entity types that can be queried.
 */
export enum QueryEntityType {
  CASE = "case",
  RIU = "riu",
  CAMPAIGN = "campaign",
  PERSON = "person",
  DISCLOSURE = "disclosure",
  INVESTIGATION = "investigation",
}

/**
 * Comparison operators for query filters.
 */
export enum FilterOperator {
  EQUALS = "eq",
  NOT_EQUALS = "neq",
  GREATER_THAN = "gt",
  GREATER_THAN_OR_EQUAL = "gte",
  LESS_THAN = "lt",
  LESS_THAN_OR_EQUAL = "lte",
  CONTAINS = "contains",
  STARTS_WITH = "startsWith",
  ENDS_WITH = "endsWith",
  IN = "in",
  NOT_IN = "notIn",
  IS_NULL = "isNull",
  IS_NOT_NULL = "isNotNull",
  BETWEEN = "between",
}

/**
 * Date range presets for time-based queries.
 */
export enum DateRangePreset {
  TODAY = "today",
  YESTERDAY = "yesterday",
  LAST_7_DAYS = "last_7_days",
  LAST_30_DAYS = "last_30_days",
  LAST_90_DAYS = "last_90_days",
  THIS_MONTH = "this_month",
  LAST_MONTH = "last_month",
  THIS_QUARTER = "this_quarter",
  LAST_QUARTER = "last_quarter",
  THIS_YEAR = "this_year",
  LAST_YEAR = "last_year",
  CUSTOM = "custom",
}

/**
 * Aggregation functions for aggregate queries.
 */
export enum AggregationFunction {
  COUNT = "count",
  SUM = "sum",
  AVG = "avg",
  MIN = "min",
  MAX = "max",
}

/**
 * Context object for the AI query - helps narrow scope.
 */
export class QueryContextDto {
  @IsString()
  @IsOptional()
  dashboardId?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}

/**
 * Date range specification for queries.
 */
export class DateRangeDto {
  @IsEnum(DateRangePreset)
  @IsOptional()
  preset?: DateRangePreset;

  @IsString()
  @IsOptional()
  start?: string;

  @IsString()
  @IsOptional()
  end?: string;
}

/**
 * Request DTO for AI natural language queries.
 */
export class AiQueryRequestDto {
  @IsString()
  @MaxLength(1000)
  query: string;

  @IsObject()
  @ValidateNested()
  @Type(() => QueryContextDto)
  @IsOptional()
  context?: QueryContextDto;

  @IsObject()
  @ValidateNested()
  @Type(() => DateRangeDto)
  @IsOptional()
  dateRange?: DateRangeDto;

  @IsBoolean()
  @IsOptional()
  includeSuggestions?: boolean;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number;
}

// ============================================
// AI Structured Output Types (from Claude)
// ============================================

/**
 * Single filter condition parsed from natural language.
 */
export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
  /** For BETWEEN operator */
  valueTo?: unknown;
}

/**
 * Sort specification.
 */
export interface QuerySort {
  field: string;
  direction: "asc" | "desc";
}

/**
 * Group by specification for distribution/aggregation queries.
 */
export interface QueryGroupBy {
  field: string;
  /** For date fields - how to bucket */
  dateTrunc?: "day" | "week" | "month" | "quarter" | "year";
}

/**
 * Aggregation specification.
 */
export interface QueryAggregation {
  function: AggregationFunction;
  field?: string; // Optional for COUNT
  alias?: string;
}

/**
 * Parsed query structure from AI - the structured output from Claude.
 * This is what AI returns after understanding the natural language query.
 */
export interface ParsedQuery {
  /** What the user is trying to accomplish */
  intent: QueryIntent;

  /** Which entity type to query */
  entityType: QueryEntityType;

  /** Filters to apply */
  filters: QueryFilter[];

  /** Sorting specification */
  orderBy?: QuerySort[];

  /** Grouping for distributions/aggregates */
  groupBy?: QueryGroupBy[];

  /** Aggregation functions to apply */
  aggregations?: QueryAggregation[];

  /** Date range for the query */
  dateRange?: {
    field: string;
    start: string;
    end: string;
  };

  /** Maximum records to return */
  limit?: number;

  /** Fields to include in results (for LIST queries) */
  selectFields?: string[];

  /** AI's confidence in parsing (0-1) */
  confidence: number;

  /** AI's interpretation of the query in plain English */
  interpretation: string;
}

// ============================================
// Result Data Types
// ============================================

/**
 * KPI result data - single value with optional comparison.
 */
export interface KpiResultData {
  type: "kpi";
  value: number;
  label: string;
  previousValue?: number;
  changePercent?: number;
  changeDirection?: "up" | "down" | "unchanged";
  unit?: string;
  format?: "number" | "currency" | "percent";
}

/**
 * Table result data - rows and columns.
 */
export interface TableResultData {
  type: "table";
  columns: Array<{
    key: string;
    label: string;
    dataType: "string" | "number" | "date" | "boolean";
    sortable?: boolean;
  }>;
  rows: Array<Record<string, unknown>>;
  totalCount: number;
  page?: number;
  pageSize?: number;
}

/**
 * Chart data point.
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chart result data - for line, bar, and pie charts.
 */
export interface ChartResultData {
  type: "chart";
  chartType: "line" | "bar" | "pie";
  title?: string;
  series: Array<{
    name: string;
    data: ChartDataPoint[];
  }>;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
}

/**
 * Text result data - for non-data responses.
 */
export interface TextResultData {
  type: "text";
  content: string;
  /** Additional context or clarification */
  notes?: string;
}

/**
 * Union type for all result data types.
 */
export type QueryResultData =
  | KpiResultData
  | TableResultData
  | ChartResultData
  | TextResultData;

/**
 * Suggested follow-up queries.
 */
export interface QuerySuggestion {
  text: string;
  description?: string;
}

/**
 * Response DTO for AI query results.
 */
export class AiQueryResponseDto {
  /** Unique request ID for tracking */
  requestId: string;

  /** Natural language interpretation of what was queried */
  interpretedQuery: string;

  /** Summary of results in natural language */
  summary: string;

  /** Selected visualization type */
  visualizationType: VisualizationType;

  /** The actual result data */
  data: QueryResultData;

  /** Suggested follow-up queries */
  suggestions?: QuerySuggestion[];

  /** The parsed query structure (for debugging/transparency) */
  parsedQuery?: ParsedQuery;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Whether results were cached */
  cached?: boolean;
}

/**
 * Error response for failed queries.
 */
export class AiQueryErrorDto {
  requestId: string;
  error: string;
  errorCode: string;
  suggestions?: QuerySuggestion[];
}

/**
 * Query history entry for logging.
 */
export interface QueryHistoryEntry {
  id: string;
  organizationId: string;
  userId: string;
  query: string;
  parsedQuery: ParsedQuery;
  visualizationType: VisualizationType;
  resultSummary: string;
  processingTimeMs: number;
  inputTokens: number;
  outputTokens: number;
  createdAt: Date;
}
