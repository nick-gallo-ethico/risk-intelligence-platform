import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Type of entity timeline event.
 */
export const EntityTimelineEventType = {
  DISCLOSURE_SUBMITTED: "DISCLOSURE_SUBMITTED",
  CONFLICT_DETECTED: "CONFLICT_DETECTED",
  CONFLICT_DISMISSED: "CONFLICT_DISMISSED",
  CONFLICT_ESCALATED: "CONFLICT_ESCALATED",
  CASE_INVOLVEMENT: "CASE_INVOLVEMENT",
  EXCLUSION_CREATED: "EXCLUSION_CREATED",
} as const;

export type EntityTimelineEventType =
  (typeof EntityTimelineEventType)[keyof typeof EntityTimelineEventType];

/**
 * Single item in an entity's timeline.
 * RS.45: Full entity timeline history view.
 */
export class EntityTimelineItem {
  @ApiProperty({ description: "Type of timeline event" })
  eventType: EntityTimelineEventType;

  @ApiProperty({ description: "When the event occurred" })
  occurredAt: Date;

  @ApiProperty({ description: "Human-readable description of the event" })
  description: string;

  @ApiPropertyOptional({ description: "Related disclosure ID" })
  disclosureId?: string;

  @ApiPropertyOptional({ description: "Related conflict alert ID" })
  conflictAlertId?: string;

  @ApiPropertyOptional({ description: "Related case ID" })
  caseId?: string;

  @ApiPropertyOptional({ description: "Related exclusion ID" })
  exclusionId?: string;

  @ApiPropertyOptional({ description: "Person ID involved" })
  personId?: string;

  @ApiPropertyOptional({ description: "Person name (for display)" })
  personName?: string;

  @ApiPropertyOptional({ description: "Additional metadata" })
  metadata?: Record<string, unknown>;
}

/**
 * Full entity timeline response.
 * RS.45: Aggregates all interactions with an entity across disclosures and cases.
 */
export class EntityTimelineDto {
  @ApiProperty({ description: "Entity name searched" })
  entityName: string;

  @ApiProperty({ description: "Total number of timeline events" })
  totalEvents: number;

  @ApiProperty({ type: [EntityTimelineItem], description: "Timeline events" })
  events: EntityTimelineItem[];

  @ApiProperty({ description: "Summary statistics" })
  statistics: {
    totalDisclosures: number;
    totalConflicts: number;
    totalCases: number;
    uniquePersons: number;
    dateRange: {
      earliest: Date | null;
      latest: Date | null;
    };
  };
}
