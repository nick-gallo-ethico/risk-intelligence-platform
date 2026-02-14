import { Injectable } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Health indicator for PostgreSQL database connectivity.
 *
 * Verifies database connectivity by executing a simple SELECT 1 query.
 * Used by the /health endpoint to determine if the application can
 * serve traffic (database-dependent operations).
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Checks database health by executing SELECT 1.
   *
   * @param key - The key used in the health check result
   * @returns Health indicator result with status
   * @throws HealthCheckError if database is unreachable
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new HealthCheckError(
        "Database check failed",
        this.getStatus(key, false, { message }),
      );
    }
  }
}
