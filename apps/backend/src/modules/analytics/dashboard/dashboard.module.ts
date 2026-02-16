import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { redisStore } from "cache-manager-ioredis-yet";
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
 * - Widget data fetching with caching (Redis-backed for multi-instance scaling)
 * - Scheduled background refresh of popular dashboards
 *
 * Widget data is fetched via domain-specific sub-services:
 * - WidgetCaseDataService: Cases, RIUs, Investigations
 * - WidgetCampaignDataService: Campaigns, Assignments, Disclosures
 * - WidgetMetricsDataService: Compliance Health, SLA, Activity
 *
 * Cache is Redis-backed (via cache-manager-ioredis-yet) to support
 * horizontal scaling - all app instances share the same cache.
 */
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          host: configService.get<string>("REDIS_HOST", "localhost"),
          port: configService.get<number>("REDIS_PORT", 6379),
          password: configService.get<string>("REDIS_PASSWORD") || undefined,
          db: configService.get<number>("REDIS_DB", 0),
          ttl: 300000, // 5 minutes default for dashboard data
        }),
      }),
      inject: [ConfigService],
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
