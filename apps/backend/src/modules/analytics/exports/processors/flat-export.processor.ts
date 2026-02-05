/**
 * FlatExportProcessor - BullMQ processor for async flat file exports
 *
 * Handles large-scale data exports asynchronously:
 * 1. Updates job status to PROCESSING
 * 2. Builds column configuration from FlatFileService
 * 3. Streams data from Prisma with pagination
 * 4. Generates XLSX/CSV file via ExcelExportService
 * 5. Uploads to storage with signed URL generation
 * 6. Updates job record with completion status
 *
 * Key features:
 * - Progress tracking with job.updateProgress()
 * - 7-day file expiration on Azure Blob
 * - Retry logic (3 attempts, exponential backoff)
 * - Error handling with job status updates
 *
 * @see FlatFileService for column configuration
 * @see ExcelExportService for file generation
 */

import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../../../prisma/prisma.service";
import { FlatFileService } from "../flat-file.service";
import { ExcelExportService } from "../excel-export.service";
import { StorageService } from "../../../../common/services/storage.service";
import { ColumnDefinition, TaggedFieldConfig } from "../entities/export.entity";
import {
  ExportJobStatus,
  ExportFormat,
  ExportType,
  Prisma,
  CaseStatus,
} from "@prisma/client";

/**
 * Queue name for flat file exports.
 * Must match the queue registered in the module.
 */
export const FLAT_EXPORT_QUEUE_NAME = "flat-export";

/**
 * Job data structure for flat file exports.
 */
export interface FlatExportJobData {
  /** Export job record ID */
  executionId: string;
  /** Tenant identifier */
  organizationId: string;
  /** Export type (FLAT_FILE, CASES_ONLY, etc.) */
  exportType: ExportType;
  /** Output format */
  format: ExportFormat;
  /** Query filters from user */
  filters: Record<string, unknown>;
  /** Column configuration options */
  columnConfig: {
    includeInvestigations: boolean;
    maxInvestigations: number;
    includeTaggedFields: boolean;
    includeOverflow: boolean;
    /** Snapshot of tagged fields at job creation */
    taggedFields?: TaggedFieldConfig[];
  };
  /** User who created the export */
  createdById: string;
}

@Processor(FLAT_EXPORT_QUEUE_NAME, { concurrency: 2 })
@Injectable()
export class FlatExportProcessor extends WorkerHost {
  private readonly logger = new Logger(FlatExportProcessor.name);

  /** Batch size for Prisma pagination */
  private readonly DATA_BATCH_SIZE = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly flatFileService: FlatFileService,
    private readonly excelExportService: ExcelExportService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  /**
   * Process a flat file export job.
   *
   * @param job - BullMQ job containing export configuration
   * @returns Result with file key and row count
   */
  async process(
    job: Job<FlatExportJobData>,
  ): Promise<{ fileKey: string; rowCount: number }> {
    const {
      executionId,
      organizationId,
      exportType,
      format,
      filters,
      columnConfig,
    } = job.data;

    this.logger.log(
      `Processing flat export job ${executionId} for org ${organizationId}`,
    );

    // Update status to processing
    await this.updateJobStatus(executionId, ExportJobStatus.PROCESSING, {
      progress: 5,
    });

    try {
      // 1. Build column configuration
      await job.updateProgress(10);
      const columns = await this.buildColumns(organizationId, columnConfig);

      // 2. Count total rows for progress tracking
      const totalRows = await this.countRows(
        organizationId,
        exportType,
        filters,
      );
      await this.prisma.exportJob.update({
        where: { id: executionId },
        data: { totalRows },
      });

      this.logger.log(`Export job ${executionId}: ${totalRows} rows to export`);

      // 3. Generate file based on format and size
      await job.updateProgress(20);
      const fileBuffer = await this.generateFile(
        organizationId,
        exportType,
        format,
        filters,
        columns,
        columnConfig,
        totalRows,
      );

      await job.updateProgress(80);

      // 4. Upload to storage
      const fileExt = format.toLowerCase();
      const mimeType = this.getMimeType(format);

      // Upload as a file input
      const uploadResult = await this.storageService.upload(
        {
          originalname: `export-${executionId}.${fileExt}`,
          mimetype: mimeType,
          size: fileBuffer.length,
          buffer: fileBuffer,
        },
        organizationId,
        { subdirectory: "exports" },
      );

      // 5. Generate signed URL with 7-day expiration
      const signedUrl = await this.storageService.getSignedUrl(
        uploadResult.key,
        7 * 24 * 60 * 60, // 7 days in seconds
      );

      // 6. Update job record with completion
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.prisma.exportJob.update({
        where: { id: executionId },
        data: {
          status: ExportJobStatus.COMPLETED,
          progress: 100,
          processedRows: totalRows,
          fileUrl: signedUrl,
          fileSizeBytes: fileBuffer.length,
          completedAt: new Date(),
          expiresAt,
        },
      });

      this.logger.log(
        `Export job ${executionId} completed: ${totalRows} rows, ${fileBuffer.length} bytes`,
      );

      return { fileKey: uploadResult.key, rowCount: totalRows };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Export job ${executionId} failed: ${errorMessage}`);

      await this.prisma.exportJob.update({
        where: { id: executionId },
        data: {
          status: ExportJobStatus.FAILED,
          errorMessage,
          errorDetails: {
            stack: error instanceof Error ? error.stack : undefined,
          } as Prisma.InputJsonValue,
        },
      });

      throw error;
    }
  }

  /**
   * Handle job failure after all retries exhausted.
   */
  @OnWorkerEvent("failed")
  onFailed(job: Job<FlatExportJobData> | undefined, error: Error): void {
    if (!job) {
      this.logger.error(`Export job failed with no context: ${error.message}`);
      return;
    }

    this.logger.error(
      `Export job ${job.data.executionId} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  /**
   * Build column definitions from configuration.
   */
  private async buildColumns(
    orgId: string,
    config: FlatExportJobData["columnConfig"],
  ): Promise<ColumnDefinition[]> {
    const columns: ColumnDefinition[] = [
      ...this.flatFileService.getCoreColumns(),
    ];

    if (config.includeInvestigations) {
      columns.push(
        ...this.flatFileService.getInvestigationColumns(
          config.maxInvestigations,
        ),
      );
    }

    if (config.includeTaggedFields) {
      // Use snapshotted tags if available, otherwise fetch current
      const tags = config.taggedFields
        ? config.taggedFields.map((t) => ({
            id: `snapshot-${t.tagSlot}`,
            organizationId: orgId,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdById: "",
            ...t,
            formatPattern: t.formatPattern ?? null,
            templateId: t.templateId ?? null,
          }))
        : await this.flatFileService.getTaggedFields(orgId);

      columns.push(...this.flatFileService.getTaggedColumns(tags));
    }

    if (config.includeOverflow) {
      columns.push(
        {
          key: "all_custom_fields",
          label: "All Custom Fields",
          type: "string",
          width: 50,
        },
        {
          key: "all_investigations",
          label: "All Investigations",
          type: "string",
          width: 50,
        },
      );
    }

    return columns;
  }

  /**
   * Count total rows matching filters.
   */
  private async countRows(
    orgId: string,
    _exportType: ExportType,
    filters: Record<string, unknown>,
  ): Promise<number> {
    return this.prisma.case.count({
      where: {
        organizationId: orgId,
        ...this.buildWhereClause(filters),
      },
    });
  }

  /**
   * Generate the export file based on format and size.
   */
  private async generateFile(
    orgId: string,
    exportType: ExportType,
    format: ExportFormat,
    filters: Record<string, unknown>,
    columns: ColumnDefinition[],
    columnConfig: FlatExportJobData["columnConfig"],
    totalRows: number,
  ): Promise<Buffer> {
    if (format === ExportFormat.XLSX) {
      if (totalRows > 10000) {
        // Use streaming for large exports
        const dataStream = this.createDataStream(
          orgId,
          exportType,
          filters,
          columns,
          columnConfig,
        );
        const excelStream = await this.excelExportService.streamExport(
          dataStream,
          columns,
        );
        return this.streamToBuffer(excelStream);
      } else {
        // Use buffer for small exports
        const rows = await this.collectRows(
          orgId,
          exportType,
          filters,
          columns,
          columnConfig,
        );
        return this.excelExportService.generateBuffer(rows, columns);
      }
    } else if (format === ExportFormat.CSV) {
      const rows = await this.collectRows(
        orgId,
        exportType,
        filters,
        columns,
        columnConfig,
      );
      return this.generateCsv(rows, columns);
    } else {
      // JSON format
      const rows = await this.collectRows(
        orgId,
        exportType,
        filters,
        columns,
        columnConfig,
      );
      return Buffer.from(JSON.stringify(rows, null, 2));
    }
  }

  /**
   * Create async data stream for large exports.
   */
  private async *createDataStream(
    orgId: string,
    _exportType: ExportType,
    filters: Record<string, unknown>,
    columns: ColumnDefinition[],
    columnConfig: FlatExportJobData["columnConfig"],
  ): AsyncIterable<Record<string, unknown>> {
    let offset = 0;

    while (true) {
      const cases = await this.fetchCaseBatch(orgId, filters, offset);

      if (cases.length === 0) break;

      for (const caseData of cases) {
        yield this.denormalizeCase(caseData, columns, columnConfig);
      }

      offset += this.DATA_BATCH_SIZE;
    }
  }

  /**
   * Collect all rows into memory for small exports.
   */
  private async collectRows(
    orgId: string,
    _exportType: ExportType,
    filters: Record<string, unknown>,
    _columns: ColumnDefinition[],
    columnConfig: FlatExportJobData["columnConfig"],
  ): Promise<Record<string, unknown>[]> {
    const rows: Record<string, unknown>[] = [];
    let offset = 0;

    while (true) {
      const cases = await this.fetchCaseBatch(orgId, filters, offset);

      if (cases.length === 0) break;

      for (const caseData of cases) {
        rows.push(this.denormalizeCase(caseData, _columns, columnConfig));
      }

      offset += this.DATA_BATCH_SIZE;
    }

    return rows;
  }

  /**
   * Fetch a batch of cases with relations.
   */
  private async fetchCaseBatch(
    orgId: string,
    filters: Record<string, unknown>,
    offset: number,
  ): Promise<CaseWithInclude[]> {
    const cases = await this.prisma.case.findMany({
      where: {
        organizationId: orgId,
        ...this.buildWhereClause(filters),
      },
      include: {
        primaryCategory: true,
        secondaryCategory: true,
        investigations: {
          take: 10,
          include: {
            _count: { select: { interviews: true } },
          },
        },
        riuAssociations: {
          select: { riu: { select: { id: true } } },
        },
        personAssociations: {
          select: { personId: true },
        },
      },
      skip: offset,
      take: this.DATA_BATCH_SIZE,
      orderBy: { createdAt: "desc" },
    });

    return cases;
  }

  /**
   * Denormalize case to flat row matching column definitions.
   */
  private denormalizeCase(
    caseData: CaseWithInclude,
    _columns: ColumnDefinition[],
    columnConfig: FlatExportJobData["columnConfig"],
  ): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    // Core case fields
    row.case_id = caseData.id;
    row.case_number = caseData.referenceNumber;
    row.case_status = caseData.status;
    row.case_priority = caseData.severity; // severity maps to priority
    row.case_created_at = caseData.createdAt;
    row.case_closed_at = caseData.outcomeAt; // outcomeAt as proxy for closed
    row.case_days_open = this.calculateDaysOpen(
      caseData.createdAt,
      caseData.outcomeAt,
    );
    row.case_sla_breached = false; // Would need SLA tracking relation

    // Classification
    row.category_name = caseData.primaryCategory?.name ?? "";
    row.category_code = caseData.primaryCategory?.code ?? "";
    row.subcategory_name = caseData.secondaryCategory?.name ?? "";

    // Source
    row.source_channel = caseData.sourceChannel;
    row.is_anonymous = caseData.reporterAnonymous;
    row.reporter_relationship = caseData.reporterRelationship ?? "";

    // Assignment - simplified (no direct assignee relation on Case)
    row.assigned_to_name = "";
    row.assigned_to_email = "";

    // Organization - using denormalized location fields
    row.business_unit_name = "";
    row.business_unit_code = "";
    row.location_name = caseData.locationName ?? "";
    row.location_country = caseData.locationCountry ?? "";
    row.location_region = caseData.locationState ?? "";

    // Outcome
    row.outcome = caseData.outcome ?? "";
    row.outcome_reason = caseData.outcomeNotes ?? "";

    // Remediation (placeholder - would need remediation relation)
    row.has_remediation = false;
    row.remediation_status = "";

    // Counts
    row.riu_count = caseData.riuAssociations?.length ?? 0;
    row.investigation_count = caseData.investigations?.length ?? 0;
    row.subject_count = caseData.personAssociations?.length ?? 0;
    row.attachment_count = 0; // Would need attachments relation

    // Investigation columns
    if (columnConfig.includeInvestigations && caseData.investigations) {
      for (let i = 0; i < columnConfig.maxInvestigations; i++) {
        const inv = caseData.investigations[i];
        const prefix = `inv_${i + 1}`;

        row[`${prefix}_id`] = inv?.id ?? "";
        row[`${prefix}_type`] = inv?.investigationType ?? "";
        row[`${prefix}_status`] = inv?.status ?? "";
        row[`${prefix}_outcome`] = inv?.outcome ?? "";
        row[`${prefix}_started_at`] = inv?.createdAt ?? null; // Use createdAt as start
        row[`${prefix}_completed_at`] = inv?.closedAt ?? null;
        row[`${prefix}_days_to_complete`] =
          inv?.createdAt && inv?.closedAt
            ? Math.ceil(
                (inv.closedAt.getTime() - inv.createdAt.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : null;
        row[`${prefix}_investigator_name`] = "";
        row[`${prefix}_interview_count`] = inv?._count?.interviews ?? 0;
        row[`${prefix}_finding_summary`] = inv?.findingsSummary ?? "";
      }
    }

    // Tagged fields (from snapshotted config)
    if (columnConfig.includeTaggedFields && columnConfig.taggedFields) {
      for (const tag of columnConfig.taggedFields) {
        const value = this.resolveTaggedValue(tag, caseData);
        row[`tag_${tag.tagSlot}_value`] = value;
      }
    }

    // Overflow columns
    if (columnConfig.includeOverflow) {
      row.all_custom_fields = JSON.stringify(caseData.customFields ?? {});
      row.all_investigations = JSON.stringify(
        caseData.investigations?.map((inv) => ({
          id: inv.id,
          status: inv.status,
          outcome: inv.outcome,
        })) ?? [],
      );
    }

    return row;
  }

  /**
   * Resolve tagged field value from case data.
   */
  private resolveTaggedValue(
    tag: TaggedFieldConfig,
    caseData: CaseWithInclude,
  ): unknown {
    try {
      const pathParts = tag.sourceFieldPath.split(".");
      let value: unknown = caseData;

      for (const part of pathParts) {
        if (value === null || value === undefined) return null;
        value = (value as Record<string, unknown>)[part];
      }

      return value ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Calculate days open for a case.
   */
  private calculateDaysOpen(
    createdAt: Date,
    closedAt: Date | null | undefined,
  ): number {
    const endDate = closedAt ?? new Date();
    return Math.ceil(
      (endDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  /**
   * Build Prisma where clause from filters.
   */
  private buildWhereClause(
    filters: Record<string, unknown>,
  ): Prisma.CaseWhereInput {
    const where: Prisma.CaseWhereInput = {};

    if (filters.dateRange) {
      const range = filters.dateRange as { start: string; end: string };
      where.createdAt = {
        gte: new Date(range.start),
        lte: new Date(range.end),
      };
    }

    if (filters.statuses && Array.isArray(filters.statuses)) {
      where.status = { in: filters.statuses as CaseStatus[] };
    }

    if (filters.categories && Array.isArray(filters.categories)) {
      where.primaryCategoryId = { in: filters.categories as string[] };
    }

    return where;
  }

  /**
   * Convert stream to buffer.
   */
  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Generate CSV from rows.
   */
  private generateCsv(
    rows: Record<string, unknown>[],
    columns: ColumnDefinition[],
  ): Buffer {
    const lines: string[] = [];

    // Header row
    lines.push(columns.map((col) => this.escapeCsv(col.label)).join(","));

    // Data rows
    for (const row of rows) {
      const values = columns.map((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return "";
        if (value instanceof Date) return value.toISOString();
        return this.escapeCsv(String(value));
      });
      lines.push(values.join(","));
    }

    return Buffer.from(lines.join("\n"));
  }

  /**
   * Escape value for CSV (quote if contains comma, quote, or newline).
   */
  private escapeCsv(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Get MIME type for export format.
   */
  private getMimeType(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.XLSX:
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case ExportFormat.CSV:
        return "text/csv";
      case ExportFormat.JSON:
        return "application/json";
      default:
        return "application/octet-stream";
    }
  }

  /**
   * Update job status helper.
   */
  private async updateJobStatus(
    jobId: string,
    status: ExportJobStatus,
    data?: { progress?: number },
  ): Promise<void> {
    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status,
        ...data,
      },
    });
  }
}

/**
 * Type for Case with included relations.
 * Using Prisma generated types with GetPayload for type safety.
 */
type CaseWithInclude = Prisma.CaseGetPayload<{
  include: {
    primaryCategory: true;
    secondaryCategory: true;
    investigations: {
      include: {
        _count: { select: { interviews: true } };
      };
    };
    riuAssociations: {
      select: { riu: { select: { id: true } } };
    };
    personAssociations: {
      select: { personId: true };
    };
  };
}>;
