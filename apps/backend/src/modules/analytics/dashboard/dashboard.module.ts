import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ScheduleModule } from "@nestjs/schedule";
import { DashboardConfigService } from "./dashboard-config.service";
import { WidgetDataService } from "./widget-data.service";
import { ScheduledRefreshService } from "./scheduled-refresh.service";
import { DashboardController } from "./dashboard.controller";

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
    DashboardConfigService,
    WidgetDataService,
    ScheduledRefreshService,
  ],
  exports: [DashboardConfigService, WidgetDataService, ScheduledRefreshService],
})
export class DashboardModule {}
