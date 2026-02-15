import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  DashboardWidget,
  WidgetType,
  InvestigationStatus,
} from "@prisma/client";
import {
  KpiData,
  ChartData,
  TableData,
  ListData,
  ResolvedDateRange,
  TableColumn,
} from "../dto/widget-data.dto";
import { WidgetQueryConfig } from "../entities/dashboard-config.entity";

/**
 * Service for fetching case, RIU, and investigation widget data.
 *
 * Extracts case-related data fetching logic from WidgetDataService
 * to reduce complexity and enable better testing.
 */
@Injectable()
export class WidgetCaseDataService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ===========================================
  // Public: Case Data Fetchers
  // ===========================================

  /**
   * Routes case data requests to the appropriate fetch method based on widget type.
   */
  async fetchCaseData(
    organizationId: string,
    userId: string,
    widget: DashboardWidget,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<ChartData | TableData | KpiData | ListData> {
    const widgetType = widget.widgetType;

    if (widgetType === WidgetType.KPI_CARD) {
      return this.fetchCaseKpi(organizationId, queryConfig, dateRange);
    }

    if (widgetType === WidgetType.TABLE) {
      return this.fetchCaseTable(organizationId, queryConfig, dateRange);
    }

    if (widgetType === WidgetType.LIST) {
      return this.fetchCaseList(organizationId, queryConfig, dateRange);
    }

    // Chart types (BAR, LINE, PIE, DONUT, FUNNEL)
    return this.fetchCaseChart(organizationId, widget, queryConfig, dateRange);
  }

  /**
   * Fetches cases assigned to the current user.
   */
  async fetchMyCases(
    organizationId: string,
    userId: string,
    widget: DashboardWidget,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<ChartData | TableData | KpiData | ListData> {
    // Filter for cases where user has an investigation assigned
    const modifiedConfig: WidgetQueryConfig = {
      ...queryConfig,
      filters: {
        ...queryConfig?.filters,
        investigations: {
          some: {
            assignedTo: { has: userId },
          },
        },
      },
    };

    return this.fetchCaseData(
      organizationId,
      userId,
      widget,
      modifiedConfig,
      dateRange,
    );
  }

  /**
   * Fetches case count KPI with trend calculation.
   */
  async fetchCaseKpi(
    organizationId: string,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<KpiData> {
    const filters = queryConfig?.filters || {};
    const whereClause = this.buildCaseWhereClause(
      organizationId,
      filters,
      dateRange,
    );

    const count = await this.prisma.case.count({
      where: whereClause,
    });

    // Get previous period for comparison
    const periodLength =
      dateRange.endDate.getTime() - dateRange.startDate.getTime();
    const previousStart = new Date(
      dateRange.startDate.getTime() - periodLength,
    );
    const previousEnd = new Date(dateRange.startDate);

    const previousCount = await this.prisma.case.count({
      where: this.buildCaseWhereClause(organizationId, filters, {
        startDate: previousStart,
        endDate: previousEnd,
      }),
    });

    const trendValue =
      previousCount > 0 ? ((count - previousCount) / previousCount) * 100 : 0;

    return {
      type: "kpi",
      value: count,
      label: "Cases",
      trend: {
        value: Math.abs(trendValue),
        direction: trendValue > 0 ? "up" : trendValue < 0 ? "down" : "flat",
        isPositive: trendValue < 0, // Fewer cases is generally positive
      },
      comparison: {
        value: previousCount,
        period: "previous period",
      },
    };
  }

  /**
   * Fetches case table data with pagination support.
   */
  async fetchCaseTable(
    organizationId: string,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<TableData> {
    const limit = queryConfig?.limit || 10;
    const filters = queryConfig?.filters || {};

    const cases = await this.prisma.case.findMany({
      where: this.buildCaseWhereClause(organizationId, filters, dateRange),
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        primaryCategory: {
          select: { name: true },
        },
        investigations: {
          select: { id: true },
        },
      },
    });

    const total = await this.prisma.case.count({
      where: this.buildCaseWhereClause(organizationId, filters, dateRange),
    });

    return {
      type: "table",
      columns: this.getCaseTableColumns(),
      rows: cases.map((c) => ({
        id: c.id,
        referenceNumber: c.referenceNumber,
        status: c.status,
        severity: c.severity,
        category: c.primaryCategory?.name || "Uncategorized",
        assignedTo:
          c.investigations && c.investigations.length > 0
            ? `${c.investigations.length} investigation(s)`
            : "No investigation",
        createdAt: c.createdAt,
      })),
      total,
      hasMore: total > limit,
    };
  }

  /**
   * Fetches case list data for list widgets.
   */
  async fetchCaseList(
    organizationId: string,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<ListData> {
    const limit = queryConfig?.limit || 5;
    const filters = queryConfig?.filters || {};

    const cases = await this.prisma.case.findMany({
      where: this.buildCaseWhereClause(organizationId, filters, dateRange),
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        primaryCategory: {
          select: { name: true },
        },
      },
    });

    const total = await this.prisma.case.count({
      where: this.buildCaseWhereClause(organizationId, filters, dateRange),
    });

    return {
      type: "list",
      items: cases.map((c) => ({
        id: c.id,
        title: c.referenceNumber,
        subtitle: c.primaryCategory?.name || "Uncategorized",
        status: c.status,
        statusColor: this.getSeverityColor(c.severity),
        url: `/cases/${c.id}`,
        timestamp: c.createdAt,
      })),
      total,
    };
  }

  /**
   * Fetches case chart data grouped by status or severity.
   */
  async fetchCaseChart(
    organizationId: string,
    widget: DashboardWidget,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<ChartData> {
    const groupByField = queryConfig?.aggregation?.groupBy?.[0] || "status";
    const filters = queryConfig?.filters || {};

    // Only group by valid fields
    const validGroupFields = ["status", "severity"] as const;
    const groupBy = validGroupFields.includes(
      groupByField as (typeof validGroupFields)[number],
    )
      ? (groupByField as "status" | "severity")
      : "status";

    const groupedData = await this.prisma.case.groupBy({
      by: [groupBy],
      where: this.buildCaseWhereClause(organizationId, filters, dateRange),
      _count: { id: true },
    });

    const categories = groupedData.map((g) => String(g[groupBy]));
    const data = groupedData.map((g) => g._count.id);

    return {
      type: "chart",
      chartType: widget.chartType || "BAR",
      series: [
        {
          name: "Cases",
          data,
        },
      ],
      categories,
      config: {
        showLegend: categories.length <= 8,
      },
    };
  }

  /**
   * Builds Prisma where clause for case queries.
   */
  buildCaseWhereClause(
    organizationId: string,
    filters: Record<string, unknown>,
    dateRange: ResolvedDateRange,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {
      organizationId,
      createdAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    };

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (key === "assignedToMe" || key === "relatedToMyCases") {
        continue; // Skip special markers
      }
      where[key] = value;
    }

    return where;
  }

  // ===========================================
  // Public: RIU Data Fetchers
  // ===========================================

  /**
   * Fetches RIU data for KPI or chart widgets.
   */
  async fetchRiuData(
    organizationId: string,
    widget: DashboardWidget,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<ChartData | KpiData> {
    const widgetType = widget.widgetType;

    if (widgetType === WidgetType.KPI_CARD) {
      return this.fetchRiuKpi(organizationId, queryConfig, dateRange);
    }

    return this.fetchRiuChart(organizationId, widget, queryConfig, dateRange);
  }

  /**
   * Fetches RIU count KPI.
   */
  async fetchRiuKpi(
    organizationId: string,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<KpiData> {
    const count = await this.prisma.riskIntelligenceUnit.count({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
    });

    return {
      type: "kpi",
      value: count,
      label: "RIUs",
    };
  }

  /**
   * Fetches RIU chart data over time.
   */
  async fetchRiuChart(
    organizationId: string,
    widget: DashboardWidget,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<ChartData> {
    const rius = await this.prisma.riskIntelligenceUnit.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by week
    const weeklyData = this.groupByWeek(
      rius.map((r) => ({ createdAt: r.createdAt })),
      dateRange,
    );

    return {
      type: "chart",
      chartType: widget.chartType || "LINE",
      series: [
        {
          name: "RIU Intake",
          data: weeklyData.values,
        },
      ],
      categories: weeklyData.labels,
      config: {
        showGrid: true,
        xAxis: { format: "date" },
      },
    };
  }

  /**
   * Builds Prisma where clause for RIU queries.
   */
  buildRiuWhereClause(
    organizationId: string,
    filters: Record<string, unknown>,
    dateRange: ResolvedDateRange,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {
      organizationId,
      createdAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    };

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (key === "assignedToMe" || key === "relatedToMyCases") {
        continue; // Skip special markers
      }
      where[key] = value;
    }

    return where;
  }

  // ===========================================
  // Public: Investigation Data Fetchers
  // ===========================================

  /**
   * Fetches investigation progress data for the current user.
   */
  async fetchInvestigationData(
    organizationId: string,
    userId: string,
    _dateRange: ResolvedDateRange,
  ): Promise<KpiData> {
    // Get investigations assigned to user (assignedTo is an array of user IDs)
    const investigations = await this.prisma.investigation.findMany({
      where: {
        organizationId,
        assignedTo: { has: userId },
        status: { not: InvestigationStatus.CLOSED },
      },
      select: {
        status: true,
      },
    });

    // Simplified progress: map status to percentage
    const progressMap: Record<string, number> = {
      NEW: 0,
      ASSIGNED: 10,
      INVESTIGATING: 50,
      PENDING_REVIEW: 80,
      ON_HOLD: 25,
      CLOSED: 100,
    };

    const avgProgress =
      investigations.length > 0
        ? investigations.reduce(
            (sum, inv) => sum + (progressMap[inv.status] || 0),
            0,
          ) / investigations.length
        : 0;

    return {
      type: "kpi",
      value: Math.round(avgProgress),
      label: "Investigation Progress",
    };
  }

  // ===========================================
  // Private: Helper Methods
  // ===========================================

  private getCaseTableColumns(): TableColumn[] {
    return [
      {
        key: "referenceNumber",
        label: "Reference",
        type: "link",
        sortable: true,
      },
      { key: "status", label: "Status", type: "status", sortable: true },
      { key: "severity", label: "Severity", type: "badge" },
      { key: "category", label: "Category", type: "string" },
      { key: "assignedTo", label: "Assigned To", type: "string" },
      { key: "createdAt", label: "Created", type: "date", sortable: true },
    ];
  }

  private getSeverityColor(
    severity: string,
  ): "success" | "warning" | "danger" | "neutral" {
    switch (severity) {
      case "LOW":
        return "success";
      case "MEDIUM":
        return "warning";
      case "HIGH":
      case "CRITICAL":
        return "danger";
      default:
        return "neutral";
    }
  }

  private groupByWeek(
    data: Array<{ createdAt: Date }>,
    dateRange: ResolvedDateRange,
  ): { labels: string[]; values: number[] } {
    const weekMap = new Map<string, number>();

    // Initialize weeks in range
    const current = new Date(dateRange.startDate);
    while (current <= dateRange.endDate) {
      const weekLabel = this.getWeekLabel(current);
      weekMap.set(weekLabel, 0);
      current.setDate(current.getDate() + 7);
    }

    // Aggregate data by week
    for (const item of data) {
      const weekLabel = this.getWeekLabel(item.createdAt);
      const existing = weekMap.get(weekLabel) || 0;
      weekMap.set(weekLabel, existing + 1);
    }

    const entries = Array.from(weekMap.entries());
    return {
      labels: entries.map(([label]) => label),
      values: entries.map(([, value]) => value),
    };
  }

  private getWeekLabel(date: Date): string {
    const month = date.toLocaleString("default", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  }
}
