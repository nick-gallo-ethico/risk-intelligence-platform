/**
 * Health Score Service
 *
 * Calculates tenant health scores using a weighted composite of 5 components:
 * - Login Score (20%): Active users / total users
 * - Case Resolution Score (25%): On-time closures
 * - Campaign Completion Score (25%): Assignment completion rates
 * - Feature Adoption Score (15%): Features used / available
 * - Support Ticket Score (15%): Inverse of ticket volume
 *
 * @see RESEARCH.md for algorithm details
 * @see health-metrics.types.ts for weights and thresholds
 */

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  UsageMetricsService,
  LoginMetrics,
  CaseMetrics,
  CampaignMetrics,
} from "./usage-metrics.service";
import {
  RiskLevel,
  HealthTrend,
  HealthScoreComponents,
  ALL_TRACKED_FEATURES,
  calculateRiskLevel,
  calculateTrend,
  calculateOverallScore,
} from "../types/health-metrics.types";
import { subDays } from "date-fns";

/**
 * Result of health score calculation.
 */
export interface HealthScoreResult {
  /** Overall weighted score (0-100) */
  overallScore: number;
  /** Individual component scores */
  components: HealthScoreComponents;
  /** Trend direction based on previous score */
  trend: HealthTrend;
  /** Risk classification based on score and trend */
  riskLevel: RiskLevel;
}

@Injectable()
export class HealthScoreService {
  private readonly logger = new Logger(HealthScoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageMetricsService: UsageMetricsService,
  ) {}

  /**
   * Calculate health score for a tenant.
   * Fetches metrics, calculates components, determines trend/risk, and saves result.
   *
   * @param organizationId - Tenant ID
   * @returns Health score result with all components
   */
  async calculateHealthScore(
    organizationId: string,
  ): Promise<HealthScoreResult> {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);

    // Fetch component data in parallel for efficiency
    const [
      loginData,
      caseData,
      campaignData,
      featureScore,
      ticketCount,
      previousScore,
    ] = await Promise.all([
      this.usageMetricsService.getLoginMetrics(
        organizationId,
        thirtyDaysAgo,
        now,
      ),
      this.usageMetricsService.getCaseMetrics(
        organizationId,
        thirtyDaysAgo,
        now,
      ),
      this.usageMetricsService.getCampaignMetrics(organizationId),
      this.getFeatureAdoptionScore(organizationId),
      this.usageMetricsService.getSupportTicketCount(
        organizationId,
        thirtyDaysAgo,
        now,
      ),
      this.getPreviousScore(organizationId),
    ]);

    // Calculate individual component scores (0-100)
    const components: HealthScoreComponents = {
      loginScore: this.calculateLoginScore(loginData),
      caseResolutionScore: this.calculateCaseResolutionScore(caseData),
      campaignCompletionScore: this.calculateCampaignScore(campaignData),
      featureAdoptionScore: featureScore,
      supportTicketScore: this.calculateTicketScore(ticketCount),
    };

    // Calculate weighted overall score using helper function
    const overallScore = calculateOverallScore(components);

    // Determine trend based on previous score
    const trend = calculateTrend(overallScore, previousScore);

    // Determine risk level based on score and trend
    const riskLevel = calculateRiskLevel(overallScore, trend);

    // Save the score record
    await this.prisma.tenantHealthScore.create({
      data: {
        organizationId,
        calculatedAt: now,
        loginScore: components.loginScore,
        caseResolutionScore: components.caseResolutionScore,
        campaignCompletionScore: components.campaignCompletionScore,
        featureAdoptionScore: components.featureAdoptionScore,
        supportTicketScore: components.supportTicketScore,
        overallScore,
        trend,
        riskLevel,
        previousScore,
      },
    });

    this.logger.log(
      `Health score calculated for org ${organizationId}: ${overallScore} (${riskLevel})`,
    );

    return { overallScore, components, trend, riskLevel };
  }

  /**
   * Get the latest health score for a tenant.
   *
   * @param organizationId - Tenant ID
   * @returns Latest health score record or null
   */
  async getLatestScore(organizationId: string) {
    return this.prisma.tenantHealthScore.findFirst({
      where: { organizationId },
      orderBy: { calculatedAt: "desc" },
    });
  }

  /**
   * Get health score history for trend visualization.
   *
   * @param organizationId - Tenant ID
   * @param days - Number of days of history (default 30)
   * @returns Array of historical health scores
   */
  async getScoreHistory(organizationId: string, days: number = 30) {
    const startDate = subDays(new Date(), days);
    return this.prisma.tenantHealthScore.findMany({
      where: {
        organizationId,
        calculatedAt: { gte: startDate },
      },
      orderBy: { calculatedAt: "asc" },
    });
  }

  /**
   * Get all tenants at HIGH risk level.
   * Useful for CSM dashboards and proactive outreach.
   *
   * @returns Array of high-risk tenant scores
   */
  async getHighRiskTenants() {
    return this.prisma.tenantHealthScore.findMany({
      where: {
        riskLevel: RiskLevel.HIGH,
      },
      orderBy: { calculatedAt: "desc" },
      distinct: ["organizationId"],
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  // --- Component Calculators ---

  /**
   * Calculate login score (0-100).
   * Target: 70% of users active in last 30 days = 100 score.
   */
  private calculateLoginScore(data: LoginMetrics): number {
    if (data.totalUsers === 0) return 0;
    const activeRatio = data.activeUsers / data.totalUsers;
    // 70% active = 100 score, linear scale capped at 100
    return Math.min(100, Math.round((activeRatio / 0.7) * 100));
  }

  /**
   * Calculate case resolution score (0-100).
   * Target: 90% on-time resolution = 100 score.
   * No cases closed = perfect score (not penalized for low volume).
   */
  private calculateCaseResolutionScore(data: CaseMetrics): number {
    if (data.casesClosed === 0) return 100; // No cases to resolve = perfect
    const onTimeRatio = data.casesOnTime / data.casesClosed;
    // 90% on-time = 100 score, linear scale capped at 100
    return Math.min(100, Math.round((onTimeRatio / 0.9) * 100));
  }

  /**
   * Calculate campaign completion score (0-100).
   * Target: 85% completion = 100 score.
   * No campaigns = perfect score (not penalized for not using campaigns).
   */
  private calculateCampaignScore(data: CampaignMetrics): number {
    if (data.assignmentsTotal === 0) return 100; // No campaigns = not penalized
    const completionRatio = data.assignmentsCompleted / data.assignmentsTotal;
    // 85% completion = 100 score, linear scale capped at 100
    return Math.min(100, Math.round((completionRatio / 0.85) * 100));
  }

  /**
   * Get feature adoption score (0-100).
   * Target: 60% feature adoption = 100 score.
   */
  private async getFeatureAdoptionScore(
    organizationId: string,
  ): Promise<number> {
    const adoptions = await this.prisma.featureAdoption.findMany({
      where: { organizationId },
    });

    const totalFeatures = ALL_TRACKED_FEATURES.length;
    const adoptedFeatures = adoptions.length; // Each record = one adopted feature

    // 60% adoption = 100 score, linear scale capped at 100
    const adoptionRatio = adoptedFeatures / totalFeatures;
    return Math.min(100, Math.round((adoptionRatio / 0.6) * 100));
  }

  /**
   * Calculate support ticket score (0-100).
   * Lower tickets = higher score (inverse relationship).
   * 0 tickets = 100, 10+ tickets in 30 days = 0.
   */
  private calculateTicketScore(ticketCount: number): number {
    // Each ticket reduces score by 10 points
    return Math.max(0, 100 - ticketCount * 10);
  }

  /**
   * Get the previous overall score for trend calculation.
   */
  private async getPreviousScore(
    organizationId: string,
  ): Promise<number | null> {
    const previous = await this.prisma.tenantHealthScore.findFirst({
      where: { organizationId },
      orderBy: { calculatedAt: "desc" },
    });
    return previous?.overallScore ?? null;
  }
}
