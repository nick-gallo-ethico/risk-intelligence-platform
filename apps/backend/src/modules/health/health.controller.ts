import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from "@nestjs/terminus";
import { PrismaHealthIndicator } from "./indicators/prisma.health";
import { RedisHealthIndicator } from "./indicators/redis.health";
import { ElasticsearchHealthIndicator } from "./indicators/elasticsearch.health";

/**
 * Health Check Controller
 *
 * Provides health check endpoints for:
 * - Load balancer health routing (deep checks)
 * - Kubernetes liveness probes (simple heartbeat)
 * - Kubernetes readiness probes (database availability)
 *
 * Uses @nestjs/terminus for standardized health check responses.
 * Returns HTTP 503 when any dependency is unhealthy, allowing
 * load balancers to route traffic away from unhealthy instances.
 */
@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private redisHealth: RedisHealthIndicator,
    private esHealth: ElasticsearchHealthIndicator,
  ) {}

  /**
   * Deep health check - verifies all dependencies.
   *
   * Checks database, Redis, and Elasticsearch connectivity.
   * Returns HTTP 503 if any dependency is unhealthy.
   * Used by load balancers for health-based routing.
   */
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: "Deep health check",
    description:
      "Verifies connectivity to all dependencies (database, Redis, Elasticsearch)",
  })
  @ApiResponse({
    status: 200,
    description: "All dependencies healthy",
  })
  @ApiResponse({
    status: 503,
    description: "One or more dependencies unhealthy",
  })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaHealth.isHealthy("database"),
      () => this.redisHealth.isHealthy("redis"),
      () => this.esHealth.isHealthy("elasticsearch"),
    ]);
  }

  /**
   * Liveness probe - simple heartbeat check.
   *
   * Returns immediately with a simple status response.
   * Used by Kubernetes to determine if the process is alive.
   * Does NOT check dependencies - a live process with broken
   * dependencies should be restarted via readiness probe failure.
   */
  @Get("liveness")
  @ApiOperation({
    summary: "Liveness probe",
    description:
      "Simple heartbeat check - returns immediately without dependency checks",
  })
  @ApiResponse({
    status: 200,
    description: "Application is alive",
  })
  liveness(): { status: string; timestamp: string } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe - database availability check.
   *
   * Checks only database connectivity as the critical path.
   * Used by Kubernetes to determine if the pod can receive traffic.
   * A pod that fails readiness is removed from service endpoints
   * but not restarted (unlike liveness failure).
   */
  @Get("readiness")
  @HealthCheck()
  @ApiOperation({
    summary: "Readiness probe",
    description:
      "Checks database connectivity to determine if application can serve traffic",
  })
  @ApiResponse({
    status: 200,
    description: "Application ready to serve traffic",
  })
  @ApiResponse({
    status: 503,
    description: "Application not ready - database unavailable",
  })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.prismaHealth.isHealthy("database")]);
  }
}
