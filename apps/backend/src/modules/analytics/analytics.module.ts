import { Module } from "@nestjs/common";
import { MyWorkModule } from "./my-work/my-work.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ExportsModule } from "./exports/exports.module";
import { MigrationModule } from "./migration/migration.module";
import { AiQueryModule } from "./ai-query/ai-query.module";
import { ReportModule } from "./reports/report.module";

/**
 * Analytics module aggregates all analytics-related functionality.
 * Includes:
 * - My Work unified task queue
 * - Dashboard configuration and widgets
 * - Flat file exports (Excel, CSV, PDF, PPTX)
 * - Migration infrastructure (NAVEX, EQS, CSV imports)
 * - AI Query interface for natural language data queries
 * - Report designer for saved reports
 */
@Module({
  imports: [
    MyWorkModule,
    DashboardModule,
    ExportsModule,
    MigrationModule,
    AiQueryModule,
    ReportModule,
  ],
  exports: [
    MyWorkModule,
    DashboardModule,
    ExportsModule,
    MigrationModule,
    AiQueryModule,
    ReportModule,
  ],
})
export class AnalyticsModule {}
