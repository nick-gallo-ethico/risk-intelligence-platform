import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Inject, forwardRef } from "@nestjs/common";
import { Job } from "bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  CampaignReminderService,
  PendingReminder,
} from "./campaign-reminder.service";

/**
 * Reminder job payload matching PendingReminder interface.
 */
interface ReminderJobData extends PendingReminder {
  organizationId?: string;
}

/**
 * BullMQ processor for campaign reminders.
 *
 * Implements RS.51:
 * - Scheduled reminder checks (daily)
 * - Reminder email dispatch
 * - Manager CC logic
 * - Completion tracking
 */
@Processor("campaign")
export class CampaignReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignReminderProcessor.name);

  constructor(
    @Inject(forwardRef(() => CampaignReminderService))
    private readonly reminderService: CampaignReminderService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  /**
   * Process a reminder job.
   */
  async process(job: Job<ReminderJobData>): Promise<void> {
    const { name, data } = job;

    switch (name) {
      case "send-reminder":
        await this.handleSendReminder(data);
        break;
      case "check-reminders":
        await this.handleCheckReminders(data);
        break;
      default:
        this.logger.warn(`Unknown job type: ${name}`);
    }
  }

  /**
   * Handle sending a reminder notification.
   */
  private async handleSendReminder(data: ReminderJobData): Promise<void> {
    this.logger.log(
      `Sending reminder for assignment ${data.assignmentId}, step ${data.reminderStep}`,
    );

    // Emit event for notification service to handle email
    this.eventEmitter.emit("campaign.reminder.due", {
      assignmentId: data.assignmentId,
      employeeId: data.employeeId,
      campaignId: data.campaignId,
      campaignName: data.campaignName,
      dueDate: data.dueDate,
      reminderStep: data.reminderStep,
      ccManager: data.ccManager,
      ccHR: data.ccHR,
      managerId: data.managerId,
      managerEmail: data.managerEmail,
    });

    // Record that reminder was sent
    await this.reminderService.recordReminderSent(
      data.assignmentId,
      data.ccManager,
    );

    this.logger.log(
      `Reminder sent for assignment ${data.assignmentId}` +
        (data.ccManager ? " (manager CC)" : ""),
    );
  }

  /**
   * Handle checking for reminders (triggered by scheduler).
   */
  private async handleCheckReminders(data: {
    organizationId?: string;
  }): Promise<void> {
    this.logger.log("Checking for pending reminders...");

    const reminders =
      await this.reminderService.findAssignmentsNeedingReminders(
        data.organizationId,
      );

    if (reminders.length > 0) {
      await this.reminderService.queueReminders(reminders);
      this.logger.log(`Queued ${reminders.length} reminders`);
    } else {
      this.logger.log("No reminders to send today");
    }
  }

  /**
   * Daily scheduled check for reminders.
   * Runs at 8 AM every day.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async scheduledReminderCheck(): Promise<void> {
    this.logger.log("Running scheduled reminder check");

    try {
      const reminders =
        await this.reminderService.findAssignmentsNeedingReminders();

      if (reminders.length > 0) {
        await this.reminderService.queueReminders(reminders);
        this.logger.log(`Scheduled check queued ${reminders.length} reminders`);
      } else {
        this.logger.log("Scheduled check: No reminders to send");
      }
    } catch (error) {
      this.logger.error("Error in scheduled reminder check", error);
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<ReminderJobData>): void {
    this.logger.debug(
      `Job ${job.name} completed for assignment ${job.data.assignmentId}`,
    );
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<ReminderJobData>, error: Error): void {
    this.logger.error(
      `Job ${job.name} failed for assignment ${job.data.assignmentId}: ${error.message}`,
    );
  }
}
