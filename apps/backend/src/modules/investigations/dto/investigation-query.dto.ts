import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsUUID,
  Min,
  Max,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { InvestigationStatus, InvestigationDepartment } from "@prisma/client";

/**
 * DTO for querying/filtering investigations.
 */
export class InvestigationQueryDto {
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
    description: "Page number (used if offset not provided)",
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of items to skip (takes priority over page)",
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number;

  @ApiPropertyOptional({
    description: "Filter by investigation status",
    enum: InvestigationStatus,
    example: InvestigationStatus.INVESTIGATING,
  })
  @IsEnum(InvestigationStatus)
  @IsOptional()
  status?: InvestigationStatus;

  @ApiPropertyOptional({
    description: "Filter by assigned investigator UUID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: "Filter by department",
    enum: InvestigationDepartment,
    example: InvestigationDepartment.COMPLIANCE,
  })
  @IsEnum(InvestigationDepartment)
  @IsOptional()
  department?: InvestigationDepartment;

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
    example: "desc",
    default: "desc",
    enum: ["asc", "desc"],
  })
  @IsString()
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}
