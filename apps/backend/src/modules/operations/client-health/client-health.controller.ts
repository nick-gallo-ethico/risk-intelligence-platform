/**
 * Client Health Controller
 *
 * REST API endpoints for health score retrieval and manual calculation triggers.
 * Protected by internal user authentication.
 *
 * @see CONTEXT.md for internal operations portal architecture
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { HealthScoreService } from "./health-score.service";
import { UsageMetricsService } from "./usage-metrics.service";
import {
  HEALTH_SCORE_QUEUE,
  HEALTH_SCORE_JOBS,
} from "./health-score.processor";

@Controller("internal/client-health")
export class ClientHealthController {
  constructor(
    private readonly healthScoreService: HealthScoreService,
    private readonly usageMetricsService: UsageMetricsService,
    @InjectQueue(HEALTH_SCORE_QUEUE) private readonly healthQueue: Queue,
  ) {}

  /**
   * Get the latest health score for a tenant.
   *
   * GET /api/v1/internal/client-health/:organizationId/score
   */
  @Get(":organizationId/score")
  async getScore(@Param("organizationId") organizationId: string) {
    return this.healthScoreService.getLatestScore(organizationId);
  }

  /**
   * Get health score history for trend visualization.
   *
   * GET /api/v1/internal/client-health/:organizationId/history?days=30
   */
  @Get(":organizationId/history")
  async getHistory(
    @Param("organizationId") organizationId: string,
    @Query("days", new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.healthScoreService.getScoreHistory(organizationId, days);
  }

  /**
   * Get usage metrics history for a tenant.
   *
   * GET /api/v1/internal/client-health/:organizationId/metrics?days=30
   */
  @Get(":organizationId/metrics")
  async getMetrics(
    @Param("organizationId") organizationId: string,
    @Query("days", new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.usageMetricsService.getMetricsHistory(organizationId, days);
  }

  /**
   * Trigger health score calculation for a single tenant.
   * Also collects daily metrics before calculation.
   *
   * POST /api/v1/internal/client-health/:organizationId/calculate
   */
  @Post(":organizationId/calculate")
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerCalculation(@Param("organizationId") organizationId: string) {
    const job = await this.healthQueue.add(
      HEALTH_SCORE_JOBS.CALCULATE_SINGLE,
      {
        organizationId,
        collectMetrics: true,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    );

    return {
      jobId: job.id,
      organizationId,
      status: "queued",
      message: "Health score calculation queued",
    };
  }

  /**
   * Trigger health score calculation for all active tenants.
   * Used for manual batch recalculation outside of scheduled runs.
   *
   * POST /api/v1/internal/client-health/calculate-all
   */
  @Post("calculate-all")
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerAllCalculations() {
    const job = await this.healthQueue.add(
      HEALTH_SCORE_JOBS.CALCULATE_ALL,
      {
        collectMetrics: true,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 10000 },
      },
    );

    return {
      jobId: job.id,
      status: "queued",
      message: "Batch health score calculation queued",
    };
  }

  /**
   * Get all high-risk tenants for CSM dashboard.
   *
   * GET /api/v1/internal/client-health/high-risk
   */
  @Get("high-risk")
  async getHighRiskTenants() {
    return this.healthScoreService.getHighRiskTenants();
  }

  /**
   * Get job status for a queued calculation.
   *
   * GET /api/v1/internal/client-health/jobs/:jobId
   */
  @Get("jobs/:jobId")
  async getJobStatus(@Param("jobId") jobId: string) {
    const job = await this.healthQueue.getJob(jobId);

    if (!job) {
      return { jobId, status: "not_found" };
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      jobId: job.id,
      name: job.name,
      status: state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
    };
  }
}
