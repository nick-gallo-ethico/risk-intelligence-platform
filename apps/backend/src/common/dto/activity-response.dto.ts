// =============================================================================
// ACTIVITY RESPONSE DTO - API response format for audit log entries
// =============================================================================
//
// Response DTOs are for typing and Swagger documentation only.
// No validation decorators needed since data comes from the database.
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";

/**
 * Abbreviated user information for activity response.
 * Only includes fields safe for display in activity feeds.
 */
export class ActivityActorUserDto {
  @ApiProperty({
    description: "User UUID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  id: string;

  @ApiProperty({
    description: "User display name (first + last)",
    example: "John Doe",
  })
  name: string;

  @ApiProperty({
    description: "User email address",
    example: "john.doe@example.com",
  })
  email: string;
}

/**
 * DTO for a single activity/audit log entry response.
 * Maps all fields from the AuditLog Prisma model plus expanded relations.
 */
export class ActivityResponseDto {
  @ApiProperty({
    description: "Unique identifier for this audit log entry",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({
    description: "Organization this activity belongs to",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  organizationId: string;

  // Entity Reference
  @ApiProperty({
    description: "Type of entity this activity relates to",
    enum: AuditEntityType,
    example: "CASE",
  })
  entityType: AuditEntityType;

  @ApiProperty({
    description: "UUID of the entity this activity relates to",
    example: "550e8400-e29b-41d4-a716-446655440003",
  })
  entityId: string;

  // Action
  @ApiProperty({
    description: "Action identifier",
    example: "status_changed",
  })
  action: string;

  @ApiProperty({
    description: "Category of the action",
    enum: AuditActionCategory,
    example: "UPDATE",
  })
  actionCategory: AuditActionCategory;

  @ApiProperty({
    description: "Human-readable description of the action",
    example: "John Doe changed case status from OPEN to CLOSED",
  })
  actionDescription: string;

  // Actor
  @ApiPropertyOptional({
    description:
      "UUID of the user who performed the action (null for system actions)",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  actorUserId: string | null;

  @ApiProperty({
    description: "Type of actor that performed the action",
    enum: ActorType,
    example: "USER",
  })
  actorType: ActorType;

  @ApiPropertyOptional({
    description: "Denormalized name of the actor for display",
    example: "John Doe",
  })
  actorName: string | null;

  // Change Details
  @ApiPropertyOptional({
    description: "Detailed changes with old and new values",
    example: {
      status: { old: "OPEN", new: "CLOSED" },
    },
  })
  changes: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: "Additional context for AI and audit trail",
    example: {
      reason: "Investigation completed",
    },
  })
  context: Record<string, unknown> | null;

  // Request Metadata
  @ApiPropertyOptional({
    description: "IP address of the request",
    example: "192.168.1.1",
  })
  ipAddress: string | null;

  @ApiPropertyOptional({
    description: "User agent of the request",
    example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  })
  userAgent: string | null;

  @ApiPropertyOptional({
    description: "Correlation ID for request tracing",
    example: "req-550e8400-e29b-41d4",
  })
  requestId: string | null;

  // Timestamp
  @ApiProperty({
    description: "When this activity was recorded",
    example: "2026-01-29T12:00:00Z",
  })
  createdAt: Date;

  // Expanded Relations
  @ApiPropertyOptional({
    description:
      "Expanded actor user information (when actorUserId is not null)",
    type: ActivityActorUserDto,
  })
  actorUser?: ActivityActorUserDto;
}

/**
 * Pagination metadata for list responses.
 */
export class ActivityPaginationDto {
  @ApiProperty({
    description: "Current page number",
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: "Items per page",
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: "Total number of items",
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: "Total number of pages",
    example: 8,
  })
  totalPages: number;
}

/**
 * Paginated list response for activity queries.
 */
export class ActivityListResponseDto {
  @ApiProperty({
    description: "List of activity entries",
    type: [ActivityResponseDto],
  })
  items: ActivityResponseDto[];

  @ApiProperty({
    description: "Pagination metadata",
    type: ActivityPaginationDto,
  })
  pagination: ActivityPaginationDto;
}
