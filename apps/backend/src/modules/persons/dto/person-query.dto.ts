import { IsString, IsEnum, IsOptional, IsInt, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  PersonType,
  PersonSource,
  PersonStatus,
  AnonymityTier,
} from "@prisma/client";

/**
 * Query DTO for listing persons with optional filters and pagination.
 */
export class PersonQueryDto {
  // Filters
  @ApiPropertyOptional({
    description: "Filter by person type",
    enum: PersonType,
    example: PersonType.EXTERNAL_CONTACT,
  })
  @IsEnum(PersonType)
  @IsOptional()
  type?: PersonType;

  @ApiPropertyOptional({
    description: "Filter by source",
    enum: PersonSource,
    example: PersonSource.MANUAL,
  })
  @IsEnum(PersonSource)
  @IsOptional()
  source?: PersonSource;

  @ApiPropertyOptional({
    description: "Filter by status",
    enum: PersonStatus,
    example: PersonStatus.ACTIVE,
  })
  @IsEnum(PersonStatus)
  @IsOptional()
  status?: PersonStatus;

  @ApiPropertyOptional({
    description: "Filter by anonymity tier",
    enum: AnonymityTier,
    example: AnonymityTier.OPEN,
  })
  @IsEnum(AnonymityTier)
  @IsOptional()
  anonymityTier?: AnonymityTier;

  @ApiPropertyOptional({
    description: "Search by name or email (partial match)",
    example: "john",
  })
  @IsString()
  @IsOptional()
  search?: string;

  // Pagination
  @ApiPropertyOptional({
    description: "Number of records to return",
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Number of records to skip",
    default: 0,
    minimum: 0,
    example: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number = 0;

  // Sorting
  @ApiPropertyOptional({
    description: "Field to sort by",
    example: "createdAt",
    default: "createdAt",
  })
  @IsString()
  @IsOptional()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["asc", "desc"],
    default: "desc",
    example: "desc",
  })
  @IsString()
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}
