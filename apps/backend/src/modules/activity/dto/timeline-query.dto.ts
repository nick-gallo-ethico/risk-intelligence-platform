// =============================================================================
// TIMELINE QUERY DTO - Query parameters for activity timeline endpoints
// =============================================================================

import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsBoolean,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Query parameters for timeline retrieval endpoints.
 */
export class TimelineQueryDto {
  @ApiPropertyOptional({
    description: "Page number (1-indexed)",
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of entries per page",
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Filter activities from this date (ISO 8601)",
    example: "2026-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: "Filter activities until this date (ISO 8601)",
    example: "2026-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: "Include related entity activities (e.g., Case includes Investigation)",
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  includeRelated?: boolean = true;
}
