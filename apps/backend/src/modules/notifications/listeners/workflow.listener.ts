/**
 * WorkflowEventListener - Handles workflow domain events for notification dispatch
 *
 * Listens to workflow events (step completed, approval needed) and dispatches
 * notifications to relevant users.
 *
 * Uses async: true on all handlers per RESEARCH.md to prevent blocking requests.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';

/**
 * Event emitted when a workflow step is completed.
 */
interface WorkflowStepCompletedEvent {
  organizationId: string;
  workflowInstanceId: string;
  stepId: string;
  stepName: string;
  completedByUserId: string;
  nextStepAssigneeId?: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
}

/**
 * Event emitted when a workflow step requires approval.
 */
interface WorkflowApprovalNeededEvent {
  organizationId: string;
  workflowInstanceId: string;
  stepId: string;
  stepName: string;
  approverId: string;
  requesterName?: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
}

/**
 * Event emitted when a workflow approval is granted.
 */
interface WorkflowApprovalGrantedEvent {
  organizationId: string;
  workflowInstanceId: string;
  stepId: string;
  stepName: string;
  approvedByUserId: string;
  requesterUserId: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
}

/**
 * Event emitted when a workflow approval is rejected.
 */
interface WorkflowApprovalRejectedEvent {
  organizationId: string;
  workflowInstanceId: string;
  stepId: string;
  stepName: string;
  rejectedByUserId: string;
  requesterUserId: string;
  rejectionReason?: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
}

@Injectable()
export class WorkflowEventListener {
  private readonly logger = new Logger(WorkflowEventListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Handle workflow step completion events.
   * Notifies the next assignee when their step becomes active.
   */
  @OnEvent('workflow.step_completed', { async: true })
  async handleStepCompleted(event: WorkflowStepCompletedEvent): Promise<void> {
    this.logger.debug(
      `Handling workflow.step_completed for step ${event.stepId}`,
    );

    if (!event.nextStepAssigneeId) {
      this.logger.debug('No next step assignee, skipping notification');
      return;
    }

    try {
      await this.notificationService.notify({
        organizationId: event.organizationId,
        recipientUserId: event.nextStepAssigneeId,
        category: 'ASSIGNMENT',
        type: 'ASSIGNMENT',
        templateId: 'workflow/step-assigned',
        context: {
          stepName: event.stepName,
          workflowInstanceId: event.workflowInstanceId,
          entityType: event.entityType,
          entityId: event.entityId,
        },
        title: `Workflow step ready: ${event.stepName}`,
        body: 'A workflow step has been assigned to you.',
        entityType: event.entityType,
        entityId: event.entityId,
        isUrgent: true, // Workflow assignments are urgent
      });
    } catch (error) {
      this.logger.error(
        `Failed to send workflow step completion notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle workflow approval request events.
   * Notifies the approver that their approval is needed.
   */
  @OnEvent('workflow.approval_needed', { async: true })
  async handleApprovalNeeded(event: WorkflowApprovalNeededEvent): Promise<void> {
    this.logger.debug(
      `Handling workflow.approval_needed for step ${event.stepId} -> ${event.approverId}`,
    );

    try {
      await this.notificationService.notify({
        organizationId: event.organizationId,
        recipientUserId: event.approverId,
        category: 'APPROVAL',
        type: 'APPROVAL',
        templateId: 'workflow/approval-needed',
        context: {
          stepName: event.stepName,
          requesterName: event.requesterName,
          workflowInstanceId: event.workflowInstanceId,
          entityType: event.entityType,
          entityId: event.entityId,
        },
        title: `Approval needed: ${event.stepName}`,
        body: event.requesterName
          ? `${event.requesterName} is requesting your approval.`
          : 'Your approval is needed for a workflow step.',
        entityType: event.entityType,
        entityId: event.entityId,
        isUrgent: true, // Approval requests are urgent per CONTEXT.md
      });
    } catch (error) {
      this.logger.error(
        `Failed to send approval needed notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle workflow approval granted events.
   * Notifies the requester that their request was approved.
   */
  @OnEvent('workflow.approval_granted', { async: true })
  async handleApprovalGranted(event: WorkflowApprovalGrantedEvent): Promise<void> {
    this.logger.debug(
      `Handling workflow.approval_granted for step ${event.stepId}`,
    );

    try {
      // Approval outcomes go to in-app (FYI, not urgent)
      await this.notificationService.sendInApp({
        organizationId: event.organizationId,
        recipientUserId: event.requesterUserId,
        category: 'STATUS_UPDATE',
        title: `Approved: ${event.stepName}`,
        body: 'Your workflow step has been approved.',
        entityType: event.entityType,
        entityId: event.entityId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send approval granted notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle workflow approval rejected events.
   * Notifies the requester that their request was rejected.
   */
  @OnEvent('workflow.approval_rejected', { async: true })
  async handleApprovalRejected(event: WorkflowApprovalRejectedEvent): Promise<void> {
    this.logger.debug(
      `Handling workflow.approval_rejected for step ${event.stepId}`,
    );

    try {
      // Rejections are more important - send both email and in-app
      await this.notificationService.notify({
        organizationId: event.organizationId,
        recipientUserId: event.requesterUserId,
        category: 'STATUS_UPDATE',
        type: 'STATUS_UPDATE',
        templateId: 'workflow/approval-rejected',
        context: {
          stepName: event.stepName,
          rejectionReason: event.rejectionReason,
          workflowInstanceId: event.workflowInstanceId,
          entityType: event.entityType,
          entityId: event.entityId,
        },
        title: `Rejected: ${event.stepName}`,
        body: event.rejectionReason
          ? `Your request was rejected: ${event.rejectionReason}`
          : 'Your workflow step has been rejected.',
        entityType: event.entityType,
        entityId: event.entityId,
        isUrgent: false, // Status updates are not urgent
      });
    } catch (error) {
      this.logger.error(
        `Failed to send approval rejected notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
