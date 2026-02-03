import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import * as ExcelJS from "exceljs";
import { PrismaService } from "../prisma/prisma.service";
import { QueryBuilderService } from "./query-builder.service";
import { ReportTemplateService } from "./report-template.service";
import { EXPORT_QUEUE_NAME } from "../jobs/queues/export.queue";
import { ColumnDefinition, FilterDefinition } from "./types/report.types";
import { ReportExecutionStatus } from "@prisma/client";

/**
 * ExportService
 *
 * Handles report exports in multiple formats:
 * - Excel (XLSX) with formatting, styling, and auto-filters
 * - CSV for simple data transfer
 *
 * Supports both synchronous (small reports) and async (large reports via queue).
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private prisma: PrismaService,
    private queryBuilder: QueryBuilderService,
    private templateService: ReportTemplateService,
    @InjectQueue(EXPORT_QUEUE_NAME) private exportQueue: Queue,
  ) {}

  /**
   * Queue a report for async export (for large reports).
   * Creates an execution record and queues the job.
   * Returns execution ID for status polling.
   */
  async queueExport(params: {
    organizationId: string;
    templateId: string;
    filters?: FilterDefinition[];
    format: "excel" | "csv";
    requestedById: string;
  }) {
    this.logger.log(
      `Queueing ${params.format} export for template ${params.templateId}`,
    );

    // Create execution record
    const execution = await this.prisma.reportExecution.create({
      data: {
        organizationId: params.organizationId,
        templateId: params.templateId,
        status: ReportExecutionStatus.PENDING,
        filters: params.filters
          ? JSON.parse(JSON.stringify(params.filters))
          : null,
        requestedById: params.requestedById,
      },
    });

    // Queue job
    await this.exportQueue.add("export-report", {
      executionId: execution.id,
      organizationId: params.organizationId,
      templateId: params.templateId,
      filters: params.filters,
      format: params.format,
    });

    return { executionId: execution.id, status: "queued" };
  }

  /**
   * Get status of a queued export.
   */
  async getExportStatus(organizationId: string, executionId: string) {
    const execution = await this.prisma.reportExecution.findFirst({
      where: { id: executionId, organizationId },
    });

    if (!execution) {
      return null;
    }

    return {
      id: execution.id,
      status: execution.status,
      rowCount: execution.rowCount,
      fileUrl: execution.fileUrl,
      expiresAt: execution.expiresAt,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      errorMessage: execution.errorMessage,
    };
  }

  /**
   * Generate Excel directly (for small reports <10k rows).
   * Returns buffer that can be streamed to response.
   */
  async exportToExcel(params: {
    organizationId: string;
    templateId: string;
    filters?: FilterDefinition[];
  }): Promise<Buffer> {
    const template = await this.templateService.findById(
      params.organizationId,
      params.templateId,
    );

    const columns = template.columns as unknown as ColumnDefinition[];

    this.logger.log(
      `Generating Excel export for template "${template.name}" with ${columns.length} columns`,
    );

    const result = await this.queryBuilder.executeQuery({
      organizationId: params.organizationId,
      dataSource: template.dataSource,
      columns,
      filters: params.filters,
      sortBy: template.sortBy ?? undefined,
      sortOrder: (template.sortOrder as "asc" | "desc") ?? undefined,
      limit: 10000, // Cap for direct export
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ethico Risk Intelligence Platform";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(template.name);

    // Add header row with column definitions
    worksheet.columns = columns.map((col) => ({
      header: col.label,
      key: col.field,
      width: col.width || 15,
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "left" };

    // Add data rows
    for (const row of result.data) {
      const formattedRow: Record<string, unknown> = {};
      for (const col of columns) {
        formattedRow[col.field] = this.formatValue(row[col.field], col);
      }
      worksheet.addRow(formattedRow);
    }

    // Auto-filter on all columns
    if (result.data.length > 0) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length },
      };
    }

    // Freeze header row
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    this.logger.log(
      `Generated Excel with ${result.data.length} rows, ${result.total} total`,
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generate CSV (for simple data transfer).
   * Returns CSV string.
   */
  async exportToCsv(params: {
    organizationId: string;
    templateId: string;
    filters?: FilterDefinition[];
  }): Promise<string> {
    const template = await this.templateService.findById(
      params.organizationId,
      params.templateId,
    );

    const columns = template.columns as unknown as ColumnDefinition[];

    this.logger.log(
      `Generating CSV export for template "${template.name}" with ${columns.length} columns`,
    );

    const result = await this.queryBuilder.executeQuery({
      organizationId: params.organizationId,
      dataSource: template.dataSource,
      columns,
      filters: params.filters,
      limit: 50000, // Higher limit for CSV (smaller files)
    });

    // Build CSV
    const headers = columns.map((c) => `"${this.escapeCsv(c.label)}"`).join(",");

    const rows = result.data.map((row) =>
      columns
        .map((col) => {
          const value = this.formatValue(row[col.field], col);
          if (value === null || value === undefined) return "";
          if (typeof value === "string") {
            return `"${this.escapeCsv(value)}"`;
          }
          return String(value);
        })
        .join(","),
    );

    this.logger.log(
      `Generated CSV with ${result.data.length} rows, ${result.total} total`,
    );

    return [headers, ...rows].join("\n");
  }

  /**
   * Format a value based on column type.
   */
  private formatValue(value: unknown, column: ColumnDefinition): unknown {
    if (value === null || value === undefined) return "";

    switch (column.type) {
      case "date":
        if (value instanceof Date) {
          return value.toISOString().split("T")[0];
        }
        if (typeof value === "string") {
          return new Date(value).toISOString().split("T")[0];
        }
        return value;

      case "currency":
        if (typeof value === "number") {
          return value.toFixed(2);
        }
        return value;

      case "boolean":
        return value ? "Yes" : "No";

      default:
        return value;
    }
  }

  /**
   * Escape special characters for CSV.
   */
  private escapeCsv(str: string): string {
    return str.replace(/"/g, '""');
  }
}
