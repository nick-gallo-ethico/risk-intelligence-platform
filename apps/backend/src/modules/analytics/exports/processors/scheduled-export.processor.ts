/**
 * ScheduledExportProcessor - Cron-based processor for recurring scheduled exports
 *
 * Runs every minute via NestJS @Cron decorator to check for due scheduled exports.
 * When a schedule is due:
 * 1. Creates a run record
 * 2. Generates the export file (XLSX, CSV, or PDF)
 * 3. Uploads to storage
 * 4. Delivers via email with attachment and download link
 * 5. Updates run record with success/failure
 * 6. Schedules next run
 *
 * Uses existing services:
 * - FlatFileService for column building
 * - ExcelExportService for XLSX/CSV generation
 * - BoardReportService for PDF generation
 * - MailerService for email delivery
 * - StorageProvider for file storage
 *
 * @see ScheduledExportService for schedule management
 * @see FlatFileService for data export
 */

import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MailerService } from "@nestjs-modules/mailer";
import { nanoid } from "nanoid";
import { format, subDays } from "date-fns";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  ScheduledExportService,
  ScheduleConfig,
  ColumnConfig,
} from "../scheduled-export.service";
import { FlatFileService } from "../flat-file.service";
import { ExcelExportService } from "../excel-export.service";
import { BoardReportService } from "../board-report.service";
import {
  StorageProvider,
  STORAGE_PROVIDER,
} from "../../../storage/providers/storage-provider.interface";
import {
  ScheduledExport,
  ExportFormat,
  ScheduleRunStatus,
  ExportType,
  CaseStatus,
  Prisma,
} from "@prisma/client";
import { ColumnDefinition, TaggedFieldConfig } from "../entities/export.entity";

/**
 * Date range configuration for exports.
 */
interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Column configuration for exports.
 */
interface ExportColumnConfig {
  includeInvestigations: boolean;
  maxInvestigations: number;
  includeTaggedFields: boolean;
  includeOverflow: boolean;
  taggedFields?: TaggedFieldConfig[];
}

@Injectable()
export class ScheduledExportProcessor {
  private readonly logger = new Logger(ScheduledExportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduledExportService: ScheduledExportService,
    private readonly flatFileService: FlatFileService,
    private readonly excelExportService: ExcelExportService,
    private readonly boardReportService: BoardReportService,
    private readonly mailerService: MailerService,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  /**
   * Check for due schedules every minute.
   * NestJS ScheduleModule handles cron execution.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledExports(): Promise<void> {
    const dueSchedules = await this.scheduledExportService.getDueSchedules();

    if (dueSchedules.length === 0) {
      return; // Nothing to do
    }

    this.logger.log(
      `Processing ${dueSchedules.length} due scheduled export(s)`,
    );

    // Process each schedule sequentially to avoid overload
    for (const schedule of dueSchedules) {
      await this.processSchedule(schedule);
    }
  }

  /**
   * Process a single scheduled export.
   * Creates run record, generates file, delivers, and updates status.
   */
  private async processSchedule(schedule: ScheduledExport): Promise<void> {
    // Create run record at start
    const run = await this.prisma.scheduledExportRun.create({
      data: {
        organizationId: schedule.organizationId,
        scheduledExportId: schedule.id,
        status: ScheduleRunStatus.SUCCESS, // Will be updated on failure
        deliveredTo: [],
      },
    });

    try {
      this.logger.log(
        `Processing scheduled export: "${schedule.name}" (${schedule.id})`,
      );

      // Generate export file
      const { fileBuffer, fileName, rowCount } =
        await this.generateExport(schedule);

      // Upload to storage
      const storagePath = `scheduled-exports/${schedule.organizationId}/${schedule.id}/${nanoid()}-${fileName}`;
      const uploadResult = await this.storageProvider.uploadFile({
        organizationId: schedule.organizationId,
        path: storagePath,
        content: fileBuffer,
        contentType: this.getMimeType(schedule.format),
      });

      // Get signed URL for download (7 days expiration)
      const signedUrl = await this.storageProvider.getSignedUrl({
        organizationId: schedule.organizationId,
        path: storagePath,
        expiresInMinutes: 7 * 24 * 60, // 7 days
      });

      // Deliver via email if configured
      let deliveryResults: Record<string, string> = {};
      if (
        schedule.deliveryMethod === "EMAIL" &&
        schedule.recipients.length > 0
      ) {
        deliveryResults = await this.deliverViaEmail(
          schedule,
          fileBuffer,
          fileName,
          signedUrl,
        );
      }

      // Update run record with success
      await this.prisma.scheduledExportRun.update({
        where: { id: run.id },
        data: {
          completedAt: new Date(),
          status: ScheduleRunStatus.SUCCESS,
          fileUrl: signedUrl,
          fileSizeBytes: fileBuffer.length,
          rowCount,
          deliveredTo: schedule.recipients,
          deliveryStatus: deliveryResults as Prisma.InputJsonValue,
        },
      });

      // Update schedule for next run
      await this.scheduledExportService.updateAfterRun(
        schedule.id,
        ScheduleRunStatus.SUCCESS,
        run.id,
      );

      this.logger.log(
        `Completed scheduled export: "${schedule.name}" - ${rowCount} rows, delivered to ${schedule.recipients.length} recipient(s)`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed scheduled export "${schedule.name}": ${errorMessage}`,
        errorStack,
      );

      // Update run record with failure
      await this.prisma.scheduledExportRun.update({
        where: { id: run.id },
        data: {
          completedAt: new Date(),
          status: ScheduleRunStatus.FAILED,
          errorMessage,
          errorDetails: { stack: errorStack } as Prisma.InputJsonValue,
        },
      });

      // Still update schedule for next run (don't let failures block future runs)
      await this.scheduledExportService.updateAfterRun(
        schedule.id,
        ScheduleRunStatus.FAILED,
        run.id,
      );
    }
  }

  /**
   * Generate the export file based on format.
   */
  private async generateExport(schedule: ScheduledExport): Promise<{
    fileBuffer: Buffer;
    fileName: string;
    rowCount: number;
  }> {
    const columnConfig = schedule.columnConfig as unknown as ExportColumnConfig;
    const filters = schedule.filters as Record<string, unknown>;

    let fileBuffer: Buffer;
    let rowCount = 0;

    switch (schedule.format) {
      case ExportFormat.XLSX:
      case ExportFormat.CSV: {
        // Build columns
        const columns = await this.buildColumns(
          schedule.organizationId,
          columnConfig,
        );

        // Fetch data
        const data = await this.fetchExportData(
          schedule.organizationId,
          schedule.exportType,
          filters,
          columns,
          columnConfig,
        );
        rowCount = data.length;

        if (schedule.format === ExportFormat.XLSX) {
          // Generate Excel buffer
          fileBuffer = await this.excelExportService.generateBuffer(
            data,
            columns,
          );
        } else {
          // Generate CSV buffer
          fileBuffer = this.generateCsvBuffer(data, columns);
        }
        break;
      }

      case ExportFormat.PDF: {
        // Use board report service for PDF generation
        const dateRange = this.getDateRange(filters);
        const result = await this.boardReportService.generateBoardReport(
          schedule.organizationId,
          schedule.createdById,
          {
            title: schedule.name,
            dateRange,
            includePptx: false,
          },
        );

        // Download the generated PDF from storage
        fileBuffer = await this.storageProvider.downloadFile({
          organizationId: schedule.organizationId,
          path: this.extractPathFromUrl(result.pdfUrl),
        });
        rowCount = 1; // PDF is a single document
        break;
      }

      default:
        throw new Error(`Unsupported export format: ${schedule.format}`);
    }

    const dateSuffix = format(new Date(), "yyyy-MM-dd");
    const sanitizedName = schedule.name.replace(/[^a-z0-9]/gi, "-");
    const fileName = `${sanitizedName}-${dateSuffix}.${schedule.format.toLowerCase()}`;

    return { fileBuffer, fileName, rowCount };
  }

  /**
   * Build column definitions based on configuration.
   */
  private async buildColumns(
    orgId: string,
    config: ExportColumnConfig,
  ): Promise<ColumnDefinition[]> {
    const columns: ColumnDefinition[] = [];

    // Add core columns
    columns.push(...this.flatFileService.getCoreColumns());

    // Add investigation columns if requested
    if (config.includeInvestigations) {
      columns.push(
        ...this.flatFileService.getInvestigationColumns(
          config.maxInvestigations,
        ),
      );
    }

    // Add tagged field columns if requested
    if (config.includeTaggedFields) {
      if (config.taggedFields) {
        // Use snapshotted tags from config
        columns.push(
          ...config.taggedFields.map((tag) => ({
            key: `tag_${tag.tagSlot}_value`,
            label: tag.displayLabel,
            type: "string" as const,
            width: 20,
            tagSlot: tag.tagSlot,
          })),
        );
      } else {
        // Fetch current tags
        const tags = await this.flatFileService.getTaggedFields(orgId);
        columns.push(...this.flatFileService.getTaggedColumns(tags));
      }
    }

    return columns;
  }

  /**
   * Fetch export data based on export type and filters.
   */
  private async fetchExportData(
    orgId: string,
    exportType: ExportType,
    filters: Record<string, unknown>,
    columns: ColumnDefinition[],
    config: ExportColumnConfig,
  ): Promise<Record<string, unknown>[]> {
    // Build Prisma where clause from filters
    const where: Prisma.CaseWhereInput = {
      organizationId: orgId,
    };

    // Apply date range filter
    if (filters.dateRange) {
      const dateRange = filters.dateRange as { start: string; end: string };
      where.createdAt = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    // Apply status filter - cast to CaseStatus[]
    if (filters.statuses && Array.isArray(filters.statuses)) {
      where.status = { in: filters.statuses as CaseStatus[] };
    }

    // Apply category filter
    if (filters.categories && Array.isArray(filters.categories)) {
      where.primaryCategoryId = { in: filters.categories as string[] };
    }

    // Fetch cases with relations
    const cases = await this.prisma.case.findMany({
      where,
      include: {
        primaryCategory: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        investigations: config.includeInvestigations
          ? {
              take: config.maxInvestigations,
              orderBy: { createdAt: "desc" },
              include: {
                primaryInvestigator: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            }
          : false,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to export rows
    return cases.map((caseData) => this.transformCaseToRow(caseData, columns));
  }

  /**
   * Transform a case record to an export row.
   */
  private transformCaseToRow(
    caseData: Record<string, unknown>,
    columns: ColumnDefinition[],
  ): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    for (const column of columns) {
      const value = this.resolveColumnValue(caseData, column);
      row[column.key] = value;
    }

    return row;
  }

  /**
   * Resolve a column value from case data.
   */
  private resolveColumnValue(
    caseData: Record<string, unknown>,
    column: ColumnDefinition,
  ): unknown {
    // Handle simple field mapping
    const fieldMap: Record<string, string> = {
      case_id: "id",
      case_number: "caseNumber",
      title: "title",
      status: "status",
      severity: "severity",
      created_at: "createdAt",
      updated_at: "updatedAt",
      description: "description",
    };

    const field = fieldMap[column.key];
    if (field) {
      return caseData[field];
    }

    // Handle nested fields
    if (column.key === "category_name") {
      const category = caseData.primaryCategory as Record<
        string,
        unknown
      > | null;
      return category?.name || null;
    }

    if (column.key === "assigned_to_name") {
      // assignedTo is a string array of user IDs in the Case model
      const assignedTo = caseData.assignedTo as string[] | undefined;
      return assignedTo?.length ? assignedTo.join(", ") : null;
    }

    if (column.key === "created_by_name") {
      const createdBy = caseData.createdBy as Record<string, unknown> | null;
      return createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : null;
    }

    if (column.key === "created_by_email") {
      const createdBy = caseData.createdBy as Record<string, unknown> | null;
      return createdBy?.email || null;
    }

    // Handle investigation columns
    if (column.key.startsWith("inv_")) {
      const investigations = caseData.investigations as
        | Array<Record<string, unknown>>
        | undefined;
      if (!investigations) return null;

      const match = column.key.match(/^inv_(\d+)_(.+)$/);
      if (match) {
        const invIndex = parseInt(match[1], 10) - 1;
        const invField = match[2];
        const investigation = investigations[invIndex];

        if (!investigation) return null;

        if (invField === "id") return investigation.id;
        if (invField === "status") return investigation.status;
        if (invField === "started") return investigation.createdAt;
        if (invField === "completed") return investigation.closedAt;
        if (invField === "investigator") {
          const inv = investigation.primaryInvestigator as Record<
            string,
            unknown
          > | null;
          return inv ? `${inv.firstName} ${inv.lastName}` : null;
        }
      }
    }

    return null;
  }

  /**
   * Generate CSV buffer from data.
   */
  private generateCsvBuffer(
    data: Record<string, unknown>[],
    columns: ColumnDefinition[],
  ): Buffer {
    const rows: string[] = [];

    // Header row
    rows.push(columns.map((c) => this.escapeCsv(c.label)).join(","));

    // Data rows
    for (const row of data) {
      const values = columns.map((c) => this.escapeCsv(row[c.key]));
      rows.push(values.join(","));
    }

    return Buffer.from(rows.join("\n"), "utf-8");
  }

  /**
   * Escape a value for CSV format.
   */
  private escapeCsv(value: unknown): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Deliver export via email with attachment and download link.
   */
  private async deliverViaEmail(
    schedule: ScheduledExport,
    fileBuffer: Buffer,
    fileName: string,
    downloadUrl: string,
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const recipient of schedule.recipients) {
      try {
        await this.mailerService.sendMail({
          to: recipient,
          subject: `Scheduled Report: ${schedule.name}`,
          html: this.buildEmailHtml(schedule.name, downloadUrl),
          attachments: [
            {
              filename: fileName,
              content: fileBuffer,
              contentType: this.getMimeType(schedule.format),
            },
          ],
        });

        results[recipient] = "sent";
        this.logger.debug(`Delivered scheduled export to ${recipient}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results[recipient] = `failed: ${errorMessage}`;
        this.logger.warn(
          `Failed to deliver scheduled export to ${recipient}: ${errorMessage}`,
        );
      }
    }

    return results;
  }

  /**
   * Build HTML email content.
   */
  private buildEmailHtml(reportName: string, downloadUrl: string): string {
    const generatedAt = format(new Date(), "PPpp");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a2e; font-size: 24px; margin-bottom: 16px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
    .button { display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; }
    .button:hover { background-color: #1d4ed8; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Scheduled Report: ${reportName}</h1>
    <p class="meta">Generated: ${generatedAt}</p>
    <p>Your scheduled report is ready. The report is attached to this email and also available for download:</p>
    <p style="margin: 24px 0;">
      <a href="${downloadUrl}" class="button">Download Report</a>
    </p>
    <p><small>This download link expires in 7 days.</small></p>
    <div class="footer">
      <p>This is an automated message from the Ethico Risk Intelligence Platform.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
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
      case ExportFormat.PDF:
        return "application/pdf";
      default:
        return "application/octet-stream";
    }
  }

  /**
   * Get date range from filters or default to last 30 days.
   */
  private getDateRange(filters: Record<string, unknown>): DateRange {
    if (filters.dateRange) {
      const range = filters.dateRange as { start: string; end: string };
      return { start: new Date(range.start), end: new Date(range.end) };
    }
    return { start: subDays(new Date(), 30), end: new Date() };
  }

  /**
   * Extract storage path from signed URL.
   * This is a simplified version; in production you'd parse the URL properly.
   */
  private extractPathFromUrl(url: string): string {
    // For local storage, the URL is the path
    // For Azure Blob, would need to parse the blob path from the signed URL
    if (url.startsWith("file://")) {
      return url.replace("file://", "");
    }
    // For HTTP URLs, extract the path portion
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.replace(/^\//, "");
    } catch {
      return url;
    }
  }
}
