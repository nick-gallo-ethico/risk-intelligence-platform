/**
 * CaseEventListener - Handles case domain events for notification dispatch
 *
 * Listens to case events (assignments, status changes) and dispatches
 * appropriate notifications via NotificationService.
 *
 * Uses async: true on all handlers per RESEARCH.md to prevent blocking requests.
 */

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "../services/notification.service";
import { CaseAssignedEvent, CaseStatusChangedEvent } from "../../events/events";

@Injectable()
export class CaseEventListener {
  private readonly logger = new Logger(CaseEventListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Handle case assignment events.
   * Sends urgent notification to new assignee (always real-time per CONTEXT.md).
   */
  @OnEvent("case.assigned", { async: true })
  async handleCaseAssigned(event: CaseAssignedEvent): Promise<void> {
    this.logger.debug(
      `Handling case.assigned for case ${event.caseId} -> ${event.newAssigneeId}`,
    );

    try {
      await this.notificationService.notify({
        organizationId: event.organizationId,
        recipientUserId: event.newAssigneeId,
        category: "ASSIGNMENT",
        type: "ASSIGNMENT",
        templateId: "assignment/case-assigned",
        context: {
          case: {
            id: event.caseId,
            referenceNumber: "", // Will be populated by service if needed
            categoryName: "",
            severity: "",
          },
        },
        title: "New case assigned to you",
        body: "A case has been assigned to you and requires your attention.",
        entityType: "case",
        entityId: event.caseId,
        isUrgent: true, // Assignments are always urgent per CONTEXT.md
      });
    } catch (error) {
      this.logger.error(
        `Failed to send case assignment notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle case status change events.
   * Queues for daily digest (not urgent per CONTEXT.md).
   */
  @OnEvent("case.status_changed", { async: true })
  async handleStatusChanged(event: CaseStatusChangedEvent): Promise<void> {
    this.logger.debug(
      `Handling case.status_changed for case ${event.caseId}: ${event.previousStatus} -> ${event.newStatus}`,
    );

    try {
      // Status changes go to daily digest per CONTEXT.md (not urgent)
      await this.notificationService.queueForDigest({
        organizationId: event.organizationId,
        userId: event.actorUserId || "", // Notify the actor (or need to find assignee)
        type: "STATUS_UPDATE",
        entityType: "case",
        entityId: event.caseId,
        metadata: {
          previousStatus: event.previousStatus,
          newStatus: event.newStatus,
          rationale: event.rationale,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to queue case status change notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
