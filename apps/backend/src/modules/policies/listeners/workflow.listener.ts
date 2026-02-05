// =============================================================================
// POLICY WORKFLOW LISTENER - Syncs workflow events to policy status
// =============================================================================
//
// This listener subscribes to workflow events and updates policy status
// accordingly. It ensures policy status stays in sync with workflow state.
//
// EVENT MAPPINGS:
// - workflow.completed (POLICY) -> Policy status = APPROVED
// - workflow.cancelled (POLICY) -> Policy status = DRAFT
//
// KEY BEHAVIORS:
// - All handlers check entityType === 'POLICY' before processing
// - Errors are caught and logged, not thrown (per project pattern)
// - All changes emit policy-specific events for downstream consumers
// =============================================================================

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import {
  WorkflowCompletedEvent,
  WorkflowCancelledEvent,
  WorkflowTransitionedEvent,
} from "../../workflow/events/workflow.events";
import {
  PolicyStatus,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";

/**
 * Event emitted when a policy is approved via workflow.
 */
export class PolicyApprovedEvent {
  static readonly eventName = "policy.approved";

  constructor(
    public readonly organizationId: string,
    public readonly policyId: string,
    public readonly policyTitle: string,
    public readonly workflowInstanceId: string,
    public readonly approvedAt: Date,
  ) {}
}

/**
 * Event emitted when a policy is rejected via workflow.
 */
export class PolicyRejectedEvent {
  static readonly eventName = "policy.rejected";

  constructor(
    public readonly organizationId: string,
    public readonly policyId: string,
    public readonly policyTitle: string,
    public readonly workflowInstanceId: string,
    public readonly reason?: string,
  ) {}
}

/**
 * Event emitted when a policy approval step is completed.
 */
export class PolicyApprovalStepCompletedEvent {
  static readonly eventName = "policy.approval_step_completed";

  constructor(
    public readonly organizationId: string,
    public readonly policyId: string,
    public readonly policyTitle: string,
    public readonly workflowInstanceId: string,
    public readonly previousStage: string,
    public readonly newStage: string,
    public readonly completedById?: string,
  ) {}
}

/**
 * PolicyWorkflowListener subscribes to workflow events and updates
 * policy status based on workflow state changes.
 *
 * This decouples policy status management from the workflow engine,
 * allowing the workflow module to remain generic.
 */
@Injectable()
export class PolicyWorkflowListener {
  private readonly logger = new Logger(PolicyWorkflowListener.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  // -------------------------------------------------------------------------
  // WORKFLOW COMPLETED - Policy approved
  // -------------------------------------------------------------------------

  /**
   * Handles workflow completion for policies.
   * Updates policy status to APPROVED when workflow completes successfully.
   *
   * @param event - The workflow completed event
   */
  @OnEvent(WorkflowCompletedEvent.eventName, { async: true })
  async onWorkflowCompleted(event: WorkflowCompletedEvent): Promise<void> {
    try {
      // Only process POLICY entity types
      if (event.entityType !== "POLICY") {
        return;
      }

      this.logger.log(
        `Processing workflow completion for policy ${event.entityId}`,
      );

      // Get policy for audit logging
      const policy = await this.prisma.policy.findUnique({
        where: { id: event.entityId },
      });

      if (!policy) {
        this.logger.warn(
          `Policy ${event.entityId} not found for workflow completion`,
        );
        return;
      }

      // Update policy status to APPROVED
      await this.prisma.policy.update({
        where: { id: event.entityId },
        data: {
          status: PolicyStatus.APPROVED,
          updatedAt: new Date(),
        },
      });

      // Log activity
      await this.auditService.log({
        organizationId: event.organizationId,
        entityType: AuditEntityType.POLICY,
        entityId: event.entityId,
        action: "approved",
        actionCategory: AuditActionCategory.SYSTEM, // Workflow actions categorized as SYSTEM
        actionDescription: `Policy "${policy.title}" approved via workflow`,
        actorUserId: event.actorUserId,
        actorType: event.actorUserId ? ActorType.USER : ActorType.SYSTEM,
        context: {
          workflowInstanceId: event.instanceId,
          outcome: event.outcome,
        },
      });

      // Emit policy-specific event
      this.emitEvent(
        PolicyApprovedEvent.eventName,
        new PolicyApprovedEvent(
          event.organizationId,
          event.entityId,
          policy.title,
          event.instanceId,
          new Date(),
        ),
      );

      this.logger.log(
        `Policy ${event.entityId} approved via workflow ${event.instanceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling workflow completion for policy: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw - let other listeners continue
    }
  }

  // -------------------------------------------------------------------------
  // WORKFLOW CANCELLED - Policy returned to draft
  // -------------------------------------------------------------------------

  /**
   * Handles workflow cancellation for policies.
   * Updates policy status back to DRAFT when workflow is cancelled.
   *
   * @param event - The workflow cancelled event
   */
  @OnEvent(WorkflowCancelledEvent.eventName, { async: true })
  async onWorkflowCancelled(event: WorkflowCancelledEvent): Promise<void> {
    try {
      // Only process POLICY entity types
      if (event.entityType !== "POLICY") {
        return;
      }

      this.logger.log(
        `Processing workflow cancellation for policy ${event.entityId}`,
      );

      // Get policy for audit logging
      const policy = await this.prisma.policy.findUnique({
        where: { id: event.entityId },
      });

      if (!policy) {
        this.logger.warn(
          `Policy ${event.entityId} not found for workflow cancellation`,
        );
        return;
      }

      // Note: Status update is already handled by PolicyApprovalService.cancelApproval()
      // when the user explicitly cancels. This handler covers system/external cancellations.
      // Check if status needs updating (may already be DRAFT if cancelled via service).
      if (policy.status === PolicyStatus.PENDING_APPROVAL) {
        await this.prisma.policy.update({
          where: { id: event.entityId },
          data: {
            status: PolicyStatus.DRAFT,
            updatedAt: new Date(),
          },
        });

        // Log activity (only if we updated status)
        await this.auditService.log({
          organizationId: event.organizationId,
          entityType: AuditEntityType.POLICY,
          entityId: event.entityId,
          action: "approval_workflow_cancelled",
          actionCategory: AuditActionCategory.SYSTEM, // Workflow actions categorized as SYSTEM
          actionDescription: `Policy "${policy.title}" approval workflow cancelled${event.reason ? `: ${event.reason}` : ""}`,
          actorUserId: event.actorUserId,
          actorType: event.actorUserId ? ActorType.USER : ActorType.SYSTEM,
          context: {
            workflowInstanceId: event.instanceId,
            reason: event.reason,
          },
        });
      }

      // Emit policy-specific event
      this.emitEvent(
        PolicyRejectedEvent.eventName,
        new PolicyRejectedEvent(
          event.organizationId,
          event.entityId,
          policy.title,
          event.instanceId,
          event.reason,
        ),
      );

      this.logger.log(
        `Policy ${event.entityId} workflow cancelled, returned to DRAFT`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling workflow cancellation for policy: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw - let other listeners continue
    }
  }

  // -------------------------------------------------------------------------
  // WORKFLOW TRANSITIONED - Log step progress
  // -------------------------------------------------------------------------

  /**
   * Handles workflow transitions for policies.
   * Logs activity when workflow moves between stages.
   *
   * @param event - The workflow transitioned event
   */
  @OnEvent(WorkflowTransitionedEvent.eventName, { async: true })
  async onWorkflowTransitioned(event: WorkflowTransitionedEvent): Promise<void> {
    try {
      // Only process POLICY entity types
      if (event.entityType !== "POLICY") {
        return;
      }

      this.logger.debug(
        `Processing workflow transition for policy ${event.entityId}: ${event.previousStage} -> ${event.newStage}`,
      );

      // Get policy for audit logging
      const policy = await this.prisma.policy.findUnique({
        where: { id: event.entityId },
      });

      if (!policy) {
        this.logger.warn(
          `Policy ${event.entityId} not found for workflow transition`,
        );
        return;
      }

      // Log activity for the transition
      await this.auditService.log({
        organizationId: event.organizationId,
        entityType: AuditEntityType.POLICY,
        entityId: event.entityId,
        action: "approval_step_completed",
        actionCategory: AuditActionCategory.SYSTEM, // Workflow actions categorized as SYSTEM
        actionDescription: `Policy "${policy.title}" approval progressed from "${event.previousStage}" to "${event.newStage}"`,
        actorUserId: event.actorUserId,
        actorType: event.actorUserId ? ActorType.USER : ActorType.SYSTEM,
        context: {
          workflowInstanceId: event.instanceId,
          previousStage: event.previousStage,
          newStage: event.newStage,
          reason: event.reason,
        },
      });

      // Emit policy-specific event for notifications
      this.emitEvent(
        PolicyApprovalStepCompletedEvent.eventName,
        new PolicyApprovalStepCompletedEvent(
          event.organizationId,
          event.entityId,
          policy.title,
          event.instanceId,
          event.previousStage,
          event.newStage,
          event.actorUserId || undefined,
        ),
      );
    } catch (error) {
      this.logger.error(
        `Error handling workflow transition for policy: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw - let other listeners continue
    }
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
