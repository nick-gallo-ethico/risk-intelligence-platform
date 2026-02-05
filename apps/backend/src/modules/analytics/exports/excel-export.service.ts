/**
 * ExcelExportService - Excel file generation with streaming support
 *
 * Provides two modes of Excel export:
 * 1. Streaming (streamExport): For large datasets >10k rows - uses WorkbookWriter
 * 2. Buffer (generateBuffer): For small datasets with full formatting support
 *
 * Key features:
 * - Column width auto-sizing based on type
 * - Header styling (bold, gray background, auto-filter, freeze pane)
 * - Cell type formatting (date, currency, percentage)
 * - Status conditional formatting (OPEN=amber, CLOSED=green)
 * - Batch processing with event loop yielding for large exports
 *
 * @see FlatExportProcessor for async job execution
 */

import { Injectable, Logger } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { PassThrough } from "stream";
import { ColumnDefinition } from "./entities/export.entity";

/**
 * Options for generating Excel files
 */
export interface ExcelOptions {
  /** Sheet name (default: 'Export') */
  sheetName?: string;
  /** Include metadata like creator and creation date */
  includeMetadata?: boolean;
}

/**
 * Status-specific conditional formatting configuration
 */
interface StatusFormatConfig {
  text: string;
  bgColor: string;
}

@Injectable()
export class ExcelExportService {
  private readonly logger = new Logger(ExcelExportService.name);

  /** Batch size for yielding to event loop during streaming */
  private readonly BATCH_SIZE = 1000;

  /** Status conditional formatting rules */
  private readonly STATUS_FORMATS: StatusFormatConfig[] = [
    { text: "OPEN", bgColor: "FFFEF3C7" }, // Amber
    { text: "IN_PROGRESS", bgColor: "FFDBEAFE" }, // Blue
    { text: "CLOSED", bgColor: "FFD1FAE5" }, // Green
    { text: "CANCELLED", bgColor: "FFFEE2E2" }, // Red
  ];

  /**
   * Stream large exports to avoid memory issues.
   * Use for exports >10k rows.
   *
   * Key features:
   * - WorkbookWriter with streaming mode
   * - Row commit after each row (critical for streaming)
   * - Event loop yielding every BATCH_SIZE rows
   * - Reduced formatting compared to buffer mode
   *
   * @param dataSource - Async iterable of row data
   * @param columns - Column definitions for headers and formatting
   * @returns PassThrough stream containing Excel file data
   */
  async streamExport(
    dataSource: AsyncIterable<Record<string, unknown>>,
    columns: ColumnDefinition[],
  ): Promise<PassThrough> {
    const stream = new PassThrough();

    // Start streaming in background (don't await)
    this.executeStreamExport(stream, dataSource, columns).catch((error) => {
      this.logger.error(`Stream export failed: ${error.message}`);
      stream.destroy(error);
    });

    return stream;
  }

  /**
   * Execute the streaming export to the provided stream.
   * Separated from streamExport to allow non-blocking return.
   */
  private async executeStreamExport(
    stream: PassThrough,
    dataSource: AsyncIterable<Record<string, unknown>>,
    columns: ColumnDefinition[],
  ): Promise<void> {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream,
      useStyles: true,
      useSharedStrings: false, // Faster for large files
    });

    const worksheet = workbook.addWorksheet("Export");

    // Set columns with proper widths
    worksheet.columns = columns.map((col) => ({
      header: col.label,
      key: col.key,
      width: this.getColumnWidth(col),
      style: this.getColumnStyle(col),
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" }, // Gray-200
    };
    headerRow.commit();

    // Enable auto-filter on header row
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    // Freeze header row
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // Stream rows with batched event loop yielding
    let rowCount = 0;
    for await (const row of dataSource) {
      const values = columns.map((col) =>
        this.formatCellValue(row[col.key], col),
      );
      worksheet.addRow(values).commit(); // commit() is critical for streaming
      rowCount++;

      // Yield to event loop every batch to prevent blocking
      if (rowCount % this.BATCH_SIZE === 0) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    await worksheet.commit();
    await workbook.commit();

    this.logger.log(`Streamed ${rowCount} rows to Excel`);
  }

  /**
   * Generate Excel buffer for smaller exports (<10k rows).
   * Faster for small datasets, includes more formatting.
   *
   * Key features:
   * - Full in-memory workbook for rich formatting
   * - Conditional formatting for status columns
   * - Creator metadata
   *
   * @param rows - Array of row data
   * @param columns - Column definitions
   * @param options - Excel generation options
   * @returns Buffer containing complete Excel file
   */
  async generateBuffer(
    rows: Record<string, unknown>[],
    columns: ColumnDefinition[],
    options?: ExcelOptions,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Set metadata
    if (options?.includeMetadata !== false) {
      workbook.creator = "Ethico Risk Intelligence Platform";
      workbook.created = new Date();
    }

    const worksheet = workbook.addWorksheet(options?.sheetName || "Export");

    // Set columns with widths
    worksheet.columns = columns.map((col) => ({
      header: col.label,
      key: col.key,
      width: this.getColumnWidth(col),
    }));

    // Add all rows
    rows.forEach((row) => {
      const values = columns.map((col) =>
        this.formatCellValue(row[col.key], col),
      );
      worksheet.addRow(values);
    });

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" }, // Gray-200
    };
    headerRow.border = {
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } }, // Gray-300
    };

    // Auto-filter on header row
    const lastCol = this.getColumnLetter(columns.length);
    worksheet.autoFilter = { from: "A1", to: `${lastCol}1` };

    // Freeze header row
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // Apply conditional formatting for status columns
    columns.forEach((col, idx) => {
      if (col.type === "string" && col.key.includes("status")) {
        this.applyStatusFormatting(worksheet, idx + 1, rows.length + 1);
      }
    });

    // Apply column-specific number formats
    columns.forEach((col, idx) => {
      const colNum = idx + 1;
      const excelCol = worksheet.getColumn(colNum);
      const numFmt = this.getNumFmt(col);
      if (numFmt) {
        excelCol.numFmt = numFmt;
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Generated Excel buffer: ${rows.length} rows`);

    return Buffer.from(buffer);
  }

  /**
   * Get column width based on type and label.
   */
  private getColumnWidth(col: ColumnDefinition): number {
    if (col.width) return col.width;

    switch (col.type) {
      case "date":
        return 12;
      case "boolean":
        return 10;
      case "currency":
        return 15;
      case "percentage":
        return 12;
      case "number":
        return 12;
      default:
        // Calculate based on label length, capped
        return Math.min(50, Math.max(10, col.label.length + 5));
    }
  }

  /**
   * Get column style for ExcelJS column definition.
   */
  private getColumnStyle(col: ColumnDefinition): Partial<ExcelJS.Column> {
    const numFmt = this.getNumFmt(col);
    if (numFmt) {
      return { numFmt } as Partial<ExcelJS.Column>;
    }
    return {};
  }

  /**
   * Get Excel number format string for column type.
   */
  private getNumFmt(col: ColumnDefinition): string | undefined {
    switch (col.type) {
      case "date":
        return col.format || "YYYY-MM-DD";
      case "currency":
        return col.format || '"$"#,##0.00';
      case "percentage":
        return col.format || "0.0%";
      case "number":
        return "#,##0";
      default:
        return undefined;
    }
  }

  /**
   * Format cell value based on column type.
   */
  private formatCellValue(
    value: unknown,
    col: ColumnDefinition,
  ): string | number | boolean | Date | null {
    if (value === null || value === undefined) {
      return null;
    }

    switch (col.type) {
      case "date":
        if (value instanceof Date) {
          return value;
        }
        // Parse ISO string to Date for Excel date formatting
        const date = new Date(value as string);
        return isNaN(date.getTime()) ? String(value) : date;

      case "boolean":
        return Boolean(value) ? "Yes" : "No";

      case "currency":
      case "percentage":
      case "number":
        if (typeof value === "number") {
          return value;
        }
        const num = parseFloat(String(value));
        return isNaN(num) ? 0 : num;

      default:
        return String(value);
    }
  }

  /**
   * Apply conditional formatting for status columns.
   * Highlights rows based on status values with color coding.
   *
   * Note: Conditional formatting uses ExcelJS internal types that vary by version.
   * This method safely applies formatting or logs if types change.
   */
  private applyStatusFormatting(
    worksheet: ExcelJS.Worksheet,
    colNum: number,
    maxRow: number,
  ): void {
    const colLetter = this.getColumnLetter(colNum);
    const ref = `${colLetter}2:${colLetter}${maxRow}`;

    try {
      this.STATUS_FORMATS.forEach((format) => {
        // Use type assertion for ExcelJS conditional formatting API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        worksheet.addConditionalFormatting({
          ref,
          rules: [
            {
              type: "containsText",
              operator: "containsText",
              text: format.text,
              style: {
                fill: {
                  type: "pattern",
                  pattern: "solid",
                  bgColor: { argb: format.bgColor },
                },
              },
            } as ExcelJS.ConditionalFormattingRule,
          ],
        });
      });
    } catch (error) {
      // Conditional formatting is optional enhancement - log and continue
      this.logger.warn(
        `Could not apply conditional formatting: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Convert column number to Excel column letter (1=A, 26=Z, 27=AA).
   */
  private getColumnLetter(colNum: number): string {
    let letter = "";
    let num = colNum;

    while (num > 0) {
      const mod = (num - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      num = Math.floor((num - 1) / 26);
    }

    return letter;
  }
}
