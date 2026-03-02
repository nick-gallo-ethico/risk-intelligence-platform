import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SlaTrackerService } from "./sla-tracker.service";
import { CaseSlaTrackerService } from "./case-sla-tracker.service";
import { SlaCheckResult } from "./sla.types";

/**
 * Combined SLA check result for both workflow instances and cases.
 */
export interface CombinedSlaCheckResult {
  workflows: SlaCheckResult;
  cases: SlaCheckResult;
}

/**
 * SlaSchedulerService runs periodic SLA checks for both workflow instances and cases.
 *
 * Per CONTEXT.md: "SLA checks every 5min"
 *
 * Responsibilities:
 * - Run SLA checks on a 5-minute schedule via @Cron decorator
 * - Check both workflow instances (via SlaTrackerService) and cases (via CaseSlaTrackerService)
 * - Prevent concurrent runs with a running flag
 * - Provide manual trigger for testing/admin use
 *
 * The scheduler delegates all SLA logic to the tracker services.
 * This service only manages the timing and execution.
 */
@Injectable()
export class SlaSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SlaSchedulerService.name);

  /** Flag to prevent concurrent SLA check runs */
  private isRunning = false;

  constructor(
    private readonly slaTracker: SlaTrackerService,
    private readonly caseSlaTracker: CaseSlaTrackerService,
  ) {}

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
   * Checks both:
   * - Workflow instances (for workflow-level SLA)
   * - Cases (for case-level SLA per organization config)
   *
   * Per CONTEXT.md:
   * - At Risk (80%): Notify assignee
   * - Breached: Notify both, escalate visibility
   * - Critically Breached (48h+): Compliance officer notification
   *
   * The actual notifications are triggered via events emitted
   * by the tracker services - this method just orchestrates timing.
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
      // Check workflow instances
      const workflowResult = await this.slaTracker.updateAllSlaStatuses();

      // Check cases
      const caseResult = await this.caseSlaTracker.checkAllCaseSlas();

      const durationMs = Date.now() - startTime;

      this.logger.log(
        `SLA check completed in ${durationMs}ms: ` +
          `workflows: ${workflowResult.checked} checked, ${workflowResult.warnings} warnings, ${workflowResult.breaches} breaches | ` +
          `cases: ${caseResult.checked} checked, ${caseResult.warnings} warnings, ${caseResult.breaches} breaches`,
      );
    } catch (error) {
      this.logger.error(
        `SLA check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger an SLA check for both workflows and cases.
   *
   * Useful for:
   * - Admin testing
   * - After bulk imports
   * - Debugging SLA issues
   *
   * @returns Combined SLA check result summary
   */
  async runNow(): Promise<CombinedSlaCheckResult> {
    this.logger.log("Manual SLA check triggered");

    const workflows = await this.slaTracker.updateAllSlaStatuses();
    const cases = await this.caseSlaTracker.checkAllCaseSlas();

    return { workflows, cases };
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
