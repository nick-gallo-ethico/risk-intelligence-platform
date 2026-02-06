/**
 * ImpersonationSession Entity Description
 *
 * This file documents the ImpersonationSession Prisma model for tracking
 * cross-tenant access by internal Ethico staff.
 *
 * SECURITY MODEL:
 * Every cross-tenant operation by internal staff MUST occur within an
 * ImpersonationSession. This provides:
 *
 * 1. EXPLICIT INTENT - Operator must declare which tenant and why
 * 2. TIME-BOUNDED - Sessions expire after max 4 hours
 * 3. AUDIT TRAIL - All actions within session are logged
 * 4. ACCOUNTABILITY - Reason and optional ticket ID required
 *
 * Session Flow:
 * 1. Operator selects target organization + enters reason (+ optional ticket)
 * 2. System creates ImpersonationSession with 4-hour expiration
 * 3. All API calls include session context
 * 4. Every mutation creates ImpersonationAuditLog entry
 * 5. Session ends manually or at expiration
 *
 * @see schema.prisma for the actual model definition
 * @see impersonation-audit-log.entity.ts for action logging
 */

import { InternalRole } from "../types/internal-roles.types";

/**
 * ImpersonationSession tracks a cross-tenant access session by internal staff.
 *
 * Prisma model:
 * ```prisma
 * model ImpersonationSession {
 *   id                   String       @id @default(uuid())
 *   operatorUserId       String       @map("operator_user_id")
 *   operatorRole         InternalRole @map("operator_role")
 *   targetOrganizationId String       @map("target_organization_id")
 *   reason               String
 *   ticketId             String?      @map("ticket_id")
 *   startedAt            DateTime     @default(now()) @map("started_at")
 *   endedAt              DateTime?    @map("ended_at")
 *   expiresAt            DateTime     @map("expires_at")
 *   ipAddress            String?      @map("ip_address")
 *   userAgent            String?      @map("user_agent")
 *
 *   // Relations
 *   operator     InternalUser @relation(fields: [operatorUserId], references: [id])
 *   organization Organization @relation(fields: [targetOrganizationId], references: [id])
 *   auditLogs    ImpersonationAuditLog[]
 *
 *   @@index([operatorUserId])
 *   @@index([targetOrganizationId])
 *   @@index([startedAt])
 *   @@map("impersonation_sessions")
 * }
 * ```
 */
export interface ImpersonationSession {
  /** Unique identifier */
  id: string;

  /** FK to InternalUser performing the impersonation */
  operatorUserId: string;

  /** Operator's role at time of session start (for audit) */
  operatorRole: InternalRole;

  /** FK to Organization being accessed */
  targetOrganizationId: string;

  /** Required reason for access (audit compliance) */
  reason: string;

  /** Optional support ticket reference */
  ticketId: string | null;

  /** Session start timestamp */
  startedAt: Date;

  /** Session end timestamp (null if still active) */
  endedAt: Date | null;

  /** Session expiration (max 4 hours from start) */
  expiresAt: Date;

  /** Client IP address (for audit) */
  ipAddress: string | null;

  /** Client user agent string (for audit) */
  userAgent: string | null;
}

/**
 * Session status derived from timestamps.
 */
export const ImpersonationSessionStatus = {
  /** Session is currently active */
  ACTIVE: "ACTIVE",
  /** Session was manually ended */
  ENDED: "ENDED",
  /** Session expired due to timeout */
  EXPIRED: "EXPIRED",
} as const;

export type ImpersonationSessionStatus =
  (typeof ImpersonationSessionStatus)[keyof typeof ImpersonationSessionStatus];

/**
 * DTO for starting an impersonation session.
 */
export interface StartImpersonationDto {
  /** Target organization ID */
  targetOrganizationId: string;

  /** Required reason for access */
  reason: string;

  /** Optional support ticket reference */
  ticketId?: string;
}

/**
 * DTO for session response with computed fields.
 */
export interface ImpersonationSessionResponse extends ImpersonationSession {
  /** Computed status based on timestamps */
  status: ImpersonationSessionStatus;

  /** Organization name for display */
  organizationName: string;

  /** Operator name for display */
  operatorName: string;

  /** Minutes remaining until expiration */
  minutesRemaining: number;

  /** Count of actions performed in this session */
  actionCount: number;
}

/**
 * Maximum session duration in hours.
 * Per CONTEXT.md, max 4 hours per session.
 */
export const MAX_SESSION_DURATION_HOURS = 4;

/**
 * Pre-defined reason options for session creation.
 * Operators can also enter free-text reasons.
 */
export const IMPERSONATION_REASONS = [
  "Customer support ticket investigation",
  "Configuration verification",
  "Bug reproduction/debugging",
  "Data migration support",
  "Training/onboarding assistance",
  "Urgent security investigation",
  "Other (specify in notes)",
] as const;

/**
 * Calculates session status from timestamps.
 */
export function getSessionStatus(
  session: Pick<ImpersonationSession, "endedAt" | "expiresAt">,
): ImpersonationSessionStatus {
  if (session.endedAt) {
    return ImpersonationSessionStatus.ENDED;
  }
  if (new Date() > session.expiresAt) {
    return ImpersonationSessionStatus.EXPIRED;
  }
  return ImpersonationSessionStatus.ACTIVE;
}

/**
 * Calculates minutes remaining in session.
 * Returns 0 if session is ended or expired.
 */
export function getMinutesRemaining(
  session: Pick<ImpersonationSession, "endedAt" | "expiresAt">,
): number {
  if (session.endedAt || new Date() > session.expiresAt) {
    return 0;
  }
  const remaining = session.expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / 60000));
}
