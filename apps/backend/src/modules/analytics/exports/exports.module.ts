/**
 * ExportsModule - Flat file export functionality
 *
 * Provides:
 * - ExportsController: REST API for tag management and export jobs
 * - FlatFileService: Tag CRUD and export job management
 * - ExcelExportService: Excel file generation with streaming
 * - FlatExportProcessor: BullMQ processor for async exports
 * - PdfGeneratorService: Puppeteer-based PDF generation
 * - PptxGeneratorService: pptxgenjs-based PowerPoint generation
 * - BoardReportService: Board report generation orchestrator
 *
 * Queue: flat-export
 * - Concurrency: 2 (one export per worker thread)
 * - Retries: 3 with exponential backoff (5s, 10s, 20s)
 * - File expiration: 7 days
 */

import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ExportsController } from "./exports.controller";
import { FlatFileService } from "./flat-file.service";
import { ExcelExportService } from "./excel-export.service";
import { PdfGeneratorService } from "./pdf-generator.service";
import { PptxGeneratorService } from "./pptx-generator.service";
import { BoardReportService } from "./board-report.service";
import {
  FlatExportProcessor,
  FLAT_EXPORT_QUEUE_NAME,
} from "./processors/flat-export.processor";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditModule } from "../../audit/audit.module";
import { StorageModule } from "../../../common/storage.module";
import { AiModule } from "../../ai/ai.module";

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    StorageModule,
    AiModule,
    BullModule.registerQueue({
      name: FLAT_EXPORT_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          count: 100,
          age: 60 * 60, // 1 hour
        },
        removeOnFail: {
          count: 500,
          age: 24 * 60 * 60, // 1 day
        },
      },
    }),
  ],
  controllers: [ExportsController],
  providers: [
    FlatFileService,
    ExcelExportService,
    PdfGeneratorService,
    PptxGeneratorService,
    BoardReportService,
    FlatExportProcessor,
  ],
  exports: [
    FlatFileService,
    ExcelExportService,
    PdfGeneratorService,
    PptxGeneratorService,
    BoardReportService,
  ],
})
export class ExportsModule {}
