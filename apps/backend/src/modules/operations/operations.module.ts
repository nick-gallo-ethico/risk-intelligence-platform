/**
 * OperationsModule - Internal Operations Portal
 *
 * Aggregates all internal tooling for Ethico teams:
 * - Support Console (impersonation, debugging, config inspection)
 * - Implementation Portal (onboarding, migrations, checklist tracking)
 * - Hotline Operations (directive management, QA queue, operator status)
 * - Client Success (health metrics, usage analytics, benchmarks)
 *
 * ARCHITECTURE NOTE:
 * This module is NOT tenant-scoped - it operates across tenants
 * with elevated permissions and full audit logging.
 *
 * SECURITY MODEL:
 * - All endpoints require InternalUser authentication (via Azure AD SSO)
 * - All cross-tenant operations require active ImpersonationSession
 * - Every action produces ImpersonationAuditLog entries
 * - Session duration limited to 4 hours max
 * - Reason/ticket required for session creation
 *
 * Sub-modules (to be added in subsequent plans):
 * - ImpersonationModule: Session management and audit logging
 * - SupportModule: Debug tools, error logs, job monitoring
 * - ImplementationModule: Project tracking, checklists, migrations
 * - HotlineOpsModule: Directives, QA queue, operator dashboard
 * - ClientHealthModule: Health scores, usage metrics, benchmarks
 *
 * @see CONTEXT.md for detailed architecture decisions
 * @see internal-roles.types.ts for role definitions and permissions
 */

import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { ImplementationModule } from "./implementation/implementation.module";
import { ImpersonationModule } from "./impersonation/impersonation.module";

@Module({
  imports: [
    // Prisma for database access
    PrismaModule,
    // Audit module for general audit logging (in addition to impersonation-specific logs)
    AuditModule,
    // Impersonation module (cross-tenant access with audit logging)
    ImpersonationModule,
    // Implementation portal (go-live readiness, project tracking)
    ImplementationModule,
    // Sub-modules will be added in subsequent plans:
    // - 12-07: SupportModule (debugging tools)
    // - 12-08+: HotlineOpsModule (directives, QA)
    // - 12-14+: ClientHealthModule (health scores)
  ],
  controllers: [
    // Controllers will be added as sub-modules are implemented:
    // - ImpersonationController (session CRUD)
    // - SupportController (debug endpoints)
    // - DirectivesController (directive CRUD)
    // - ClientHealthController (metrics endpoints)
  ],
  providers: [
    // Services will be added as sub-modules are implemented:
    // - ImpersonationService
    // - ImpersonationAuditService
    // - InternalAuthService
    // - SupportDiagnosticsService
    // - ClientHealthService
  ],
  exports: [
    // Export sub-modules for use by other modules
    ImpersonationModule,
    ImplementationModule,
  ],
})
export class OperationsModule {}
