import { Injectable, Inject, Optional } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import Redis from "ioredis";

/**
 * Health indicator for Redis cache connectivity.
 *
 * Verifies Redis connectivity by executing PING command.
 * If Redis is not configured (optional dependency), returns healthy
 * with status "not_configured" to indicate graceful degradation.
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    @Optional() @Inject("REDIS_CLIENT") private readonly redis?: Redis,
  ) {
    super();
  }

  /**
   * Checks Redis health by executing PING command.
   *
   * @param key - The key used in the health check result
   * @returns Health indicator result with status
   * @throws HealthCheckError if Redis is configured but unreachable
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.redis) {
      return this.getStatus(key, true, { status: "not_configured" });
    }

    try {
      const result = await this.redis.ping();
      const isHealthy = result === "PONG";
      return this.getStatus(key, isHealthy);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new HealthCheckError(
        "Redis check failed",
        this.getStatus(key, false, { message }),
      );
    }
  }
}
