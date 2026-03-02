/**
 * Reporter Notification DTO
 *
 * Data structure for queuing notifications to anonymous reporters.
 * Used by DelayedNotificationService for privacy-preserving notification delivery.
 *
 * CRITICAL: Never log reporter email or notification content directly.
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsObject,
} from "class-validator";

/**
 * Data for a reporter notification to be queued with delay.
 */
export class ReporterNotificationDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  to: string;

  @IsString()
  templateId: string;

  @IsObject()
  context: Record<string, unknown>;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;
}

/**
 * Interface for internal use (non-validated).
 */
export interface ReporterNotificationData {
  organizationId: string;
  to: string;
  templateId: string;
  context: Record<string, unknown>;
  scheduledFor?: Date;
}
