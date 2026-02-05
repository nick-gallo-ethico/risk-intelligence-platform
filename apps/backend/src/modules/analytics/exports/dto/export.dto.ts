import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsUUID,
  IsDateString,
  Min,
  Max,
  MaxLength,
  Matches,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  ExportSourceType,
  ExportDataType,
  ExportType,
  ExportFormat,
  ExportJobStatus,
} from "@prisma/client";

// ===========================================
// Tag Management DTOs
// ===========================================

/**
 * DTO for creating a field tag configuration.
 * Tags allow admins to promote custom fields to named export columns.
 */
export class CreateTagDto {
  @ApiProperty({
    description: "Entity type to pull the field from",
    enum: ExportSourceType,
    example: "CASE",
  })
  @IsEnum(ExportSourceType)
  sourceEntityType: ExportSourceType;

  @ApiProperty({
    description:
      'JSON path to the field (e.g., "customFields.totalDollarAmount" or "responses.q5")',
    example: "customFields.totalDollarAmount",
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  sourceFieldPath: string;

  @ApiPropertyOptional({
    description:
      "Optional template ID to limit tag to specific form template responses",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({
    description: "Tag slot number (1-20), determines column position in export",
    minimum: 1,
    maximum: 20,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(20)
  tagSlot: number;

  @ApiProperty({
    description:
      "Column name for export file (lowercase, alphanumeric with underscores)",
    example: "total_dollar_amount",
    maxLength: 50,
  })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message:
      "Column name must start with lowercase letter and contain only lowercase letters, numbers, and underscores",
  })
  @MaxLength(50)
  columnName: string;

  @ApiProperty({
    description: "Human-readable label for the column header",
    example: "Total Dollar Amount",
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  displayLabel: string;

  @ApiProperty({
    description: "Data type for value formatting",
    enum: ExportDataType,
    example: "CURRENCY",
  })
  @IsEnum(ExportDataType)
  dataType: ExportDataType;

  @ApiPropertyOptional({
    description:
      'Format pattern (e.g., "$#,##0.00" for currency, "YYYY-MM-DD" for date)',
    example: "$#,##0.00",
  })
  @IsOptional()
  @IsString()
  formatPattern?: string;
}

/**
 * DTO for updating a field tag configuration.
 * All fields are optional for partial updates.
 */
export class UpdateTagDto extends PartialType(CreateTagDto) {}

// ===========================================
// Date Range DTO
// ===========================================

/**
 * DTO for specifying date range filters.
 */
export class DateRangeDto {
  @ApiProperty({
    description: "Start date (ISO 8601 format)",
    example: "2025-01-01",
  })
  @IsDateString()
  start: string;

  @ApiProperty({
    description: "End date (ISO 8601 format)",
    example: "2025-12-31",
  })
  @IsDateString()
  end: string;
}

// ===========================================
// Export Job DTOs
// ===========================================

/**
 * DTO for creating an export job.
 */
export class CreateExportJobDto {
  @ApiProperty({
    description: "Type of export",
    enum: ExportType,
    example: "FLAT_FILE",
  })
  @IsEnum(ExportType)
  exportType: ExportType;

  @ApiProperty({
    description: "Output format",
    enum: ExportFormat,
    example: "XLSX",
  })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  // Filters
  @ApiPropertyOptional({
    description: "Date range filter",
    type: DateRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    description: "Filter by case statuses",
    example: ["OPEN", "CLOSED"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  statuses?: string[];

  @ApiPropertyOptional({
    description: "Filter by category IDs",
    example: ["550e8400-e29b-41d4-a716-446655440000"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: "Filter by business unit IDs",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  businessUnits?: string[];

  @ApiPropertyOptional({
    description: "Filter by location IDs",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  locations?: string[];

  // Column configuration
  @ApiPropertyOptional({
    description: "Include investigation columns",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeInvestigations?: boolean = true;

  @ApiPropertyOptional({
    description: "Maximum number of investigations to include per row",
    minimum: 1,
    maximum: 10,
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxInvestigations?: number = 3;

  @ApiPropertyOptional({
    description: "Include admin-configured tagged fields",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeTaggedFields?: boolean = true;

  @ApiPropertyOptional({
    description: "Include overflow JSON columns for all custom data",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeOverflow?: boolean = false;
}

// ===========================================
// Response DTOs
// ===========================================

/**
 * Response DTO for tag preview with sample data.
 */
export class TagPreviewDto {
  @ApiProperty({ description: "Tag slot number" })
  tagSlot: number;

  @ApiProperty({ description: "Column name" })
  columnName: string;

  @ApiProperty({ description: "Display label" })
  displayLabel: string;

  @ApiProperty({ description: "Raw value from entity" })
  rawValue: unknown;

  @ApiProperty({ description: "Formatted value" })
  formattedValue: string;

  @ApiProperty({ description: "Data type" })
  dataType: ExportDataType;
}

/**
 * Response DTO for export job status.
 */
export class ExportJobResponseDto {
  @ApiProperty({ description: "Job ID" })
  jobId: string;

  @ApiProperty({ description: "Job status", enum: ExportJobStatus })
  status: ExportJobStatus;

  @ApiProperty({ description: "Progress percentage (0-100)" })
  progress: number;

  @ApiPropertyOptional({ description: "Total rows to export" })
  totalRows?: number;

  @ApiProperty({ description: "Export format", enum: ExportFormat })
  format: ExportFormat;

  @ApiPropertyOptional({ description: "File size in bytes" })
  fileSizeBytes?: number;

  @ApiPropertyOptional({ description: "Download URL (when complete)" })
  downloadUrl?: string;

  @ApiPropertyOptional({ description: "File expiration date" })
  expiresAt?: Date;

  @ApiProperty({ description: "Job created at" })
  createdAt: Date;

  @ApiPropertyOptional({ description: "Job completed at" })
  completedAt?: Date;

  @ApiPropertyOptional({ description: "Error message (if failed)" })
  errorMessage?: string;
}

/**
 * Response DTO for paginated export job list.
 */
export class ExportJobListResponseDto {
  @ApiProperty({
    description: "List of export jobs",
    type: [ExportJobResponseDto],
  })
  data: ExportJobResponseDto[];

  @ApiProperty({ description: "Total count" })
  total: number;

  @ApiProperty({ description: "Page number" })
  page: number;

  @ApiProperty({ description: "Page size" })
  pageSize: number;
}
