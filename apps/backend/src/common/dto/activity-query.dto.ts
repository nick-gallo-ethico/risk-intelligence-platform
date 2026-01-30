// =============================================================================
// ACTIVITY QUERY DTO - Query parameters for activity timeline
// =============================================================================
//
// Used for filtering and paginating audit log entries.
// All filters are optional - omitting filters returns all activities.
// organizationId is applied automatically from tenant context.
// =============================================================================

import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  IsDate,
  Min,
  Max,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { AuditEntityType, AuditActionCategory } from "@prisma/client";

/**
 * DTO for querying the activity/audit log timeline.
 *
 * @example
 * ```typescript
 * // Query all activities for a specific case
 * const query: ActivityQueryDto = {
 *   entityType: AuditEntityType.CASE,
 *   entityId: 'case-uuid-123',
 *   page: 1,
 *   limit: 20,
 * };
 *
 * // Query all activities by a specific user
 * const userQuery: ActivityQueryDto = {
 *   actorUserId: 'user-uuid-456',
 *   startDate: new Date('2026-01-01'),
 *   endDate: new Date('2026-01-31'),
 * };
 * ```
 */
export class ActivityQueryDto {
  @ApiPropertyOptional({
    description: "Filter by entity type",
    enum: AuditEntityType,
    example: "CASE",
  })
  @IsOptional()
  @IsEnum(AuditEntityType)
  entityType?: AuditEntityType;

  @ApiPropertyOptional({
    description: "Filter by specific entity UUID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: "Filter by the user who performed the action",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional({
    description: "Filter by action category",
    enum: AuditActionCategory,
    example: "UPDATE",
  })
  @IsOptional()
  @IsEnum(AuditActionCategory)
  actionCategory?: AuditActionCategory;

  @ApiPropertyOptional({
    description: "Filter activities on or after this date",
    example: "2026-01-01T00:00:00Z",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description: "Filter activities on or before this date",
    example: "2026-01-31T23:59:59Z",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description: "Filter by action type (e.g., created, updated, assigned)",
    example: "status_changed",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  action?: string;

  @ApiPropertyOptional({
    description: "Page number (1-based)",
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of items per page",
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Sort order for results (by createdAt)",
    example: "desc",
    default: "desc",
    enum: ["asc", "desc"],
  })
  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc" = "desc";
}
