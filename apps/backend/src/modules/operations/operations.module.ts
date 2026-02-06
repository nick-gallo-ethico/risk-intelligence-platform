/**
 * OperationsModule - Internal Operations Portal
 *
 * Aggregates all internal tooling for Ethico teams:
 * - Support Console (impersonation, debugging, config inspection)
 * - Implementation Portal (onboarding, migrations, checklist tracking)
 * - Hotline Operations (directive management, QA queue, operator status)
 * - Client Success (health metrics, usage analytics, benchmarks)
 * - Training (certification, courses, quizzes)
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
 * Sub-modules:
 * - ImpersonationModule: Session management and audit logging
 * - SupportModule: Debug tools, error logs, job monitoring
 * - ImplementationModule: Project tracking, checklists, migrations
 * - HotlineOpsModule: Directives, QA queue, operator dashboard
 * - ClientHealthModule: Health scores, usage metrics, benchmarks
 * - TrainingModule: Certification, courses, quizzes
 *
 * @see CONTEXT.md for detailed architecture decisions
 * @see internal-roles.types.ts for role definitions and permissions
 */

import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { ImplementationModule } from "./implementation/implementation.module";
import { ImpersonationModule } from "./impersonation/impersonation.module";
import { ClientHealthModule } from "./client-health/client-health.module";
import { HotlineOpsModule } from "./hotline-ops/hotline-ops.module";
import { TrainingModule } from "./training/training.module";
import { SupportModule } from "./support/support.module";

@Module({
  imports: [
    // Prisma for database access
    PrismaModule,
    // Audit module for general audit logging (in addition to impersonation-specific logs)
    AuditModule,
    // Impersonation module (cross-tenant access with audit logging)
    ImpersonationModule,
    // Support console (debug tools, error logs, config inspection)
    SupportModule,
    // Implementation portal (go-live readiness, project tracking)
    ImplementationModule,
    // Client health metrics (health scores, usage metrics, benchmarks)
    ClientHealthModule,
    // Hotline operations (directives, QA queue, operator status)
    HotlineOpsModule,
    // Training and certification (courses, quizzes, certificates)
    TrainingModule,
  ],
  controllers: [
    // Controllers are registered via sub-modules:
    // - ImpersonationController (via ImpersonationModule)
    // - SupportConsoleController (via SupportModule)
    // - ClientHealthController (via ClientHealthModule)
    // - ImplementationController (via ImplementationModule)
    // - GoLiveController (via ImplementationModule)
    // - HotlineOpsController (via HotlineOpsModule)
    // - TrainingController (via TrainingModule)
  ],
  providers: [
    // Services are registered via sub-modules:
    // - ImpersonationService (via ImpersonationModule)
    // - SupportConsoleService (via SupportModule)
    // - HealthScoreService, UsageMetricsService (via ClientHealthModule)
    // - ImplementationService, ChecklistService (via ImplementationModule)
  ],
  exports: [
    // Export sub-modules for use by other modules
    ImpersonationModule,
    SupportModule,
    ImplementationModule,
    ClientHealthModule,
    HotlineOpsModule,
    TrainingModule,
  ],
})
export class OperationsModule {}
