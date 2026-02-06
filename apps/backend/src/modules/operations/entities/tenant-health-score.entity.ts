/**
 * TenantHealthScore Entity Description
 *
 * This file documents the TenantHealthScore Prisma model for client health monitoring.
 *
 * TenantHealthScore stores blended health scores per tenant with:
 * - 5 component scores (login, case resolution, campaign, feature adoption, support)
 * - Weighted overall score (0-100)
 * - Trend classification (improving/stable/declining)
 * - Risk level (low/medium/high)
 * - Alert level configuration per account
 *
 * @see schema.prisma for the actual model definition
 * @see health-metrics.types.ts for scoring weights and thresholds
 */

import {
  RiskLevel,
  HealthTrend,
  AlertLevel,
  HealthScoreComponents,
} from "../types/health-metrics.types";

/**
 * TenantHealthScore represents a point-in-time health calculation for a tenant.
 *
 * Prisma model:
 * ```prisma
 * model TenantHealthScore {
 *   id                      String       @id @default(uuid())
 *   organizationId          String       @map("organization_id")
 *   calculatedAt            DateTime     @default(now()) @map("calculated_at")
 *
 *   // Component scores (0-100 each)
 *   loginScore              Int          @map("login_score")
 *   caseResolutionScore     Int          @map("case_resolution_score")
 *   campaignCompletionScore Int          @map("campaign_completion_score")
 *   featureAdoptionScore    Int          @map("feature_adoption_score")
 *   supportTicketScore      Int          @map("support_ticket_score")
 *
 *   // Overall (weighted average, 0-100)
 *   overallScore            Int          @map("overall_score")
 *
 *   // Trend and risk classification
 *   trend                   HealthTrend
 *   riskLevel               RiskLevel    @map("risk_level")
 *
 *   // Previous score for delta calculation
 *   previousScore           Int?         @map("previous_score")
 *
 *   // Alert configuration (per account)
 *   alertLevel              AlertLevel   @default(DASHBOARD_ONLY) @map("alert_level")
 *
 *   // Relations
 *   organization            Organization @relation(...)
 * }
 * ```
 */
export interface TenantHealthScore {
  /** Unique identifier */
  id: string;

  /** Organization this score belongs to */
  organizationId: string;

  /** When this score was calculated */
  calculatedAt: Date;

  /** Login score (0-100): Active users / total users */
  loginScore: number;

  /** Case resolution score (0-100): On-time closures */
  caseResolutionScore: number;

  /** Campaign completion score (0-100): Attestation/disclosure completion rates */
  campaignCompletionScore: number;

  /** Feature adoption score (0-100): Features used / available features */
  featureAdoptionScore: number;

  /** Support ticket score (0-100): Inverse of ticket volume */
  supportTicketScore: number;

  /** Overall weighted score (0-100) */
  overallScore: number;

  /** Trend direction based on score delta */
  trend: HealthTrend;

  /** Risk level classification */
  riskLevel: RiskLevel;

  /** Previous overall score for trend calculation */
  previousScore: number | null;

  /** Alert configuration for this account */
  alertLevel: AlertLevel;
}

/**
 * DTO for creating a health score calculation.
 */
export interface CreateHealthScoreDto {
  organizationId: string;
  components: HealthScoreComponents;
  previousScore?: number | null;
  alertLevel?: AlertLevel;
}

/**
 * DTO for health score with organization details.
 */
export interface TenantHealthScoreWithOrg extends TenantHealthScore {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Summary of health scores for dashboard display.
 */
export interface HealthScoreSummary {
  /** Total number of tenants */
  totalTenants: number;

  /** Count by risk level */
  byRiskLevel: {
    low: number;
    medium: number;
    high: number;
  };

  /** Count by trend */
  byTrend: {
    improving: number;
    stable: number;
    declining: number;
  };

  /** Average overall score */
  averageScore: number;
}

/**
 * Health score trend data for charts.
 */
export interface HealthScoreTrend {
  organizationId: string;
  dataPoints: Array<{
    calculatedAt: Date;
    overallScore: number;
    trend: HealthTrend;
    riskLevel: RiskLevel;
  }>;
}
