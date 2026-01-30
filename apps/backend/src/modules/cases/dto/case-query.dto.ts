import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsUUID,
  Min,
  Max,
  MaxLength,
  IsDateString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CaseStatus, Severity, SourceChannel, CaseType } from "@prisma/client";

/**
 * Custom validator to ensure fromDate is before toDate.
 */
@ValidatorConstraint({ name: "dateRange", async: false })
class DateRangeValidator implements ValidatorConstraintInterface {
  validate(_value: string, args: ValidationArguments): boolean {
    const obj = args.object as CaseQueryDto;
    if (obj.createdAfter && obj.createdBefore) {
      const fromDate = new Date(obj.createdAfter);
      const toDate = new Date(obj.createdBefore);
      return fromDate <= toDate;
    }
    return true;
  }

  defaultMessage(): string {
    return "createdAfter must be before or equal to createdBefore";
  }
}

/**
 * DTO for querying/filtering cases.
 * Supports pagination, filtering by multiple fields, full-text search, and sorting.
 */
export class CaseQueryDto {
  // ===========================================
  // Pagination
  // ===========================================

  @ApiPropertyOptional({
    description: "Items per page",
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Number of items to skip",
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number = 0;

  // ===========================================
  // Enum Filters
  // ===========================================

  @ApiPropertyOptional({
    description: "Filter by case status",
    enum: CaseStatus,
    example: CaseStatus.OPEN,
  })
  @IsEnum(CaseStatus)
  @IsOptional()
  status?: CaseStatus;

  @ApiPropertyOptional({
    description: "Filter by severity level",
    enum: Severity,
    example: Severity.HIGH,
  })
  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @ApiPropertyOptional({
    description: "Filter by source channel",
    enum: SourceChannel,
    example: SourceChannel.HOTLINE,
  })
  @IsEnum(SourceChannel)
  @IsOptional()
  sourceChannel?: SourceChannel;

  @ApiPropertyOptional({
    description: "Filter by case type",
    enum: CaseType,
    example: CaseType.REPORT,
  })
  @IsEnum(CaseType)
  @IsOptional()
  caseType?: CaseType;

  // ===========================================
  // User Filters
  // ===========================================

  @ApiPropertyOptional({
    description: "Filter by creator user ID (UUID)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID("4", { message: "createdById must be a valid UUID" })
  createdById?: string;

  @ApiPropertyOptional({
    description: "Filter by intake operator user ID (UUID)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID("4", { message: "intakeOperatorId must be a valid UUID" })
  intakeOperatorId?: string;

  // ===========================================
  // Search
  // ===========================================

  @ApiPropertyOptional({
    description: "Full-text search query",
    example: "harassment policy",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  // ===========================================
  // Date Range Filters
  // ===========================================

  @ApiPropertyOptional({
    description: "Filter cases created on or after this date (ISO 8601)",
    example: "2026-01-01",
  })
  @IsDateString({}, { message: "createdAfter must be a valid ISO 8601 date" })
  @IsOptional()
  @Validate(DateRangeValidator)
  createdAfter?: string;

  @ApiPropertyOptional({
    description: "Filter cases created on or before this date (ISO 8601)",
    example: "2026-12-31",
  })
  @IsDateString({}, { message: "createdBefore must be a valid ISO 8601 date" })
  @IsOptional()
  createdBefore?: string;

  // ===========================================
  // Sorting
  // ===========================================

  @ApiPropertyOptional({
    description: "Field to sort by",
    example: "createdAt",
    default: "createdAt",
    enum: ["createdAt", "updatedAt", "referenceNumber", "severity", "status"],
  })
  @IsString()
  @IsOptional()
  sortBy?:
    | "createdAt"
    | "updatedAt"
    | "referenceNumber"
    | "severity"
    | "status" = "createdAt";

  @ApiPropertyOptional({
    description: "Sort order",
    example: "desc",
    default: "desc",
    enum: ["asc", "desc"],
  })
  @IsString()
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}
