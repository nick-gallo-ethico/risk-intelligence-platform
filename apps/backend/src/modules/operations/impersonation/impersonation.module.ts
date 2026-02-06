/**
 * ImpersonationModule
 *
 * NestJS module for cross-tenant impersonation functionality.
 * Provides session management, middleware, guards, and audit logging.
 *
 * EXPORTS:
 * - ImpersonationService: Session lifecycle management
 * - ImpersonationGuard: Route protection requiring impersonation
 *
 * MIDDLEWARE:
 * - ImpersonationMiddleware: Applied globally to detect X-Impersonation-Session
 *   and set tenant context. Applied to all routes.
 *
 * ENDPOINTS:
 * - POST   /api/v1/internal/impersonation/sessions
 * - DELETE /api/v1/internal/impersonation/sessions/:id
 * - POST   /api/v1/internal/impersonation/sessions/:id/validate
 * - GET    /api/v1/internal/impersonation/sessions/:id
 * - GET    /api/v1/internal/impersonation/sessions/:id/audit
 * - GET    /api/v1/internal/impersonation/my-sessions
 *
 * ARCHITECTURE:
 * This module is part of OperationsModule (internal tools).
 * It integrates with the existing PrismaModule for database access
 * and uses the ImpersonationSession/ImpersonationAuditLog Prisma models.
 *
 * @see operations.module.ts for parent module
 * @see impersonation.service.ts for session management
 * @see impersonation.middleware.ts for context setup
 */

import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ImpersonationService } from "./impersonation.service";
import { ImpersonationGuard } from "./impersonation.guard";
import { ImpersonationMiddleware } from "./impersonation.middleware";
import { ImpersonationController } from "./impersonation.controller";

@Module({
  imports: [PrismaModule],
  controllers: [ImpersonationController],
  providers: [ImpersonationService, ImpersonationGuard],
  exports: [ImpersonationService, ImpersonationGuard],
})
export class ImpersonationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middleware to all routes that might use impersonation
    // The middleware checks for X-Impersonation-Session header
    // and sets context only when present
    consumer.apply(ImpersonationMiddleware).forRoutes("*");
  }
}
