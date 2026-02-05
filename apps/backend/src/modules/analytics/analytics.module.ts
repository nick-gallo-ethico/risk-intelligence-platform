import { Module } from "@nestjs/common";
import { MyWorkModule } from "./my-work/my-work.module";
import { DashboardModule } from "./dashboard/dashboard.module";

/**
 * Analytics module aggregates all analytics-related functionality.
 * Includes:
 * - My Work unified task queue
 * - Dashboard configuration and widgets
 * - AI Query interface (future)
 */
@Module({
  imports: [MyWorkModule, DashboardModule],
  exports: [MyWorkModule, DashboardModule],
})
export class AnalyticsModule {}
