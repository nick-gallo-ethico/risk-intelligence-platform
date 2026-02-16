import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { DashboardWidget, WidgetType } from "@prisma/client";
import {
  WidgetDataResponse,
  WidgetData,
  KpiData,
  ResolvedDateRange,
  resolveDateRange,
  BatchWidgetDataResponse,
} from "./dto/widget-data.dto";
import { DateRangeDto } from "./dto/dashboard.dto";
import { WIDGET_CACHE_TTL } from "./prebuilt/prebuilt-widgets";
import { WidgetQueryConfig } from "./entities/dashboard-config.entity";
import { WidgetCaseDataService } from "./services/widget-case-data.service";
import { WidgetCampaignDataService } from "./services/widget-campaign-data.service";
import { WidgetMetricsDataService } from "./services/widget-metrics-data.service";

/**
 * Thin coordinator service for fetching widget data.
 *
 * Delegates actual data fetching to domain-specific sub-services:
 * - WidgetCaseDataService: Cases, RIUs, Investigations
 * - WidgetCampaignDataService: Campaigns, Campaign Assignments, Disclosures
 * - WidgetMetricsDataService: Compliance Health, SLA, Activity, Quick Actions
 *
 * This service handles:
 * - Caching logic
 * - Batch fetching
 * - Routing requests to appropriate sub-service
 */
@Injectable()
export class WidgetDataService {
  /** Default cache TTL in seconds */
  private readonly DEFAULT_CACHE_TTL = 300;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly widgetCaseDataService: WidgetCaseDataService,
    private readonly widgetCampaignDataService: WidgetCampaignDataService,
    private readonly widgetMetricsDataService: WidgetMetricsDataService,
  ) {}

  // Public API

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

    // Fetch fresh data via router
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

  // Private: Data Fetching Router

  /**
   * Routes widget data requests to the appropriate domain-specific service.
   */
  private async fetchWidgetData(
    organizationId: string,
    userId: string,
    widget: DashboardWidget,
    dateRange: ResolvedDateRange,
  ): Promise<WidgetData> {
    const dataSource = widget.dataSource;
    const queryConfig = widget.queryConfig as WidgetQueryConfig | null;

    switch (dataSource) {
      // Case domain
      case "cases":
        return this.widgetCaseDataService.fetchCaseData(
          organizationId,
          userId,
          widget,
          queryConfig,
          dateRange,
        );
      case "my_cases":
        return this.widgetCaseDataService.fetchMyCases(
          organizationId,
          userId,
          widget,
          queryConfig,
          dateRange,
        );
      case "rius":
        return this.widgetCaseDataService.fetchRiuData(
          organizationId,
          widget,
          queryConfig,
          dateRange,
        );
      case "investigations":
        return this.widgetCaseDataService.fetchInvestigationData(
          organizationId,
          userId,
          dateRange,
        );

      // Campaign domain
      case "campaigns":
        return this.widgetCampaignDataService.fetchCampaignData(
          organizationId,
          widget,
          queryConfig,
          dateRange,
        );
      case "campaign_assignments":
        return this.widgetCampaignDataService.fetchCampaignAssignmentData(
          organizationId,
          widget,
          queryConfig,
          dateRange,
        );
      case "disclosures":
        return this.widgetCampaignDataService.fetchDisclosureData(
          organizationId,
          widget,
          queryConfig,
          dateRange,
        );

      // Metrics domain
      case "compliance_health":
        return this.widgetMetricsDataService.computeComplianceHealth(
          organizationId,
          dateRange,
        );
      case "sla_metrics":
        return this.widgetMetricsDataService.fetchSlaMetrics(
          organizationId,
          userId,
          queryConfig,
          dateRange,
        );
      case "activity":
        return this.widgetMetricsDataService.fetchActivityData(
          organizationId,
          queryConfig,
          dateRange,
        );
      case "actions":
        return this.widgetMetricsDataService.getQuickActions(widget);

      default:
        throw new BadRequestException(`Unknown data source: ${dataSource}`);
    }
  }

  // Private: Cache Helpers

  /**
   * Builds a cache key for widget data.
   */
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

  /**
   * Gets the cache TTL for a widget type.
   */
  private getCacheTtl(widgetType: WidgetType): number {
    return WIDGET_CACHE_TTL[widgetType] || this.DEFAULT_CACHE_TTL;
  }
}
