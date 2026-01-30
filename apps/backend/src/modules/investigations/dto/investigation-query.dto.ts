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
import { InvestigationStatus, InvestigationDepartment } from "@prisma/client";

/**
 * DTO for querying/filtering investigations.
 */
export class InvestigationQueryDto {
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsEnum(InvestigationStatus)
  @IsOptional()
  status?: InvestigationStatus;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsEnum(InvestigationDepartment)
  @IsOptional()
  department?: InvestigationDepartment;

  @IsString()
  @IsOptional()
  sortBy?: string = "createdAt";

  @IsString()
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}
