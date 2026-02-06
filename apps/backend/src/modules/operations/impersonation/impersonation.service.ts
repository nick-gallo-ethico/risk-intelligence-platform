/**
 * ImpersonationService
 *
 * Manages cross-tenant impersonation sessions for internal Ethico staff.
 * Provides session lifecycle management with full audit logging.
 *
 * SECURITY MODEL:
 * - All cross-tenant access requires active ImpersonationSession
 * - Sessions have 4-hour max duration (configurable)
 * - Every action during session is logged to ImpersonationAuditLog
 * - Reason and optional ticket ID required for session creation
 *
 * USAGE:
 * 1. startSession() - Create session with reason/ticket
 * 2. validateSession() - Check if session is valid
 * 3. logAction() / logCurrentAction() - Audit actions
 * 4. endSession() - Terminate session
 *
 * CONTEXT MANAGEMENT:
 * This service works with ImpersonationMiddleware which:
 * - Reads X-Impersonation-Session header
 * - Sets req.impersonation context on Express request
 * - Configures RLS via SET LOCAL app.current_tenant
 *
 * @see impersonation.middleware.ts for context setup
 * @see impersonation.guard.ts for route protection
 * @see 12-CONTEXT.md for architecture decisions
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  InternalRole,
  ROLE_PERMISSIONS,
  InternalPermission,
} from "../types/internal-roles.types";
import { StartSessionDto } from "./dto/impersonation.dto";

/**
 * Maximum session duration in milliseconds.
 * Per CONTEXT.md: 4-hour max per session.
 */
const SESSION_MAX_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Impersonation context stored in request.
 * Set by ImpersonationMiddleware when X-Impersonation-Session header is present.
 */
export interface ImpersonationContext {
  /** Session ID */
  sessionId: string;

  /** Operator's internal user ID */
  operatorUserId: string;

  /** Operator's role at session start */
  operatorRole: InternalRole;

  /** Target organization being impersonated */
  targetOrganizationId: string;

  /** Reason for impersonation */
  reason: string;

  /** Optional support ticket reference */
  ticketId?: string;

  /** Session expiration time */
  expiresAt: Date;
}

/**
 * Extend Express Request type to include impersonation context.
 */
declare global {
  namespace Express {
    interface Request {
      impersonation?: ImpersonationContext;
    }
  }
}

@Injectable()
export class ImpersonationService {
  private readonly logger = new Logger(ImpersonationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start an impersonation session.
   *
   * Creates a new ImpersonationSession record with audit logging.
   * Session expires after SESSION_MAX_DURATION_MS (4 hours).
   *
   * @param operatorUserId - Internal user ID of the operator
   * @param dto - Session creation details (targetOrg, reason, ticketId)
   * @param ipAddress - Client IP address for audit
   * @param userAgent - Client user agent for audit
   * @returns Session ID and expiration time
   * @throws ForbiddenException if operator not found, inactive, or lacks permission
   * @throws NotFoundException if target organization not found
   */
  async startSession(
    operatorUserId: string,
    dto: StartSessionDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ sessionId: string; expiresAt: Date }> {
    // Validate operator exists and has permission
    const operator = await this.prisma.internalUser.findUnique({
      where: { id: operatorUserId },
    });

    if (!operator || !operator.isActive) {
      throw new ForbiddenException("Operator not found or inactive");
    }

    if (!this.canImpersonate(operator.role as InternalRole)) {
      throw new ForbiddenException(
        "Insufficient permissions for impersonation",
      );
    }

    // Validate target organization exists
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.targetOrganizationId },
    });

    if (!org) {
      throw new NotFoundException("Target organization not found");
    }

    // Create session (max 4 hours per CONTEXT.md)
    // No automatic timeout - manual exit only, but security cap at 4 hours
    const expiresAt = new Date(Date.now() + SESSION_MAX_DURATION_MS);

    const session = await this.prisma.impersonationSession.create({
      data: {
        operatorUserId,
        operatorRole: operator.role as InternalRole,
        targetOrganizationId: dto.targetOrganizationId,
        reason: dto.reason,
        ticketId: dto.ticketId,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Log session start
    await this.logAction(session.id, "SESSION_STARTED", null, null, {
      organizationName: org.name,
      reason: dto.reason,
      ticketId: dto.ticketId,
    });

    this.logger.log(
      `Impersonation session started: ${session.id} by ${operator.email} for ${org.name}`,
    );

    return { sessionId: session.id, expiresAt };
  }

  /**
   * End an impersonation session.
   *
   * Sets endedAt timestamp and logs session end.
   *
   * @param sessionId - Session to end
   * @param notes - Optional notes on session end
   * @throws NotFoundException if session not found
   * @throws ForbiddenException if session already ended
   */
  async endSession(sessionId: string, notes?: string): Promise<void> {
    const session = await this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    if (session.endedAt) {
      throw new ForbiddenException("Session already ended");
    }

    await this.prisma.impersonationSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });

    await this.logAction(sessionId, "SESSION_ENDED", null, null, { notes });

    this.logger.log(`Impersonation session ended: ${sessionId}`);
  }

  /**
   * Validate a session is active.
   *
   * Checks that session exists, is not ended, and not expired.
   *
   * @param sessionId - Session ID to validate
   * @returns ImpersonationContext if valid, null otherwise
   */
  async validateSession(
    sessionId: string,
  ): Promise<ImpersonationContext | null> {
    const session = await this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return null;
    if (session.endedAt) return null;
    if (new Date() > session.expiresAt) return null;

    return {
      sessionId: session.id,
      operatorUserId: session.operatorUserId,
      operatorRole: session.operatorRole as InternalRole,
      targetOrganizationId: session.targetOrganizationId,
      reason: session.reason,
      ticketId: session.ticketId ?? undefined,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Get remaining time for a session in seconds.
   *
   * @param sessionId - Session ID to check
   * @returns Remaining seconds, 0 if ended/expired/not found
   */
  async getRemainingSeconds(sessionId: string): Promise<number> {
    const session = await this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
      select: { endedAt: true, expiresAt: true },
    });

    if (!session) return 0;
    if (session.endedAt) return 0;

    const remaining = session.expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * Get session details with organization name.
   *
   * @param sessionId - Session ID to retrieve
   * @returns Session with organization details
   */
  async getSessionWithDetails(sessionId: string) {
    return this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
      include: {
        organization: { select: { id: true, name: true } },
        operator: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * Get active sessions for an operator.
   *
   * @param operatorUserId - Internal user ID
   * @returns List of active sessions
   */
  async getActiveSessions(operatorUserId: string) {
    const now = new Date();
    return this.prisma.impersonationSession.findMany({
      where: {
        operatorUserId,
        endedAt: null,
        expiresAt: { gt: now },
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
    });
  }

  /**
   * Log an action during impersonation.
   *
   * Creates ImpersonationAuditLog entry with session context.
   *
   * @param sessionId - Session ID
   * @param action - Action type (VIEW_CASE, UPDATE_USER, etc.)
   * @param entityType - Type of entity affected (optional)
   * @param entityId - ID of entity affected (optional)
   * @param details - Additional action details (optional)
   */
  async logAction(
    sessionId: string,
    action: string,
    entityType: string | null,
    entityId: string | null,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.impersonationAuditLog.create({
      data: {
        sessionId,
        action,
        entityType,
        entityId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details: details as any,
      },
    });
  }

  /**
   * Get audit logs for a session.
   *
   * @param sessionId - Session ID
   * @param limit - Max number of logs to return
   * @returns List of audit log entries
   */
  async getSessionAuditLogs(sessionId: string, limit = 100) {
    return this.prisma.impersonationAuditLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get audit logs for an organization.
   *
   * Returns all impersonation activity for a tenant.
   * Used for SOC 2 compliance and customer inquiries.
   *
   * @param organizationId - Organization ID
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns List of audit log entries with session context
   */
  async getOrganizationAuditLogs(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const dateFilter: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = startDate;
      if (endDate) dateFilter.createdAt.lte = endDate;
    }

    return this.prisma.impersonationAuditLog.findMany({
      where: {
        session: { targetOrganizationId: organizationId },
        ...dateFilter,
      },
      include: {
        session: {
          select: {
            operatorUserId: true,
            operatorRole: true,
            reason: true,
            ticketId: true,
            operator: { select: { email: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Check if a role has impersonation permission.
   *
   * @param role - Internal role to check
   * @returns true if role can impersonate
   */
  private canImpersonate(role: InternalRole): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;

    // ADMIN role with ALL permission has access to everything
    if (permissions.includes(InternalPermission.ALL)) return true;

    // Check for explicit impersonate permission
    return permissions.includes(InternalPermission.IMPERSONATE);
  }
}
