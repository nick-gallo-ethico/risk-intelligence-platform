import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { DashboardConfigService } from "./dashboard-config.service";
import { WidgetDataService } from "./widget-data.service";
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
 */
@Module({
  imports: [CacheModule.register()],
  controllers: [DashboardController],
  providers: [DashboardConfigService, WidgetDataService],
  exports: [DashboardConfigService, WidgetDataService],
})
export class DashboardModule {}
