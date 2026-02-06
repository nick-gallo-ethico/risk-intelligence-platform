/**
 * PeerBenchmarkProcessor - Nightly Benchmark Calculation Job
 *
 * Runs nightly to calculate and cache peer benchmark aggregates.
 * Uses BullMQ for job processing.
 *
 * @see CONTEXT.md for caching requirements
 * @see PeerBenchmarkService for calculation logic
 */

import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PeerBenchmarkService } from "./peer-benchmark.service";

/**
 * Queue name for benchmark processing jobs.
 */
export const BENCHMARK_QUEUE = "benchmarks";

/**
 * Job type definitions for the benchmark queue.
 */
export interface BenchmarkJobData {
  /** Type of benchmark job */
  type: "calculate_all";
  /** Optional: specific metric to calculate */
  metricName?: string;
}

/**
 * Job result from benchmark calculation.
 */
export interface BenchmarkJobResult {
  /** Number of benchmark aggregates calculated */
  metricsCalculated: number;
  /** Duration of calculation in milliseconds */
  durationMs?: number;
}

@Processor(BENCHMARK_QUEUE)
export class PeerBenchmarkProcessor extends WorkerHost {
  private readonly logger = new Logger(PeerBenchmarkProcessor.name);

  constructor(private readonly benchmarkService: PeerBenchmarkService) {
    super();
  }

  /**
   * Process a benchmark calculation job.
   *
   * @param job - BullMQ job to process
   * @returns Job result with metrics count
   */
  async process(job: Job<BenchmarkJobData>): Promise<BenchmarkJobResult> {
    const startTime = Date.now();
    this.logger.log(
      `Processing benchmark calculation job ${job.id} (type: ${job.data.type})`,
    );

    try {
      const result = await this.benchmarkService.calculateBenchmarks();
      const durationMs = Date.now() - startTime;

      this.logger.log(
        `Benchmark job ${job.id} completed: ${result.metricsCalculated} metrics in ${durationMs}ms`,
      );

      return {
        ...result,
        durationMs,
      };
    } catch (error) {
      this.logger.error(
        `Benchmark job ${job.id} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Handle job failure events.
   */
  @OnWorkerEvent("failed")
  onFailed(job: Job<BenchmarkJobData>, error: Error): void {
    this.logger.error(
      `Benchmark job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
      error.stack,
    );
  }

  /**
   * Handle job completion events.
   */
  @OnWorkerEvent("completed")
  onCompleted(job: Job<BenchmarkJobData>, result: BenchmarkJobResult): void {
    this.logger.log(
      `Benchmark job ${job.id} completed successfully: ${result.metricsCalculated} metrics calculated`,
    );
  }

  /**
   * Handle worker ready events.
   */
  @OnWorkerEvent("active")
  onActive(job: Job<BenchmarkJobData>): void {
    this.logger.log(`Benchmark job ${job.id} started processing`);
  }
}
