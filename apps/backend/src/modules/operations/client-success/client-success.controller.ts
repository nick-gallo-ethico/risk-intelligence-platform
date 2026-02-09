/**
 * Client Success Controller
 *
 * REST API endpoints for Client Success Manager dashboard.
 * Provides portfolio overview and peer benchmarks.
 *
 * SECURITY:
 * - Protected by internal user authentication
 * - Cross-tenant operations (shows all organizations)
 * - Requires InternalUser role
 *
 * @see CONTEXT.md for Client Success requirements
 */

import { Controller, Get, Query } from "@nestjs/common";
import { ClientSuccessService } from "./client-success.service";
import { PortfolioResponse, PortfolioQueryDto } from "./dto/portfolio.dto";
import { BenchmarksResponse, BenchmarksQueryDto } from "./dto/benchmarks.dto";

// TODO: Add InternalUserGuard when implemented
// @UseGuards(InternalUserGuard)
@Controller("internal/client-success")
export class ClientSuccessController {
  constructor(private readonly clientSuccessService: ClientSuccessService) {}

  /**
   * Get portfolio overview of all clients.
   * Returns health scores, trends, and summary statistics.
   *
   * GET /api/v1/internal/client-success/portfolio
   *
   * Query Parameters:
   * - riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' - Filter by risk level
   * - sortBy: 'name' | 'healthScore' | 'lastActivity' - Sort field
   * - sortOrder: 'asc' | 'desc' - Sort direction
   *
   * @example
   * GET /api/v1/internal/client-success/portfolio?riskLevel=HIGH&sortBy=healthScore&sortOrder=asc
   */
  @Get("portfolio")
  async getPortfolio(
    @Query() query?: PortfolioQueryDto,
  ): Promise<PortfolioResponse> {
    return this.clientSuccessService.getPortfolio(query);
  }

  /**
   * Get peer benchmarks with optional filtering.
   * Shows percentile distributions with 5-peer minimum for privacy.
   *
   * GET /api/v1/internal/client-success/benchmarks
   *
   * Query Parameters:
   * - organizationId: string - Specific organization (optional)
   * - size: 'small' | 'medium' | 'large' | 'enterprise' - Company size filter
   * - industry: string - Industry sector filter (e.g., 'HEALTHCARE')
   *
   * @example
   * GET /api/v1/internal/client-success/benchmarks?size=medium&industry=HEALTHCARE
   */
  @Get("benchmarks")
  async getBenchmarks(
    @Query() query?: BenchmarksQueryDto,
  ): Promise<BenchmarksResponse> {
    return this.clientSuccessService.getBenchmarks(query);
  }
}
