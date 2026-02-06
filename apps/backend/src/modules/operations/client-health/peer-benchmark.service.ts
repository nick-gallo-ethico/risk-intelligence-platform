/**
 * PeerBenchmarkService - Peer Comparison with Percentile Calculation
 *
 * Per CONTEXT.md:
 * - Peer comparison with configurable filtering
 * - Compare against all customers (default) OR filter by size/industry
 * - Minimum 5 peers for privacy
 * - Show percentile, median, P25/P75 with visual indicator
 * - Cache aggregates nightly
 *
 * NOTE: Industry/size filters rely on Organization.settings JSON containing:
 * - settings.industrySector: string (e.g., "HEALTHCARE")
 * - settings.employeeCount: number (e.g., 500)
 * If not present, filtering by industry/size is skipped.
 *
 * @see CONTEXT.md for benchmark display requirements
 * @see health-metrics.types.ts for MIN_PEER_COUNT constant
 */

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  BenchmarkDisplay,
  MIN_PEER_COUNT,
} from "../types/health-metrics.types";

/**
 * Filter criteria for benchmark comparisons.
 * When all fields are undefined, compares against all customers.
 */
export interface BenchmarkFilter {
  /** Filter by industry sector (e.g., HEALTHCARE, FINANCIAL_SERVICES) */
  industrySector?: string;
  /** Minimum employee count for size filter */
  employeeMin?: number;
  /** Maximum employee count for size filter */
  employeeMax?: number;
}

/**
 * Organization settings structure for industry/size info.
 */
interface OrganizationSettings {
  industrySector?: string;
  employeeCount?: number;
  [key: string]: unknown;
}

/**
 * Metrics supported for benchmarking.
 */
const BENCHMARK_METRICS = [
  "attestation_completion_rate",
  "case_resolution_time",
  "case_on_time_rate",
  "login_rate",
  "feature_adoption_rate",
] as const;

/**
 * Employee size ranges for benchmark filtering.
 * These ranges provide meaningful peer groupings.
 */
const SIZE_RANGES = [
  { employeeMin: 1, employeeMax: 100 },
  { employeeMin: 101, employeeMax: 500 },
  { employeeMin: 501, employeeMax: 2000 },
  { employeeMin: 2001, employeeMax: undefined },
] as const;

@Injectable()
export class PeerBenchmarkService {
  private readonly logger = new Logger(PeerBenchmarkService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get benchmark comparison for a tenant.
   *
   * @param organizationId - The tenant to compare
   * @param metricName - The metric to benchmark
   * @param filter - Optional filter by industry/size
   * @returns Benchmark display data or null if not enough peers
   */
  async getBenchmarkComparison(
    organizationId: string,
    metricName: string,
    filter?: BenchmarkFilter,
  ): Promise<BenchmarkDisplay | null> {
    // Get tenant's value for this metric
    const tenantValue = await this.getTenantMetricValue(
      organizationId,
      metricName,
    );
    if (tenantValue === null) {
      this.logger.debug(
        `No metric value found for org ${organizationId}, metric ${metricName}`,
      );
      return null;
    }

    // Get matching benchmark from cache
    const benchmark = await this.prisma.peerBenchmark.findFirst({
      where: {
        metricName,
        industrySector: filter?.industrySector ?? null,
        employeeMin: filter?.employeeMin ?? null,
        employeeMax: filter?.employeeMax ?? null,
      },
      orderBy: { calculatedAt: "desc" },
    });

    // Privacy check: require minimum 5 peers
    if (!benchmark || benchmark.peerCount < MIN_PEER_COUNT) {
      this.logger.debug(
        `Insufficient peers for benchmark: ${benchmark?.peerCount ?? 0} < ${MIN_PEER_COUNT}`,
      );
      return null;
    }

    // Calculate tenant's percentile position
    const percentile = this.calculatePercentile(tenantValue, benchmark);

    return {
      yourValue: tenantValue,
      percentile,
      p25: benchmark.p25,
      median: benchmark.median,
      p75: benchmark.p75,
      peerCount: benchmark.peerCount,
      filterDescription: this.buildFilterDescription(
        filter,
        benchmark.peerCount,
      ),
    };
  }

  /**
   * Calculate all benchmarks for nightly caching.
   * Called by PeerBenchmarkProcessor.
   *
   * @returns Count of metrics calculated
   */
  async calculateBenchmarks(): Promise<{ metricsCalculated: number }> {
    const filters = await this.getFilterCombinations();
    let count = 0;

    this.logger.log(
      `Starting benchmark calculation for ${BENCHMARK_METRICS.length} metrics x ${filters.length} filters`,
    );

    for (const metricName of BENCHMARK_METRICS) {
      for (const filter of filters) {
        await this.calculateBenchmarkForFilter(metricName, filter);
        count++;
      }
    }

    this.logger.log(`Calculated ${count} benchmark aggregates`);
    return { metricsCalculated: count };
  }

  /**
   * Calculate benchmark for a specific metric and filter combination.
   */
  private async calculateBenchmarkForFilter(
    metricName: string,
    filter: BenchmarkFilter | null,
  ): Promise<void> {
    // Get all tenant values for this metric with optional filtering
    const values = await this.getAllTenantValues(metricName, filter);

    // Privacy: only store if we have enough data points
    if (values.length < MIN_PEER_COUNT) {
      this.logger.debug(
        `Skipping benchmark for ${metricName} with filter ${JSON.stringify(filter)}: only ${values.length} values`,
      );
      return;
    }

    // Sort for percentile calculation
    values.sort((a, b) => a - b);

    const stats = {
      peerCount: values.length,
      p25: this.getPercentileValue(values, 25),
      median: this.getPercentileValue(values, 50),
      p75: this.getPercentileValue(values, 75),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      minValue: values[0],
      maxValue: values[values.length - 1],
    };

    // Get today at midnight for unique constraint
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try to find existing benchmark to update or create new one
    // Using findFirst + update/create instead of upsert due to nullable fields in unique constraint
    const existing = await this.prisma.peerBenchmark.findFirst({
      where: {
        metricName,
        industrySector: filter?.industrySector ?? null,
        employeeMin: filter?.employeeMin ?? null,
        employeeMax: filter?.employeeMax ?? null,
        calculatedAt: today,
      },
    });

    if (existing) {
      await this.prisma.peerBenchmark.update({
        where: { id: existing.id },
        data: stats,
      });
    } else {
      await this.prisma.peerBenchmark.create({
        data: {
          metricName,
          industrySector: filter?.industrySector ?? null,
          employeeMin: filter?.employeeMin ?? null,
          employeeMax: filter?.employeeMax ?? null,
          calculatedAt: today,
          ...stats,
        },
      });
    }
  }

  /**
   * Get the tenant's current value for a metric.
   * Maps metric names to TenantHealthScore component fields.
   */
  private async getTenantMetricValue(
    organizationId: string,
    metricName: string,
  ): Promise<number | null> {
    // Get latest health score for component values
    const score = await this.prisma.tenantHealthScore.findFirst({
      where: { organizationId },
      orderBy: { calculatedAt: "desc" },
    });

    if (!score) return null;

    // Map metric names to score components
    switch (metricName) {
      case "attestation_completion_rate":
        return score.campaignCompletionScore;
      case "case_on_time_rate":
        return score.caseResolutionScore;
      case "login_rate":
        return score.loginScore;
      case "feature_adoption_rate":
        return score.featureAdoptionScore;
      case "case_resolution_time":
        // For time-based metrics, we'd need different data source
        // For now, return caseResolutionScore as proxy
        return score.caseResolutionScore;
      default:
        this.logger.warn(`Unknown metric name: ${metricName}`);
        return null;
    }
  }

  /**
   * Get all tenant values for a metric with optional filtering.
   * Filters by industry/size from Organization.settings JSON.
   */
  private async getAllTenantValues(
    metricName: string,
    filter: BenchmarkFilter | null,
  ): Promise<number[]> {
    // Get all active organizations with their settings
    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, settings: true },
    });

    // Filter organizations based on industry/size from settings JSON
    const filteredOrgs = orgs.filter((org) => {
      const settings = (org.settings as OrganizationSettings) || {};

      // Apply industry filter if specified
      if (filter?.industrySector) {
        if (settings.industrySector !== filter.industrySector) {
          return false;
        }
      }

      // Apply size filter if specified
      if (
        filter?.employeeMin !== undefined ||
        filter?.employeeMax !== undefined
      ) {
        const employeeCount = settings.employeeCount;
        if (typeof employeeCount !== "number") {
          return false; // Skip orgs without employee count data
        }
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

    // Collect values for each filtered organization
    const values: number[] = [];
    for (const org of filteredOrgs) {
      const value = await this.getTenantMetricValue(org.id, metricName);
      if (value !== null) {
        values.push(value);
      }
    }

    return values;
  }

  /**
   * Get all filter combinations for benchmark calculation.
   * Includes: no filter (all customers), by industry, by size range.
   */
  private async getFilterCombinations(): Promise<(BenchmarkFilter | null)[]> {
    // Start with no filter (all customers)
    const filters: (BenchmarkFilter | null)[] = [null];

    // Get all active organizations to extract unique industries
    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: { settings: true },
    });

    // Extract unique industries from settings JSON
    const industries = new Set<string>();
    for (const org of orgs) {
      const settings = (org.settings as OrganizationSettings) || {};
      if (
        settings.industrySector &&
        typeof settings.industrySector === "string"
      ) {
        industries.add(settings.industrySector);
      }
    }

    // Add industry filters
    for (const industrySector of industries) {
      filters.push({ industrySector });
    }

    // Add size range filters
    for (const size of SIZE_RANGES) {
      filters.push({
        employeeMin: size.employeeMin,
        employeeMax: size.employeeMax,
      });
    }

    return filters;
  }

  /**
   * Calculate percentile value from sorted array.
   * Uses linear interpolation for non-integer indices.
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
   * Calculate tenant's percentile position based on quartile values.
   * Uses piecewise linear interpolation between quartiles.
   */
  private calculatePercentile(
    value: number,
    benchmark: {
      p25: number;
      median: number;
      p75: number;
      minValue: number;
      maxValue: number;
    },
  ): number {
    // Handle edge cases
    if (value <= benchmark.minValue) return 0;
    if (value >= benchmark.maxValue) return 100;

    // Piecewise linear interpolation
    if (value <= benchmark.p25) {
      // 0-25th percentile range
      const range = benchmark.p25 - benchmark.minValue;
      if (range === 0) return 0;
      return Math.round(((value - benchmark.minValue) / range) * 25);
    } else if (value <= benchmark.median) {
      // 25-50th percentile range
      const range = benchmark.median - benchmark.p25;
      if (range === 0) return 25;
      return 25 + Math.round(((value - benchmark.p25) / range) * 25);
    } else if (value <= benchmark.p75) {
      // 50-75th percentile range
      const range = benchmark.p75 - benchmark.median;
      if (range === 0) return 50;
      return 50 + Math.round(((value - benchmark.median) / range) * 25);
    } else {
      // 75-100th percentile range
      const range = benchmark.maxValue - benchmark.p75;
      if (range === 0) return 75;
      return 75 + Math.round(((value - benchmark.p75) / range) * 25);
    }
  }

  /**
   * Build human-readable filter description for display.
   */
  private buildFilterDescription(
    filter: BenchmarkFilter | undefined,
    peerCount: number,
  ): string {
    const parts: string[] = [];

    if (filter?.industrySector) {
      parts.push(filter.industrySector);
    }

    if (
      filter?.employeeMin !== undefined ||
      filter?.employeeMax !== undefined
    ) {
      if (
        filter.employeeMin !== undefined &&
        filter.employeeMax !== undefined
      ) {
        parts.push(`${filter.employeeMin}-${filter.employeeMax} employees`);
      } else if (filter.employeeMin !== undefined) {
        parts.push(`${filter.employeeMin}+ employees`);
      } else if (filter.employeeMax !== undefined) {
        parts.push(`Up to ${filter.employeeMax} employees`);
      }
    }

    const base = parts.length > 0 ? parts.join(", ") : "all customers";
    return `${base} (${peerCount} organizations)`;
  }
}
