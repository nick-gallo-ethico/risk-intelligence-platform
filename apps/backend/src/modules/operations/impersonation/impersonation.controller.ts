/**
 * ImpersonationController
 *
 * REST API for impersonation session management.
 * Used by Internal Operations Portal to start/end/validate sessions.
 *
 * ENDPOINTS:
 * - POST   /api/v1/internal/impersonation/sessions       - Start session
 * - DELETE /api/v1/internal/impersonation/sessions/:id   - End session
 * - POST   /api/v1/internal/impersonation/sessions/:id/validate - Check session
 * - GET    /api/v1/internal/impersonation/sessions/:id   - Get session details
 * - GET    /api/v1/internal/impersonation/sessions/:id/audit - Get audit logs
 *
 * AUTHENTICATION:
 * These endpoints require internal authentication (InternalUser).
 * Currently placeholder - will be implemented with InternalAuthGuard.
 *
 * SECURITY:
 * - All session operations are audited
 * - Session start requires reason (audit compliance)
 * - Only authorized internal roles can create sessions
 *
 * @see impersonation.service.ts for business logic
 * @see 12-CONTEXT.md for architecture decisions
 */

import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from "@nestjs/common";
import { Request } from "express";
import { ImpersonationService } from "./impersonation.service";
import {
  StartSessionDto,
  EndSessionDto,
  SessionValidationResponse,
} from "./dto/impersonation.dto";

// Extend Express Request to include internalUser (for future InternalAuthGuard)
declare global {
  namespace Express {
    interface Request {
      internalUser?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

@Controller("internal/impersonation")
export class ImpersonationController {
  constructor(private readonly impersonationService: ImpersonationService) {}

  /**
   * Start an impersonation session.
   *
   * POST /api/v1/internal/impersonation/sessions
   *
   * Body:
   * - targetOrganizationId: UUID of org to impersonate
   * - reason: Required justification (min 10 chars)
   * - ticketId: Optional support ticket reference
   *
   * Returns:
   * - sessionId: UUID of created session
   * - expiresAt: Session expiration timestamp
   *
   * TODO: Add InternalAuthGuard when internal auth is implemented
   */
  @Post("sessions")
  // @UseGuards(InternalAuthGuard)
  async startSession(@Body() dto: StartSessionDto, @Req() req: Request) {
    // TODO: Get operator ID from internal auth
    const operatorUserId = req.internalUser?.id;
    if (!operatorUserId) {
      // For development/testing, require operatorUserId in headers
      const devOperatorId = req.headers["x-internal-user-id"] as string;
      if (!devOperatorId) {
        throw new ForbiddenException(
          "Internal authentication required. Set X-Internal-User-Id header for development.",
        );
      }

      const ipAddress =
        req.ip || (req.headers["x-forwarded-for"] as string)?.split(",")[0];
      const userAgent = req.headers["user-agent"];

      return this.impersonationService.startSession(
        devOperatorId,
        dto,
        ipAddress,
        userAgent,
      );
    }

    const ipAddress =
      req.ip || (req.headers["x-forwarded-for"] as string)?.split(",")[0];
    const userAgent = req.headers["user-agent"];

    return this.impersonationService.startSession(
      operatorUserId,
      dto,
      ipAddress,
      userAgent,
    );
  }

  /**
   * End an impersonation session.
   *
   * DELETE /api/v1/internal/impersonation/sessions/:sessionId
   *
   * Body (optional):
   * - notes: Session end notes
   *
   * Returns: 204 No Content on success
   */
  @Delete("sessions/:sessionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async endSession(
    @Param("sessionId") sessionId: string,
    @Body() dto: EndSessionDto,
  ) {
    await this.impersonationService.endSession(sessionId, dto.notes);
  }

  /**
   * Validate a session (health check).
   *
   * POST /api/v1/internal/impersonation/sessions/:sessionId/validate
   *
   * Returns:
   * - valid: boolean
   * - organizationId: Target org (if valid)
   * - expiresAt: Expiration timestamp (if valid)
   * - remainingSeconds: Seconds until expiration (if valid)
   */
  @Post("sessions/:sessionId/validate")
  async validateSession(
    @Param("sessionId") sessionId: string,
  ): Promise<SessionValidationResponse> {
    const context = await this.impersonationService.validateSession(sessionId);

    if (!context) {
      return { valid: false };
    }

    return {
      valid: true,
      organizationId: context.targetOrganizationId,
      expiresAt: context.expiresAt,
      remainingSeconds: Math.floor(
        (context.expiresAt.getTime() - Date.now()) / 1000,
      ),
    };
  }

  /**
   * Get session details.
   *
   * GET /api/v1/internal/impersonation/sessions/:sessionId
   *
   * Returns: Session with organization and operator details
   */
  @Get("sessions/:sessionId")
  async getSession(@Param("sessionId") sessionId: string) {
    const session =
      await this.impersonationService.getSessionWithDetails(sessionId);

    if (!session) {
      throw new ForbiddenException("Session not found");
    }

    // Calculate remaining time
    const remaining = session.expiresAt.getTime() - Date.now();
    const isActive = !session.endedAt && remaining > 0;

    return {
      ...session,
      remainingSeconds: isActive ? Math.floor(remaining / 1000) : 0,
      status: session.endedAt ? "ENDED" : remaining <= 0 ? "EXPIRED" : "ACTIVE",
    };
  }

  /**
   * Get audit logs for a session.
   *
   * GET /api/v1/internal/impersonation/sessions/:sessionId/audit
   *
   * Returns: List of audit log entries for the session
   */
  @Get("sessions/:sessionId/audit")
  async getSessionAuditLogs(@Param("sessionId") sessionId: string) {
    return this.impersonationService.getSessionAuditLogs(sessionId);
  }

  /**
   * Get active sessions for current operator.
   *
   * GET /api/v1/internal/impersonation/my-sessions
   *
   * Returns: List of active sessions for the authenticated internal user
   */
  @Get("my-sessions")
  async getMySessions(@Req() req: Request) {
    const operatorUserId =
      req.internalUser?.id || (req.headers["x-internal-user-id"] as string);

    if (!operatorUserId) {
      throw new ForbiddenException("Internal authentication required");
    }

    return this.impersonationService.getActiveSessions(operatorUserId);
  }
}
