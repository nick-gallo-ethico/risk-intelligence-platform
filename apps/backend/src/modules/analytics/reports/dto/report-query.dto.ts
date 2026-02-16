import {
  IsOptional,
  IsArray,
  IsString,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReportFieldDto } from "./report-field.dto";
import {
  ReportAggregationConfigDto,
  ReportChartConfigDto,
} from "./report-chart.dto";

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
 * Response DTO for field registry.
 */
export class FieldRegistryResponseDto {
  @ApiProperty({ description: "Entity type" })
  entityType: string;

  @ApiProperty({ description: "Field groups", type: [Object] })
  fieldGroups: Array<{ groupName: string; fields: ReportFieldDto[] }>;

  @ApiProperty({ description: "Total field count" })
  totalFields: number;
}
