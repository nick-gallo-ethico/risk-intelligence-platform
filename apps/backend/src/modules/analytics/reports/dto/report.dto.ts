import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  ReportVisualizationType,
  ReportVisibility,
  ReportEntityType,
  ReportTemplateCategory,
  ReportSortOrder,
} from "../entities/saved-report.entity";
import {
  ReportAggregationConfigDto,
  ReportChartConfigDto,
} from "./report-chart.dto";

// Re-export from focused files for convenience
export { ReportFieldDto, ReportFieldGroupDto } from "./report-field.dto";
export { ReportFilterConditionDto } from "./report-filter.dto";
export {
  ReportAggregationConfigDto,
  ReportChartConfigDto,
} from "./report-chart.dto";
export {
  RunReportDto,
  ReportResultsDto,
  SavedReportResponseDto,
  ReportListResponseDto,
  FieldRegistryResponseDto,
} from "./report-query.dto";

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
