import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  RiuType,
  RiuSourceChannel,
  RiuReporterType,
  RiuStatus,
  Severity,
} from "@prisma/client";

/**
 * DTO for querying Risk Intelligence Units.
 * Supports filtering, pagination, and sorting.
 */
export class RiuQueryDto {
  // Pagination
  @ApiPropertyOptional({
    description: "Number of records to return",
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: "Number of records to skip", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  // Sorting
  @ApiPropertyOptional({
    description: "Field to sort by",
    default: "createdAt",
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["asc", "desc"],
    default: "desc",
  })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc";

  // Filters
  @ApiPropertyOptional({ enum: RiuType, description: "Filter by RIU type" })
  @IsOptional()
  @IsEnum(RiuType)
  type?: RiuType;

  @ApiPropertyOptional({
    enum: RiuSourceChannel,
    description: "Filter by source channel",
  })
  @IsOptional()
  @IsEnum(RiuSourceChannel)
  sourceChannel?: RiuSourceChannel;

  @ApiPropertyOptional({
    enum: RiuReporterType,
    description: "Filter by reporter type",
  })
  @IsOptional()
  @IsEnum(RiuReporterType)
  reporterType?: RiuReporterType;

  @ApiPropertyOptional({ enum: RiuStatus, description: "Filter by status" })
  @IsOptional()
  @IsEnum(RiuStatus)
  status?: RiuStatus;

  @ApiPropertyOptional({ enum: Severity, description: "Filter by severity" })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @ApiPropertyOptional({ description: "Filter by category ID" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: "Filter by created user ID" })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  // Date range filters
  @ApiPropertyOptional({
    description: "Filter by created after date (ISO 8601)",
  })
  @IsOptional()
  @IsString()
  createdAfter?: string;

  @ApiPropertyOptional({
    description: "Filter by created before date (ISO 8601)",
  })
  @IsOptional()
  @IsString()
  createdBefore?: string;

  // Text search (for reference number or content)
  @ApiPropertyOptional({ description: "Search by reference number or content" })
  @IsOptional()
  @IsString()
  search?: string;
}
