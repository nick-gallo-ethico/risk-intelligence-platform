import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import {
  PrismaHealthIndicator,
  RedisHealthIndicator,
  ElasticsearchHealthIndicator,
} from "./indicators";
import { PrismaModule } from "../prisma/prisma.module";

/**
 * Health Module
 *
 * Provides deep health checks for load balancers and Kubernetes probes.
 * Uses @nestjs/terminus for standardized health check responses.
 *
 * Endpoints:
 * - GET /health - Deep health check (all dependencies)
 * - GET /health/liveness - Simple liveness probe
 * - GET /health/readiness - Database-only readiness check
 */
@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    RedisHealthIndicator,
    ElasticsearchHealthIndicator,
  ],
})
export class HealthModule {}
