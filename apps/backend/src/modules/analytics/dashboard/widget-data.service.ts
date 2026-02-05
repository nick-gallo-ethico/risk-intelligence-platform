import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DashboardWidget,
  WidgetType,
  InvestigationStatus,
} from "@prisma/client";
import {
  WidgetDataResponse,
  WidgetData,
  KpiData,
  ChartData,
  TableData,
  ListData,
  QuickActionsData,
  ResolvedDateRange,
  resolveDateRange,
  BatchWidgetDataResponse,
  TableColumn,
} from "./dto/widget-data.dto";
import { DateRangeDto } from "./dto/dashboard.dto";
import { WIDGET_CACHE_TTL } from "./prebuilt/prebuilt-widgets";
import { WidgetQueryConfig } from "./entities/dashboard-config.entity";

/**
 * Service for fetching widget data from various data sources.
 *
 * Provides data fetching for all widget types with proper caching.
 * Each data source (cases, RIUs, campaigns, disclosures) has its own
 * fetch method with appropriate aggregation logic.
 */
@Injectable()
export class WidgetDataService {
  /** Default cache TTL in seconds */
  private readonly DEFAULT_CACHE_TTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ===========================================
  // Public API
  // ===========================================

  /**
   * Gets data for a single widget.
   *
   * @param organizationId - Tenant ID for data isolation
   * @param userId - Current user ID (for "my" filters)
   * @param widget - Widget configuration
   * @param dateRange - Date range for filtering
   * @param forceRefresh - Skip cache and fetch fresh data
   */
  async getWidgetData(
    organizationId: string,
    userId: string,
    widget: DashboardWidget,
    dateRange: DateRangeDto,
    forceRefresh = false,
  ): Promise<WidgetDataResponse> {
    const resolvedDateRange = resolveDateRange(dateRange);
    const cacheKey = this.buildCacheKey(
      organizationId,
      widget.id,
      resolvedDateRange,
    );

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await this.cacheManager.get<WidgetDataResponse>(cacheKey);
      if (cached) {
        return { ...cached, fromCache: true };
      }
    }

    // Fetch fresh data
    const data = await this.fetchWidgetData(
      organizationId,
      userId,
      widget,
      resolvedDateRange,
    );

    const ttl = this.getCacheTtl(widget.widgetType);
    const response: WidgetDataResponse = {
      widgetId: widget.id,
      data,
      updatedAt: new Date(),
      nextRefreshAt: new Date(Date.now() + ttl * 1000),
      fromCache: false,
    };

    // Cache the response
    await this.cacheManager.set(cacheKey, response, ttl * 1000);

    return response;
  }

  /**
   * Gets data for multiple widgets in parallel.
   * Used when loading a dashboard to fetch all widget data efficiently.
   */
  async getBatchWidgetData(
    organizationId: string,
    userId: string,
    widgets: DashboardWidget[],
    dateRange: DateRangeDto,
  ): Promise<BatchWidgetDataResponse> {
    const startTime = Date.now();

    // Fetch all widgets in parallel
    const responses = await Promise.all(
      widgets.map((widget) =>
        this.getWidgetData(organizationId, userId, widget, dateRange).catch(
          (_error) => {
            // Return error response for failed widgets
            const errorResponse: WidgetDataResponse = {
              widgetId: widget.id,
              data: { type: "kpi", value: 0, label: "Error" } as KpiData,
              updatedAt: new Date(),
              fromCache: false,
            };
            return errorResponse;
          },
        ),
      ),
    );

    return {
      widgets: responses,
      requestedAt: new Date(),
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * Invalidates cached data for a widget.
   */
  async invalidateWidget(
    organizationId: string,
    widgetId: string,
  ): Promise<void> {
    // Delete most common date range cached entries
    const presets = ["LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS"];
    for (const preset of presets) {
      await this.cacheManager.del(
        `widget:${organizationId}:${widgetId}:${preset}`,
      );
    }
  }

  // ===========================================
  // Private: Data Fetching Router
  // ===========================================

  private async fetchWidgetData(
    organizationId: string,
    userId: string,
    widget: DashboardWidget,
    dateRange: ResolvedDateRange,
  ): Promise<WidgetData> {
    const dataSource = widget.dataSource;
    const queryConfig = widget.queryConfig as WidgetQueryConfig | null;

    switch (dataSource) {
      case "cases":
        return this.fetchCaseData(
          organizationId,
          userId,
          widget,
          queryConfig,
          dateRange,
        );
      case "my_cases":
        return this.fetchMyCases(
          organizationId,
          userId,
          widget,
          queryConfig,
          dateRange,
        );
      case "rius":
        return this.fetchRiuData(
          organizationId,
          widget,
          queryConfig,
          dateRange,
        );
      case "campaigns":
        return this.fetchCampaignData(
          organizationId,
          widget,
          queryConfig,
          dateRange,
        );
      case "campaign_assignments":
        return this.fetchCampaignAssignmentData(
          organizationId,
          widget,
          queryConfig,
          dateRange,
        );
      case "disclosures":
        return this.fetchDisclosureData(
          organizationId,
          widget,
          queryConfig,
          dateRange,
        );
      case "compliance_health":
        return this.computeComplianceHealth(organizationId, dateRange);
      case "sla_metrics":
        return this.fetchSlaMetrics(
          organizationId,
          userId,
          queryConfig,
          dateRange,
        );
      case "investigations":
        return this.fetchInvestigationData(organizationId, userId, dateRange);
      case "activity":
        return this.fetchActivityData(organizationId, queryConfig, dateRange);
      case "actions":
        return this.getQuickActions(widget);
      default:
        throw new BadRequestException(`Unknown data source: ${dataSource}`);
    }
  }

  // ===========================================
  // Case Data Fetchers
  // ===========================================

  private async fetchCaseData(
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

  private async fetchCaseKpi(
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

  private async fetchCaseChart(
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

  private async fetchCaseTable(
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

  private async fetchCaseList(
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

  private async fetchMyCases(
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

  private buildCaseWhereClause(
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
  // RIU Data Fetchers
  // ===========================================

  private async fetchRiuData(
    organizationId: string,
    widget: DashboardWidget,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<ChartData | KpiData> {
    const widgetType = widget.widgetType;

    if (widgetType === WidgetType.KPI_CARD) {
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

    // Line chart: RIU intake over time
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

  // ===========================================
  // Campaign Data Fetchers
  // ===========================================

  private async fetchCampaignData(
    organizationId: string,
    widget: DashboardWidget,
    queryConfig: WidgetQueryConfig | null,
    _dateRange: ResolvedDateRange,
  ): Promise<ChartData | TableData | KpiData> {
    const widgetType = widget.widgetType;
    const filters = queryConfig?.filters || {};

    if (widgetType === WidgetType.KPI_CARD) {
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

  private async fetchCampaignAssignmentData(
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
  // Disclosure Data Fetchers
  // ===========================================

  private async fetchDisclosureData(
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

  // ===========================================
  // Computed Metrics
  // ===========================================

  /**
   * Computes the overall compliance health score.
   * Score is based on:
   * - Open case ratio (weight: 30%)
   * - SLA compliance rate (weight: 40%)
   * - Campaign completion rate (weight: 30%)
   */
  private async computeComplianceHealth(
    organizationId: string,
    dateRange: ResolvedDateRange,
  ): Promise<KpiData> {
    // Get case metrics
    const totalCases = await this.prisma.case.count({
      where: { organizationId },
    });
    const openCases = await this.prisma.case.count({
      where: { organizationId, status: { not: "CLOSED" } },
    });
    const caseScore = totalCases > 0 ? (1 - openCases / totalCases) * 100 : 100;

    // Get SLA metrics (simplified - cases closed in period)
    const closedCases = await this.prisma.case.count({
      where: {
        organizationId,
        status: "CLOSED",
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
    });
    // Simplified SLA - assume 90% compliance
    const slaScore = closedCases > 0 ? 90 : 100;

    // Get campaign completion rate
    const activeAssignments = await this.prisma.campaignAssignment.count({
      where: {
        organizationId,
        campaign: { status: "ACTIVE" },
      },
    });
    const completedAssignments = await this.prisma.campaignAssignment.count({
      where: {
        organizationId,
        campaign: { status: "ACTIVE" },
        status: "COMPLETED",
      },
    });
    const campaignScore =
      activeAssignments > 0
        ? (completedAssignments / activeAssignments) * 100
        : 100;

    // Weighted average
    const healthScore = Math.round(
      caseScore * 0.3 + slaScore * 0.4 + campaignScore * 0.3,
    );

    // Determine status
    const status: "success" | "warning" | "danger" =
      healthScore >= 80 ? "success" : healthScore >= 60 ? "warning" : "danger";

    return {
      type: "kpi",
      value: healthScore,
      label: "Compliance Health",
      status,
    };
  }

  private async fetchSlaMetrics(
    organizationId: string,
    userId: string,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<KpiData> {
    const filters = queryConfig?.filters || {};
    const isMyFilter = filters.assignedToMe;

    const whereClause: Record<string, unknown> = {
      organizationId,
      createdAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
      status: { not: "CLOSED" },
    };

    if (isMyFilter) {
      whereClause.assignedTo = { has: userId };
    }

    // Count cases at risk (older than 20 days and still open)
    const atRiskCount = await this.prisma.case.count({
      where: {
        ...whereClause,
        createdAt: { lt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      },
    });

    return {
      type: "kpi",
      value: atRiskCount,
      label: "SLA Alerts",
      status: atRiskCount > 0 ? "danger" : "success",
    };
  }

  private async fetchInvestigationData(
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

  private async fetchActivityData(
    organizationId: string,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<ListData> {
    const limit = queryConfig?.limit || 8;

    // Get recent activity from audit log
    const activities = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        actionDescription: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actorUser: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return {
      type: "list",
      items: activities.map((a) => ({
        id: a.id,
        title: a.actionDescription || a.action,
        subtitle: a.actorUser
          ? `${a.actorUser.firstName} ${a.actorUser.lastName}`
          : "System",
        timestamp: a.createdAt,
        url: `/${a.entityType.toLowerCase()}s/${a.entityId}`,
        icon: this.getActivityIcon(a.action),
      })),
      total: activities.length,
    };
  }

  // ===========================================
  // Quick Actions
  // ===========================================

  private getQuickActions(widget: DashboardWidget): QuickActionsData {
    // Return role-appropriate quick actions based on widget title
    const title = widget.title.toLowerCase();

    if (title.includes("board") || title.includes("cco")) {
      return {
        type: "quick_actions",
        actions: [
          {
            id: "generate-report",
            label: "Generate Report",
            icon: "file-text",
            action: "/reports/new",
            enabled: true,
          },
          {
            id: "view-trends",
            label: "View Trends",
            icon: "trending-up",
            action: "/analytics/trends",
            enabled: true,
          },
          {
            id: "export-data",
            label: "Export Data",
            icon: "download",
            action: "/analytics/export",
            enabled: true,
          },
        ],
      };
    }

    if (title.includes("investigator") || title.includes("quick actions")) {
      return {
        type: "quick_actions",
        actions: [
          {
            id: "create-case",
            label: "New Case",
            icon: "plus-circle",
            action: "/cases/new",
            enabled: true,
          },
          {
            id: "my-tasks",
            label: "My Tasks",
            icon: "check-square",
            action: "/tasks",
            enabled: true,
          },
          {
            id: "search",
            label: "Search",
            icon: "search",
            action: "/search",
            enabled: true,
          },
        ],
      };
    }

    if (title.includes("launch") || title.includes("campaign")) {
      return {
        type: "quick_actions",
        actions: [
          {
            id: "new-campaign",
            label: "New Campaign",
            icon: "send",
            action: "/campaigns/new",
            enabled: true,
          },
          {
            id: "send-reminder",
            label: "Send Reminder",
            icon: "bell",
            action: "/campaigns/reminders",
            enabled: true,
          },
          {
            id: "view-responses",
            label: "View Responses",
            icon: "inbox",
            action: "/disclosures",
            enabled: true,
          },
        ],
      };
    }

    return {
      type: "quick_actions",
      actions: [],
    };
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  private buildCacheKey(
    organizationId: string,
    widgetId: string,
    dateRange: ResolvedDateRange,
  ): string {
    const rangeKey =
      dateRange.preset ||
      `${dateRange.startDate.toISOString()}_${dateRange.endDate.toISOString()}`;
    return `widget:${organizationId}:${widgetId}:${rangeKey}`;
  }

  private getCacheTtl(widgetType: WidgetType): number {
    return WIDGET_CACHE_TTL[widgetType] || this.DEFAULT_CACHE_TTL;
  }

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

  private getActivityIcon(action: string): string {
    const iconMap: Record<string, string> = {
      created: "plus-circle",
      updated: "edit",
      deleted: "trash",
      assigned: "user-plus",
      commented: "message-circle",
      status_changed: "refresh-cw",
      closed: "check-circle",
    };
    return iconMap[action] || "activity";
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
