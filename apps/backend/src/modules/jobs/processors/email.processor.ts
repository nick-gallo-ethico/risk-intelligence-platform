/**
 * EmailProcessor - Email Queue Worker
 *
 * Sends emails via nodemailer/MailerService with comprehensive delivery tracking.
 *
 * Key features:
 * - Real email delivery via SMTP (SendGrid, SES, Mailhog in dev)
 * - Integration with DeliveryTrackerService for status tracking
 * - Automatic retry via BullMQ exponential backoff
 * - Permanent failure logging after all retries exhausted
 *
 * Job data includes pre-rendered HTML (templates rendered before queueing).
 *
 * @see DeliveryTrackerService for delivery status tracking
 * @see NotificationService for job creation
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Job } from 'bullmq';
import { EMAIL_QUEUE_NAME } from '../queues/email.queue';
import { EmailJobData } from '../types/job-data.types';
import { DeliveryTrackerService } from '../../notifications/services/delivery-tracker.service';

/**
 * Extended email job data that includes pre-rendered HTML.
 * This is the actual structure passed from NotificationService.
 */
interface ProcessedEmailJobData extends EmailJobData {
  /** Pre-rendered HTML content */
  html: string;
  /** Email subject line (required for direct send) */
  subject: string;
  /** Notification record ID for delivery tracking */
  notificationId: string;
}

/**
 * Result returned from email send operation.
 */
interface SendResult {
  /** Whether the send was successful */
  success: boolean;
  /** Provider's message ID (for webhook correlation) */
  messageId?: string;
  /** Error message if failed */
  error?: string;
}

@Processor(EMAIL_QUEUE_NAME, { concurrency: 10 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailerService: MailerService,
    @Inject(forwardRef(() => DeliveryTrackerService))
    private readonly deliveryTracker: DeliveryTrackerService,
  ) {
    super();
  }

  /**
   * Process email job: send via SMTP and track delivery status.
   *
   * Email HTML is pre-rendered before queueing (per RESEARCH.md - don't render in worker).
   * This keeps the worker simple and fast.
   *
   * @param job - BullMQ job containing email data
   * @returns Object with messageId for tracking
   */
  async process(job: Job<ProcessedEmailJobData>): Promise<{ messageId: string }> {
    const { notificationId, to, subject, html, organizationId } = job.data;

    this.logger.log(
      `Processing email job ${job.id}: to=${to}, notificationId=${notificationId}, org=${organizationId}`,
    );

    // Validate required fields
    if (!to || !subject || !html) {
      const error = 'Missing required email fields (to, subject, or html)';
      this.logger.error(`Email job ${job.id} failed: ${error}`);
      throw new Error(error);
    }

    // Validate notification ID exists for tracking
    if (!notificationId) {
      this.logger.warn(`Email job ${job.id} missing notificationId - delivery tracking disabled`);
    }

    // Send email via MailerService
    const result = await this.sendEmail(to, subject, html);

    if (!result.success) {
      // Record failure for this attempt
      if (notificationId) {
        await this.deliveryTracker.recordFailed(notificationId, result.error || 'Unknown error');
      }

      // Throw to trigger BullMQ retry
      throw new Error(result.error || 'Email send failed');
    }

    // Record successful send with provider's message ID
    const messageId = result.messageId || `local-${job.id}`;
    if (notificationId) {
      await this.deliveryTracker.recordSent(notificationId, messageId);
    }

    this.logger.log(`Email sent successfully: ${messageId} to ${to}`);

    return { messageId };
  }

  /**
   * Send email via MailerService (nodemailer wrapper).
   *
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - Pre-rendered HTML content
   * @returns Send result with messageId or error
   */
  private async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
  ): Promise<SendResult> {
    try {
      const result = await this.mailerService.sendMail({
        to,
        subject,
        html,
      });

      // nodemailer returns messageId in response
      // Format varies by transport: "<uuid@domain>" or just "uuid"
      const messageId = result.messageId?.replace(/[<>]/g, '') || undefined;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to send email to ${to}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Called when job completes successfully.
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job<ProcessedEmailJobData>): void {
    const result = job.returnvalue as { messageId: string } | undefined;
    this.logger.log(
      `Email job ${job.id} completed successfully, messageId: ${result?.messageId || 'N/A'}`,
    );
  }

  /**
   * Called when job fails.
   * If all retries exhausted, records permanent failure for compliance audit.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<ProcessedEmailJobData> | undefined, error: Error): Promise<void> {
    if (!job) {
      this.logger.error(`Email job failed with no job context: ${error.message}`);
      return;
    }

    const { notificationId } = job.data;
    const maxAttempts = job.opts?.attempts || 3;

    this.logger.error(
      `Email job ${job.id} failed after ${job.attemptsMade}/${maxAttempts} attempts: ${error.message}`,
    );

    // Check if this was the final attempt
    if (job.attemptsMade >= maxAttempts && notificationId) {
      // Record permanent failure for compliance audit
      await this.deliveryTracker.recordPermanentFailure(
        notificationId,
        `Failed after ${maxAttempts} attempts: ${error.message}`,
      );
    }
  }

  /**
   * Called when job becomes active (started processing).
   */
  @OnWorkerEvent('active')
  onActive(job: Job<ProcessedEmailJobData>): void {
    this.logger.debug(
      `Email job ${job.id} is now active (attempt ${job.attemptsMade + 1})`,
    );
  }

  /**
   * Called when job is stalled (processing took too long).
   */
  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`Email job ${jobId} has stalled and will be reprocessed`);
  }

  /**
   * Called on worker error.
   */
  @OnWorkerEvent('error')
  onError(error: Error): void {
    this.logger.error(`Email worker error: ${error.message}`, error.stack);
  }
}
