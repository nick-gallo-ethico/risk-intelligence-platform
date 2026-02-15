import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { PrismaService } from "../../../prisma/prisma.service";
import { DashboardWidget, WidgetType } from "@prisma/client";
import {
  KpiData,
  ChartData,
  TableData,
  ListData,
  ResolvedDateRange,
} from "../dto/widget-data.dto";
import { WidgetQueryConfig } from "../entities/dashboard-config.entity";

/**
 * Service for fetching campaign, campaign assignment, and disclosure widget data.
 *
 * Extracts campaign-related data fetching logic from WidgetDataService
 * to reduce complexity and enable better testing.
 */
@Injectable()
export class WidgetCampaignDataService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ===========================================
  // Public: Campaign Data Fetchers
  // ===========================================

  /**
   * Fetches campaign data for KPI, table, or chart widgets.
   */
  async fetchCampaignData(
    organizationId: string,
    widget: DashboardWidget,
    queryConfig: WidgetQueryConfig | null,
    _dateRange: ResolvedDateRange,
  ): Promise<ChartData | TableData | KpiData> {
    const widgetType = widget.widgetType;
    const filters = queryConfig?.filters || {};

    if (widgetType === WidgetType.KPI_CARD) {
      return this.fetchCampaignKpi(organizationId, queryConfig, _dateRange);
    }

    if (widgetType === WidgetType.TABLE) {
      const limit = queryConfig?.limit || 10;

      const campaigns = await this.prisma.campaign.findMany({
        where: {
          organizationId,
          ...this.buildSimpleFilter(filters),
        },
        take: limit,
        orderBy: { dueDate: "asc" },
        include: {
          _count: {
            select: { assignments: true },
          },
        },
      });

      // Get completion rates
      const campaignStats = await Promise.all(
        campaigns.map(async (c) => {
          const completed = await this.prisma.campaignAssignment.count({
            where: { campaignId: c.id, status: "COMPLETED" },
          });
          const total = c._count.assignments;
          return {
            id: c.id,
            completionRate: total > 0 ? (completed / total) * 100 : 0,
          };
        }),
      );

      return {
        type: "table",
        columns: [
          { key: "name", label: "Campaign", type: "string", sortable: true },
          { key: "type", label: "Type", type: "badge" },
          { key: "status", label: "Status", type: "status" },
          { key: "dueDate", label: "Due Date", type: "date", sortable: true },
          { key: "completionRate", label: "Completion", type: "number" },
        ],
        rows: campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          dueDate: c.dueDate,
          completionRate:
            campaignStats.find((s) => s.id === c.id)?.completionRate || 0,
        })),
        total: campaigns.length,
        hasMore: false,
      };
    }

    // Chart: Campaign by type or status
    return this.fetchCampaignChart(organizationId, widget, queryConfig);
  }

  /**
   * Fetches campaign count KPI.
   */
  async fetchCampaignKpi(
    organizationId: string,
    queryConfig: WidgetQueryConfig | null,
    _dateRange: ResolvedDateRange,
  ): Promise<KpiData> {
    const filters = queryConfig?.filters || {};

    const count = await this.prisma.campaign.count({
      where: {
        organizationId,
        ...this.buildSimpleFilter(filters),
      },
    });

    return {
      type: "kpi",
      value: count,
      label: "Campaigns",
    };
  }

  /**
   * Fetches campaign chart data grouped by type or status.
   */
  async fetchCampaignChart(
    organizationId: string,
    widget: DashboardWidget,
    queryConfig: WidgetQueryConfig | null,
  ): Promise<ChartData> {
    const filters = queryConfig?.filters || {};
    const groupByField = queryConfig?.aggregation?.groupBy?.[0] || "type";
    const validGroupFields = ["type", "status"] as const;
    const groupBy = validGroupFields.includes(
      groupByField as (typeof validGroupFields)[number],
    )
      ? (groupByField as "type" | "status")
      : "type";

    const grouped = await this.prisma.campaign.groupBy({
      by: [groupBy],
      where: {
        organizationId,
        ...this.buildSimpleFilter(filters),
      },
      _count: { id: true },
    });

    return {
      type: "chart",
      chartType: widget.chartType || "DONUT",
      series: [
        {
          name: "Campaigns",
          data: grouped.map((g) => g._count.id),
        },
      ],
      categories: grouped.map((g) => String(g[groupBy])),
      config: { showLegend: true },
    };
  }

  // ===========================================
  // Public: Campaign Assignment Data Fetchers
  // ===========================================

  /**
   * Fetches campaign assignment data for KPI or chart widgets.
   */
  async fetchCampaignAssignmentData(
    organizationId: string,
    widget: DashboardWidget,
    queryConfig: WidgetQueryConfig | null,
    _dateRange: ResolvedDateRange,
  ): Promise<ChartData | KpiData> {
    const filters = queryConfig?.filters || {};

    if (widget.widgetType === WidgetType.KPI_CARD) {
      const count = await this.prisma.campaignAssignment.count({
        where: {
          organizationId,
          ...this.buildSimpleFilter(filters),
        },
      });

      return {
        type: "kpi",
        value: count,
        label: "Assignments",
      };
    }

    // Chart: Assignments by status
    const grouped = await this.prisma.campaignAssignment.groupBy({
      by: ["status"],
      where: {
        organizationId,
        ...this.buildSimpleFilter(filters),
      },
      _count: { id: true },
    });

    return {
      type: "chart",
      chartType: widget.chartType || "DONUT",
      series: [
        {
          name: "Assignments",
          data: grouped.map((g) => g._count.id),
        },
      ],
      categories: grouped.map((g) => g.status),
      config: {
        showLegend: true,
        colors: ["#22c55e", "#f59e0b", "#ef4444"], // Completed, Pending, Overdue
      },
    };
  }

  // ===========================================
  // Public: Disclosure Data Fetchers
  // ===========================================

  /**
   * Fetches disclosure data (RIUs of type DISCLOSURE_RESPONSE) for widgets.
   */
  async fetchDisclosureData(
    organizationId: string,
    widget: DashboardWidget,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<ChartData | KpiData | ListData> {
    const widgetType = widget.widgetType;

    if (widgetType === WidgetType.KPI_CARD) {
      const count = await this.prisma.riskIntelligenceUnit.count({
        where: {
          organizationId,
          type: "DISCLOSURE_RESPONSE",
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        },
      });

      return {
        type: "kpi",
        value: count,
        label: "Disclosures",
      };
    }

    if (widgetType === WidgetType.LIST) {
      const disclosures = await this.prisma.riskIntelligenceUnit.findMany({
        where: {
          organizationId,
          type: "DISCLOSURE_RESPONSE",
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        },
        take: queryConfig?.limit || 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          referenceNumber: true,
          severity: true,
          createdAt: true,
          aiSummary: true,
        },
      });

      return {
        type: "list",
        items: disclosures.map((d) => ({
          id: d.id,
          title: d.referenceNumber,
          subtitle: d.aiSummary || "Disclosure submission",
          status: d.severity,
          statusColor: this.getSeverityColor(d.severity),
          url: `/rius/${d.id}`,
          timestamp: d.createdAt,
        })),
        total: disclosures.length,
      };
    }

    // Line chart: Disclosures over time
    const disclosures = await this.prisma.riskIntelligenceUnit.findMany({
      where: {
        organizationId,
        type: "DISCLOSURE_RESPONSE",
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

    const weeklyData = this.groupByWeek(
      disclosures.map((d) => ({ createdAt: d.createdAt })),
      dateRange,
    );

    return {
      type: "chart",
      chartType: widget.chartType || "LINE",
      series: [
        {
          name: "Disclosures",
          data: weeklyData.values,
        },
      ],
      categories: weeklyData.labels,
      config: { showGrid: true },
    };
  }

  /**
   * Builds where clause for campaign queries.
   */
  buildCampaignWhereClause(
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

    // Apply simple filters
    for (const [key, value] of Object.entries(filters)) {
      if (key === "assignedToMe" || key === "relatedToMyCases") {
        continue; // Skip special markers
      }
      where[key] = value;
    }

    return where;
  }

  // ===========================================
  // Private: Helper Methods
  // ===========================================

  private buildSimpleFilter(
    filters: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filters)) {
      // Skip special filters
      if (
        key === "assignedToMe" ||
        key === "relatedToMyCases" ||
        key === "campaign"
      ) {
        continue;
      }
      result[key] = value;
    }

    return result;
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
