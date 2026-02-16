import { Module, forwardRef } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AiModule } from "../ai/ai.module";
import { DisclosureFormService } from "./disclosure-form.service";
import { DisclosureFormController } from "./disclosure-form.controller";
import { ThresholdService } from "./threshold.service";
import { ConflictDetectionService } from "./conflict-detection.service";
import { ConflictMatchingService } from "./services/conflict-matching.service";
import { ConflictExclusionService } from "./services/conflict-exclusion.service";
import { DisclosureDraftService } from "./services/disclosure-draft.service";
import { DisclosureQueryService } from "./services/disclosure-query.service";
import { DisclosureSubmissionService } from "./disclosure-submission.service";
import { AiTriageService } from "./ai-triage.service";
import { TriageInterpreterService } from "./services/triage-interpreter.service";
import { TriagePreviewService } from "./services/triage-preview.service";
import { TriageExecutorService } from "./services/triage-executor.service";
import { TriageController } from "./triage.controller";
import { ConflictController } from "./conflict.controller";

/**
 * DisclosuresModule provides disclosure form template management,
 * threshold rule evaluation, conflict detection, and AI triage services.
 *
 * Phase 9: Campaigns & Disclosures
 *
 * Provides:
 * - DisclosureFormService: Form template CRUD with versioning (RS.32)
 * - ThresholdService: Threshold rule evaluation for auto-case creation (RS.35-38)
 * - ConflictDetectionService: Cross-system conflict detection coordinator (RS.41-46)
 * - ConflictMatchingService: Fuzzy matching and individual conflict checks
 * - ConflictExclusionService: Exclusion management
 * - DisclosureSubmissionService: Disclosure submission coordinator
 * - DisclosureDraftService: Draft save/resume functionality
 * - DisclosureQueryService: Query operations and DTO mapping
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
  controllers: [DisclosureFormController, TriageController, ConflictController],
  providers: [
    DisclosureFormService,
    ThresholdService,
    ConflictMatchingService,
    ConflictExclusionService,
    ConflictDetectionService,
    DisclosureDraftService,
    DisclosureQueryService,
    DisclosureSubmissionService,
    // Triage services (split from ai-triage.service.ts)
    TriageInterpreterService,
    TriagePreviewService,
    TriageExecutorService,
    AiTriageService,
  ],
  exports: [
    DisclosureFormService,
    ThresholdService,
    ConflictDetectionService,
    ConflictMatchingService,
    ConflictExclusionService,
    DisclosureDraftService,
    DisclosureQueryService,
    DisclosureSubmissionService,
    AiTriageService,
  ],
})
export class DisclosuresModule {}
