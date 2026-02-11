import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  ValidateNested,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsUUID,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  ReportVisualizationType,
  ReportVisibility,
  ReportEntityType,
  ReportTemplateCategory,
  ReportSortOrder,
  ReportFieldType,
  ReportAggregationFunction,
} from "../entities/saved-report.entity";

// ===========================================
// Field Metadata DTOs
// ===========================================

/**
 * Represents metadata for a single report field.
 * Used by the field picker in the report designer.
 */
export class ReportFieldDto {
  @ApiProperty({
    description: "Unique field identifier (e.g., status, primaryCategoryId)",
    example: "status",
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: "Human-readable label for display",
    example: "Status",
  })
  @IsString()
  label: string;

  @ApiProperty({
    description: "Data type of the field",
    enum: ["string", "number", "date", "datetime", "boolean", "enum", "uuid"],
    example: "enum",
  })
  @IsString()
  type: ReportFieldType;

  @ApiProperty({
    description: "Logical grouping for UI organization",
    example: "Case Details",
  })
  @IsString()
  group: string;

  @ApiProperty({
    description: "Prisma field path for queries",
    example: "status",
  })
  @IsString()
  prismaField: string;

  @ApiProperty({
    description: "Whether field can be used in filters",
    example: true,
  })
  @IsBoolean()
  filterable: boolean;

  @ApiProperty({
    description: "Whether field can be used in sort",
    example: true,
  })
  @IsBoolean()
  sortable: boolean;

  @ApiProperty({
    description: "Whether field can be used in group by",
    example: true,
  })
  @IsBoolean()
  groupable: boolean;

  @ApiProperty({
    description: "Whether field can have aggregation functions",
    example: false,
  })
  @IsBoolean()
  aggregatable: boolean;

  @ApiPropertyOptional({
    description: "Allowed values for enum fields",
    example: ["NEW", "IN_PROGRESS", "PENDING", "CLOSED"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enumValues?: string[];

  @ApiPropertyOptional({
    description: "Whether this is a computed/derived field",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isComputed?: boolean;

  @ApiPropertyOptional({
    description: "Whether this is a tenant custom property",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isCustomProperty?: boolean;

  @ApiPropertyOptional({
    description: "Join path for related entity fields",
    example: "primaryCategory.name",
  })
  @IsOptional()
  @IsString()
  joinPath?: string;
}

/**
 * Group of related fields for UI organization.
 */
export class ReportFieldGroupDto {
  @ApiProperty({
    description: "Group name",
    example: "Case Details",
  })
  @IsString()
  groupName: string;

  @ApiProperty({
    description: "Fields in this group",
    type: [ReportFieldDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ReportFieldDto)
  fields: ReportFieldDto[];
}

// ===========================================
// Filter DTOs
// ===========================================

/**
 * Single filter condition for report queries.
 */
export class ReportFilterConditionDto {
  @ApiProperty({
    description: "Field to filter on",
    example: "status",
  })
  @IsString()
  field: string;

  @ApiProperty({
    description: "Comparison operator",
    enum: [
      "eq",
      "neq",
      "gt",
      "gte",
      "lt",
      "lte",
      "contains",
      "startsWith",
      "endsWith",
      "in",
      "notIn",
      "isNull",
      "isNotNull",
      "between",
    ],
    example: "eq",
  })
  @IsString()
  operator: string;

  @ApiProperty({
    description: "Value to compare against",
    example: "OPEN",
  })
  value: unknown;

  @ApiPropertyOptional({
    description: "Upper bound for between operator",
    example: "2025-12-31",
  })
  @IsOptional()
  valueTo?: unknown;
}

// ===========================================
// Aggregation DTOs
// ===========================================

/**
 * Aggregation configuration for a report column.
 */
export class ReportAggregationConfigDto {
  @ApiProperty({
    description: "Field to aggregate",
    example: "id",
  })
  @IsString()
  field: string;

  @ApiProperty({
    description: "Aggregation function",
    enum: ["count", "sum", "avg", "min", "max"],
    example: "count",
  })
  @IsString()
  function: ReportAggregationFunction;

  @ApiPropertyOptional({
    description: "Alias for result column",
    example: "total_cases",
  })
  @IsOptional()
  @IsString()
  alias?: string;
}

// ===========================================
// Chart Config DTO
// ===========================================

/**
 * Configuration for chart visualizations.
 */
export class ReportChartConfigDto {
  @ApiPropertyOptional({
    description: "X-axis field for bar/line charts",
    example: "createdAt",
  })
  @IsOptional()
  @IsString()
  xAxisField?: string;

  @ApiPropertyOptional({
    description: "Y-axis field for bar/line charts",
    example: "count",
  })
  @IsOptional()
  @IsString()
  yAxisField?: string;

  @ApiPropertyOptional({
    description: "Series field for multiple lines/bars",
    example: "status",
  })
  @IsOptional()
  @IsString()
  seriesField?: string;

  @ApiPropertyOptional({
    description: "Custom colors by value",
    example: { NEW: "#4CAF50", CLOSED: "#9E9E9E" },
  })
  @IsOptional()
  @IsObject()
  colors?: Record<string, string>;

  @ApiPropertyOptional({
    description: "Show data labels on chart",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showDataLabels?: boolean;

  @ApiPropertyOptional({
    description: "Show legend",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showLegend?: boolean;

  @ApiPropertyOptional({
    description: "Stack bars for stacked_bar visualization",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  stacked?: boolean;

  @ApiPropertyOptional({
    description: "Comparison period for KPI visualization",
    enum: ["previous_period", "same_period_last_year"],
    example: "previous_period",
  })
  @IsOptional()
  @IsString()
  comparisonPeriod?: "previous_period" | "same_period_last_year";

  @ApiPropertyOptional({
    description: "Funnel conversion metric",
    example: "status",
  })
  @IsOptional()
  @IsString()
  funnelMetric?: string;
}

// ===========================================
// Report CRUD DTOs
// ===========================================

/**
 * DTO for creating a new saved report.
 */
export class CreateReportDto {
  @ApiProperty({
    description: "Report name",
    example: "Monthly Case Summary",
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: "Report description",
    example: "Summary of all cases created this month",
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: "Entity type to report on",
    enum: [
      "cases",
      "rius",
      "persons",
      "campaigns",
      "policies",
      "disclosures",
      "investigations",
    ],
    example: "cases",
  })
  @IsString()
  entityType: ReportEntityType;

  @ApiProperty({
    description: "Column field IDs to include",
    example: ["referenceNumber", "status", "createdAt", "primaryCategory.name"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  columns: string[];

  @ApiPropertyOptional({
    description: "Filter conditions (AND/OR groups)",
    type: "array",
    example: [
      {
        logic: "AND",
        conditions: [{ field: "status", operator: "eq", value: "OPEN" }],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  filters?: unknown[];

  @ApiPropertyOptional({
    description: "Fields to group by for aggregation",
    example: ["status"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupBy?: string[];

  @ApiPropertyOptional({
    description: "Aggregation configurations",
    type: [ReportAggregationConfigDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportAggregationConfigDto)
  aggregation?: ReportAggregationConfigDto[];

  @ApiPropertyOptional({
    description: "Visualization type",
    enum: ["table", "bar", "line", "pie", "kpi", "funnel", "stacked_bar"],
    default: "table",
    example: "table",
  })
  @IsOptional()
  @IsString()
  visualization?: ReportVisualizationType;

  @ApiPropertyOptional({
    description: "Chart configuration for non-table visualizations",
    type: ReportChartConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportChartConfigDto)
  chartConfig?: ReportChartConfigDto;

  @ApiPropertyOptional({
    description: "Field to sort by",
    example: "createdAt",
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["asc", "desc"],
    example: "desc",
  })
  @IsOptional()
  @IsString()
  sortOrder?: ReportSortOrder;

  @ApiPropertyOptional({
    description: "Make this a shared template",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({
    description: "Category for templates",
    enum: ["compliance", "operations", "executive", "investigations", "hr"],
    example: "compliance",
  })
  @IsOptional()
  @IsString()
  templateCategory?: ReportTemplateCategory;

  @ApiPropertyOptional({
    description: "Report visibility",
    enum: ["PRIVATE", "TEAM", "EVERYONE"],
    default: "PRIVATE",
    example: "PRIVATE",
  })
  @IsOptional()
  @IsString()
  visibility?: ReportVisibility;
}

/**
 * DTO for updating an existing report.
 * All fields are optional for partial updates.
 */
export class UpdateReportDto extends PartialType(CreateReportDto) {
  @ApiPropertyOptional({
    description: "Mark report as favorite",
  })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}

/**
 * DTO for running a report with optional overrides.
 */
export class RunReportDto {
  @ApiPropertyOptional({
    description: "Override filters for this run only",
  })
  @IsOptional()
  @IsArray()
  overrideFilters?: unknown[];

  @ApiPropertyOptional({
    description: "Date range start override",
    example: "2025-01-01",
  })
  @IsOptional()
  @IsString()
  dateRangeStart?: string;

  @ApiPropertyOptional({
    description: "Date range end override",
    example: "2025-12-31",
  })
  @IsOptional()
  @IsString()
  dateRangeEnd?: string;

  @ApiPropertyOptional({
    description: "Max rows to return",
    minimum: 1,
    maximum: 10000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  limit?: number;

  @ApiPropertyOptional({
    description: "Rows to skip for pagination",
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

// ===========================================
// Response DTOs
// ===========================================

/**
 * Response DTO for a saved report.
 */
export class SavedReportResponseDto {
  @ApiProperty({ description: "Report ID" })
  id: string;

  @ApiProperty({ description: "Report name" })
  name: string;

  @ApiPropertyOptional({ description: "Report description" })
  description?: string;

  @ApiProperty({ description: "Entity type" })
  entityType: string;

  @ApiProperty({ description: "Column field IDs", type: [String] })
  columns: string[];

  @ApiProperty({ description: "Filter conditions" })
  filters: unknown[];

  @ApiPropertyOptional({ description: "Group by fields", type: [String] })
  groupBy?: string[];

  @ApiPropertyOptional({ description: "Aggregation config" })
  aggregation?: ReportAggregationConfigDto[];

  @ApiProperty({ description: "Visualization type" })
  visualization: string;

  @ApiPropertyOptional({ description: "Chart config" })
  chartConfig?: ReportChartConfigDto;

  @ApiPropertyOptional({ description: "Sort field" })
  sortBy?: string;

  @ApiPropertyOptional({ description: "Sort order" })
  sortOrder?: string;

  @ApiProperty({ description: "Is a template" })
  isTemplate: boolean;

  @ApiPropertyOptional({ description: "Template category" })
  templateCategory?: string;

  @ApiProperty({ description: "Visibility" })
  visibility: string;

  @ApiProperty({ description: "Is favorite" })
  isFavorite: boolean;

  @ApiPropertyOptional({ description: "Last run timestamp" })
  lastRunAt?: Date;

  @ApiPropertyOptional({ description: "Last run duration in ms" })
  lastRunDuration?: number;

  @ApiPropertyOptional({ description: "Last run row count" })
  lastRunRowCount?: number;

  @ApiPropertyOptional({ description: "Linked scheduled export ID" })
  scheduledExportId?: string;

  @ApiProperty({ description: "Creator user ID" })
  createdById: string;

  @ApiProperty({ description: "Created timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Updated timestamp" })
  updatedAt: Date;
}

/**
 * Response DTO for report list with pagination.
 */
export class ReportListResponseDto {
  @ApiProperty({ description: "Reports", type: [SavedReportResponseDto] })
  data: SavedReportResponseDto[];

  @ApiProperty({ description: "Total count" })
  total: number;

  @ApiProperty({ description: "Current page" })
  page: number;

  @ApiProperty({ description: "Page size" })
  pageSize: number;
}

/**
 * Response DTO for report execution results.
 */
export class ReportResultsDto {
  @ApiProperty({ description: "Report ID" })
  reportId: string;

  @ApiProperty({ description: "Report name" })
  reportName: string;

  @ApiProperty({ description: "Visualization type" })
  visualization: string;

  @ApiProperty({ description: "Column definitions", type: [ReportFieldDto] })
  columns: ReportFieldDto[];

  @ApiProperty({ description: "Result data rows" })
  rows: Record<string, unknown>[];

  @ApiProperty({ description: "Total matching records" })
  totalCount: number;

  @ApiProperty({ description: "Current offset" })
  offset: number;

  @ApiProperty({ description: "Limit used" })
  limit: number;

  @ApiProperty({ description: "Execution time in ms" })
  executionTimeMs: number;

  @ApiPropertyOptional({ description: "Chart data for non-table viz" })
  chartData?: {
    labels: string[];
    datasets: Array<{
      name: string;
      data: number[];
      color?: string;
    }>;
  };
}

/**
 * Response DTO for field registry.
 */
export class FieldRegistryResponseDto {
  @ApiProperty({ description: "Entity type" })
  entityType: string;

  @ApiProperty({ description: "Field groups", type: [ReportFieldGroupDto] })
  fieldGroups: ReportFieldGroupDto[];

  @ApiProperty({ description: "Total field count" })
  totalFields: number;
}
