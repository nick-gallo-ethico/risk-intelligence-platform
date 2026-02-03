import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueryBuilderService } from "./query-builder.service";
import { ReportTemplateService } from "./report-template.service";
import { ExportService } from "./export.service";
import { ReportingController } from "./reporting.controller";
import { EXPORT_QUEUE_NAME } from "../jobs/queues/export.queue";

/**
 * Reporting Module
 *
 * Provides the reporting engine for dynamic reports and exports.
 *
 * Features:
 * - Report templates: Reusable report configurations
 * - Query builder: Dynamic Prisma query generation from templates
 * - Export service: Excel and CSV export with formatting
 * - Async export: Large reports run via job queue
 *
 * Dependencies:
 * - PrismaModule (database access)
 * - JobsModule (export queue)
 */
@Module({
  imports: [
    // Import the export queue for async exports
    BullModule.registerQueue({
      name: EXPORT_QUEUE_NAME,
    }),
  ],
  providers: [QueryBuilderService, ReportTemplateService, ExportService],
  controllers: [ReportingController],
  exports: [QueryBuilderService, ReportTemplateService, ExportService],
})
export class ReportingModule {}
