/**
 * ClientHealthModule - Tenant Health Metrics and Benchmarks
 *
 * Provides services for:
 * - Tenant health score calculation (HealthScoreService)
 * - Usage metrics tracking (UsageMetricsService)
 * - Feature adoption monitoring
 * - Peer benchmark comparisons (PeerBenchmarkService)
 * - Scheduled calculation via BullMQ (HealthScoreProcessor)
 *
 * @see CONTEXT.md for health metrics requirements
 * @see RESEARCH.md for calculation patterns
 */

import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "../../prisma/prisma.module";
import { HealthScoreService } from "./health-score.service";
import { UsageMetricsService } from "./usage-metrics.service";
import {
  HealthScoreProcessor,
  HEALTH_SCORE_QUEUE,
} from "./health-score.processor";
import { ClientHealthController } from "./client-health.controller";
import { PeerBenchmarkService } from "./peer-benchmark.service";
import {
  PeerBenchmarkProcessor,
  BENCHMARK_QUEUE,
} from "./peer-benchmark.processor";

@Module({
  imports: [
    PrismaModule,
    // Health score calculation queue
    BullModule.registerQueue({
      name: HEALTH_SCORE_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
        removeOnFail: { count: 500 }, // Keep last 500 failed jobs for debugging
      },
    }),
    // Benchmark calculation queue
    BullModule.registerQueue({
      name: BENCHMARK_QUEUE,
    }),
  ],
  controllers: [ClientHealthController],
  providers: [
    // Health score services
    HealthScoreService,
    UsageMetricsService,
    HealthScoreProcessor,
    // Benchmark services
    PeerBenchmarkService,
    PeerBenchmarkProcessor,
  ],
  exports: [HealthScoreService, UsageMetricsService, PeerBenchmarkService],
})
export class ClientHealthModule {}
