import {
  IsUUID,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ChartType, DateRangePreset } from "@prisma/client";
import { DateRangeDto } from "./dashboard.dto";

// ===========================================
// Request DTOs
// ===========================================

/**
 * DTO for requesting data for a single widget.
 */
export class WidgetDataRequestDto {
  @IsUUID()
  widgetId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

/**
 * DTO for batch requesting data for multiple widgets.
 * Used when loading a dashboard to fetch all widget data in parallel.
 */
export class BatchWidgetDataRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetDataRequestDto)
  widgets: WidgetDataRequestDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  globalDateRange?: DateRangeDto;
}

// ===========================================
// Response Types
// ===========================================

/**
 * Response wrapper for widget data.
 */
export interface WidgetDataResponse {
  /** Widget ID this data belongs to */
  widgetId: string;
  /** The actual widget data */
  data: WidgetData;
  /** When the data was last updated */
  updatedAt: Date;
  /** When the cache will expire and fresh data will be fetched */
  nextRefreshAt?: Date;
  /** Whether this data was served from cache */
  fromCache: boolean;
}

/**
 * Union type for all widget data types.
 */
export type WidgetData =
  | KpiData
  | ChartData
  | TableData
  | ListData
  | QuickActionsData;

// ===========================================
// KPI Card Data
// ===========================================

/**
 * Data structure for KPI card widgets.
 * Shows a single metric with optional trend and comparison.
 */
export interface KpiData {
  type: "kpi";
  /** The primary value to display */
  value: number | string;
  /** Label describing the value */
  label: string;
  /** Trend indicator compared to previous period */
  trend?: KpiTrend;
  /** Comparison value from previous period */
  comparison?: KpiComparison;
  /** Color coding for the value (success, warning, danger, neutral) */
  status?: "success" | "warning" | "danger" | "neutral";
}

/**
 * Trend information for KPI data.
 */
export interface KpiTrend {
  /** Percentage or absolute change */
  value: number;
  /** Direction of the change */
  direction: "up" | "down" | "flat";
  /** Whether up is good (for color coding) */
  isPositive: boolean;
}

/**
 * Comparison information for KPI data.
 */
export interface KpiComparison {
  /** Value from the comparison period */
  value: number | string;
  /** Label for the comparison period */
  period: string;
}

// ===========================================
// Chart Data (Recharts-compatible format)
// ===========================================

/**
 * Data structure for chart widgets.
 * Uses Recharts-compatible format for frontend rendering.
 */
export interface ChartData {
  type: "chart";
  /** Chart visualization type */
  chartType: ChartType;
  /** Data series for the chart */
  series: ChartSeries[];
  /** Category labels (for bar charts, etc.) */
  categories?: string[];
  /** Additional chart configuration */
  config?: ChartConfig;
}

/**
 * A single data series in a chart.
 */
export interface ChartSeries {
  /** Series name (for legend) */
  name: string;
  /** Data values (null for missing data points) */
  data: Array<number | null>;
  /** Optional color override */
  color?: string;
  /** Series type for mixed charts */
  type?: "line" | "bar" | "area";
}

/**
 * Optional chart configuration.
 */
export interface ChartConfig {
  /** Show legend */
  showLegend?: boolean;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show data labels */
  showLabels?: boolean;
  /** Chart colors */
  colors?: string[];
  /** Y-axis configuration */
  yAxis?: {
    min?: number;
    max?: number;
    format?: "number" | "percentage" | "currency";
  };
  /** X-axis configuration */
  xAxis?: {
    format?: "date" | "datetime" | "category";
    tickInterval?: number;
  };
}

// ===========================================
// Table Data
// ===========================================

/**
 * Data structure for table widgets.
 */
export interface TableData {
  type: "table";
  /** Column definitions */
  columns: TableColumn[];
  /** Data rows */
  rows: TableRow[];
  /** Total count (for pagination) */
  total: number;
  /** Whether more data is available */
  hasMore: boolean;
}

/**
 * Column definition for table data.
 */
export interface TableColumn {
  /** Column identifier */
  key: string;
  /** Display label */
  label: string;
  /** Data type for formatting */
  type: "string" | "number" | "date" | "datetime" | "status" | "link" | "badge";
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Width hint (px or %) */
  width?: string | number;
  /** Alignment */
  align?: "left" | "center" | "right";
}

/**
 * A single row in table data.
 */
export interface TableRow {
  /** Unique row identifier */
  id: string;
  /** Cell values keyed by column key */
  [key: string]: unknown;
}

// ===========================================
// List Data
// ===========================================

/**
 * Data structure for list widgets.
 */
export interface ListData {
  type: "list";
  /** List items */
  items: ListItem[];
  /** Total count (for pagination) */
  total: number;
}

/**
 * A single item in a list widget.
 */
export interface ListItem {
  /** Unique item identifier */
  id: string;
  /** Primary text/title */
  title: string;
  /** Secondary text/subtitle */
  subtitle?: string;
  /** Status indicator */
  status?: string;
  /** Status color (for badge display) */
  statusColor?: "success" | "warning" | "danger" | "info" | "neutral";
  /** Link URL for navigation */
  url?: string;
  /** Timestamp (for recent activity lists) */
  timestamp?: Date;
  /** Icon identifier */
  icon?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ===========================================
// Quick Actions Data
// ===========================================

/**
 * Data structure for quick actions widgets.
 */
export interface QuickActionsData {
  type: "quick_actions";
  /** Available quick actions */
  actions: QuickAction[];
}

/**
 * A single quick action button.
 */
export interface QuickAction {
  /** Action identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon identifier */
  icon: string;
  /** Action URL or handler identifier */
  action: string;
  /** Whether the action is enabled */
  enabled: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Badge count (for notifications) */
  badge?: number;
}

// ===========================================
// Batch Response
// ===========================================

/**
 * Response for batch widget data requests.
 */
export interface BatchWidgetDataResponse {
  /** Individual widget responses */
  widgets: WidgetDataResponse[];
  /** Overall request timestamp */
  requestedAt: Date;
  /** Total time to fetch all widgets (ms) */
  totalDuration: number;
}

// ===========================================
// Error Response
// ===========================================

/**
 * Error response for failed widget data fetches.
 */
export interface WidgetDataError {
  widgetId: string;
  error: string;
  code:
    | "NOT_FOUND"
    | "PERMISSION_DENIED"
    | "INVALID_CONFIG"
    | "DATA_SOURCE_ERROR";
}

// ===========================================
// Date Range Helpers
// ===========================================

/**
 * Resolved date range with actual start and end dates.
 */
export interface ResolvedDateRange {
  startDate: Date;
  endDate: Date;
  preset?: DateRangePreset;
}

/**
 * Helper to resolve a DateRangeDto to actual dates.
 */
export function resolveDateRange(dto: DateRangeDto): ResolvedDateRange {
  if (dto.start && dto.end) {
    return {
      startDate: new Date(dto.start),
      endDate: new Date(dto.end),
      preset: dto.preset,
    };
  }

  const now = new Date();
  const endDate = new Date(now);
  let startDate: Date;

  switch (dto.preset) {
    case DateRangePreset.TODAY:
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case DateRangePreset.LAST_7_DAYS:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case DateRangePreset.LAST_30_DAYS:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      break;
    case DateRangePreset.LAST_90_DAYS:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      break;
    case DateRangePreset.LAST_12_MONTHS:
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 12);
      break;
    case DateRangePreset.YEAR_TO_DATE:
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case DateRangePreset.CUSTOM:
    default:
      // Default to last 30 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
  }

  return { startDate, endDate, preset: dto.preset };
}
