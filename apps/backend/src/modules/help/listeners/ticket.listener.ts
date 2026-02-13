/**
 * Ticket Event Listener
 *
 * Handles support ticket events and sends notifications.
 */

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  NotificationService,
  NotifyParams,
} from "../../notifications/services/notification.service";
import {
  NotificationCategory,
  NotificationType,
} from "../../notifications/entities/notification.types";
import { TicketCreatedEvent } from "../entities/help.types";

@Injectable()
export class TicketListener {
  private readonly logger = new Logger(TicketListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Handle support ticket creation event.
   * Sends a confirmation notification to the user who created the ticket.
   */
  @OnEvent("support.ticket.created", { async: true })
  async handleTicketCreated(event: TicketCreatedEvent): Promise<void> {
    const { ticket, organizationId, userId } = event;

    this.logger.log(
      `Handling ticket created event: ${ticket.ticketNumber} for user ${userId}`,
    );

    try {
      // Send notification to the user confirming ticket receipt
      const notifyParams: NotifyParams = {
        organizationId,
        recipientUserId: userId,
        // Use ASSIGNMENT as closest category for system notifications
        category: "ASSIGNMENT" as NotificationCategory,
        type: NotificationType.ASSIGNMENT,
        templateId: "support/ticket-received",
        context: {
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
        },
        title: `Support ticket ${ticket.ticketNumber} received`,
        body: `We've received your support request: "${ticket.subject}". Our team will respond shortly.`,
        entityType: "SUPPORT_TICKET",
        entityId: ticket.id,
      };

      await this.notificationService.notify(notifyParams);

      this.logger.debug(`Sent notification for ticket ${ticket.ticketNumber}`);
    } catch (error) {
      // Log error but don't throw - notification failure shouldn't block ticket creation
      this.logger.error(
        `Failed to send notification for ticket ${ticket.ticketNumber}: ${error.message}`,
        error.stack,
      );
    }
  }
}
