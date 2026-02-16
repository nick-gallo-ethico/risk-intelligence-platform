import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  KpiItem,
  TrendData,
  BreakdownItem,
  CaseBreakdown,
} from "../pptx-generator.service";

// Exported Types for Report Data

/**
 * Date range filter for report queries.
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Filter options for report data queries.
 */
export interface ReportDataFilters {
  /** Filter by business units */
  businessUnitIds?: string[];
  /** Filter by locations */
  locationIds?: string[];
  /** Filter by categories */
  categoryIds?: string[];
}

/**
 * Case counts and statistics.
 */
export interface CaseCounts {
  total: number;
  open: number;
  closed: number;
  avgDaysToClose: number;
  substantiationRate: number;
  trend?: { value: number; direction: "up" | "down" | "flat" };
}

/**
 * Trend data points for time series.
 */
export interface TrendDataPoints {
  labels: string[];
  casesOpened: number[];
  casesClosed: number[];
}

/**
 * SLA metrics for the reporting period.
 */
export interface SlaMetrics {
  compliance: number;
  atRisk: number;
  breached: number;
  avgDaysToClose: number;
  trend?: { value: number; direction: "up" | "down" | "flat" };
}

/**
 * Campaign metrics for the reporting period.
 */
export interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  completion: number;
  pending: number;
  overdue: number;
}

/**
 * Risk area identification.
 */
export interface RiskArea {
  name: string;
  score: number;
  casesCount: number;
  trend: "increasing" | "decreasing" | "stable";
}

/**
 * Complete report data aggregation.
 */
export interface ReportData {
  kpis: KpiItem[];
  trends: TrendData[];
  caseBreakdown: CaseBreakdown;
  slaMetrics: SlaMetrics;
  campaignMetrics: CampaignMetrics;
  riskAreas: RiskArea[];
}

/**
 * ReportDataFetcherService
 *
 * Handles all database queries for board report data aggregation.
 * Extracts data fetching logic from BoardReportService to provide
 * a focused, testable service for report data retrieval.
 *
 * Features:
 * - Case counts and statistics with trend calculation
 * - Category and status breakdowns
 * - Weekly trend data for charts
 * - SLA compliance metrics
 * - Campaign completion metrics
 * - Risk area identification based on severity
 *
 * Usage:
 * ```typescript
 * const data = await reportDataFetcherService.fetchReportData(
 *   organizationId,
 *   { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
 *   { categoryIds: ['cat-1', 'cat-2'] }
 * );
 * ```
 */
@Injectable()
export class ReportDataFetcherService {
  private readonly logger = new Logger(ReportDataFetcherService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch all report data in parallel.
   *
   * @param orgId - Organization ID
   * @param dateRange - Date range for the report
   * @param filters - Optional filters for business units, locations, categories
   * @returns Complete report data for rendering
   */
  async fetchReportData(
    orgId: string,
    dateRange: DateRange,
    filters?: ReportDataFilters,
  ): Promise<ReportData> {
    this.logger.debug(
      `Fetching report data for org=${orgId}, range=${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`,
    );

    const [
      caseCounts,
      categoryBreakdown,
      statusBreakdown,
      trends,
      slaMetrics,
      campaignMetrics,
      riskAreas,
      riuCount,
    ] = await Promise.all([
      this.fetchCaseCounts(orgId, dateRange, filters),
      this.fetchCategoryBreakdown(orgId, dateRange, filters),
      this.fetchStatusBreakdown(orgId, dateRange, filters),
      this.fetchTrendData(orgId, dateRange),
      this.fetchSlaMetrics(orgId, dateRange, filters),
      this.fetchCampaignMetrics(orgId),
      this.fetchRiskAreas(orgId, dateRange),
      this.fetchRiuCount(orgId, dateRange),
    ]);

    // Build KPIs array
    const kpis: KpiItem[] = [
      {
        label: "Total Cases",
        value: caseCounts.total,
        trend: caseCounts.trend,
      },
      { label: "Open Cases", value: caseCounts.open },
      {
        label: "Avg Days to Close",
        value: Math.round(caseCounts.avgDaysToClose),
      },
      {
        label: "SLA Compliance",
        value: `${slaMetrics.compliance}%`,
        trend: slaMetrics.trend,
      },
      {
        label: "Campaign Completion",
        value: `${campaignMetrics.completion}%`,
      },
      {
        label: "Substantiation Rate",
        value: `${caseCounts.substantiationRate}%`,
      },
      {
        label: "Total RIUs",
        value: riuCount,
      },
      {
        label: "Active Campaigns",
        value: campaignMetrics.activeCampaigns,
      },
    ];

    return {
      kpis,
      trends: [
        {
          name: "Cases Opened",
          labels: trends.labels,
          values: trends.casesOpened,
          color: "3B82F6",
        },
        {
          name: "Cases Closed",
          labels: trends.labels,
          values: trends.casesClosed,
          color: "22C55E",
        },
      ],
      caseBreakdown: {
        byCategory: categoryBreakdown,
        byStatus: statusBreakdown,
      },
      slaMetrics,
      campaignMetrics,
      riskAreas,
    };
  }

  /**
   * Fetch case counts and statistics.
   *
   * @param orgId - Organization ID
   * @param dateRange - Date range for filtering
   * @param filters - Optional filters
   * @returns Case counts with trend calculation
   */
  async fetchCaseCounts(
    orgId: string,
    dateRange: DateRange,
    filters?: ReportDataFilters,
  ): Promise<CaseCounts> {
    const whereClause = this.buildCaseWhereClause(orgId, dateRange, filters);

    const [total, open, closed, substantiated] = await Promise.all([
      this.prisma.case.count({ where: whereClause }),
      this.prisma.case.count({
        where: { ...whereClause, status: { not: "CLOSED" } },
      }),
      this.prisma.case.count({ where: { ...whereClause, status: "CLOSED" } }),
      this.prisma.case.count({
        where: { ...whereClause, outcome: "SUBSTANTIATED" },
      }),
    ]);

    // Calculate average days to close using outcomeAt
    const closedCases = await this.prisma.case.findMany({
      where: {
        ...whereClause,
        status: "CLOSED",
        outcomeAt: { not: null },
      },
      select: { createdAt: true, outcomeAt: true },
    });

    const avgDaysToClose =
      closedCases.length > 0
        ? closedCases.reduce((sum, c) => {
            const days =
              (c.outcomeAt!.getTime() - c.createdAt.getTime()) /
              (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / closedCases.length
        : 0;

    // Calculate trend vs previous period
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - periodLength);
    const previousEnd = dateRange.start;

    const previousTotal = await this.prisma.case.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: previousStart, lte: previousEnd },
      },
    });

    const trendValue =
      previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;

    return {
      total,
      open,
      closed,
      avgDaysToClose,
      substantiationRate:
        closed > 0 ? Math.round((substantiated / closed) * 100) : 0,
      trend: {
        value: Math.abs(Math.round(trendValue)),
        direction: trendValue > 0 ? "up" : trendValue < 0 ? "down" : "flat",
      },
    };
  }

  /**
   * Fetch case breakdown by category.
   *
   * @param orgId - Organization ID
   * @param dateRange - Date range for filtering
   * @param _filters - Optional filters (unused, for consistency)
   * @returns Breakdown items by category
   */
  async fetchCategoryBreakdown(
    orgId: string,
    dateRange: DateRange,
    _filters?: ReportDataFilters,
  ): Promise<BreakdownItem[]> {
    const cases = await this.prisma.case.groupBy({
      by: ["primaryCategoryId"],
      where: {
        organizationId: orgId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        primaryCategoryId: { not: null },
      },
      _count: { id: true },
    });

    // Get category names
    const categoryIds = cases
      .map((c) => c.primaryCategoryId)
      .filter((id): id is string => id !== null);

    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return cases
      .map((c) => ({
        name: categoryMap.get(c.primaryCategoryId!) || "Unknown",
        value: c._count.id,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  }

  /**
   * Fetch case breakdown by status.
   *
   * @param orgId - Organization ID
   * @param dateRange - Date range for filtering
   * @param _filters - Optional filters (unused, for consistency)
   * @returns Breakdown items by status with colors
   */
  async fetchStatusBreakdown(
    orgId: string,
    dateRange: DateRange,
    _filters?: ReportDataFilters,
  ): Promise<BreakdownItem[]> {
    const statusColors: Record<string, string> = {
      OPEN: "3B82F6", // Blue
      IN_PROGRESS: "F59E0B", // Amber
      PENDING_REVIEW: "8B5CF6", // Purple
      CLOSED: "22C55E", // Green
    };

    const cases = await this.prisma.case.groupBy({
      by: ["status"],
      where: {
        organizationId: orgId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
    });

    return cases.map((c) => ({
      name: this.formatStatus(c.status),
      value: c._count.id,
      color: statusColors[c.status] || "64748B",
    }));
  }

  /**
   * Fetch trend data over time (weekly).
   *
   * @param orgId - Organization ID
   * @param dateRange - Date range for the trend
   * @returns Weekly data points for opened and closed cases
   */
  async fetchTrendData(
    orgId: string,
    dateRange: DateRange,
  ): Promise<TrendDataPoints> {
    const weeks = this.getWeeksBetween(dateRange.start, dateRange.end);
    const labels: string[] = [];
    const casesOpened: number[] = [];
    const casesClosed: number[] = [];

    for (const week of weeks) {
      labels.push(this.formatWeekLabel(week.start));

      const [opened, closed] = await Promise.all([
        this.prisma.case.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: week.start, lte: week.end },
          },
        }),
        this.prisma.case.count({
          where: {
            organizationId: orgId,
            status: "CLOSED",
            outcomeAt: { gte: week.start, lte: week.end },
          },
        }),
      ]);

      casesOpened.push(opened);
      casesClosed.push(closed);
    }

    return { labels, casesOpened, casesClosed };
  }

  /**
   * Fetch SLA metrics.
   *
   * @param orgId - Organization ID
   * @param dateRange - Date range for filtering
   * @param _filters - Optional filters (unused, for consistency)
   * @returns SLA compliance metrics
   */
  async fetchSlaMetrics(
    orgId: string,
    dateRange: DateRange,
    _filters?: ReportDataFilters,
  ): Promise<SlaMetrics> {
    const closedCases = await this.prisma.case.findMany({
      where: {
        organizationId: orgId,
        status: "CLOSED",
        outcomeAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: {
        id: true,
        createdAt: true,
        outcomeAt: true,
      },
    });

    let compliant = 0;
    let breached = 0;
    let totalDays = 0;

    // Simple SLA calculation: cases closed within 30 days are compliant
    const SLA_DAYS = 30;
    for (const c of closedCases) {
      if (c.outcomeAt) {
        const daysToClose =
          (c.outcomeAt.getTime() - c.createdAt.getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysToClose <= SLA_DAYS) {
          compliant++;
        } else {
          breached++;
        }
        totalDays += daysToClose;
      }
    }

    const total = closedCases.length;
    const compliance = total > 0 ? Math.round((compliant / total) * 100) : 100;

    // Count at-risk cases (open cases older than 20 days - approaching SLA)
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    const atRisk = await this.prisma.case.count({
      where: {
        organizationId: orgId,
        status: { not: "CLOSED" },
        createdAt: { lt: twentyDaysAgo },
      },
    });

    return {
      compliance,
      atRisk,
      breached,
      avgDaysToClose: total > 0 ? totalDays / total : 0,
    };
  }

  /**
   * Fetch campaign metrics.
   *
   * @param orgId - Organization ID
   * @returns Campaign completion and status metrics
   */
  async fetchCampaignMetrics(orgId: string): Promise<CampaignMetrics> {
    const [totalCampaigns, activeCampaigns, assignments] = await Promise.all([
      this.prisma.campaign.count({ where: { organizationId: orgId } }),
      this.prisma.campaign.count({
        where: { organizationId: orgId, status: "ACTIVE" },
      }),
      this.prisma.campaignAssignment.groupBy({
        by: ["status"],
        where: {
          organizationId: orgId,
          campaign: { status: "ACTIVE" },
        },
        _count: { id: true },
      }),
    ]);

    const statusCounts = new Map(
      assignments.map((a) => [a.status, a._count.id]),
    );
    const completed = statusCounts.get("COMPLETED") || 0;
    const pending = statusCounts.get("PENDING") || 0;
    const overdue = statusCounts.get("OVERDUE") || 0;
    const total = completed + pending + overdue;

    return {
      totalCampaigns,
      activeCampaigns,
      completion: total > 0 ? Math.round((completed / total) * 100) : 0,
      pending,
      overdue,
    };
  }

  /**
   * Fetch risk areas based on case severity.
   *
   * @param orgId - Organization ID
   * @param dateRange - Date range for filtering
   * @returns Risk areas with scores based on high-severity case counts
   */
  async fetchRiskAreas(
    orgId: string,
    dateRange: DateRange,
  ): Promise<RiskArea[]> {
    // Group high-severity cases by category
    const highRiskCases = await this.prisma.case.groupBy({
      by: ["primaryCategoryId"],
      where: {
        organizationId: orgId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        severity: "HIGH",
        primaryCategoryId: { not: null },
      },
      _count: { id: true },
    });

    // Get category names
    const categoryIds = highRiskCases
      .map((c) => c.primaryCategoryId)
      .filter((id): id is string => id !== null);

    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return highRiskCases
      .map((c) => ({
        name: categoryMap.get(c.primaryCategoryId!) || "Unknown",
        score: Math.min(100, (c._count?.id ?? 0) * 20), // Simple risk score
        casesCount: c._count?.id ?? 0,
        trend: "stable" as const, // Would need historical comparison for real trend
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Fetch RIU count for the period.
   *
   * @param orgId - Organization ID
   * @param dateRange - Date range for filtering
   * @returns Total RIU count
   */
  async fetchRiuCount(orgId: string, dateRange: DateRange): Promise<number> {
    return this.prisma.riskIntelligenceUnit.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    });
  }

  /**
   * Get organization name.
   *
   * @param orgId - Organization ID
   * @returns Organization name or undefined if not found
   */
  async getOrganizationName(orgId: string): Promise<string | undefined> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    return org?.name;
  }

  // Private Helper Methods

  /**
   * Build Prisma where clause for case queries with filters.
   */
  private buildCaseWhereClause(
    orgId: string,
    dateRange: DateRange,
    filters?: ReportDataFilters,
  ): Record<string, unknown> {
    return {
      organizationId: orgId,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
      ...(filters?.businessUnitIds?.length && {
        businessUnitId: { in: filters.businessUnitIds },
      }),
      ...(filters?.locationIds?.length && {
        locationName: { in: filters.locationIds },
      }),
      ...(filters?.categoryIds?.length && {
        primaryCategoryId: { in: filters.categoryIds },
      }),
    };
  }

  /**
   * Format status string for display.
   */
  private formatStatus(status: string): string {
    return status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Get weeks between two dates.
   */
  private getWeeksBetween(
    start: Date,
    end: Date,
  ): Array<{ start: Date; end: Date }> {
    const weeks: Array<{ start: Date; end: Date }> = [];
    const current = new Date(start);

    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);

      weeks.push({
        start: weekStart,
        end: weekEnd <= end ? weekEnd : end,
      });

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  /**
   * Format week label for charts.
   */
  private formatWeekLabel(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}
