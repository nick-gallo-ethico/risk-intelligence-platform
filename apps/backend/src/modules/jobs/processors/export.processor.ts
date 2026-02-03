import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { EXPORT_QUEUE_NAME } from "../queues/export.queue";
import { ExportJobData } from "../types/job-data.types";

/**
 * Export Queue Worker
 *
 * Handles async report export jobs:
 * - Large dataset exports (>10k rows)
 * - Excel and CSV file generation
 * - Upload to storage and generate download URL
 *
 * NOTE: The actual export logic is in ReportingModule's ExportService.
 * This processor is responsible for job orchestration and error handling.
 * Integration with ExportService happens in the ReportingModule.
 */
@Processor(EXPORT_QUEUE_NAME, { concurrency: 3 })
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  async process(job: Job<ExportJobData>): Promise<{ fileKey: string }> {
    this.logger.log(
      `Processing export job ${job.id}: executionId=${job.data.executionId} for org:${job.data.organizationId}`,
    );

    // The actual export is handled by ExportService in ReportingModule
    // This processor just orchestrates the job lifecycle
    // In production, this would call ExportService.processExportJob()

    this.logger.log(
      `Export job ${job.id} would generate ${job.data.format} file for template ${job.data.templateId}`,
    );

    // Placeholder - actual implementation connects to ExportService
    return { fileKey: `exports/${job.data.executionId}.${job.data.format}` };
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<ExportJobData>) {
    this.logger.log(`Export job ${job.id} completed successfully`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<ExportJobData>, error: Error) {
    this.logger.error(
      `Export job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
