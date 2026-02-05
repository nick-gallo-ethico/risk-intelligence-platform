import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ActivityModule } from "../../common/activity.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { AiModule } from "../ai/ai.module";
import { PoliciesService } from "./policies.service";
import { PoliciesController } from "./policies.controller";
import { PolicyApprovalService } from "./approval/policy-approval.service";
import { PolicyApprovalController } from "./approval/policy-approval.controller";
import { PolicyWorkflowListener } from "./listeners/workflow.listener";
import { TranslationStaleListener } from "./listeners/translation-stale.listener";
import { PolicyTranslationService } from "./translations/policy-translation.service";
import { PolicyTranslationController } from "./translations/policy-translation.controller";
import { PolicyCaseAssociationService } from "./associations/policy-case-association.service";
import { PolicyCaseAssociationController } from "./associations/policy-case-association.controller";

/**
 * PoliciesModule provides policy management functionality.
 *
 * Features:
 * - Policy CRUD with version-on-publish pattern
 * - Draft editing with copy-on-edit from published versions
 * - Publishing creates immutable PolicyVersions
 * - Workflow-based approval integration
 * - Event-driven status synchronization
 * - AI-powered translation with staleness tracking
 *
 * Endpoints:
 * - POST /policies - Create policy
 * - GET /policies - List policies with filtering
 * - GET /policies/:id - Get single policy
 * - PUT /policies/:id - Update draft
 * - POST /policies/:id/publish - Publish as new version
 * - POST /policies/:id/retire - Retire policy
 * - GET /policies/:id/versions - Get version history
 * - GET /policies/versions/:versionId - Get specific version
 * - POST /policies/:id/approval - Submit for approval
 * - POST /policies/versions/:versionId/translations - Create translation
 * - GET /policies/versions/:versionId/translations - Get version translations
 * - PUT /policies/translations/:id - Update translation
 * - POST /policies/translations/:id/review - Review translation
 * - POST /policies/translations/:id/refresh - Refresh stale translation
 * - GET /policies/translations/stale - Get stale translations
 * - GET /policies/translations/languages - Get available languages
 *
 * Policy-Case Associations:
 * - POST /policy-case-associations - Create policy-case link
 * - GET /policy-case-associations - Query associations
 * - GET /policy-case-associations/:id - Get single association
 * - PUT /policy-case-associations/:id - Update association
 * - DELETE /policy-case-associations/:id - Delete association
 * - GET /policy-case-associations/by-policy/:policyId - Get by policy
 * - GET /policy-case-associations/by-case/:caseId - Get by case
 * - GET /policy-case-associations/violation-stats - Get violation stats
 *
 * Exports:
 * - PoliciesService: Core policy management
 * - PolicyApprovalService: Approval workflow integration
 * - PolicyTranslationService: AI and manual translation management
 * - PolicyCaseAssociationService: Policy-case linking
 */
@Module({
  imports: [
    PrismaModule,
    ActivityModule, // For ActivityService
    WorkflowModule, // For WorkflowEngineService
    AiModule, // For SkillRegistry (translation skill)
  ],
  controllers: [
    PoliciesController,
    PolicyApprovalController,
    PolicyTranslationController,
    PolicyCaseAssociationController,
  ],
  providers: [
    PoliciesService,
    PolicyApprovalService,
    PolicyWorkflowListener,
    TranslationStaleListener,
    PolicyTranslationService,
    PolicyCaseAssociationService,
  ],
  exports: [
    PoliciesService,
    PolicyApprovalService,
    PolicyTranslationService,
    PolicyCaseAssociationService,
  ],
})
export class PoliciesModule {}
