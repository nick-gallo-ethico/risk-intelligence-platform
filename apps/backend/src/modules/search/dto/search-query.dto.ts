import {
  IsOptional,
  IsString,
  IsArray,
  IsInt,
  Min,
  Max,
  IsEnum,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Search query DTO for unified platform search.
 *
 * Supports:
 * - Free text search across all fields
 * - Entity type filtering
 * - Field-specific filters
 * - Sorting and pagination
 */
export class SearchQueryDto {
  @ApiPropertyOptional({
    description: "Free text query",
    example: "harassment chicago",
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: "Entity types to search",
    example: ["cases", "rius"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",");
    }
    return value;
  })
  entityTypes?: string[];

  @ApiPropertyOptional({
    description: "Field filters (e.g., status=OPEN, severity=HIGH,MEDIUM)",
    example: { status: "OPEN", severity: ["HIGH", "MEDIUM"] },
    type: "object",
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Handle query string format: filters[status]=OPEN
    if (typeof value === "object") {
      // Convert comma-separated values to arrays
      const result: Record<string, string | string[]> = {};
      for (const [key, val] of Object.entries(value)) {
        if (typeof val === "string" && val.includes(",")) {
          result[key] = val.split(",");
        } else {
          result[key] = val as string | string[];
        }
      }
      return result;
    }
    return value;
  })
  filters?: Record<string, string | string[]>;

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
    default: "desc",
  })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  @ApiPropertyOptional({
    description: "Number of records to skip",
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: "Number of records to return",
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}
