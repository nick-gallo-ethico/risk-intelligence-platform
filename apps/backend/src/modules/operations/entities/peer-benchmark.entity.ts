/**
 * PeerBenchmark Entity Description
 *
 * This file documents the PeerBenchmark Prisma model for peer comparison data.
 *
 * PeerBenchmark stores nightly cached aggregates:
 * - Calculated via background job (not on-demand)
 * - Filtered by industry sector and employee count range
 * - Privacy protected (only shown when peerCount >= 5)
 * - Includes percentile distributions (p25, median, p75)
 *
 * @see schema.prisma for the actual model definition
 * @see health-metrics.types.ts for BenchmarkMetric and IndustrySector enums
 */

import {
  BenchmarkMetric,
  IndustrySector,
  BenchmarkDisplay,
  MIN_PEER_COUNT,
} from "../types/health-metrics.types";

/**
 * PeerBenchmark represents cached benchmark data for peer comparison.
 *
 * Prisma model:
 * ```prisma
 * model PeerBenchmark {
 *   id             String   @id @default(uuid())
 *   metricName     String   @map("metric_name")
 *   calculatedAt   DateTime @default(now()) @map("calculated_at")
 *
 *   // Filter criteria (null = all customers)
 *   industrySector String?  @map("industry_sector")
 *   employeeMin    Int?     @map("employee_min")
 *   employeeMax    Int?     @map("employee_max")
 *
 *   // Aggregates
 *   peerCount      Int      @map("peer_count")
 *   p25            Float
 *   median         Float
 *   p75            Float
 *   mean           Float
 *   minValue       Float    @map("min_value")
 *   maxValue       Float    @map("max_value")
 * }
 * ```
 */
export interface PeerBenchmark {
  /** Unique identifier */
  id: string;

  /** Name of the metric being benchmarked */
  metricName: string;

  /** When this benchmark was calculated */
  calculatedAt: Date;

  /** Industry sector filter (null = all industries) */
  industrySector: string | null;

  /** Minimum employee count filter */
  employeeMin: number | null;

  /** Maximum employee count filter */
  employeeMax: number | null;

  /** Number of tenants in this cohort */
  peerCount: number;

  /** 25th percentile value */
  p25: number;

  /** 50th percentile (median) value */
  median: number;

  /** 75th percentile value */
  p75: number;

  /** Mean (average) value */
  mean: number;

  /** Minimum value in cohort */
  minValue: number;

  /** Maximum value in cohort */
  maxValue: number;
}

/**
 * DTO for creating a benchmark record.
 */
export interface CreatePeerBenchmarkDto {
  metricName: BenchmarkMetric | string;
  industrySector?: IndustrySector | string | null;
  employeeMin?: number | null;
  employeeMax?: number | null;
  peerCount: number;
  p25: number;
  median: number;
  p75: number;
  mean: number;
  minValue: number;
  maxValue: number;
}

/**
 * Filter criteria for benchmark lookup.
 */
export interface BenchmarkFilter {
  metricName: BenchmarkMetric | string;
  industrySector?: IndustrySector | string | null;
  employeeMin?: number | null;
  employeeMax?: number | null;
}

/**
 * Benchmark with tenant's position for display.
 */
export interface BenchmarkWithPosition extends PeerBenchmark {
  /** Tenant's actual value */
  tenantValue: number;

  /** Tenant's percentile rank (0-100) */
  percentileRank: number;

  /** Whether benchmark can be shown (peerCount >= MIN_PEER_COUNT) */
  canDisplay: boolean;

  /** Formatted filter description */
  filterDescription: string;
}

/**
 * Converts a benchmark to display format.
 * @param benchmark - The benchmark data
 * @param tenantValue - The tenant's value for this metric
 * @returns Display-ready benchmark data
 */
export function toBenchmarkDisplay(
  benchmark: PeerBenchmark,
  tenantValue: number,
): BenchmarkDisplay {
  // Calculate percentile rank
  let percentile: number;
  if (tenantValue <= benchmark.minValue) {
    percentile = 0;
  } else if (tenantValue >= benchmark.maxValue) {
    percentile = 100;
  } else if (tenantValue <= benchmark.p25) {
    percentile =
      25 *
      ((tenantValue - benchmark.minValue) /
        (benchmark.p25 - benchmark.minValue));
  } else if (tenantValue <= benchmark.median) {
    percentile =
      25 +
      25 * ((tenantValue - benchmark.p25) / (benchmark.median - benchmark.p25));
  } else if (tenantValue <= benchmark.p75) {
    percentile =
      50 +
      25 *
        ((tenantValue - benchmark.median) / (benchmark.p75 - benchmark.median));
  } else {
    percentile =
      75 +
      25 *
        ((tenantValue - benchmark.p75) / (benchmark.maxValue - benchmark.p75));
  }

  // Build filter description
  const parts: string[] = [];
  if (benchmark.industrySector) {
    parts.push(benchmark.industrySector);
  }
  if (benchmark.employeeMin !== null || benchmark.employeeMax !== null) {
    const min = benchmark.employeeMin ?? 0;
    const max = benchmark.employeeMax ?? "∞";
    parts.push(`${min}-${max} employees`);
  }
  const filterDescription =
    parts.length > 0 ? parts.join(", ") : "all customers";

  return {
    yourValue: tenantValue,
    percentile: Math.round(percentile),
    p25: benchmark.p25,
    median: benchmark.median,
    p75: benchmark.p75,
    peerCount: benchmark.peerCount,
    filterDescription,
  };
}

/**
 * Checks if a benchmark can be displayed (privacy protection).
 * @param peerCount - Number of peers in the cohort
 * @returns true if peerCount >= MIN_PEER_COUNT
 */
export function canDisplayBenchmark(peerCount: number): boolean {
  return peerCount >= MIN_PEER_COUNT;
}

/**
 * Available benchmark metrics with descriptions.
 */
export const BENCHMARK_METRIC_DESCRIPTIONS: Record<string, string> = {
  case_resolution_time: "Average case resolution time in days",
  case_sla_compliance: "Percentage of cases closed within SLA",
  attestation_completion_rate: "Campaign/attestation completion rate",
  login_rate: "Percentage of employees who logged in (30-day rolling)",
  feature_adoption_count: "Number of features adopted",
  health_score: "Overall health score",
};
