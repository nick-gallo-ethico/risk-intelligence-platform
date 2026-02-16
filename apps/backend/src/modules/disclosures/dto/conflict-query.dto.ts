import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  IsString,
  IsUUID,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ConflictType, ConflictSeverity, ConflictStatus } from "@prisma/client";
import { ConflictAlertDto } from "./conflict-alert.dto";

/**
 * DTO for querying conflict alerts with filters.
 */
export class ConflictQueryDto {
  @ApiPropertyOptional({
    description: "Filter by status",
    enum: ConflictStatus,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ConflictStatus, { each: true })
  status?: ConflictStatus[];

  @ApiPropertyOptional({
    description: "Filter by conflict type",
    enum: ConflictType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ConflictType, { each: true })
  conflictType?: ConflictType[];

  @ApiPropertyOptional({
    description: "Filter by severity",
    enum: ConflictSeverity,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ConflictSeverity, { each: true })
  severity?: ConflictSeverity[];

  @ApiPropertyOptional({ description: "Filter by disclosure ID" })
  @IsOptional()
  @IsUUID()
  disclosureId?: string;

  @ApiPropertyOptional({ description: "Filter by matched entity name" })
  @IsOptional()
  @IsString()
  matchedEntity?: string;

  @ApiPropertyOptional({ description: "Minimum match confidence" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minConfidence?: number;

  @ApiPropertyOptional({ description: "Start date for date range filter" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date for date range filter" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "Page number (1-based)", default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: "Page size (max 100)",
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number;
}

/**
 * Paginated response for conflict alerts.
 */
export class ConflictAlertPageDto {
  @ApiProperty({ type: [ConflictAlertDto] })
  items: ConflictAlertDto[];

  @ApiProperty({ description: "Total count of matching alerts" })
  total: number;

  @ApiProperty({ description: "Current page (1-based)" })
  page: number;

  @ApiProperty({ description: "Page size" })
  pageSize: number;

  @ApiProperty({ description: "Total number of pages" })
  totalPages: number;

  @ApiProperty({ description: "Whether there are more pages" })
  hasMore: boolean;
}
