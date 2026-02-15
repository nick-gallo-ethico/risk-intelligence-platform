import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ScheduleModule } from "@nestjs/schedule";
import { DashboardConfigService } from "./dashboard-config.service";
import { WidgetDataService } from "./widget-data.service";
import { ScheduledRefreshService } from "./scheduled-refresh.service";
import { DashboardController } from "./dashboard.controller";
import { WidgetCaseDataService } from "./services/widget-case-data.service";
import { WidgetCampaignDataService } from "./services/widget-campaign-data.service";
import { WidgetMetricsDataService } from "./services/widget-metrics-data.service";

/**
 * Module for dashboard configuration and data management.
 *
 * Provides functionality for:
 * - Dashboard CRUD (create, read, update, delete)
 * - Widget management within dashboards
 * - User-specific dashboard configurations
 * - Role-based default dashboards
 * - Widget data fetching with caching
 * - Scheduled background refresh of popular dashboards
 *
 * Widget data is fetched via domain-specific sub-services:
 * - WidgetCaseDataService: Cases, RIUs, Investigations
 * - WidgetCampaignDataService: Campaigns, Assignments, Disclosures
 * - WidgetMetricsDataService: Compliance Health, SLA, Activity
 */
@Module({
  imports: [
    CacheModule.register({
      ttl: 300, // 5 minutes default
      max: 1000, // Max cached items
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [DashboardController],
  providers: [
    // Core services
    DashboardConfigService,
    WidgetDataService,
    ScheduledRefreshService,
    // Widget data sub-services
    WidgetCaseDataService,
    WidgetCampaignDataService,
    WidgetMetricsDataService,
  ],
  exports: [DashboardConfigService, WidgetDataService, ScheduledRefreshService],
})
export class DashboardModule {}
