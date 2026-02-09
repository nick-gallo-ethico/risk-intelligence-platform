import { Global, Module } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import { MetricsController } from "./metrics.controller";

/**
 * MetricsModule - Global Prometheus Metrics Module
 *
 * Provides application-wide metrics collection and exposure.
 * Marked as @Global() so MetricsService can be injected anywhere
 * without importing the module.
 *
 * Features:
 * - Default Node.js runtime metrics (memory, CPU, event loop, GC)
 * - HTTP request metrics (count, duration, status)
 * - Business metrics (cases, investigations, RIUs, campaigns)
 * - AI metrics (request count, duration, tokens)
 * - WebSocket metrics (connections, messages)
 * - Database metrics (query duration, connections)
 * - Queue metrics (jobs processed, failed, active)
 *
 * Usage:
 * 1. Import MetricsModule in AppModule
 * 2. Use MetricsInterceptor globally to track HTTP metrics
 * 3. Inject MetricsService in services to record custom metrics
 * 4. Configure Prometheus to scrape /metrics endpoint
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
