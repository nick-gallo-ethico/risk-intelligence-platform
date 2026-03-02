/**
 * Visibility-Filtered Message DTOs
 *
 * DTOs for message and status views filtered by visibility level.
 * Different visibility levels expose different amounts of information
 * to protect privacy while providing appropriate transparency.
 *
 * Visibility Levels (ordered least to most transparent):
 * - MINIMAL: content, direction only
 * - STANDARD: + isRead, relative readAt ('read')
 * - DETAILED: + exact readAt timestamp, timeline info
 * - TRANSPARENT: + investigator first name
 *
 * @see 42-05-PLAN.md - Visibility Level Filtering
 * @see relay-settings.dto.ts - ReporterVisibilityLevel enum
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Message view filtered by visibility level.
 * Different visibility levels expose different amounts of information.
 *
 * MINIMAL: content, direction only
 * STANDARD: + isRead, relative readAt ('read')
 * DETAILED: + exact readAt timestamp, timeline info
 * TRANSPARENT: + investigator first name
 */
export class VisibilityFilteredMessageDto {
  @ApiProperty({ description: "Message ID" })
  id: string;

  @ApiProperty({
    description: "Message direction",
    enum: ["inbound", "outbound"],
  })
  direction: "inbound" | "outbound";

  @ApiProperty({ description: "Message content" })
  content: string;

  @ApiPropertyOptional({ description: "Message subject" })
  subject?: string | null;

  @ApiProperty({ description: "Created timestamp" })
  createdAt: Date;

  @ApiPropertyOptional({ description: "Whether message was read (STANDARD+)" })
  isRead?: boolean;

  @ApiPropertyOptional({
    description: 'Read indicator (STANDARD: "read", DETAILED+: timestamp)',
  })
  readAt?: string | Date | null;

  @ApiPropertyOptional({
    description: "Investigator first name (TRANSPARENT only)",
  })
  senderName?: string;

  @ApiPropertyOptional({ description: "Estimated response time (DETAILED+)" })
  estimatedResponseTime?: string;
}

/**
 * Report status view filtered by visibility level.
 */
export class VisibilityFilteredStatusDto {
  @ApiProperty({ description: "Reference number" })
  referenceNumber: string;

  @ApiProperty({ description: "Status code" })
  status: string;

  @ApiProperty({ description: "Human-readable status" })
  statusLabel: string;

  @ApiPropertyOptional({ description: "Status description (STANDARD+)" })
  statusDescription?: string;

  @ApiPropertyOptional({ description: "Has unread messages" })
  hasUnreadMessages?: boolean;

  @ApiPropertyOptional({ description: "Unread count" })
  unreadCount?: number;

  @ApiProperty({ description: "Last updated timestamp" })
  lastUpdated: Date;

  @ApiPropertyOptional({ description: "Whether messaging is enabled" })
  canMessage?: boolean;

  @ApiPropertyOptional({
    description: "Assigned investigator first name (TRANSPARENT only)",
  })
  investigatorName?: string;

  @ApiPropertyOptional({ description: "Expected resolution date (DETAILED+)" })
  expectedResolution?: Date;
}
