/**
 * Client Success Service
 *
 * Aggregates health scores and benchmarks for Client Success Manager dashboard.
 * Provides portfolio overview and peer benchmark comparisons.
 *
 * ARCHITECTURE NOTE:
 * This service aggregates data from HealthScoreService and PeerBenchmarkService
 * to provide simplified views for the CSM dashboard.
 *
 * SECURITY:
 * - All operations are cross-tenant (internal operations view)
 * - Requires InternalUser authentication
 * - No tenant isolation - shows all active organizations
 *
 * @see CONTEXT.md for Client Success requirements
 * @see health-metrics.types.ts for score calculation weights
 */

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { HealthScoreService } from "../client-health/health-score.service";
import { PeerBenchmarkService } from "../client-health/peer-benchmark.service";
import {
  PortfolioResponse,
  PortfolioClient,
  PortfolioSummary,
  PortfolioQueryDto,
} from "./dto/portfolio.dto";
import {
  BenchmarksResponse,
  BenchmarksQueryDto,
  BenchmarkStats,
} from "./dto/benchmarks.dto";

/**
 * Health score calculation weights per CONTEXT.md:
 * - Login: 20%
 * - Case Resolution: 25%
 * - Campaign Completion: 25%
 * - Feature Adoption: 15%
 * - Support Tickets: 15%
 *
 * NOTE: Currently defined for documentation purposes.
 * Weights are applied in HealthScoreService.
 */
// const HEALTH_SCORE_WEIGHTS = {
//   login: 0.2,
//   caseResolution: 0.25,
//   campaignCompletion: 0.25,
//   featureAdoption: 0.15,
//   ticketVolume: 0.15,
// };

@Injectable()
export class ClientSuccessService {
  private readonly logger = new Logger(ClientSuccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly healthScoreService: HealthScoreService,
    private readonly peerBenchmarkService: PeerBenchmarkService,
  ) {}

  /**
   * Get portfolio overview of all clients with health scores.
   *
   * @param query - Optional filtering and sorting parameters
   * @returns Portfolio response with clients and summary
   */
  async getPortfolio(query?: PortfolioQueryDto): Promise<PortfolioResponse> {
    this.logger.log("Fetching client portfolio");

    // Get all active organizations with their latest health scores
    const organizations = await this.prisma.organization.findMany({
      where: {
        isActive: true,
      },
      include: {
        healthScores: {
          orderBy: { calculatedAt: "desc" },
          take: 2, // Current + previous for trend calculation
        },
      },
    });

    // Transform to portfolio clients
    const clients: PortfolioClient[] = await Promise.all(
      organizations.map(async (org) => {
        const latestScore = org.healthScores[0];
        const previousScore = org.healthScores[1];

        // Get last activity timestamp (most recent case, RIU, or user login)
        const lastActivity = await this.getLastActivity(org.id);

        // Calculate trend (change from previous score)
        const trend = previousScore
          ? latestScore.overallScore - previousScore.overallScore
          : 0;

        return {
          id: org.id,
          name: org.name,
          healthScore: latestScore?.overallScore ?? 0,
          trend,
          components: {
            login: latestScore?.loginScore ?? 0,
            caseResolution: latestScore?.caseResolutionScore ?? 0,
            campaignCompletion: latestScore?.campaignCompletionScore ?? 0,
            featureAdoption: latestScore?.featureAdoptionScore ?? 0,
            ticketVolume: latestScore?.supportTicketScore ?? 0,
          },
          alertsEnabled: true, // Could be pulled from org settings
          lastActivity: lastActivity.toISOString(),
        };
      }),
    );

    // Apply filtering
    let filteredClients = clients;
    if (query?.riskLevel) {
      filteredClients = clients.filter((client) => {
        const score = client.healthScore;
        if (query.riskLevel === "HIGH") return score < 60;
        if (query.riskLevel === "MEDIUM") return score >= 60 && score < 80;
        if (query.riskLevel === "LOW") return score >= 80;
        return true;
      });
    }

    // Apply sorting
    if (query?.sortBy) {
      filteredClients.sort((a, b) => {
        let comparison = 0;
        switch (query.sortBy) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "healthScore":
            comparison = a.healthScore - b.healthScore;
            break;
          case "lastActivity":
            comparison =
              new Date(a.lastActivity).getTime() -
              new Date(b.lastActivity).getTime();
            break;
        }
        return query.sortOrder === "desc" ? -comparison : comparison;
      });
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(clients);

    return {
      clients: filteredClients,
      summary,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get peer benchmarks with optional filtering.
   *
   * @param query - Filter by organization, size, industry
   * @returns Benchmark statistics with privacy protection
   */
  async getBenchmarks(query?: BenchmarksQueryDto): Promise<BenchmarksResponse> {
    this.logger.log(
      `Fetching benchmarks for org: ${query?.organizationId ?? "all"}`,
    );

    // Parse size filter into employee range
    const sizeFilter = this.parseSizeFilter(query?.size);

    // Get benchmarks for each metric
    const [
      attestationCompletion,
      caseResolutionDays,
      loginRate,
      featureAdoption,
      healthScore,
    ] = await Promise.all([
      this.getBenchmarkStats("attestation_completion_rate", {
        industrySector: query?.industry,
        ...sizeFilter,
      }),
      this.getBenchmarkStats("case_resolution_time", {
        industrySector: query?.industry,
        ...sizeFilter,
      }),
      this.getBenchmarkStats("login_rate", {
        industrySector: query?.industry,
        ...sizeFilter,
      }),
      this.getBenchmarkStats("feature_adoption_rate", {
        industrySector: query?.industry,
        ...sizeFilter,
      }),
      // For overall health score, we calculate directly from TenantHealthScore
      this.getHealthScoreBenchmarks({
        industrySector: query?.industry,
        ...sizeFilter,
      }),
    ]);

    // Privacy check: ensure minimum peer count (handled in getBenchmarkStats)
    const peerCount =
      attestationCompletion?.peerCount ?? healthScore?.peerCount ?? 0;

    return {
      peerCount,
      filters: {
        size: query?.size ?? null,
        industry: query?.industry ?? null,
      },
      attestationCompletion: attestationCompletion ?? this.getDefaultStats(),
      caseResolutionDays: caseResolutionDays ?? this.getDefaultStats(),
      loginRate: loginRate ?? this.getDefaultStats(),
      featureAdoption: featureAdoption ?? this.getDefaultStats(),
      healthScore: healthScore ?? this.getDefaultStats(),
      lastCalculated: new Date().toISOString(),
    };
  }

  /**
   * Get benchmark statistics for a specific metric.
   * Returns null if insufficient peers (privacy protection).
   */
  private async getBenchmarkStats(
    metricName: string,
    filter?: {
      industrySector?: string;
      employeeMin?: number;
      employeeMax?: number;
    },
  ): Promise<BenchmarkStats | null> {
    const benchmark = await this.prisma.peerBenchmark.findFirst({
      where: {
        metricName,
        industrySector: filter?.industrySector ?? null,
        employeeMin: filter?.employeeMin ?? null,
        employeeMax: filter?.employeeMax ?? null,
      },
      orderBy: { calculatedAt: "desc" },
    });

    // Privacy protection: require minimum 5 peers
    if (!benchmark || benchmark.peerCount < 5) {
      return null;
    }

    return {
      p25: benchmark.p25,
      median: benchmark.median,
      p75: benchmark.p75,
      mean: benchmark.mean,
      min: benchmark.minValue,
      max: benchmark.maxValue,
      peerCount: benchmark.peerCount,
    };
  }

  /**
   * Get health score benchmarks by calculating from TenantHealthScore records.
   * This allows filtering by industry/size using Organization.settings.
   */
  private async getHealthScoreBenchmarks(filter?: {
    industrySector?: string;
    employeeMin?: number;
    employeeMax?: number;
  }): Promise<BenchmarkStats | null> {
    // Get all active organizations with their settings and latest health scores
    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        settings: true,
        healthScores: {
          orderBy: { calculatedAt: "desc" },
          take: 1,
        },
      },
    });

    // Filter organizations based on industry/size
    const filteredOrgs = orgs.filter((org) => {
      const settings = (org.settings as Record<string, unknown>) || {};

      // Apply industry filter
      if (
        filter?.industrySector &&
        settings.industrySector !== filter.industrySector
      ) {
        return false;
      }

      // Apply size filter
      if (
        filter?.employeeMin !== undefined ||
        filter?.employeeMax !== undefined
      ) {
        const employeeCount = settings.employeeCount;
        if (typeof employeeCount !== "number") return false;
        if (
          filter.employeeMin !== undefined &&
          employeeCount < filter.employeeMin
        ) {
          return false;
        }
        if (
          filter.employeeMax !== undefined &&
          employeeCount > filter.employeeMax
        ) {
          return false;
        }
      }

      return true;
    });

    // Extract health scores
    const scores = filteredOrgs
      .map((org) => org.healthScores[0]?.overallScore)
      .filter((score): score is number => score !== undefined);

    // Privacy protection: require minimum 5 values
    if (scores.length < 5) {
      return null;
    }

    // Sort for percentile calculation
    scores.sort((a, b) => a - b);

    return {
      p25: this.getPercentileValue(scores, 25),
      median: this.getPercentileValue(scores, 50),
      p75: this.getPercentileValue(scores, 75),
      mean: scores.reduce((a, b) => a + b, 0) / scores.length,
      min: scores[0],
      max: scores[scores.length - 1],
      peerCount: scores.length,
    };
  }

  /**
   * Calculate percentile value from sorted array.
   */
  private getPercentileValue(
    sortedValues: number[],
    percentile: number,
  ): number {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0];

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedValues[lower];
    }

    // Linear interpolation
    return (
      sortedValues[lower] +
      (sortedValues[upper] - sortedValues[lower]) * (index - lower)
    );
  }

  /**
   * Parse size filter string into employee min/max range.
   */
  private parseSizeFilter(size?: string): {
    employeeMin?: number;
    employeeMax?: number;
  } {
    if (!size) return {};

    switch (size) {
      case "small":
        return { employeeMin: 1, employeeMax: 100 };
      case "medium":
        return { employeeMin: 101, employeeMax: 500 };
      case "large":
        return { employeeMin: 501, employeeMax: 2000 };
      case "enterprise":
        return { employeeMin: 2001 };
      default:
        return {};
    }
  }

  /**
   * Get default stats when no benchmark data available.
   */
  private getDefaultStats(): BenchmarkStats {
    return {
      p25: 0,
      median: 0,
      p75: 0,
      mean: 0,
      min: 0,
      max: 0,
      peerCount: 0,
    };
  }

  /**
   * Calculate portfolio summary statistics.
   */
  private calculateSummary(clients: PortfolioClient[]): PortfolioSummary {
    const total = clients.length;
    let healthy = 0;
    let atRisk = 0;
    let critical = 0;
    let totalScore = 0;

    for (const client of clients) {
      totalScore += client.healthScore;

      if (client.healthScore >= 80) {
        healthy++;
      } else if (client.healthScore >= 60) {
        atRisk++;
      } else {
        critical++;
      }
    }

    return {
      total,
      healthy,
      atRisk,
      critical,
      averageScore: total > 0 ? Math.round(totalScore / total) : 0,
    };
  }

  /**
   * Get last activity timestamp for an organization.
   * Checks cases, RIUs, and user logins.
   */
  private async getLastActivity(organizationId: string): Promise<Date> {
    // Get most recent activity from multiple sources
    const [lastCase, lastRiu, lastLogin] = await Promise.all([
      this.prisma.case.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      this.prisma.riskIntelligenceUnit.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      this.prisma.session.findFirst({
        where: {
          user: { organizationId },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    // Return the most recent timestamp
    const dates = [
      lastCase?.createdAt,
      lastRiu?.createdAt,
      lastLogin?.createdAt,
    ].filter((d): d is Date => d !== undefined && d !== null);

    if (dates.length === 0) {
      return new Date(); // Default to now if no activity found
    }

    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }
}
