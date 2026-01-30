// =============================================================================
// CREATE ACTIVITY DTO - Input for logging activity to the audit log
// =============================================================================
//
// IMPORTANT: organizationId and actorUserId are NOT in this DTO.
// - organizationId comes from the tenant context (JWT/middleware)
// - actorUserId comes from the current user context
//
// This DTO is used by ActivityService.log() to record actions.
// =============================================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AuditEntityType, AuditActionCategory } from "@prisma/client";

/**
 * Represents the change tracking structure for audit logs.
 * Stores the old and new values when a field is modified.
 */
export class ActivityChangesDto {
  @ApiPropertyOptional({
    description: "Previous value before the change",
    example: { status: "OPEN" },
  })
  @IsOptional()
  oldValue?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "New value after the change",
    example: { status: "CLOSED" },
  })
  @IsOptional()
  newValue?: Record<string, unknown>;
}

/**
 * DTO for creating a new activity log entry.
 *
 * @example
 * ```typescript
 * const activity: CreateActivityDto = {
 *   entityType: AuditEntityType.CASE,
 *   entityId: 'case-uuid-123',
 *   action: 'status_changed',
 *   actionDescription: 'John changed status from OPEN to CLOSED',
 *   actionCategory: AuditActionCategory.UPDATE,
 *   changes: {
 *     oldValue: { status: 'OPEN' },
 *     newValue: { status: 'CLOSED' },
 *   },
 * };
 * ```
 */
export class CreateActivityDto {
  @ApiProperty({
    description: "Type of entity this activity relates to",
    enum: AuditEntityType,
    example: "CASE",
  })
  @IsEnum(AuditEntityType)
  entityType: AuditEntityType;

  @ApiProperty({
    description: "UUID of the entity this activity relates to",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    description:
      "Action identifier (e.g., created, updated, status_changed, assigned)",
    example: "status_changed",
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  action: string;

  @ApiProperty({
    description:
      "Human-readable description of the action for display and AI context",
    example: "John Doe changed case status from OPEN to CLOSED",
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  actionDescription: string;

  @ApiPropertyOptional({
    description: "Category of the action for filtering and analytics",
    enum: AuditActionCategory,
    example: "UPDATE",
  })
  @IsOptional()
  @IsEnum(AuditActionCategory)
  actionCategory?: AuditActionCategory;

  @ApiPropertyOptional({
    description: "Change details with old and new values",
    type: ActivityChangesDto,
    example: {
      oldValue: { status: "OPEN" },
      newValue: { status: "CLOSED" },
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActivityChangesDto)
  changes?: ActivityChangesDto;

  @ApiPropertyOptional({
    description:
      "Additional context for AI and audit trail (reason, triggered_by, related_entities)",
    example: {
      reason: "Investigation completed with no findings",
      triggered_by: "manual_action",
    },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      "Additional metadata (request correlation, feature flags, etc.)",
    example: {
      feature_flag: "new_workflow_v2",
      correlation_id: "req-123",
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
