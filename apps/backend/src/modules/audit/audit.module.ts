import { Module, Global } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { AuditDescriptionService } from "./audit-description.service";
import { CaseAuditHandler } from "./handlers/case-audit.handler";
import { InvestigationAuditHandler } from "./handlers/investigation-audit.handler";
import { AuditController } from "./audit.controller";

/**
 * Global module providing unified audit logging across the application.
 *
 * The @Global() decorator makes AuditService and AuditDescriptionService
 * available to all modules without explicit imports.
 *
 * Event handlers automatically subscribe to domain events and create
 * audit log entries with natural language descriptions.
 */
@Global()
@Module({
  providers: [
    AuditService,
    AuditDescriptionService,
    CaseAuditHandler,
    InvestigationAuditHandler,
  ],
  controllers: [AuditController],
  exports: [AuditService, AuditDescriptionService],
})
export class AuditModule {}
