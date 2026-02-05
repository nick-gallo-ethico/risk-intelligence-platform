import { Module } from "@nestjs/common";
import { DashboardConfigService } from "./dashboard-config.service";
import { DashboardController } from "./dashboard.controller";

/**
 * Module for dashboard configuration management.
 *
 * Provides functionality for:
 * - Dashboard CRUD (create, read, update, delete)
 * - Widget management within dashboards
 * - User-specific dashboard configurations
 * - Role-based default dashboards
 */
@Module({
  controllers: [DashboardController],
  providers: [DashboardConfigService],
  exports: [DashboardConfigService],
})
export class DashboardModule {}
