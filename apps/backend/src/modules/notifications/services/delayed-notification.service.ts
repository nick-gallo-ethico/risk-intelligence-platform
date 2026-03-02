/**
 * Delayed Notification Service
 *
 * Provides privacy-preserving notification delivery for anonymous reporters.
 * Uses cryptographically secure random delays (1-6 hours default) to prevent
 * timing attacks that could deanonymize reporters.
 *
 * CRITICAL: Never log reporter email or notification content - PII risk.
 *
 * @see 42-01-PLAN.md - Anonymous Communication Relay foundation
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { randomInt } from "crypto";
import { EMAIL_QUEUE_NAME } from "../../jobs/queues/email.queue";
import { ReporterNotificationData } from "../dto/reporter-notification.dto";

/** Default minimum delay in hours */
const DEFAULT_MIN_HOURS = 1;
/** Default maximum delay in hours */
const DEFAULT_MAX_HOURS = 6;

/**
 * Job data structure for email queue.
 */
interface EmailJobData {
  organizationId: string;
  to: string;
  templateId: string;
  context: Record<string, unknown>;
  isReporterNotification: boolean;
}

@Injectable()
export class DelayedNotificationService {
  private readonly logger = new Logger(DelayedNotificationService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
  ) {}

  /**
   * Queue a notification with a cryptographically secure random delay.
   *
   * The delay prevents timing attacks that could correlate notification
   * delivery times with reporter activity, protecting anonymity.
   *
   * @param data - Notification data (email, template, context)
   * @param minHours - Minimum delay in hours (default: 1)
   * @param maxHours - Maximum delay in hours (default: 6)
   * @returns Job ID for tracking (does NOT include PII)
   */
  async queueDelayedNotification(
    data: ReporterNotificationData,
    minHours: number = DEFAULT_MIN_HOURS,
    maxHours: number = DEFAULT_MAX_HOURS,
  ): Promise<string> {
    // Validate delay range
    if (minHours < 0 || maxHours < minHours || maxHours > 48) {
      throw new Error(
        `Invalid delay range: minHours=${minHours}, maxHours=${maxHours}`,
      );
    }

    // Calculate cryptographically secure random delay
    const delayMs = this.getRandomDelayMs(minHours, maxHours);

    // Prepare job data
    const jobData: EmailJobData = {
      organizationId: data.organizationId,
      to: data.to,
      templateId: data.templateId,
      context: data.context,
      isReporterNotification: true,
    };

    // Queue with delay
    const job = await this.emailQueue.add("reporter-notification", jobData, {
      delay: delayMs,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        count: 500,
        age: 12 * 60 * 60, // 12 hours
      },
      removeOnFail: {
        count: 1000,
        age: 3 * 24 * 60 * 60, // 3 days
      },
    });

    // Log job ID only - NEVER log recipient email or content
    this.logger.log(
      `Queued delayed notification: jobId=${job.id}, ` +
        `orgId=${data.organizationId}, ` +
        `delayMinutes=${Math.round(delayMs / 60000)}`,
    );

    return job.id || "unknown";
  }

  /**
   * Queue an immediate notification (no delay).
   *
   * Use sparingly - only for non-anonymous or urgent notifications.
   *
   * @param data - Notification data
   * @returns Job ID
   */
  async queueImmediateNotification(
    data: ReporterNotificationData,
  ): Promise<string> {
    const jobData: EmailJobData = {
      organizationId: data.organizationId,
      to: data.to,
      templateId: data.templateId,
      context: data.context,
      isReporterNotification: true,
    };

    const job = await this.emailQueue.add("reporter-notification", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    });

    this.logger.log(
      `Queued immediate notification: jobId=${job.id}, orgId=${data.organizationId}`,
    );

    return job.id || "unknown";
  }

  /**
   * Calculate a cryptographically secure random delay.
   *
   * Uses Node.js crypto.randomInt for secure random generation,
   * NOT Math.random which is predictable.
   *
   * @param minHours - Minimum delay in hours
   * @param maxHours - Maximum delay in hours
   * @returns Delay in milliseconds
   */
  private getRandomDelayMs(minHours: number, maxHours: number): number {
    const minMs = Math.floor(minHours * 60 * 60 * 1000);
    const maxMs = Math.floor(maxHours * 60 * 60 * 1000);

    // crypto.randomInt generates a random integer in [min, max)
    // Adding 1 to max ensures the upper bound is inclusive
    return randomInt(minMs, maxMs + 1);
  }
}
