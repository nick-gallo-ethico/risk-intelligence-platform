// =============================================================================
// TIMELINE RESPONSE DTO - Response types for activity timeline endpoints
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AuditEntityType } from "@prisma/client";

/**
 * Information about a related entity in the timeline.
 */
export class RelatedEntityInfoDto {
  @ApiProperty({
    description: "Parent entity type",
    enum: AuditEntityType,
  })
  parentEntityType: AuditEntityType;

  @ApiProperty({
    description: "Parent entity ID",
  })
  parentEntityId: string;

  @ApiProperty({
    description: "Relationship type",
    example: "investigation",
  })
  relationship: string;
}

/**
 * Single timeline entry representing an activity event.
 */
export class TimelineEntryDto {
  @ApiProperty({
    description: "Activity ID",
  })
  id: string;

  @ApiProperty({
    description: "Entity type this activity belongs to",
    enum: AuditEntityType,
  })
  entityType: AuditEntityType;

  @ApiProperty({
    description: "Entity ID",
  })
  entityId: string;

  @ApiProperty({
    description: "Action performed",
    example: "created",
  })
  action: string;

  @ApiProperty({
    description: "Human-readable description of the action",
    example: "John Smith created case ETH-2026-00001",
  })
  actionDescription: string;

  @ApiPropertyOptional({
    description: "User ID who performed the action",
    nullable: true,
  })
  actorUserId: string | null;

  @ApiPropertyOptional({
    description: "Name of the actor",
    nullable: true,
  })
  actorName: string | null;

  @ApiProperty({
    description: "When the activity occurred",
  })
  createdAt: Date;

  @ApiProperty({
    description: "Whether this activity is from a related entity",
  })
  isRelatedEntity: boolean;

  @ApiPropertyOptional({
    description: "Information about the related entity, if applicable",
    type: RelatedEntityInfoDto,
  })
  relatedEntityInfo?: RelatedEntityInfoDto;

  @ApiPropertyOptional({
    description: "Changes made in this activity",
    nullable: true,
  })
  changes?: Record<string, { old: unknown; new: unknown }> | null;

  @ApiPropertyOptional({
    description: "Additional context for this activity",
    nullable: true,
  })
  context?: Record<string, unknown> | null;
}

/**
 * Paginated timeline response.
 */
export class TimelineResponseDto {
  @ApiProperty({
    description: "Timeline entries",
    type: [TimelineEntryDto],
  })
  entries: TimelineEntryDto[];

  @ApiProperty({
    description: "Total number of entries",
  })
  total: number;

  @ApiProperty({
    description: "Whether more entries are available",
  })
  hasMore: boolean;

  @ApiProperty({
    description: "Current page number",
  })
  page: number;

  @ApiProperty({
    description: "Entries per page",
  })
  limit: number;
}

/**
 * Entity activity summary statistics.
 */
export class EntitySummaryDto {
  @ApiProperty({
    description: "Total number of activities on this entity",
  })
  totalActivities: number;

  @ApiPropertyOptional({
    description: "When the last activity occurred",
    nullable: true,
  })
  lastActivityAt: Date | null;

  @ApiPropertyOptional({
    description: "Name of the last actor",
    nullable: true,
  })
  lastActivityBy: string | null;

  @ApiProperty({
    description: "Number of unique users who acted on this entity",
  })
  uniqueActors: number;
}
