import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SlaTrackerService } from "./sla-tracker.service";
import { SlaCheckResult } from "./sla.types";

/**
 * SlaSchedulerService runs periodic SLA checks.
 *
 * Per CONTEXT.md: "SLA checks every 5min"
 *
 * Responsibilities:
 * - Run SLA checks on a 5-minute schedule via @Cron decorator
 * - Prevent concurrent runs with a running flag
 * - Provide manual trigger for testing/admin use
 *
 * The scheduler delegates all SLA logic to SlaTrackerService.
 * This service only manages the timing and execution.
 */
@Injectable()
export class SlaSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SlaSchedulerService.name);

  /** Flag to prevent concurrent SLA check runs */
  private isRunning = false;

  constructor(private readonly slaTracker: SlaTrackerService) {}

  /**
   * Called when the module initializes.
   * Logs that the scheduler is ready.
   */
  onModuleInit(): void {
    this.logger.log("SLA Scheduler initialized - will run every 5 minutes");
  }

  /**
   * Scheduled SLA check that runs every 5 minutes.
   *
   * Per CONTEXT.md:
   * - At Risk (80%): Notify assignee
   * - Breached: Notify both, escalate visibility
   * - Critically Breached (24h+): Executive notification
   *
   * The actual notifications are triggered via events emitted
   * by SlaTrackerService - this method just orchestrates timing.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSlaCheck(): Promise<void> {
    // Prevent concurrent runs
    if (this.isRunning) {
      this.logger.warn("SLA check already running, skipping this interval");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    this.logger.log("Starting scheduled SLA check");

    try {
      const result = await this.slaTracker.updateAllSlaStatuses();
      const durationMs = Date.now() - startTime;

      this.logger.log(
        `SLA check completed in ${durationMs}ms: ` +
          `${result.checked} checked, ${result.warnings} warnings, ${result.breaches} breaches`
      );
    } catch (error) {
      this.logger.error(
        `SLA check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger an SLA check.
   *
   * Useful for:
   * - Admin testing
   * - After bulk imports
   * - Debugging SLA issues
   *
   * @returns SLA check result summary
   */
  async runNow(): Promise<SlaCheckResult> {
    this.logger.log("Manual SLA check triggered");
    return this.slaTracker.updateAllSlaStatuses();
  }

  /**
   * Check if an SLA check is currently running.
   *
   * @returns true if a check is in progress
   */
  isCheckRunning(): boolean {
    return this.isRunning;
  }
}
