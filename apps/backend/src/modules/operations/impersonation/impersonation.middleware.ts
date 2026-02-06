/**
 * ImpersonationMiddleware
 *
 * Detects X-Impersonation-Session header and sets tenant context.
 * Works alongside TenantMiddleware but takes precedence when active.
 *
 * FLOW:
 * 1. Check for X-Impersonation-Session header
 * 2. If present, validate session with ImpersonationService
 * 3. If valid:
 *    - Set req.impersonation context
 *    - Override tenant context via SET LOCAL app.current_tenant
 *    - Add response headers for client UI (remaining time, org ID)
 * 4. If invalid/expired, set X-Impersonation-Invalid header
 *
 * RESPONSE HEADERS:
 * - X-Impersonation-Remaining: Seconds until session expires
 * - X-Impersonation-Org: Target organization ID
 * - X-Impersonation-Invalid: Set to "true" if session is invalid
 *
 * SECURITY:
 * - RLS context is overridden to target organization
 * - All subsequent database queries are scoped to impersonated tenant
 * - Original tenant context (if any) is preserved in req.organizationId
 *
 * @see impersonation.service.ts for session validation
 * @see impersonation.guard.ts for route protection
 */

import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ImpersonationService,
  ImpersonationContext,
} from "./impersonation.service";

@Injectable()
export class ImpersonationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ImpersonationMiddleware.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly impersonationService: ImpersonationService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const sessionId = req.headers["x-impersonation-session"] as string;

    if (sessionId) {
      const context =
        await this.impersonationService.validateSession(sessionId);

      if (context) {
        // Set impersonation context on request
        req.impersonation = context;

        // Override tenant context for RLS
        // This ensures all database queries use the impersonated tenant
        await this.prisma.$executeRawUnsafe(
          `SELECT set_config('app.current_organization', '${context.targetOrganizationId}', true)`,
        );

        // Add response headers for client UI
        const remaining = context.expiresAt.getTime() - Date.now();
        res.setHeader(
          "X-Impersonation-Remaining",
          Math.floor(remaining / 1000).toString(),
        );
        res.setHeader("X-Impersonation-Org", context.targetOrganizationId);

        this.logger.debug(
          `Impersonation context set for session ${sessionId} -> org ${context.targetOrganizationId}`,
        );
      } else {
        // Invalid/expired session - client should clear header
        res.setHeader("X-Impersonation-Invalid", "true");
        this.logger.warn(`Invalid impersonation session: ${sessionId}`);
      }
    }

    next();
  }
}

/**
 * Helper function to check if request is currently impersonating.
 *
 * @param req - Express request object
 * @returns true if valid impersonation context is present
 */
export function isImpersonating(req: Request): boolean {
  if (!req.impersonation) return false;
  return new Date() < req.impersonation.expiresAt;
}

/**
 * Helper function to get effective organization ID.
 *
 * Returns impersonated org if active, otherwise original org from request.
 *
 * @param req - Express request object
 * @returns Organization ID (impersonated or original)
 */
export function getEffectiveOrganizationId(req: Request): string | undefined {
  if (isImpersonating(req)) {
    return req.impersonation!.targetOrganizationId;
  }
  return req.organizationId;
}
