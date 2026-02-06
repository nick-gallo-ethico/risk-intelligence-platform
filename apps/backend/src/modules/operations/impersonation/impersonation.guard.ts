/**
 * ImpersonationGuard
 *
 * Guard for routes that REQUIRE an active impersonation session.
 * Use on routes that should only be accessible when impersonating.
 *
 * USAGE:
 * ```typescript
 * @Controller('api/v1/internal/support')
 * @UseGuards(ImpersonationGuard)
 * export class SupportController {
 *   @Get('cases')
 *   async getCases(@Req() req: Request) {
 *     // req.impersonation is guaranteed to be present
 *     const orgId = req.impersonation.targetOrganizationId;
 *   }
 * }
 * ```
 *
 * BEHAVIOR:
 * 1. Checks for X-Impersonation-Session header
 * 2. Validates session with ImpersonationService
 * 3. Ensures req.impersonation context is set
 * 4. Throws ForbiddenException if invalid/missing
 *
 * PREREQUISITES:
 * - ImpersonationMiddleware should run before this guard
 * - If middleware already set context, guard validates it
 * - If middleware missed it, guard sets context
 *
 * @see impersonation.middleware.ts for context setup
 * @see impersonation.service.ts for session validation
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Request } from "express";
import {
  ImpersonationService,
  ImpersonationContext,
} from "./impersonation.service";

@Injectable()
export class ImpersonationGuard implements CanActivate {
  constructor(private readonly impersonationService: ImpersonationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.headers["x-impersonation-session"] as string;

    if (!sessionId) {
      throw new ForbiddenException("Impersonation session required");
    }

    // Check if middleware already set context
    if (request.impersonation) {
      // Validate it's still valid (not expired since middleware ran)
      if (new Date() < request.impersonation.expiresAt) {
        return true;
      }
    }

    // Validate session
    const impersonationContext =
      await this.impersonationService.validateSession(sessionId);

    if (!impersonationContext) {
      throw new ForbiddenException("Invalid or expired impersonation session");
    }

    // Ensure request context is set (middleware should have done this)
    if (!request.impersonation) {
      request.impersonation = impersonationContext;
    }

    return true;
  }
}

/**
 * RequireImpersonation
 *
 * Decorator that combines UseGuards with ImpersonationGuard.
 * Provides cleaner syntax for controllers.
 *
 * USAGE:
 * ```typescript
 * @Controller('api/v1/internal/support')
 * export class SupportController {
 *   @Get('cases')
 *   @RequireImpersonation()
 *   async getCases(@Req() req: Request) {
 *     // req.impersonation is guaranteed
 *   }
 * }
 * ```
 */
import { UseGuards, applyDecorators } from "@nestjs/common";

export function RequireImpersonation() {
  return applyDecorators(UseGuards(ImpersonationGuard));
}

/**
 * CurrentImpersonation
 *
 * Parameter decorator to inject impersonation context directly.
 *
 * USAGE:
 * ```typescript
 * @Get('cases')
 * @RequireImpersonation()
 * async getCases(
 *   @CurrentImpersonation() ctx: ImpersonationContext,
 * ) {
 *   const orgId = ctx.targetOrganizationId;
 * }
 * ```
 */
import { createParamDecorator } from "@nestjs/common";

export const CurrentImpersonation = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ImpersonationContext | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.impersonation;
  },
);
