/**
 * Client Health Metrics Types
 *
 * Blended scoring approach per CONTEXT.md:
 * - Usage metrics: login frequency, feature adoption
 * - Outcome metrics: case resolution, SLA compliance, attestation rates
 *
 * Weight distribution (must sum to 1.0) per RESEARCH.md:
 * - Login: 20%
 * - Case Resolution: 25%
 * - Campaign Completion: 25%
 * - Feature Adoption: 15%
 * - Support Tickets: 15%
 *
 * @see CONTEXT.md for health score calculation details
 * @see RESEARCH.md for weight distribution rationale
 */

/**
 * Health score component weights.
 * These must sum to 1.0 for accurate overall score calculation.
 */
export const HEALTH_WEIGHTS = {
  login: 0.2,
  caseResolution: 0.25,
  campaignCompletion: 0.25,
  featureAdoption: 0.15,
  supportTickets: 0.15,
} as const;

/**
 * Risk levels for tenant health classification.
 * Used for traffic light indicators and alert prioritization.
 */
export const RiskLevel = {
  /** Score >= 70, stable or improving */
  LOW: "LOW",
  /** Score 40-70 OR declining */
  MEDIUM: "MEDIUM",
  /** Score < 40 OR (score < 60 AND declining) */
  HIGH: "HIGH",
} as const;

export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

/**
 * Health score trend classification.
 * Calculated from delta between current and previous score.
 */
export const HealthTrend = {
  /** Delta > +5 */
  IMPROVING: "IMPROVING",
  /** Delta -5 to +5 */
  STABLE: "STABLE",
  /** Delta < -5 */
  DECLINING: "DECLINING",
} as const;

export type HealthTrend = (typeof HealthTrend)[keyof typeof HealthTrend];

/**
 * Alert level configuration per account.
 * Different customers may require different alerting thresholds.
 */
export const AlertLevel = {
  /** No alerts generated */
  NONE: "NONE",
  /** Show on dashboard only (SMB/PLG customers) */
  DASHBOARD_ONLY: "DASHBOARD_ONLY",
  /** Proactive notification to CSM (high-touch enterprise customers) */
  PROACTIVE: "PROACTIVE",
} as const;

export type AlertLevel = (typeof AlertLevel)[keyof typeof AlertLevel];

/**
 * Features tracked for adoption scoring.
 * Binary flags per tenant per feature (adopted or not).
 */
export const TrackedFeature = {
  // Core features
  HOTLINE_INTAKE: "HOTLINE_INTAKE",
  WEB_INTAKE: "WEB_INTAKE",
  CASE_MANAGEMENT: "CASE_MANAGEMENT",
  INVESTIGATIONS: "INVESTIGATIONS",

  // Advanced features
  AI_ASSISTANT: "AI_ASSISTANT",
  CUSTOM_WORKFLOWS: "CUSTOM_WORKFLOWS",
  CUSTOM_DASHBOARDS: "CUSTOM_DASHBOARDS",
  POLICY_MANAGEMENT: "POLICY_MANAGEMENT",

  // Campaign features
  COI_CAMPAIGNS: "COI_CAMPAIGNS",
  ATTESTATION_CAMPAIGNS: "ATTESTATION_CAMPAIGNS",
  GIFT_DISCLOSURES: "GIFT_DISCLOSURES",

  // Integration features
  SSO_ENABLED: "SSO_ENABLED",
  HRIS_INTEGRATION: "HRIS_INTEGRATION",
  API_USAGE: "API_USAGE",
} as const;

export type TrackedFeature =
  (typeof TrackedFeature)[keyof typeof TrackedFeature];

/**
 * All tracked features as an array (useful for iteration).
 */
export const ALL_TRACKED_FEATURES = Object.values(TrackedFeature);

/**
 * Component scores that make up the overall health score.
 * Each component is scored 0-100.
 */
export interface HealthScoreComponents {
  /** Active users / total users (0-100) */
  loginScore: number;
  /** On-time case closures (0-100) */
  caseResolutionScore: number;
  /** Campaign/attestation completion rates (0-100) */
  campaignCompletionScore: number;
  /** Features used / features available (0-100) */
  featureAdoptionScore: number;
  /** Inverse of ticket volume - fewer tickets = higher score (0-100) */
  supportTicketScore: number;
}

/**
 * Peer benchmark display data per CONTEXT.md.
 * Used for showing tenant performance relative to peers.
 */
export interface BenchmarkDisplay {
  /** The tenant's actual value for this metric */
  yourValue: number;
  /** Tenant's percentile rank among peers (0-100) */
  percentile: number;
  /** 25th percentile value */
  p25: number;
  /** 50th percentile value (median) */
  median: number;
  /** 75th percentile value */
  p75: number;
  /** Number of peers in comparison group (min 5 for privacy) */
  peerCount: number;
  /** Description of the peer filter, e.g., "all customers" or "Healthcare, 100-500 employees" */
  filterDescription: string;
}

/**
 * Metrics that can be benchmarked across tenants.
 */
export const BenchmarkMetric = {
  /** Average case resolution time in days */
  CASE_RESOLUTION_TIME: "case_resolution_time",
  /** Percentage of cases closed within SLA */
  CASE_SLA_COMPLIANCE: "case_sla_compliance",
  /** Campaign/attestation completion rate */
  ATTESTATION_COMPLETION_RATE: "attestation_completion_rate",
  /** Percentage of employees who logged in (30-day rolling) */
  LOGIN_RATE: "login_rate",
  /** Number of features adopted */
  FEATURE_ADOPTION_COUNT: "feature_adoption_count",
  /** Overall health score */
  HEALTH_SCORE: "health_score",
} as const;

export type BenchmarkMetric =
  (typeof BenchmarkMetric)[keyof typeof BenchmarkMetric];

/**
 * Industry sectors for peer benchmark filtering.
 */
export const IndustrySector = {
  HEALTHCARE: "HEALTHCARE",
  FINANCIAL_SERVICES: "FINANCIAL_SERVICES",
  MANUFACTURING: "MANUFACTURING",
  TECHNOLOGY: "TECHNOLOGY",
  RETAIL: "RETAIL",
  EDUCATION: "EDUCATION",
  GOVERNMENT: "GOVERNMENT",
  OTHER: "OTHER",
} as const;

export type IndustrySector =
  (typeof IndustrySector)[keyof typeof IndustrySector];

/**
 * Risk level thresholds for health score classification.
 */
export const RISK_THRESHOLDS = {
  /** Score below this is HIGH risk */
  HIGH_RISK_THRESHOLD: 40,
  /** Score below this combined with declining trend is HIGH risk */
  DECLINING_HIGH_THRESHOLD: 60,
  /** Score at or above this is LOW risk */
  LOW_RISK_THRESHOLD: 70,
} as const;

/**
 * Trend thresholds for health trend classification.
 */
export const TREND_THRESHOLDS = {
  /** Delta above this = IMPROVING */
  IMPROVING_DELTA: 5,
  /** Delta below this = DECLINING */
  DECLINING_DELTA: -5,
} as const;

/**
 * Minimum peer count for benchmark display (privacy protection).
 */
export const MIN_PEER_COUNT = 5;

/**
 * Calculates the risk level based on score and trend.
 * @param score - Current health score (0-100)
 * @param trend - Current trend direction
 * @returns Risk level classification
 */
export function calculateRiskLevel(
  score: number,
  trend: HealthTrend,
): RiskLevel {
  // Score < 40 is always HIGH risk
  if (score < RISK_THRESHOLDS.HIGH_RISK_THRESHOLD) {
    return RiskLevel.HIGH;
  }

  // Score < 60 AND declining is HIGH risk
  if (
    score < RISK_THRESHOLDS.DECLINING_HIGH_THRESHOLD &&
    trend === HealthTrend.DECLINING
  ) {
    return RiskLevel.HIGH;
  }

  // Score >= 70 is LOW risk (unless declining, then MEDIUM)
  if (score >= RISK_THRESHOLDS.LOW_RISK_THRESHOLD) {
    return trend === HealthTrend.DECLINING ? RiskLevel.MEDIUM : RiskLevel.LOW;
  }

  // Everything else (40-70) is MEDIUM risk
  return RiskLevel.MEDIUM;
}

/**
 * Calculates the trend based on score delta.
 * @param currentScore - Current health score
 * @param previousScore - Previous health score (null if no history)
 * @returns Trend classification
 */
export function calculateTrend(
  currentScore: number,
  previousScore: number | null,
): HealthTrend {
  if (previousScore === null) {
    return HealthTrend.STABLE;
  }

  const delta = currentScore - previousScore;

  if (delta > TREND_THRESHOLDS.IMPROVING_DELTA) {
    return HealthTrend.IMPROVING;
  }

  if (delta < TREND_THRESHOLDS.DECLINING_DELTA) {
    return HealthTrend.DECLINING;
  }

  return HealthTrend.STABLE;
}

/**
 * Calculates the overall health score from components using weighted average.
 * @param components - Individual component scores
 * @returns Weighted overall score (0-100)
 */
export function calculateOverallScore(
  components: HealthScoreComponents,
): number {
  const weighted =
    components.loginScore * HEALTH_WEIGHTS.login +
    components.caseResolutionScore * HEALTH_WEIGHTS.caseResolution +
    components.campaignCompletionScore * HEALTH_WEIGHTS.campaignCompletion +
    components.featureAdoptionScore * HEALTH_WEIGHTS.featureAdoption +
    components.supportTicketScore * HEALTH_WEIGHTS.supportTickets;

  // Round to nearest integer
  return Math.round(weighted);
}
