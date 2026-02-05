import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ActivityModule } from "../../common/activity.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { PoliciesService } from "./policies.service";
import { PoliciesController } from "./policies.controller";
import { PolicyApprovalService } from "./approval/policy-approval.service";
import { PolicyApprovalController } from "./approval/policy-approval.controller";
import { PolicyWorkflowListener } from "./listeners/workflow.listener";

/**
 * PoliciesModule provides policy management functionality.
 *
 * Features:
 * - Policy CRUD with version-on-publish pattern
 * - Draft editing with copy-on-edit from published versions
 * - Publishing creates immutable PolicyVersions
 * - Workflow-based approval integration
 * - Event-driven status synchronization
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
 *
 * Exports:
 * - PoliciesService: Core policy management
 * - PolicyApprovalService: Approval workflow integration
 */
@Module({
  imports: [
    PrismaModule,
    ActivityModule, // For ActivityService
    WorkflowModule, // For WorkflowEngineService
  ],
  controllers: [PoliciesController, PolicyApprovalController],
  providers: [PoliciesService, PolicyApprovalService, PolicyWorkflowListener],
  exports: [PoliciesService, PolicyApprovalService],
})
export class PoliciesModule {}
