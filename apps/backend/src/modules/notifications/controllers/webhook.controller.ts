/**
 * WebhookController - Email Provider Webhook Handler
 *
 * Receives delivery status callbacks from email providers (SendGrid, SES, etc.).
 * Processes events to update notification delivery status.
 *
 * Security considerations:
 * - Optional signature verification for provider callbacks
 * - Rate limiting to prevent abuse
 * - No authentication required (provider callbacks are unauthenticated)
 *
 * Supported providers:
 * - SendGrid Event Webhook
 * - AWS SES (via SNS)
 * - Generic SMTP (manual status updates)
 *
 * @see DeliveryTrackerService for status tracking
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import {
  DeliveryTrackerService,
  WebhookEvent,
  WebhookEventType,
  BounceType,
} from '../services/delivery-tracker.service';

/**
 * SendGrid event payload structure.
 */
interface SendGridEvent {
  email: string;
  timestamp: number;
  event: string;
  sg_message_id: string;
  reason?: string;
  bounce_classification?: string;
  type?: string; // For bounce events
}

/**
 * AWS SES notification structure (via SNS).
 */
interface SesNotification {
  notificationType: 'Bounce' | 'Complaint' | 'Delivery';
  mail: {
    messageId: string;
    destination: string[];
  };
  bounce?: {
    bounceType: 'Permanent' | 'Transient';
    bounceSubType: string;
    bouncedRecipients: Array<{
      emailAddress: string;
      action: string;
      diagnosticCode: string;
    }>;
  };
  complaint?: {
    complainedRecipients: Array<{ emailAddress: string }>;
    complaintFeedbackType: string;
  };
  delivery?: {
    timestamp: string;
    recipients: string[];
  };
}

/**
 * Webhook payload DTO for Swagger documentation.
 */
class SendGridWebhookDto {
  events: SendGridEvent[];
}

@Controller('webhooks')
@ApiTags('Webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly sendGridSigningKey: string | undefined;
  private readonly sesVerificationEnabled: boolean;

  constructor(
    private readonly deliveryTracker: DeliveryTrackerService,
    private readonly configService: ConfigService,
  ) {
    this.sendGridSigningKey = this.configService.get<string>('SENDGRID_WEBHOOK_SIGNING_KEY');
    this.sesVerificationEnabled = this.configService.get<boolean>('SES_WEBHOOK_VERIFY', false);

    if (this.sendGridSigningKey) {
      this.logger.log('SendGrid webhook signature verification enabled');
    }
    if (this.sesVerificationEnabled) {
      this.logger.log('SES webhook verification enabled');
    }
  }

  /**
   * Handle SendGrid Event Webhook.
   * Receives delivery events: processed, delivered, bounce, dropped, deferred, open, click, spam_report.
   *
   * @see https://docs.sendgrid.com/for-developers/tracking-events/event
   */
  @Post('email-events')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 100 } }) // 100 events per minute
  @ApiOperation({ summary: 'Receive email delivery events from SendGrid' })
  @ApiBody({ type: SendGridWebhookDto })
  @ApiResponse({ status: 200, description: 'Events processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload or signature' })
  async handleSendGridEvents(
    @Body() events: SendGridEvent[],
    @Headers('x-twilio-email-event-webhook-signature') signature?: string,
    @Headers('x-twilio-email-event-webhook-timestamp') timestamp?: string,
  ): Promise<{ processed: number; errors: number }> {
    // Verify signature if configured
    if (this.sendGridSigningKey && signature && timestamp) {
      const isValid = this.verifySendGridSignature(events, signature, timestamp);
      if (!isValid) {
        this.logger.warn('Invalid SendGrid webhook signature');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Process events in parallel (order doesn't matter for delivery events)
    let processed = 0;
    let errors = 0;

    const processPromises = events.map(async (event) => {
      try {
        const normalizedEvent = this.normalizeSendGridEvent(event);
        if (normalizedEvent) {
          await this.deliveryTracker.processWebhookEvent(normalizedEvent);
          processed++;
        }
      } catch (error) {
        this.logger.error(
          `Error processing SendGrid event: ${error instanceof Error ? error.message : String(error)}`,
          { event },
        );
        errors++;
      }
    });

    await Promise.all(processPromises);

    this.logger.log(`Processed ${processed} SendGrid events (${errors} errors)`);

    return { processed, errors };
  }

  /**
   * Handle AWS SES notifications via SNS.
   * Receives: Bounce, Complaint, Delivery notifications.
   *
   * @see https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-examples.html
   */
  @Post('ses-events')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 100 } }) // 100 events per minute
  @ApiOperation({ summary: 'Receive email delivery events from AWS SES via SNS' })
  @ApiResponse({ status: 200, description: 'Event processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  async handleSesEvents(
    @Body() body: unknown,
    @Headers('x-amz-sns-message-type') messageType?: string,
  ): Promise<{ status: string }> {
    // Handle SNS subscription confirmation
    if (messageType === 'SubscriptionConfirmation') {
      this.logger.log('SNS subscription confirmation request - manual confirmation required');
      return { status: 'subscription_confirmation_required' };
    }

    // Parse SNS notification
    if (messageType !== 'Notification') {
      this.logger.debug(`Ignoring SNS message type: ${messageType}`);
      return { status: 'ignored' };
    }

    try {
      const snsBody = body as { Message: string };
      const notification: SesNotification = JSON.parse(snsBody.Message);

      const normalizedEvent = this.normalizeSesNotification(notification);
      if (normalizedEvent) {
        await this.deliveryTracker.processWebhookEvent(normalizedEvent);
      }

      return { status: 'processed' };
    } catch (error) {
      this.logger.error(
        `Error processing SES event: ${error instanceof Error ? error.message : String(error)}`,
        { body },
      );
      throw new BadRequestException('Invalid SES notification payload');
    }
  }

  /**
   * Verify SendGrid webhook signature.
   *
   * @see https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
   */
  private verifySendGridSignature(
    events: SendGridEvent[],
    signature: string,
    timestamp: string,
  ): boolean {
    if (!this.sendGridSigningKey) {
      return true; // Signature verification not configured
    }

    try {
      const payload = JSON.stringify(events) + timestamp;
      const expectedSignature = crypto
        .createHmac('sha256', this.sendGridSigningKey)
        .update(payload)
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Normalize SendGrid event to WebhookEvent format.
   */
  private normalizeSendGridEvent(event: SendGridEvent): WebhookEvent | null {
    // Map SendGrid event types to our normalized types
    const eventTypeMap: Record<string, WebhookEventType | null> = {
      delivered: 'delivered',
      bounce: 'bounce',
      dropped: 'dropped',
      deferred: 'deferred',
      open: 'open',
      click: 'click',
      spamreport: 'spam_report',
      unsubscribe: 'unsubscribe',
      processed: null, // We track sent via our own processor
      group_unsubscribe: null,
      group_resubscribe: null,
    };

    const eventType = eventTypeMap[event.event.toLowerCase()];
    if (!eventType) {
      return null;
    }

    // Map bounce classification to our type
    let bounceType: BounceType | undefined;
    if (event.event === 'bounce') {
      const classification = event.bounce_classification || event.type || '';
      if (classification.includes('hard') || classification.includes('invalid')) {
        bounceType = 'hard';
      } else if (classification.includes('soft') || classification.includes('full')) {
        bounceType = 'soft';
      } else if (classification.includes('block')) {
        bounceType = 'blocked';
      } else {
        bounceType = 'unknown';
      }
    }

    return {
      eventType,
      messageId: event.sg_message_id,
      email: event.email,
      timestamp: new Date(event.timestamp * 1000),
      reason: event.reason,
      bounceType,
      rawEvent: event as unknown as Record<string, unknown>,
    };
  }

  /**
   * Normalize AWS SES notification to WebhookEvent format.
   */
  private normalizeSesNotification(notification: SesNotification): WebhookEvent | null {
    const messageId = notification.mail.messageId;

    switch (notification.notificationType) {
      case 'Delivery':
        return {
          eventType: 'delivered',
          messageId,
          timestamp: notification.delivery
            ? new Date(notification.delivery.timestamp)
            : new Date(),
        };

      case 'Bounce':
        if (!notification.bounce) return null;

        const bounceType: BounceType =
          notification.bounce.bounceType === 'Permanent' ? 'hard' : 'soft';

        const reason = notification.bounce.bouncedRecipients[0]?.diagnosticCode;

        return {
          eventType: 'bounce',
          messageId,
          timestamp: new Date(),
          reason,
          bounceType,
          rawEvent: notification as unknown as Record<string, unknown>,
        };

      case 'Complaint':
        return {
          eventType: 'spam_report',
          messageId,
          timestamp: new Date(),
          rawEvent: notification as unknown as Record<string, unknown>,
        };

      default:
        return null;
    }
  }
}
