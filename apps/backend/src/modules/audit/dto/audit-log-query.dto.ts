import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { AuditEntityType, AuditActionCategory } from "@prisma/client";

/**
 * Query parameters for filtering and paginating audit logs.
 */
export class AuditLogQueryDto {
  @IsOptional()
  @IsEnum(AuditEntityType)
  entityType?: AuditEntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  actorUserId?: string;

  @IsOptional()
  @IsEnum(AuditActionCategory)
  actionCategory?: AuditActionCategory;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
