// =============================================================================
// POLICY APPROVAL SERVICE - Integrates policies with workflow engine
// =============================================================================
//
// This service handles policy approval workflows by delegating to the existing
// WorkflowEngineService. It does NOT implement its own approval logic.
//
// KEY BEHAVIORS:
// - Submit policy for approval -> starts workflow instance
// - Cancel approval -> cancels workflow instance
// - Get approval status -> queries workflow instance state
// - All status changes come via workflow events (see PolicyWorkflowListener)
// =============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { WorkflowEngineService } from "../../workflow/engine/workflow-engine.service";
import {
  Policy,
  PolicyStatus,
  WorkflowInstance,
  WorkflowTemplate,
  WorkflowEntityType,
  WorkflowInstanceStatus,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";
import { WorkflowStage } from "../../workflow/types/workflow.types";

/**
 * Result of submitting a policy for approval.
 */
export interface SubmitForApprovalResult {
  policy: Policy;
  workflowInstanceId: string;
}

/**
 * Approval status summary for a policy.
 */
export interface ApprovalStatusResult {
  policy: Policy;
  workflowInstance: (WorkflowInstance & { template: WorkflowTemplate }) | null;
  currentStep: {
    stageId: string;
    stageName: string;
    description?: string;
  } | null;
  reviewers: Array<{
    userId: string;
    userName?: string;
    status: string;
  }>;
  isActive: boolean;
}

/**
 * Event emitted when a policy is submitted for approval.
 */
export class PolicySubmittedForApprovalEvent {
  static readonly eventName = "policy.submitted_for_approval";

  constructor(
    public readonly organizationId: string,
    public readonly policyId: string,
    public readonly policyTitle: string,
    public readonly workflowInstanceId: string,
    public readonly submittedById: string,
    public readonly submissionNotes?: string,
  ) {}
}

/**
 * Event emitted when policy approval is cancelled.
 */
export class PolicyApprovalCancelledEvent {
  static readonly eventName = "policy.approval_cancelled";

  constructor(
    public readonly organizationId: string,
    public readonly policyId: string,
    public readonly policyTitle: string,
    public readonly cancelledById: string,
    public readonly reason?: string,
  ) {}
}

/**
 * PolicyApprovalService integrates policy approval with the workflow engine.
 *
 * All approval logic is delegated to WorkflowEngineService. This service
 * provides policy-specific wrappers and emits policy events.
 */
@Injectable()
export class PolicyApprovalService {
  private readonly logger = new Logger(PolicyApprovalService.name);

  constructor(
    private prisma: PrismaService,
    private workflowEngine: WorkflowEngineService,
    private auditService: AuditService,
    private eventEmitter: EventEmitter2,
  ) {}

  // -------------------------------------------------------------------------
  // SUBMIT FOR APPROVAL
  // -------------------------------------------------------------------------

  /**
   * Submits a policy for approval by starting a workflow instance.
   *
   * @param policyId - ID of the policy to submit
   * @param workflowTemplateId - Optional specific template (uses default if null)
   * @param submissionNotes - Optional notes for reviewers
   * @param userId - ID of the user submitting
   * @param organizationId - Organization ID for tenant isolation
   * @returns The updated policy and workflow instance ID
   *
   * @throws NotFoundException if policy not found
   * @throws BadRequestException if policy not in DRAFT status or has no content
   * @throws NotFoundException if no workflow template configured
   */
  async submitForApproval(
    policyId: string,
    workflowTemplateId: string | null,
    submissionNotes: string | undefined,
    userId: string,
    organizationId: string,
  ): Promise<SubmitForApprovalResult> {
    // 1. Verify policy exists and is in DRAFT status
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, organizationId },
    });

    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} not found`);
    }

    if (policy.status !== PolicyStatus.DRAFT) {
      throw new BadRequestException(
        `Policy must be in DRAFT status to submit for approval. Current status: ${policy.status}`,
      );
    }

    // 2. Verify policy has draft content
    if (!policy.draftContent || policy.draftContent.trim() === "") {
      throw new BadRequestException(
        "Policy must have draft content before submitting for approval",
      );
    }

    // 3. Determine workflow template
    const templateId =
      workflowTemplateId ||
      (await this.getDefaultWorkflowTemplate(organizationId))?.id;

    if (!templateId) {
      throw new BadRequestException(
        "No approval workflow configured. Please configure a workflow template for policies or select a specific template.",
      );
    }

    // 4. Start workflow instance via WorkflowEngineService
    const workflowInstanceId = await this.workflowEngine.startWorkflow({
      organizationId,
      entityType: WorkflowEntityType.POLICY,
      entityId: policyId,
      templateId,
      actorUserId: userId,
    });

    // 5. Update policy status to PENDING_APPROVAL
    const updatedPolicy = await this.prisma.policy.update({
      where: { id: policyId },
      data: {
        status: PolicyStatus.PENDING_APPROVAL,
        updatedAt: new Date(),
      },
    });

    // 6. Log activity
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.POLICY,
      entityId: policyId,
      action: "submitted_for_approval",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Policy "${policy.title}" submitted for approval`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: {
        workflowInstanceId,
        workflowTemplateId: templateId,
        submissionNotes,
      },
    });

    // 7. Emit event
    this.emitEvent(
      PolicySubmittedForApprovalEvent.eventName,
      new PolicySubmittedForApprovalEvent(
        organizationId,
        policyId,
        policy.title,
        workflowInstanceId,
        userId,
        submissionNotes,
      ),
    );

    this.logger.log(
      `Policy ${policyId} submitted for approval with workflow ${workflowInstanceId}`,
    );

    return { policy: updatedPolicy, workflowInstanceId };
  }

  // -------------------------------------------------------------------------
  // CANCEL APPROVAL
  // -------------------------------------------------------------------------

  /**
   * Cancels an active approval workflow for a policy.
   *
   * @param policyId - ID of the policy
   * @param reason - Reason for cancellation
   * @param userId - ID of the user cancelling
   * @param organizationId - Organization ID for tenant isolation
   * @returns The updated policy (back to DRAFT status)
   *
   * @throws NotFoundException if policy not found
   * @throws BadRequestException if policy has no active approval workflow
   */
  async cancelApproval(
    policyId: string,
    reason: string,
    userId: string,
    organizationId: string,
  ): Promise<Policy> {
    // 1. Verify policy exists
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, organizationId },
    });

    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} not found`);
    }

    // 2. Find active workflow instance
    const workflowInstance = await this.prisma.workflowInstance.findFirst({
      where: {
        organizationId,
        entityType: WorkflowEntityType.POLICY,
        entityId: policyId,
        status: WorkflowInstanceStatus.ACTIVE,
      },
    });

    if (!workflowInstance) {
      throw new BadRequestException(
        `No active approval workflow found for policy ${policyId}`,
      );
    }

    // 3. Cancel workflow via WorkflowEngineService
    await this.workflowEngine.cancel(workflowInstance.id, userId, reason);

    // 4. Update policy status back to DRAFT
    const updatedPolicy = await this.prisma.policy.update({
      where: { id: policyId },
      data: {
        status: PolicyStatus.DRAFT,
        updatedAt: new Date(),
      },
    });

    // 5. Log activity
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.POLICY,
      entityId: policyId,
      action: "approval_cancelled",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Policy "${policy.title}" approval workflow cancelled: ${reason}`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: {
        workflowInstanceId: workflowInstance.id,
        reason,
      },
    });

    // 6. Emit event
    this.emitEvent(
      PolicyApprovalCancelledEvent.eventName,
      new PolicyApprovalCancelledEvent(
        organizationId,
        policyId,
        policy.title,
        userId,
        reason,
      ),
    );

    this.logger.log(`Policy ${policyId} approval workflow cancelled`);

    return updatedPolicy;
  }

  // -------------------------------------------------------------------------
  // GET APPROVAL STATUS
  // -------------------------------------------------------------------------

  /**
   * Gets the current approval status for a policy.
   *
   * @param policyId - ID of the policy
   * @param organizationId - Organization ID for tenant isolation
   * @returns Approval status including workflow state, current step, and reviewers
   *
   * @throws NotFoundException if policy not found
   */
  async getApprovalStatus(
    policyId: string,
    organizationId: string,
  ): Promise<ApprovalStatusResult> {
    // 1. Find policy
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, organizationId },
    });

    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} not found`);
    }

    // 2. Find workflow instance (may not exist if never submitted)
    const workflowInstance = await this.prisma.workflowInstance.findFirst({
      where: {
        organizationId,
        entityType: WorkflowEntityType.POLICY,
        entityId: policyId,
      },
      include: { template: true },
      orderBy: { createdAt: "desc" }, // Get most recent
    });

    if (!workflowInstance) {
      return {
        policy,
        workflowInstance: null,
        currentStep: null,
        reviewers: [],
        isActive: false,
      };
    }

    // 3. Parse current step from workflow template stages
    const stages = workflowInstance.template
      .stages as unknown as WorkflowStage[];
    const currentStage = stages.find(
      (s) => s.id === workflowInstance.currentStage,
    );

    const currentStep = currentStage
      ? {
          stageId: currentStage.id,
          stageName: currentStage.name,
          description: currentStage.description,
        }
      : null;

    // 4. Get reviewers (from step assignees if available)
    // Note: This is a simplified implementation. Full implementation would
    // query WorkflowStepAssignment table when it exists.
    const reviewers: Array<{
      userId: string;
      userName?: string;
      status: string;
    }> = [];

    // For now, check stepStates for completed approvals
    const stepStates = workflowInstance.stepStates as Record<
      string,
      { completedBy?: string; status?: string }
    >;
    for (const [_stepId, state] of Object.entries(stepStates)) {
      if (state.completedBy) {
        reviewers.push({
          userId: state.completedBy,
          status: state.status || "completed",
        });
      }
    }

    return {
      policy,
      workflowInstance,
      currentStep,
      reviewers,
      isActive: workflowInstance.status === WorkflowInstanceStatus.ACTIVE,
    };
  }

  // -------------------------------------------------------------------------
  // GET DEFAULT WORKFLOW TEMPLATE
  // -------------------------------------------------------------------------

  /**
   * Gets the default workflow template for policies.
   *
   * @param organizationId - Organization ID for tenant isolation
   * @returns The default workflow template, or null if none configured
   */
  async getDefaultWorkflowTemplate(
    organizationId: string,
  ): Promise<WorkflowTemplate | null> {
    // Look for default template specifically for POLICY entity type
    const policyTemplate = await this.prisma.workflowTemplate.findFirst({
      where: {
        organizationId,
        entityType: WorkflowEntityType.POLICY,
        isDefault: true,
        isActive: true,
      },
    });

    if (policyTemplate) {
      return policyTemplate;
    }

    // Fall back to any default active template that could be used
    // (some organizations may have a general approval workflow)
    return null;
  }

  // -------------------------------------------------------------------------
  // GET AVAILABLE WORKFLOW TEMPLATES
  // -------------------------------------------------------------------------

  /**
   * Gets all workflow templates available for policy approval.
   *
   * @param organizationId - Organization ID for tenant isolation
   * @returns Array of available workflow templates
   */
  async getAvailableWorkflowTemplates(
    organizationId: string,
  ): Promise<WorkflowTemplate[]> {
    // Get all active templates for POLICY entity type
    const templates = await this.prisma.workflowTemplate.findMany({
      where: {
        organizationId,
        entityType: WorkflowEntityType.POLICY,
        isActive: true,
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return templates;
  }

  // -------------------------------------------------------------------------
  // PRIVATE HELPERS
  // -------------------------------------------------------------------------

  /**
   * Emits an event safely, catching and logging any errors.
   */
  private emitEvent(eventName: string, event: object): void {
    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
