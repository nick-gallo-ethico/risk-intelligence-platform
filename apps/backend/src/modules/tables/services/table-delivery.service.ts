import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import {
  UserDataTable,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  Prisma,
} from "@prisma/client";
import { ScheduleTableDto } from "../dto";
import { TableScheduleConfig, TableColumn } from "../types/table.types";

/** Queue name for scheduled table delivery */
export const TABLE_DELIVERY_QUEUE = "table-delivery";

/**
 * TableDeliveryService handles scheduled table email delivery.
 *
 * Responsibilities:
 * - Calculate next scheduled run times
 * - Create/remove BullMQ repeatable jobs
 * - Configure scheduled delivery settings
 * - Generate CSV and Excel exports for delivery
 */
@Injectable()
export class TableDeliveryService {
  private readonly logger = new Logger(TableDeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @InjectQueue(TABLE_DELIVERY_QUEUE) private deliveryQueue: Queue,
  ) {}

  /**
   * Configure scheduled delivery for a table.
   */
  async schedule(
    tableId: string,
    table: UserDataTable,
    dto: ScheduleTableDto,
    userId: string,
    organizationId: string,
  ): Promise<UserDataTable> {
    const nextRun = this.calculateNextRun(dto.config);

    const updated = await this.prisma.userDataTable.update({
      where: { id: tableId },
      data: {
        scheduleConfig: dto.config as unknown as Prisma.InputJsonValue,
        nextScheduledRun: nextRun,
      },
    });

    // Remove existing job and create new one
    await this.removeScheduledJob(tableId);
    await this.createScheduledJob(updated);

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.USER_DATA_TABLE,
      entityId: tableId,
      action: "table_scheduled",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Scheduled ${dto.config.frequency} delivery for table "${table.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: {
        frequency: dto.config.frequency,
        recipients: dto.config.recipients.length,
      },
    });

    return updated;
  }

  /**
   * Create initial scheduled job for a newly created table.
   */
  async createScheduledJobForTable(table: UserDataTable): Promise<void> {
    if (table.scheduleConfig && table.nextScheduledRun) {
      await this.createScheduledJob(table);
    }
  }

  /**
   * Remove scheduled job when table is deleted.
   */
  async removeScheduledJobForTable(tableId: string): Promise<void> {
    await this.removeScheduledJob(tableId);
  }

  /**
   * Calculate next scheduled run time.
   */
  calculateNextRun(config: TableScheduleConfig): Date {
    const now = new Date();
    const [hours, minutes] = (config.time || "08:00").split(":").map(Number);

    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    // If time has passed today, move to next occurrence
    if (next <= now) {
      switch (config.frequency) {
        case "daily":
          next.setDate(next.getDate() + 1);
          break;
        case "weekly":
          const targetDay = config.dayOfWeek ?? 1; // Monday default
          let daysUntil = targetDay - now.getDay();
          if (daysUntil <= 0) daysUntil += 7;
          next.setDate(next.getDate() + daysUntil);
          break;
        case "monthly":
          const targetDate = config.dayOfMonth ?? 1;
          next.setMonth(next.getMonth() + 1);
          next.setDate(targetDate);
          break;
      }
    }

    return next;
  }

  /**
   * Generate CSV content from data.
   */
  generateCsv(data: Record<string, unknown>[], columns: TableColumn[]): string {
    const headers = columns
      .map((c) => `"${c.label.replace(/"/g, '""')}"`)
      .join(",");

    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col.field];
          if (value === null || value === undefined) return "";
          if (typeof value === "string") {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        })
        .join(","),
    );

    return [headers, ...rows].join("\n");
  }

  /**
   * Generate Excel buffer from data.
   */
  async generateExcel(
    data: Record<string, unknown>[],
    columns: TableColumn[],
    sheetName: string,
  ): Promise<Buffer> {
    // Dynamic import to avoid loading ExcelJS unless needed
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ethico Risk Intelligence Platform";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName.substring(0, 31)); // Excel sheet name max 31 chars

    // Add header row
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

    // Add data rows
    for (const row of data) {
      const rowData: Record<string, unknown> = {};
      for (const col of columns) {
        rowData[col.field] = row[col.field];
      }
      worksheet.addRow(rowData);
    }

    // Auto-filter
    if (data.length > 0) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length },
      };
    }

    // Freeze header
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Create BullMQ repeatable job for scheduled delivery.
   */
  private async createScheduledJob(table: UserDataTable): Promise<void> {
    if (!table.scheduleConfig || !table.nextScheduledRun) return;

    const config = table.scheduleConfig as unknown as TableScheduleConfig;

    // Calculate repeat pattern
    let pattern: string;
    switch (config.frequency) {
      case "daily":
        pattern = `0 ${config.time?.split(":")[1] || "0"} ${config.time?.split(":")[0] || "8"} * * *`;
        break;
      case "weekly":
        pattern = `0 ${config.time?.split(":")[1] || "0"} ${config.time?.split(":")[0] || "8"} * * ${config.dayOfWeek ?? 1}`;
        break;
      case "monthly":
        pattern = `0 ${config.time?.split(":")[1] || "0"} ${config.time?.split(":")[0] || "8"} ${config.dayOfMonth ?? 1} * *`;
        break;
    }

    await this.deliveryQueue.add(
      "deliver-table",
      {
        tableId: table.id,
        organizationId: table.organizationId,
        recipients: config.recipients,
        format: config.format,
      },
      {
        jobId: `table-${table.id}`,
        repeat: { pattern },
      },
    );

    this.logger.log(
      `Created scheduled job for table ${table.id} with pattern ${pattern}`,
    );
  }

  /**
   * Remove scheduled job for a table.
   */
  private async removeScheduledJob(tableId: string): Promise<void> {
    try {
      await this.deliveryQueue.removeRepeatableByKey(`table-${tableId}`);
    } catch {
      // Job may not exist, which is fine
      this.logger.debug(`No existing job to remove for table ${tableId}`);
    }
  }
}
