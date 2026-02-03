import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReportDataSource } from "@prisma/client";

/**
 * Column definition for report template.
 */
class ColumnDefinitionDto {
  @ApiProperty({ description: "Field name in data source" })
  @IsString()
  field: string;

  @ApiProperty({ description: "Display label" })
  @IsString()
  label: string;

  @ApiProperty({
    description: "Data type",
    enum: ["string", "number", "date", "boolean", "currency"],
  })
  @IsEnum(["string", "number", "date", "boolean", "currency"])
  type: "string" | "number" | "date" | "boolean" | "currency";

  @ApiPropertyOptional({ description: "Format string" })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ description: "Column width" })
  @IsOptional()
  width?: number;
}

/**
 * Filter definition for report template defaults.
 */
class FilterDefinitionDto {
  @ApiProperty({ description: "Field name" })
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
      "in",
      "contains",
      "between",
    ],
  })
  @IsString()
  operator: string;

  @ApiProperty({ description: "Filter value" })
  value: unknown;
}

/**
 * DTO for creating a report template.
 */
export class CreateReportTemplateDto {
  @ApiProperty({ description: "Template name" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Template description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Category (compliance, operational, board, etc.)",
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: "Data source",
    enum: ReportDataSource,
  })
  @IsEnum(ReportDataSource)
  dataSource: ReportDataSource;

  @ApiProperty({
    description: "Column definitions",
    type: [ColumnDefinitionDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ColumnDefinitionDto)
  columns: ColumnDefinitionDto[];

  @ApiPropertyOptional({
    description: "Default filters",
    type: [FilterDefinitionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterDefinitionDto)
  filters?: FilterDefinitionDto[];

  @ApiPropertyOptional({ description: "Default sort field" })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: "Sort order (asc/desc)" })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc";

  @ApiPropertyOptional({
    description: "Chart type",
    enum: ["bar", "pie", "line", "table"],
  })
  @IsOptional()
  @IsEnum(["bar", "pie", "line", "table"])
  chartType?: string;

  @ApiPropertyOptional({ description: "Roles allowed to use this template" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @ApiPropertyOptional({
    description: "Make template visible to all users in org",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
