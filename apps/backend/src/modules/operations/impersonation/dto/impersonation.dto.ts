/**
 * Impersonation DTOs
 *
 * Data Transfer Objects for impersonation session management.
 * Provides validation for session creation and termination.
 *
 * @see impersonation.service.ts for session lifecycle
 * @see impersonation-session.entity.ts for session structure
 */

import { IsString, IsOptional, IsUUID, MinLength } from "class-validator";

/**
 * DTO for starting an impersonation session.
 *
 * Requires target organization and reason (audit compliance).
 * Optional ticket reference for support tracking.
 */
export class StartSessionDto {
  /**
   * UUID of the target organization to impersonate into.
   */
  @IsUUID()
  targetOrganizationId: string;

  /**
   * Required reason for the impersonation session.
   * Must be at least 10 characters to ensure meaningful justification.
   */
  @IsString()
  @MinLength(10, { message: "Reason must be at least 10 characters" })
  reason: string;

  /**
   * Optional support ticket reference.
   * Links impersonation session to customer support ticket.
   */
  @IsOptional()
  @IsString()
  ticketId?: string;
}

/**
 * DTO for ending an impersonation session.
 *
 * Optional notes for documenting session outcome.
 */
export class EndSessionDto {
  /**
   * Optional notes on session end.
   * Can document what was accomplished or findings.
   */
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Response DTO for session validation.
 */
export class SessionValidationResponse {
  valid: boolean;
  organizationId?: string;
  expiresAt?: Date;
  remainingSeconds?: number;
}

/**
 * Response DTO for session creation.
 */
export class SessionCreationResponse {
  sessionId: string;
  expiresAt: Date;
  targetOrganizationId: string;
  reason: string;
}
