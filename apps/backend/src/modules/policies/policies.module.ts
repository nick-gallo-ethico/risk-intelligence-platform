import { Module } from "@nestjs/common";
import { PoliciesService } from "./policies.service";
import { PolicyApprovalService } from "./approval/policy-approval.service";
import { PolicyApprovalController } from "./approval/policy-approval.controller";
import { PolicyWorkflowListener } from "./listeners/workflow.listener";
import { WorkflowModule } from "../workflow/workflow.module";

/**
 * PoliciesModule provides policy management functionality.
 *
 * Features:
 * - Policy CRUD with version-on-publish pattern
 * - Draft editing with copy-on-edit from published versions
 * - Workflow-based approval integration
 * - Event-driven status synchronization
 *
 * Exports:
 * - PoliciesService: Core policy management
 * - PolicyApprovalService: Approval workflow integration
 */
@Module({
  imports: [
    // Import WorkflowModule to access WorkflowEngineService
    WorkflowModule,
  ],
  providers: [
    // Core policy services
    PoliciesService,
    // Approval workflow integration
    PolicyApprovalService,
    // Event listeners
    PolicyWorkflowListener,
  ],
  controllers: [
    // Approval endpoints
    PolicyApprovalController,
  ],
  exports: [
    PoliciesService,
    PolicyApprovalService,
  ],
})
export class PoliciesModule {}
