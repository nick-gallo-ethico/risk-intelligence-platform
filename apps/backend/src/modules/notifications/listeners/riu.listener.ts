/**
 * RIU Event Listener
 *
 * Handles RIU lifecycle events to trigger appropriate notifications.
 * Primary use: Send access code email to reporters who provide an email address.
 *
 * CRITICAL: Uses random delay (1-6hr) to prevent timing attacks that could
 * deanonymize reporters. Never log reporter email - PII risk.
 *
 * @see 42-03-PLAN.md - Access code email delivery
 */

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DelayedNotificationService } from "../services/delayed-notification.service";
import { OrganizationService } from "../../organization/organization.service";
import { REPORTER_ACCESS_CODE_TEMPLATE } from "../templates";

/**
 * Event payload from RIU creation.
 *
 * Emitted by RiusService.create() after successful RIU creation.
 */
export interface RiuCreatedEvent {
  organizationId: string;
  actorUserId: string;
  riuId: string;
  referenceNumber: string;
  type: string;
  sourceChannel: string;
  categoryId: string | null;
  severity: string | null;
  /** Reporter email - only present if reporter chose to provide it */
  reporterEmail: string | null;
  /** Access code for anonymous status portal */
  anonymousAccessCode: string | null;
  /** Reporter type: 'anonymous', 'confidential', or 'identified' */
  reporterType: string;
  /** Organization slug for portal URL */
  tenantSlug: string;
}

/**
 * Listens for RIU creation events and sends access code email to reporter.
 *
 * CRITICAL: Uses random delay (1-6hr) to prevent timing attacks.
 * Only sends if reporter provided email and access code was generated.
 */
@Injectable()
export class RiuCreatedListener {
  private readonly logger = new Logger(RiuCreatedListener.name);

  constructor(
    private readonly delayedNotificationService: DelayedNotificationService,
    private readonly organizationService: OrganizationService,
  ) {}

  /**
   * Handle RIU creation event.
   *
   * If reporter provided an email address and has an access code,
   * queue an access code email with random delay.
   */
  @OnEvent("riu.created")
  async handleRiuCreated(event: RiuCreatedEvent): Promise<void> {
    // Only send if we have both email and access code
    if (!event.reporterEmail || !event.anonymousAccessCode) {
      this.logger.debug(
        `RIU ${event.riuId}: No access code email - missing email or access code`,
      );
      return;
    }

    try {
      // Get tenant relay settings for delay configuration
      const relaySettings = await this.organizationService.getRelaySettings(
        event.organizationId,
      );

      // Build portal URL
      const baseUrl = process.env.APP_URL || "https://app.ethico.com";
      const portalUrl = `${baseUrl}/ethics/${event.tenantSlug}/status/${event.anonymousAccessCode}`;

      // Get organization name for email
      const org = await this.organizationService.getOrganization(
        event.organizationId,
      );
      const organizationName = org?.name || "Ethico";

      // Queue access code email with delayed delivery
      await this.delayedNotificationService.queueDelayedNotification(
        {
          organizationId: event.organizationId,
          to: event.reporterEmail,
          templateId: REPORTER_ACCESS_CODE_TEMPLATE,
          context: {
            referenceNumber: event.referenceNumber,
            accessCode: event.anonymousAccessCode,
            portalUrl,
            organizationName,
          },
        },
        relaySettings.notificationDelayMinHours,
        relaySettings.notificationDelayMaxHours,
      );

      // Log without email for privacy
      this.logger.log(
        `Queued access code email for RIU ${event.riuId} (delay: ${relaySettings.notificationDelayMinHours}-${relaySettings.notificationDelayMaxHours}hr)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue access code email for RIU ${event.riuId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't rethrow - email failure shouldn't fail RIU creation
    }
  }
}
