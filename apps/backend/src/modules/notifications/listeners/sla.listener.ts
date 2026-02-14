/**
 * SlaEventListener - Handles SLA domain events for notification dispatch
 *
 * Listens to SLA events (warnings, breaches, critical) and dispatches
 * urgent notifications to assignees and supervisors.
 *
 * Per CONTEXT.md SLA escalation:
 * - SLA warning: notify assignee
 * - SLA breach: notify assignee + supervisor
 * - SLA critical (48h+ overdue): escalate to compliance officer
 *
 * Uses async: true on all handlers per RESEARCH.md to prevent blocking requests.
 */

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "../services/notification.service";
import {
  SlaWarningEvent,
  SlaBreachedEvent,
  SlaCriticalEvent,
} from "../../events/events/sla.events";

@Injectable()
export class SlaEventListener {
  private readonly logger = new Logger(SlaEventListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Handle SLA warning events.
   * Sends urgent notification to case assignee.
   */
  @OnEvent("sla.warning", { async: true })
  async handleSlaWarning(event: SlaWarningEvent): Promise<void> {
    this.logger.debug(
      `Handling sla.warning for case ${event.caseId}: ${event.hoursRemaining}h remaining`,
    );

    try {
      await this.notificationService.notify({
        organizationId: event.organizationId,
        recipientUserId: event.assigneeId,
        category: "DEADLINE",
        type: "DEADLINE",
        templateId: "deadline/sla-warning",
        context: {
          case: {
            id: event.caseId,
            referenceNumber: event.referenceNumber,
            categoryName: "",
            severity: "",
            dueDate: event.dueDate,
          },
          hoursRemaining: event.hoursRemaining,
          threshold: event.threshold,
        },
        title: `SLA Warning: ${event.hoursRemaining}h remaining`,
        body: `Case ${event.referenceNumber} is approaching its SLA deadline.`,
        entityType: "case",
        entityId: event.caseId,
        isUrgent: true, // SLA warnings are always urgent
      });
    } catch (error) {
      this.logger.error(
        `Failed to send SLA warning notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle SLA breach events.
   * Sends urgent notification to both assignee and supervisor.
   */
  @OnEvent("sla.breached", { async: true })
  async handleSlaBreach(event: SlaBreachedEvent): Promise<void> {
    this.logger.debug(
      `Handling sla.breached for case ${event.caseId}: ${event.hoursOverdue}h overdue`,
    );

    try {
      // Notify assignee
      await this.notificationService.notify({
        organizationId: event.organizationId,
        recipientUserId: event.assigneeId,
        category: "ESCALATION",
        type: "ESCALATION",
        templateId: "deadline/sla-breach",
        context: {
          case: {
            id: event.caseId,
            referenceNumber: event.referenceNumber,
            categoryName: "",
            severity: "",
          },
          hoursOverdue: event.hoursOverdue,
        },
        title: `SLA BREACHED: Case ${event.referenceNumber}`,
        body: `Case has exceeded its SLA by ${event.hoursOverdue} hours.`,
        entityType: "case",
        entityId: event.caseId,
        isUrgent: true,
      });

      // Notify supervisor if available
      if (event.supervisorId) {
        await this.notificationService.notify({
          organizationId: event.organizationId,
          recipientUserId: event.supervisorId,
          category: "ESCALATION",
          type: "ESCALATION",
          templateId: "deadline/sla-breach-escalation",
          context: {
            case: {
              id: event.caseId,
              referenceNumber: event.referenceNumber,
              categoryName: "",
              severity: "",
            },
            hoursOverdue: event.hoursOverdue,
            assigneeId: event.assigneeId,
          },
          title: `SLA BREACHED: Case ${event.referenceNumber} (Supervisor Alert)`,
          body: `A case assigned to your team has exceeded its SLA.`,
          entityType: "case",
          entityId: event.caseId,
          isUrgent: true,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to send SLA breach notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle SLA critical events.
   * Escalates to compliance officer when case is 48h+ overdue.
   */
  @OnEvent("sla.critical", { async: true })
  async handleSlaCritical(event: SlaCriticalEvent): Promise<void> {
    this.logger.debug(
      `Handling sla.critical for case ${event.caseId}: ${event.hoursOverdue}h overdue`,
    );

    try {
      // Notify compliance officer
      await this.notificationService.notify({
        organizationId: event.organizationId,
        recipientUserId: event.complianceOfficerId,
        category: "ESCALATION",
        type: "ESCALATION",
        templateId: "deadline/sla-critical",
        context: {
          case: {
            id: event.caseId,
            referenceNumber: event.referenceNumber,
            categoryName: "",
            severity: "",
          },
          hoursOverdue: event.hoursOverdue,
          assigneeId: event.assigneeId,
          supervisorId: event.supervisorId,
        },
        title: `CRITICAL: Case ${event.referenceNumber} requires immediate attention`,
        body: `Case has been overdue for ${event.hoursOverdue}+ hours and requires compliance review.`,
        entityType: "case",
        entityId: event.caseId,
        isUrgent: true,
      });

      // Also continue notifying assignee and supervisor
      await this.notificationService.notify({
        organizationId: event.organizationId,
        recipientUserId: event.assigneeId,
        category: "ESCALATION",
        type: "ESCALATION",
        templateId: "deadline/sla-critical-assignee",
        context: {
          case: {
            id: event.caseId,
            referenceNumber: event.referenceNumber,
            categoryName: "",
            severity: "",
          },
          hoursOverdue: event.hoursOverdue,
        },
        title: `CRITICAL: Case ${event.referenceNumber} escalated to compliance`,
        body: `This case has been escalated to compliance due to SLA breach.`,
        entityType: "case",
        entityId: event.caseId,
        isUrgent: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send SLA critical notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
