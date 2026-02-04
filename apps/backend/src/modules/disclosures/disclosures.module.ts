import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';
import { DisclosureFormService } from './disclosure-form.service';
import { DisclosureFormController } from './disclosure-form.controller';
import { ThresholdService } from './threshold.service';
import { ConflictDetectionService } from './conflict-detection.service';
import { AiTriageService } from './ai-triage.service';
import { TriageController } from './triage.controller';

/**
 * DisclosuresModule provides disclosure form template management,
 * threshold rule evaluation, conflict detection, and AI triage services.
 *
 * Phase 9: Campaigns & Disclosures
 *
 * Provides:
 * - DisclosureFormService: Form template CRUD with versioning (RS.32)
 * - ThresholdService: Threshold rule evaluation for auto-case creation (RS.35-38)
 * - ConflictDetectionService: Cross-system conflict detection (RS.41-46)
 * - AiTriageService: AI-assisted bulk triage (RS.47)
 *
 * Controllers:
 * - DisclosureFormController: REST endpoints for form template management
 * - TriageController: REST endpoints for AI bulk triage
 */
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    forwardRef(() => AiModule),
    CacheModule.register({
      ttl: 300000, // 5 minutes (in ms)
    }),
  ],
  controllers: [DisclosureFormController, TriageController],
  providers: [
    DisclosureFormService,
    ThresholdService,
    ConflictDetectionService,
    AiTriageService,
  ],
  exports: [
    DisclosureFormService,
    ThresholdService,
    ConflictDetectionService,
    AiTriageService,
  ],
})
export class DisclosuresModule {}
