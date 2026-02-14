import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";
import { RemediationNotificationService } from "../remediation-notification.service";
import { AuditService } from "../../audit/audit.service";

/**
 * Remediation Step Created Event Payload
 */
export interface RemediationStepCreatedEvent {
  organizationId: string;
  stepId: string;
  planId: string;
  userId: string;
}

/**
 * Remediation Step Completed Event Payload
 */
export interface RemediationStepCompletedEvent {
  organizationId: string;
  stepId: string;
  planId: string;
  userId: string;
  requiresApproval: boolean;
}

/**
 * Remediation Step Approved Event Payload
 */
export interface RemediationStepApprovedEvent {
  organizationId: string;
  stepId: string;
  planId: string;
  userId: string;
}

/**
 * Remediation Plan Created Event Payload
 */
export interface RemediationPlanCreatedEvent {
  organizationId: string;
  planId: string;
  caseId: string;
  userId: string;
}

/**
 * Remediation Plan Updated Event Payload
 */
export interface RemediationPlanUpdatedEvent {
  organizationId: string;
  planId: string;
  userId: string;
}

/**
 * Remediation Plan Completed Event Payload
 */
export interface RemediationPlanCompletedEvent {
  organizationId: string;
  planId: string;
  caseId: string;
  userId: string;
}

/**
 * Remediation Event Handler
 *
 * Listens for remediation events and triggers appropriate notifications:
 * - Step created: Notify assignee, schedule reminders
 * - Step completed: Cancel reminders, notify CO if approval needed
 * - Step approved: Notify assignee
 * - Plan created: Log for audit
 * - Plan completed: Notify case owner
 *
 * Events are emitted by RemediationService and RemediationStepService.
 */
@Injectable()
export class RemediationEventHandler {
  private readonly logger = new Logger(RemediationEventHandler.name);

  constructor(
    private readonly notificationService: RemediationNotificationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Handle step creation - notify assignee and schedule reminders.
   */
  @OnEvent("remediation.step.created")
  async handleStepCreated(event: RemediationStepCreatedEvent): Promise<void> {
    this.logger.log(`Handling step created: ${event.stepId}`);

    try {
      // Notify assignee about the new assignment
      await this.notificationService.notifyStepAssigned(
        event.organizationId,
        event.stepId,
      );

      // Schedule reminders based on due date
      await this.notificationService.scheduleReminders(
        event.organizationId,
        event.stepId,
      );

      // Audit log
      await this.auditService.log({
        organizationId: event.organizationId,
        entityType: AuditEntityType.REMEDIATION_STEP,
        entityId: event.stepId,
        action: "created",
        actionCategory: AuditActionCategory.CREATE,
        actionDescription: "Remediation step created and assignee notified",
        actorUserId: event.userId,
        actorType: ActorType.USER,
      });
    } catch (error) {
      this.logger.error(
        `Error handling step created: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle step completion - cancel reminders, notify CO if approval needed.
   */
  @OnEvent("remediation.step.completed")
  async handleStepCompleted(
    event: RemediationStepCompletedEvent,
  ): Promise<void> {
    this.logger.log(`Handling step completed: ${event.stepId}`);

    try {
      // Cancel any scheduled reminders since step is done
      await this.notificationService.cancelReminders(event.stepId);

      // If step requires approval, notify compliance officers
      if (event.requiresApproval) {
        await this.notificationService.notifyStepCompletedForApproval(
          event.organizationId,
          event.stepId,
        );
      }

      // Audit log
      await this.auditService.log({
        organizationId: event.organizationId,
        entityType: AuditEntityType.REMEDIATION_STEP,
        entityId: event.stepId,
        action: "completed",
        actionCategory: AuditActionCategory.UPDATE,
        actionDescription: event.requiresApproval
          ? "Remediation step completed, awaiting CO approval"
          : "Remediation step completed",
        actorUserId: event.userId,
        actorType: ActorType.USER,
      });
    } catch (error) {
      this.logger.error(
        `Error handling step completed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle step approval - notify the assignee.
   */
  @OnEvent("remediation.step.approved")
  async handleStepApproved(event: RemediationStepApprovedEvent): Promise<void> {
    this.logger.log(`Handling step approved: ${event.stepId}`);

    try {
      // Notify the assignee that their step was approved
      await this.notificationService.notifyStepApproved(
        event.organizationId,
        event.stepId,
      );

      // Audit log
      await this.auditService.log({
        organizationId: event.organizationId,
        entityType: AuditEntityType.REMEDIATION_STEP,
        entityId: event.stepId,
        action: "approved",
        actionCategory: AuditActionCategory.UPDATE,
        actionDescription: "Remediation step approved by compliance officer",
        actorUserId: event.userId,
        actorType: ActorType.USER,
      });
    } catch (error) {
      this.logger.error(
        `Error handling step approved: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle plan creation - log for audit.
   */
  @OnEvent("remediation.plan.created")
  async handlePlanCreated(event: RemediationPlanCreatedEvent): Promise<void> {
    this.logger.log(`Handling plan created: ${event.planId}`);

    try {
      // Audit log for plan creation
      await this.auditService.log({
        organizationId: event.organizationId,
        entityType: AuditEntityType.REMEDIATION_PLAN,
        entityId: event.planId,
        action: "created",
        actionCategory: AuditActionCategory.CREATE,
        actionDescription: `Remediation plan created for case`,
        actorUserId: event.userId,
        actorType: ActorType.USER,
        context: { caseId: event.caseId },
      });
    } catch (error) {
      this.logger.error(
        `Error handling plan created: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle plan update - log for audit.
   */
  @OnEvent("remediation.plan.updated")
  async handlePlanUpdated(event: RemediationPlanUpdatedEvent): Promise<void> {
    this.logger.log(`Handling plan updated: ${event.planId}`);

    try {
      await this.auditService.log({
        organizationId: event.organizationId,
        entityType: AuditEntityType.REMEDIATION_PLAN,
        entityId: event.planId,
        action: "updated",
        actionCategory: AuditActionCategory.UPDATE,
        actionDescription: "Remediation plan updated",
        actorUserId: event.userId,
        actorType: ActorType.USER,
      });
    } catch (error) {
      this.logger.error(
        `Error handling plan updated: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle plan completion - notify case owner.
   */
  @OnEvent("remediation.plan.completed")
  async handlePlanCompleted(
    event: RemediationPlanCompletedEvent,
  ): Promise<void> {
    this.logger.log(`Handling plan completed: ${event.planId}`);

    try {
      // Notify the case owner that the remediation plan is complete
      await this.notificationService.notifyPlanCompleted(
        event.organizationId,
        event.planId,
      );

      // Audit log
      await this.auditService.log({
        organizationId: event.organizationId,
        entityType: AuditEntityType.REMEDIATION_PLAN,
        entityId: event.planId,
        action: "completed",
        actionCategory: AuditActionCategory.UPDATE,
        actionDescription: "Remediation plan completed - all steps finished",
        actorUserId: event.userId,
        actorType: ActorType.USER,
        context: { caseId: event.caseId },
      });
    } catch (error) {
      this.logger.error(
        `Error handling plan completed: ${error.message}`,
        error.stack,
      );
    }
  }
}
