import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { MigrationService } from "./migration.service";
import { MigrationUploadService } from "./migration-upload.service";
import { MigrationController } from "./migration.controller";
import { MigrationUploadController } from "./migration-upload.controller";
import { ScreenshotToFormService } from "./screenshot-to-form.service";
import {
  MigrationProcessor,
  MIGRATION_QUEUE_NAME,
} from "./processors/migration.processor";
import { PrismaModule } from "../../prisma/prisma.module";
import { NavexConnector } from "./connectors/navex.connector";
import { EqsConnector } from "./connectors/eqs.connector";
import { CsvConnector } from "./connectors/csv.connector";

/**
 * MigrationModule provides data import capabilities for competitor system migrations.
 * Supports NAVEX, EQS, Legacy Ethico, and generic CSV imports.
 *
 * Features:
 * - File upload with format auto-detection (MigrationUploadController)
 * - Full migration lifecycle API (MigrationController)
 * - Async import processing (MigrationProcessor via BullMQ)
 * - Screenshot-to-form extraction using Claude's vision API
 *
 * Queue: migrations
 * - Concurrency: 1 (one import at a time per worker)
 * - No retries (imports should be handled carefully)
 * - 7-day rollback window
 */
// StorageModule and AuditModule are @Global(), so no need to import explicitly
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: MIGRATION_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 1, // No retries for imports
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500, age: 24 * 60 * 60 }, // Keep failed jobs for 1 day
      },
    }),
  ],
  controllers: [MigrationController, MigrationUploadController],
  providers: [
    MigrationService,
    MigrationUploadService,
    ScreenshotToFormService,
    MigrationProcessor,
    NavexConnector,
    EqsConnector,
    CsvConnector,
  ],
  exports: [
    MigrationService,
    MigrationUploadService,
    ScreenshotToFormService,
    NavexConnector,
    EqsConnector,
    CsvConnector,
  ],
})
export class MigrationModule {}
