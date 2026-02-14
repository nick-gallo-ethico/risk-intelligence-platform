import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject, forwardRef } from "@nestjs/common";
import { Job } from "bullmq";
import { EMAIL_QUEUE_NAME } from "../jobs/queues/email.queue";
import { RemediationNotificationService } from "./remediation-notification.service";

/**
 * Remediation reminder job data
 */
export interface RemediationReminderJobData {
  organizationId: string;
  stepId: string;
  reminderType: "pre-due" | "overdue";
  daysUntilDue?: number;
  daysOverdue?: number;
}

/**
 * Remediation escalation job data
 */
export interface RemediationEscalationJobData {
  organizationId: string;
  stepId: string;
}

/**
 * Remediation Job Processor
 *
 * Handles scheduled remediation jobs from the email queue:
 * - remediation-reminder: Process pre-due and overdue reminders
 * - remediation-escalation: Escalate overdue steps to compliance officers
 *
 * These jobs are scheduled by RemediationNotificationService when steps
 * are created or updated. The processor delegates back to the notification
 * service for actual notification logic.
 */
@Processor(EMAIL_QUEUE_NAME, { concurrency: 5 })
export class RemediationProcessor extends WorkerHost {
  private readonly logger = new Logger(RemediationProcessor.name);

  constructor(
    @Inject(forwardRef(() => RemediationNotificationService))
    private readonly notificationService: RemediationNotificationService,
  ) {
    super();
  }

  async process(
    job: Job<RemediationReminderJobData | RemediationEscalationJobData>,
  ): Promise<{ processed: boolean; type: string }> {
    this.logger.log(`Processing remediation job ${job.id}: ${job.name}`);

    switch (job.name) {
      case "remediation-reminder":
        return this.processReminder(job as Job<RemediationReminderJobData>);

      case "remediation-escalation":
        return this.processEscalation(job as Job<RemediationEscalationJobData>);

      default:
        // Not a remediation job - let other processors handle it
        return { processed: false, type: job.name };
    }
  }

  /**
   * Process a remediation reminder job.
   * Sends pre-due or overdue reminder email to step assignee.
   */
  private async processReminder(
    job: Job<RemediationReminderJobData>,
  ): Promise<{ processed: boolean; type: string }> {
    const { organizationId, stepId, reminderType, daysUntilDue, daysOverdue } =
      job.data;

    this.logger.log(
      `Processing ${reminderType} reminder for step ${stepId} in org ${organizationId}`,
    );

    try {
      const days =
        reminderType === "pre-due" ? (daysUntilDue ?? 0) : (daysOverdue ?? 0);

      await this.notificationService.processReminder(
        organizationId,
        stepId,
        reminderType,
        days,
      );

      this.logger.log(
        `Successfully sent ${reminderType} reminder for step ${stepId}`,
      );
      return { processed: true, type: "remediation-reminder" };
    } catch (error) {
      this.logger.error(
        `Failed to process reminder for step ${stepId}: ${error.message}`,
        error.stack,
      );
      throw error; // Let BullMQ handle retry
    }
  }

  /**
   * Process a remediation escalation job.
   * Notifies compliance officers about overdue step.
   */
  private async processEscalation(
    job: Job<RemediationEscalationJobData>,
  ): Promise<{ processed: boolean; type: string }> {
    const { organizationId, stepId } = job.data;

    this.logger.log(
      `Processing escalation for step ${stepId} in org ${organizationId}`,
    );

    try {
      await this.notificationService.processEscalation(organizationId, stepId);

      this.logger.log(`Successfully escalated step ${stepId}`);
      return { processed: true, type: "remediation-escalation" };
    } catch (error) {
      this.logger.error(
        `Failed to process escalation for step ${stepId}: ${error.message}`,
        error.stack,
      );
      throw error; // Let BullMQ handle retry
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    if (
      job.name === "remediation-reminder" ||
      job.name === "remediation-escalation"
    ) {
      this.logger.log(`Remediation job ${job.id} (${job.name}) completed`);
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error) {
    if (
      job.name === "remediation-reminder" ||
      job.name === "remediation-escalation"
    ) {
      this.logger.error(
        `Remediation job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`,
      );
    }
  }
}
