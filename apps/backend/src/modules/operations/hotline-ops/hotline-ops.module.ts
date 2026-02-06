/**
 * HotlineOpsModule - Hotline Operations Module
 *
 * Provides internal tooling for Ethico hotline operations team:
 * - Directive management (CRUD with versioning, approval workflow)
 * - Bulk QA actions (approve, reject, reassign across tenants)
 * - Operator status tracking (real-time via cache)
 *
 * This module is part of the Internal Operations Portal (Phase 12).
 * All endpoints operate across tenants with full audit logging.
 *
 * @see 12-CONTEXT.md for detailed requirements
 */

import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditModule } from "../../audit/audit.module";
import { HotlineOpsController } from "./hotline-ops.controller";
import { DirectiveAdminService } from "./directive-admin.service";
import { BulkQaService } from "./bulk-qa.service";
import { OperatorStatusService } from "./operator-status.service";

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    CacheModule.register(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [HotlineOpsController],
  providers: [DirectiveAdminService, BulkQaService, OperatorStatusService],
  exports: [DirectiveAdminService, BulkQaService, OperatorStatusService],
})
export class HotlineOpsModule {}
