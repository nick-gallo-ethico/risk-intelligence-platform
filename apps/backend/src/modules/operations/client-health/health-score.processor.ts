/**
 * Health Score Processor
 *
 * BullMQ processor for scheduled health score calculation.
 * Runs nightly to recalculate all tenant health scores with rate limiting
 * to prevent database overload.
 *
 * @see RESEARCH.md for pitfall #2 (database overload prevention)
 */

import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { HealthScoreService } from "./health-score.service";
import { UsageMetricsService } from "./usage-metrics.service";

/**
 * Queue name for health score jobs.
 */
export const HEALTH_SCORE_QUEUE = "health-scores";

/**
 * Job types for health score processing.
 */
export const HEALTH_SCORE_JOBS = {
  /** Calculate score for a single tenant */
  CALCULATE_SINGLE: "calculate-single",
  /** Calculate scores for all active tenants */
  CALCULATE_ALL: "calculate-all",
  /** Collect daily metrics for a tenant */
  COLLECT_METRICS: "collect-metrics",
} as const;

/**
 * Job data structure for health score jobs.
 */
export interface HealthScoreJobData {
  /** Specific tenant ID (optional - if omitted, process all tenants) */
  organizationId?: string;
  /** Whether to collect metrics before calculating score */
  collectMetrics?: boolean;
}

/**
 * Job result structure.
 */
export interface HealthScoreJobResult {
  /** Number of tenants successfully processed */
  processed: number;
  /** Number of tenants that failed */
  failed: number;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Delay between tenant calculations to prevent database overload (ms).
 * Per RESEARCH.md: stagger calculations to avoid CPU spikes.
 */
const INTER_TENANT_DELAY_MS = 100;

@Processor(HEALTH_SCORE_QUEUE)
export class HealthScoreProcessor extends WorkerHost {
  private readonly logger = new Logger(HealthScoreProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly healthScoreService: HealthScoreService,
    private readonly usageMetricsService: UsageMetricsService,
  ) {
    super();
  }

  /**
   * Process health score jobs.
   * Handles both single-tenant and batch processing.
   */
  async process(job: Job<HealthScoreJobData>): Promise<HealthScoreJobResult> {
    this.logger.log(`Processing health score job ${job.id} (${job.name})`);

    try {
      if (job.data.organizationId) {
        // Single tenant calculation
        return await this.processSingleTenant(job);
      } else {
        // Batch calculation for all active tenants
        return await this.processAllTenants(job);
      }
    } catch (error) {
      this.logger.error(
        `Health score job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Process health score for a single tenant.
   */
  private async processSingleTenant(
    job: Job<HealthScoreJobData>,
  ): Promise<HealthScoreJobResult> {
    const startTime = Date.now();
    const { organizationId, collectMetrics } = job.data;

    if (!organizationId) {
      throw new Error("organizationId required for single tenant processing");
    }

    try {
      // Collect metrics first if requested
      if (collectMetrics) {
        await this.usageMetricsService.collectDailyMetrics(organizationId);
      }

      // Calculate health score
      await this.healthScoreService.calculateHealthScore(organizationId);

      return {
        processed: 1,
        failed: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate score for org ${organizationId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        processed: 0,
        failed: 1,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Process health scores for all active tenants.
   * Includes rate limiting to prevent database overload.
   */
  private async processAllTenants(
    job: Job<HealthScoreJobData>,
  ): Promise<HealthScoreJobResult> {
    const startTime = Date.now();
    const { collectMetrics } = job.data;

    // Get all active organizations
    const tenants = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    this.logger.log(`Processing health scores for ${tenants.length} tenants`);

    let processed = 0;
    let failed = 0;

    for (let i = 0; i < tenants.length; i++) {
      const tenant = tenants[i];

      try {
        // Collect metrics if requested
        if (collectMetrics) {
          await this.usageMetricsService.collectDailyMetrics(tenant.id);
        }

        // Calculate health score
        await this.healthScoreService.calculateHealthScore(tenant.id);
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to calculate score for org ${tenant.id} (${tenant.name}): ${error instanceof Error ? error.message : String(error)}`,
        );
        failed++;
      }

      // Update job progress
      const progress = Math.round(((i + 1) / tenants.length) * 100);
      await job.updateProgress(progress);

      // Rate limiting: wait between calculations to prevent database overload
      // Per RESEARCH.md pitfall #2: avoid CPU spikes
      if (i < tenants.length - 1) {
        await this.delay(INTER_TENANT_DELAY_MS);
      }
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Health score job complete: ${processed}/${tenants.length} tenants processed, ${failed} failed (${durationMs}ms)`,
    );

    return { processed, failed, durationMs };
  }

  /**
   * Helper to add delay between tenant processing.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle job failure events.
   */
  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Health score job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  /**
   * Handle job completion events.
   */
  @OnWorkerEvent("completed")
  onCompleted(job: Job, result: HealthScoreJobResult): void {
    this.logger.log(
      `Health score job ${job.id} completed: ${result.processed} processed, ${result.failed} failed (${result.durationMs}ms)`,
    );
  }
}
