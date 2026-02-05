import { Module } from "@nestjs/common";
import { MyWorkModule } from "./my-work/my-work.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ExportsModule } from "./exports/exports.module";
import { MigrationModule } from "./migration/migration.module";

/**
 * Analytics module aggregates all analytics-related functionality.
 * Includes:
 * - My Work unified task queue
 * - Dashboard configuration and widgets
 * - Flat file exports (Excel, CSV, PDF, PPTX)
 * - Migration infrastructure (NAVEX, EQS, CSV imports)
 * - AI Query interface
 */
@Module({
  imports: [MyWorkModule, DashboardModule, ExportsModule, MigrationModule],
  exports: [MyWorkModule, DashboardModule, ExportsModule, MigrationModule],
})
export class AnalyticsModule {}
