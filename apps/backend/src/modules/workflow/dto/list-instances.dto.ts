import { IsOptional, IsUUID, IsEnum, IsInt, Min, Max } from "class-validator";
import { Transform, Type } from "class-transformer";
import { WorkflowInstanceStatus, WorkflowEntityType } from "@prisma/client";

/**
 * DTO for querying workflow instances with optional filters.
 *
 * Supports filtering by:
 * - templateId: specific template UUID
 * - status: instance status (ACTIVE, COMPLETED, CANCELLED, PAUSED)
 * - entityType: entity type (CASE, INVESTIGATION, POLICY, DISCLOSURE)
 *
 * Pagination:
 * - page: 1-indexed page number (default 1)
 * - limit: results per page (default 20, max 100)
 */
export class ListInstancesDto {
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsEnum(WorkflowInstanceStatus)
  status?: WorkflowInstanceStatus;

  @IsOptional()
  @IsEnum(WorkflowEntityType)
  entityType?: WorkflowEntityType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
