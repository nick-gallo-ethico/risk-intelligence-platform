import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EMAIL_QUEUE_NAME } from '../queues/email.queue';
import { EmailJobData } from '../types/job-data.types';

/**
 * Email Queue Worker
 *
 * Handles email delivery jobs:
 * - Notifications (case assigned, status changed, etc.)
 * - Reports (scheduled, on-demand)
 * - Attestation reminders
 * - Campaign communications
 *
 * NOTE: This is a placeholder. Actual email service integration
 * will be implemented in Phase 7 (Notifications & Email).
 */
@Processor(EMAIL_QUEUE_NAME, { concurrency: 10 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobData>): Promise<{ messageId: string }> {
    this.logger.log(
      `Processing email job ${job.id}: template=${job.data.templateId} for org:${job.data.organizationId}`,
    );

    const recipients = Array.isArray(job.data.to)
      ? job.data.to
      : [job.data.to];
    this.logger.log(`Would send to: ${recipients.join(', ')}`);

    // Placeholder - actual email delivery in Phase 7
    return { messageId: `msg-${job.id}` };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<EmailJobData>) {
    this.logger.log(`Email job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailJobData>, error: Error) {
    this.logger.error(
      `Email job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
