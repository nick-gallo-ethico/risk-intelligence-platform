import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from "@nestjs/swagger";
import { MetricsService } from "./metrics.service";
import { Public } from "../../common/guards";

/**
 * MetricsController - Prometheus Metrics Endpoint
 *
 * Exposes application metrics in Prometheus format at /metrics.
 * This endpoint is marked as public (no auth required) but should
 * be protected at the network level (internal load balancer, firewall rules).
 *
 * Security Considerations:
 * - No authentication required for Prometheus scraping
 * - Should only be accessible from monitoring infrastructure
 * - Use network policies to restrict access to Prometheus server
 *
 * Usage:
 * - Configure Prometheus to scrape http://backend-service/metrics
 * - Default scrape interval: 15s
 */
@ApiTags("Metrics")
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Get Prometheus metrics.
   *
   * Returns all collected metrics in Prometheus text format.
   * Includes both default Node.js metrics and custom application metrics.
   */
  @Get()
  @Public()
  @ApiExcludeEndpoint() // Hide from public API docs
  @ApiOperation({
    summary: "Get Prometheus metrics",
    description:
      "Returns application metrics in Prometheus text format for monitoring and alerting",
  })
  @ApiResponse({
    status: 200,
    description: "Metrics in Prometheus text format",
    content: {
      "text/plain": {
        schema: {
          type: "string",
          example: `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/v1/cases",status="200"} 42`,
        },
      },
    },
  })
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.metricsService.getMetrics();
    res.setHeader("Content-Type", this.metricsService.getContentType());
    res.send(metrics);
  }
}
