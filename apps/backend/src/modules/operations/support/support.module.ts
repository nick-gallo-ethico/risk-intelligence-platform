/**
 * SupportModule
 *
 * NestJS module for support console functionality.
 * Provides debug access to tenant data via impersonation.
 *
 * ENDPOINTS:
 * - GET  /api/v1/internal/support/tenants/search  (no impersonation required)
 * - GET  /api/v1/internal/support/tenants/:id     (requires impersonation)
 * - GET  /api/v1/internal/support/tenants/:id/errors
 * - GET  /api/v1/internal/support/tenants/:id/config
 * - GET  /api/v1/internal/support/tenants/:id/jobs
 * - GET  /api/v1/internal/support/tenants/:id/search-index
 *
 * DEPENDENCIES:
 * - ImpersonationModule: Session management and guards
 * - PrismaModule: Database access
 *
 * @see CONTEXT.md for Support team requirements
 * @see support-console.service.ts for business logic
 */

import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ImpersonationModule } from "../impersonation/impersonation.module";
import { SupportConsoleController } from "./support-console.controller";
import { SupportConsoleService } from "./support-console.service";

@Module({
  imports: [PrismaModule, ImpersonationModule],
  controllers: [SupportConsoleController],
  providers: [SupportConsoleService],
  exports: [SupportConsoleService],
})
export class SupportModule {}
