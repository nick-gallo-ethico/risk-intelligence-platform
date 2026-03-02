/**
 * Case Message Event Listener
 *
 * Listens for outbound messages (investigator -> reporter) and queues
 * notification emails with random delay to prevent timing attacks.
 *
 * CRITICAL:
 * - Uses random delay (1-6hr default) to prevent timing correlation attacks
 * - Does NOT include message content in notification for privacy
 * - Checks tenant settings for autoNotifyOnMessage flag
 *
 * @see 42-04-PLAN.md - Notification Delivery Wiring
 */

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DelayedNotificationService } from "../services/delayed-notification.service";
import { OrganizationService } from "../../organization/organization.service";
import { PrismaService } from "../../prisma/prisma.service";
import { REPORTER_MESSAGE_NOTIFICATION_TEMPLATE } from "../templates";

/**
 * Event payload from message sent to reporter.
 */
export interface CaseMessageSentEvent {
  /** Organization ID for tenant isolation */
  organizationId: string;
  /** Case ID the message belongs to */
  caseId: string;
  /** Message ID for tracking */
  messageId: string;
  /** User ID of the sender (investigator) */
  actorUserId: string;
  /** Direction of the message */
  direction: "outbound";
}

/**
 * Listens for outbound messages (investigator -> reporter) and sends
 * notification email to reporter with random delay.
 *
 * CRITICAL:
 * - Uses random delay (1-6hr) to prevent timing attacks
 * - Does NOT include message content in notification
 * - Checks tenant settings for autoNotifyOnMessage flag
 */
@Injectable()
export class CaseMessageSentListener {
  private readonly logger = new Logger(CaseMessageSentListener.name);

  constructor(
    private readonly delayedNotificationService: DelayedNotificationService,
    private readonly organizationService: OrganizationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handle case.message.sent event.
   *
   * Only processes outbound messages (to reporter). Queues delayed
   * notification if:
   * - Message direction is outbound
   * - Tenant has autoNotifyOnMessage enabled
   * - Reporter has email on file
   *
   * @param event - Case message sent event payload
   */
  @OnEvent("case.message.sent")
  async handleCaseMessageSent(event: CaseMessageSentEvent): Promise<void> {
    // Only handle outbound messages (to reporter)
    if (event.direction !== "outbound") {
      return;
    }

    try {
      // Check tenant relay settings
      const relaySettings = await this.organizationService.getRelaySettings(
        event.organizationId,
      );

      // Skip if auto-notify is disabled
      if (!relaySettings.autoNotifyOnMessage) {
        this.logger.debug(
          `Skipping notification for message ${event.messageId}: autoNotifyOnMessage disabled`,
        );
        return;
      }

      // Get case with linked RIU to find reporter email
      const caseRecord = await this.prisma.case.findUnique({
        where: { id: event.caseId },
        select: {
          referenceNumber: true,
          organization: {
            select: { slug: true, name: true },
          },
          riuAssociations: {
            where: { associationType: "PRIMARY" },
            take: 1,
            select: {
              riu: {
                select: {
                  reporterEmail: true,
                  anonymousAccessCode: true,
                },
              },
            },
          },
        },
      });

      if (!caseRecord) {
        this.logger.warn(
          `Case ${event.caseId} not found for message notification`,
        );
        return;
      }

      const primaryRiu = caseRecord.riuAssociations[0]?.riu;

      // Skip if no reporter email
      if (!primaryRiu?.reporterEmail) {
        this.logger.debug(
          `No reporter email for case ${event.caseId}: skipping notification`,
        );
        return;
      }

      // Build portal URL
      const baseUrl = process.env.APP_URL || "https://app.ethico.com";
      const portalUrl = primaryRiu.anonymousAccessCode
        ? `${baseUrl}/ethics/${caseRecord.organization.slug}/status/${primaryRiu.anonymousAccessCode}`
        : `${baseUrl}/ethics/${caseRecord.organization.slug}/status`;

      // Queue notification with delayed delivery
      await this.delayedNotificationService.queueDelayedNotification(
        {
          organizationId: event.organizationId,
          to: primaryRiu.reporterEmail,
          templateId: REPORTER_MESSAGE_NOTIFICATION_TEMPLATE,
          context: {
            referenceNumber: caseRecord.referenceNumber,
            portalUrl,
            organizationName: caseRecord.organization.name,
            hasAccessCode: !!primaryRiu.anonymousAccessCode,
            // CRITICAL: Do NOT include message content
          },
        },
        relaySettings.notificationDelayMinHours,
        relaySettings.notificationDelayMaxHours,
      );

      this.logger.log(
        `Queued message notification for case ${event.caseId} (delay: ${relaySettings.notificationDelayMinHours}-${relaySettings.notificationDelayMaxHours}hr)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue message notification for ${event.messageId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't rethrow - notification failure shouldn't affect message send
    }
  }
}
