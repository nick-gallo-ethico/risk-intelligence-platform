import { Module } from "@nestjs/common";
import { MyWorkModule } from "./my-work/my-work.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ExportsModule } from "./exports/exports.module";

/**
 * Analytics module aggregates all analytics-related functionality.
 * Includes:
 * - My Work unified task queue
 * - Dashboard configuration and widgets
 * - Flat file exports (Excel, CSV)
 * - AI Query interface (future)
 */
@Module({
  imports: [MyWorkModule, DashboardModule, ExportsModule],
  exports: [MyWorkModule, DashboardModule, ExportsModule],
})
export class AnalyticsModule {}
