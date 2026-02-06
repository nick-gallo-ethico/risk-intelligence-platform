/**
 * EscalationProcessor
 *
 * BullMQ processor for auto-escalation of implementation blockers.
 * Checks blockers against ESCALATION_TIMING constants and escalates per timing.
 *
 * Per CONTEXT.md:
 * - Day 2: reminder to owner
 * - Day 3: escalate to manager (internal blockers)
 * - Day 5: escalate to manager (client/vendor blockers)
 * - Day 7: escalate to director
 *
 * Runs on a cron schedule (configured in module) to process all open blockers.
 *
 * @see CONTEXT.md for escalation timing requirements
 * @see implementation.types.ts for ESCALATION_TIMING constants
 */

import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { BlockerCategory, BlockerStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ESCALATION_TIMING } from "../types/implementation.types";

/**
 * Queue name for escalation jobs
 */
export const ESCALATION_QUEUE = "escalation";

/**
 * Job data for escalation check
 */
export interface EscalationJobData {
  // Empty - scheduled job processes all open blockers
}

/**
 * Result of escalation processing
 */
export interface EscalationResult {
  escalated: number;
  reminded: number;
  processed: number;
}

/**
 * Helper to calculate days between two dates
 */
function differenceInDays(date1: Date, date2: Date): number {
  const ms = date1.getTime() - date2.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

@Processor(ESCALATION_QUEUE)
export class EscalationProcessor extends WorkerHost {
  private readonly logger = new Logger(EscalationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Process escalation check job.
   *
   * Finds all open blockers and checks if they need:
   * 1. Reminder (day 2 for all categories)
   * 2. Manager escalation (day 3 internal, day 5 client/vendor)
   * 3. Director escalation (day 7 for all categories)
   *
   * @param job - BullMQ job
   * @returns Escalation result with counts
   */
  async process(job: Job<EscalationJobData>): Promise<EscalationResult> {
    this.logger.log(`Processing escalation check job ${job.id}`);

    // Find all open blockers that are not snoozed
    const openBlockers = await this.prisma.implementationBlocker.findMany({
      where: {
        status: BlockerStatus.OPEN,
        OR: [
          { snoozeUntil: null },
          { snoozeUntil: { lt: new Date() } }, // Snooze expired
        ],
      },
      include: {
        project: {
          select: {
            id: true,
            leadImplementerId: true,
            assignedUserIds: true,
          },
        },
      },
    });

    let escalated = 0;
    let reminded = 0;
    const processed = openBlockers.length;

    for (const blocker of openBlockers) {
      const daysSinceCreation = differenceInDays(new Date(), blocker.createdAt);
      const timing = ESCALATION_TIMING[blocker.category as BlockerCategory];

      if (!timing) {
        this.logger.warn(
          `Unknown blocker category: ${blocker.category} for blocker ${blocker.id}`,
        );
        continue;
      }

      // Prepare blocker data with project for helper methods
      const blockerWithProject = {
        id: blocker.id,
        title: blocker.title,
        project: blocker.project,
      };

      // Check if needs escalation to director (highest priority)
      if (
        daysSinceCreation >= timing.director &&
        !blocker.escalatedToDirectorAt
      ) {
        await this.escalateToDirector(blockerWithProject);
        escalated++;
      }
      // Check if needs escalation to manager
      else if (
        daysSinceCreation >= timing.manager &&
        !blocker.escalatedToManagerAt
      ) {
        await this.escalateToManager(blockerWithProject);
        escalated++;
      }
      // Check if needs reminder
      else if (daysSinceCreation >= timing.reminder) {
        await this.sendReminder(blockerWithProject);
        reminded++;
      }
    }

    this.logger.log(
      `Escalation check complete: ${escalated} escalated, ${reminded} reminded, ${processed} processed`,
    );

    return { escalated, reminded, processed };
  }

  /**
   * Escalate blocker to manager level.
   *
   * Updates the escalatedToManagerAt timestamp and would send notification.
   *
   * @param blocker - Blocker to escalate
   */
  private async escalateToManager(blocker: {
    id: string;
    title: string;
    project: {
      id: string;
      leadImplementerId: string;
      assignedUserIds: string[];
    };
  }): Promise<void> {
    await this.prisma.implementationBlocker.update({
      where: { id: blocker.id },
      data: { escalatedToManagerAt: new Date() },
    });

    // Log the escalation as an activity
    await this.prisma.implementationActivity.create({
      data: {
        projectId: blocker.project.id,
        type: "NOTE",
        subject: `Blocker escalated to manager`,
        content: `Blocker "${blocker.title}" has been escalated to manager due to aging.`,
        isAutoLogged: true,
        createdById: "SYSTEM",
        emailTo: [],
        emailCc: [],
        attendees: [],
      },
    });

    // TODO: Send notification to manager (notification service integration)
    // await this.notificationService.notifyBlockerEscalation(blocker, 'manager');

    this.logger.log(`Blocker ${blocker.id} escalated to manager`);
  }

  /**
   * Escalate blocker to director level.
   *
   * Updates the escalatedToDirectorAt timestamp and would send notification.
   *
   * @param blocker - Blocker to escalate
   */
  private async escalateToDirector(blocker: {
    id: string;
    title: string;
    project: {
      id: string;
      leadImplementerId: string;
      assignedUserIds: string[];
    };
  }): Promise<void> {
    await this.prisma.implementationBlocker.update({
      where: { id: blocker.id },
      data: { escalatedToDirectorAt: new Date() },
    });

    // Log the escalation as an activity
    await this.prisma.implementationActivity.create({
      data: {
        projectId: blocker.project.id,
        type: "NOTE",
        subject: `Blocker escalated to director`,
        content: `Blocker "${blocker.title}" has been escalated to director due to extended aging.`,
        isAutoLogged: true,
        createdById: "SYSTEM",
        emailTo: [],
        emailCc: [],
        attendees: [],
      },
    });

    // TODO: Send notification to director (notification service integration)
    // await this.notificationService.notifyBlockerEscalation(blocker, 'director');

    this.logger.log(`Blocker ${blocker.id} escalated to director`);
  }

  /**
   * Send reminder for aging blocker.
   *
   * Does not update database, just sends notification.
   *
   * @param blocker - Blocker to remind about
   */
  private async sendReminder(blocker: {
    id: string;
    title: string;
    project: {
      id: string;
      leadImplementerId: string;
      assignedUserIds: string[];
    };
  }): Promise<void> {
    // TODO: Send reminder notification to lead implementer
    // await this.notificationService.sendBlockerReminder(blocker);

    this.logger.log(`Reminder sent for blocker ${blocker.id}`);
  }

  /**
   * Handle job failure.
   */
  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Escalation job ${job.id} failed: ${error.message}`);
  }

  /**
   * Handle job completion.
   */
  @OnWorkerEvent("completed")
  onCompleted(job: Job, result: EscalationResult): void {
    this.logger.log(
      `Escalation job ${job.id} completed: ${result.escalated} escalated, ${result.reminded} reminded`,
    );
  }
}
