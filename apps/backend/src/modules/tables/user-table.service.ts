import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ExportService } from "../reporting/export.service";
import {
  UserDataTable,
  TableCreationMethod,
  TableVisibility,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  Prisma,
} from "@prisma/client";
import {
  CreateTableDto,
  UpdateTableDto,
  ScheduleTableDto,
  ShareTableDto,
  CloneTableDto,
  TableQueryDto,
  ExportTableDto,
} from "./dto";
import {
  TableColumn,
  TableFilterCriteria,
  TableQueryResult,
  TableScheduleConfig,
  TableDataSource,
} from "./types/table.types";

// Queue name for scheduled table delivery
export const TABLE_DELIVERY_QUEUE = "table-delivery";

/**
 * UserTableService
 *
 * Manages user-created custom data tables (RS.48).
 *
 * Features:
 * - Dual-path creation: manual builder or AI-generated
 * - Multi-source data queries with filters and aggregates
 * - Table pinning to dashboards/views/reports
 * - Scheduled email delivery (CSV, Excel, PDF)
 * - Visibility controls (private, team, org-wide)
 */
@Injectable()
export class UserTableService {
  private readonly logger = new Logger(UserTableService.name);

  // Map string data sources to Prisma model names
  private readonly dataSourceModelMap: Record<TableDataSource, string> = {
    cases: "case",
    investigations: "investigation",
    rius: "riskIntelligenceUnit",
    campaigns: "campaign",
    campaign_assignments: "campaignAssignment",
    disclosures: "formSubmission",
    employees: "employee",
    persons: "person",
    users: "user",
    audit_logs: "auditLog",
  };

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private exportService: ExportService,
    @InjectQueue(TABLE_DELIVERY_QUEUE) private deliveryQueue: Queue,
  ) {}

  /**
   * Create a new user data table.
   */
  async create(
    dto: CreateTableDto,
    userId: string,
    organizationId: string,
  ): Promise<UserDataTable> {
    // Determine creation method
    const createdVia = dto.aiPrompt
      ? TableCreationMethod.AI_GENERATED
      : dto.createdVia || TableCreationMethod.BUILDER;

    const table = await this.prisma.userDataTable.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        createdVia,
        aiPrompt: dto.aiPrompt,
        createdById: userId,
        dataSources: dto.dataSources,
        columns: dto.columns as unknown as Prisma.InputJsonValue,
        filters: (dto.filters || []) as unknown as Prisma.InputJsonValue,
        groupBy: dto.groupBy || [],
        aggregates: (dto.aggregates || []) as unknown as Prisma.InputJsonValue,
        sortBy: (dto.sortBy || []) as unknown as Prisma.InputJsonValue,
        destinations: (dto.destinations ||
          []) as unknown as Prisma.InputJsonValue,
        visibility: dto.visibility || TableVisibility.PRIVATE,
        sharedWithTeams: dto.sharedWithTeams || [],
        sharedWithUsers: dto.sharedWithUsers || [],
        scheduleConfig: dto.scheduleConfig as unknown as Prisma.InputJsonValue,
        nextScheduledRun: dto.scheduleConfig
          ? this.calculateNextRun(dto.scheduleConfig)
          : null,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.USER_DATA_TABLE,
      entityId: table.id,
      action: "table_created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Created data table "${dto.name}" via ${createdVia.toLowerCase()}`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: { createdVia, dataSources: dto.dataSources },
    });

    // If scheduled, create repeatable job
    if (dto.scheduleConfig) {
      await this.createScheduledJob(table);
    }

    return table;
  }

  /**
   * Update an existing table definition.
   */
  async update(
    id: string,
    dto: UpdateTableDto,
    userId: string,
    organizationId: string,
  ): Promise<UserDataTable> {
    const existing = await this.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "edit",
    );

    const updateData: Prisma.UserDataTableUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.dataSources !== undefined) updateData.dataSources = dto.dataSources;
    if (dto.columns !== undefined)
      updateData.columns = dto.columns as unknown as Prisma.InputJsonValue;
    if (dto.filters !== undefined)
      updateData.filters = dto.filters as unknown as Prisma.InputJsonValue;
    if (dto.groupBy !== undefined) updateData.groupBy = dto.groupBy;
    if (dto.aggregates !== undefined)
      updateData.aggregates =
        dto.aggregates as unknown as Prisma.InputJsonValue;
    if (dto.sortBy !== undefined)
      updateData.sortBy = dto.sortBy as unknown as Prisma.InputJsonValue;
    if (dto.destinations !== undefined)
      updateData.destinations =
        dto.destinations as unknown as Prisma.InputJsonValue;

    // Clear cached results on definition change
    updateData.cachedResults = Prisma.JsonNull;
    updateData.cacheExpiresAt = null;

    const table = await this.prisma.userDataTable.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.USER_DATA_TABLE,
      entityId: table.id,
      action: "table_updated",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Updated data table "${table.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return table;
  }

  /**
   * Execute the table query and return results.
   */
  async execute(
    id: string,
    userId: string,
    organizationId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<TableQueryResult> {
    const table = await this.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "view",
    );

    const columns = table.columns as unknown as TableColumn[];
    const filters = (table.filters as unknown as TableFilterCriteria[]) || [];
    const groupBy = table.groupBy || [];
    const sortBy =
      (table.sortBy as unknown as {
        field: string;
        direction: "asc" | "desc";
      }[]) || [];

    // Use first data source for now (multi-source joins are complex)
    const primarySource = table.dataSources[0] as TableDataSource;
    if (!primarySource) {
      throw new BadRequestException("No data source configured for table");
    }

    const modelName = this.dataSourceModelMap[primarySource];
    if (!modelName) {
      throw new BadRequestException(
        `Unsupported data source: ${primarySource}`,
      );
    }

    // Build query
    const where = this.buildWhereClause(organizationId, filters);
    const select = this.buildSelectClause(columns);
    const orderBy =
      sortBy.length > 0
        ? sortBy.map((s) => ({ [s.field]: s.direction }))
        : [{ createdAt: "desc" as const }];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (this.prisma as any)[modelName];

    if (!delegate) {
      throw new BadRequestException(`Model ${modelName} not found`);
    }

    // Execute query
    if (groupBy.length > 0) {
      // Aggregation query
      const result = await this.executeAggregationQuery(
        delegate,
        where,
        groupBy,
        table.aggregates as unknown as { field: string; function: string }[],
      );

      return {
        data: result,
        total: result.length,
        columns,
        aggregations: result,
      };
    }

    // Standard query with pagination
    const [data, total] = await Promise.all([
      delegate.findMany({
        where,
        select,
        orderBy,
        take: options?.limit || 100,
        skip: options?.offset || 0,
      }),
      delegate.count({ where }),
    ]);

    return { data, total, columns };
  }

  /**
   * Refresh table results and update cache.
   */
  async refresh(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<TableQueryResult> {
    const result = await this.execute(id, userId, organizationId);

    // Update cached results
    await this.prisma.userDataTable.update({
      where: { id },
      data: {
        cachedResults: result.data as unknown as Prisma.InputJsonValue,
        cacheExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min cache
        lastExecutedAt: new Date(),
      },
    });

    return result;
  }

  /**
   * Export table data to specified format.
   */
  async export(
    id: string,
    dto: ExportTableDto,
    userId: string,
    organizationId: string,
  ): Promise<{ buffer?: Buffer; content?: string; filename: string }> {
    const table = await this.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "view",
    );

    const result = await this.execute(id, userId, organizationId, {
      limit: 10000,
    });

    const filename =
      dto.filename ||
      `${table.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
    const columns = table.columns as unknown as TableColumn[];

    switch (dto.format) {
      case "csv":
        const csvContent = this.generateCsv(result.data, columns);
        return { content: csvContent, filename: `${filename}.csv` };

      case "excel":
        const excelBuffer = await this.generateExcel(
          result.data,
          columns,
          table.name,
        );
        return { buffer: excelBuffer, filename: `${filename}.xlsx` };

      case "pdf":
        // PDF generation would require additional library (e.g., puppeteer, pdfkit)
        // For now, fall back to Excel
        this.logger.warn(
          "PDF export not yet implemented, falling back to Excel",
        );
        const pdfBuffer = await this.generateExcel(
          result.data,
          columns,
          table.name,
        );
        return { buffer: pdfBuffer, filename: `${filename}.xlsx` };

      default:
        throw new BadRequestException(
          `Unsupported export format: ${dto.format}`,
        );
    }
  }

  /**
   * Configure scheduled delivery for a table.
   */
  async schedule(
    id: string,
    dto: ScheduleTableDto,
    userId: string,
    organizationId: string,
  ): Promise<UserDataTable> {
    const table = await this.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "edit",
    );

    const nextRun = this.calculateNextRun(dto.config);

    const updated = await this.prisma.userDataTable.update({
      where: { id },
      data: {
        scheduleConfig: dto.config as unknown as Prisma.InputJsonValue,
        nextScheduledRun: nextRun,
      },
    });

    // Remove existing job and create new one
    await this.removeScheduledJob(id);
    await this.createScheduledJob(updated);

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.USER_DATA_TABLE,
      entityId: table.id,
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
   * Update sharing settings for a table.
   */
  async share(
    id: string,
    dto: ShareTableDto,
    userId: string,
    organizationId: string,
  ): Promise<UserDataTable> {
    const table = await this.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "edit",
    );

    const updated = await this.prisma.userDataTable.update({
      where: { id },
      data: {
        visibility: dto.visibility,
        sharedWithTeams: dto.teamIds || [],
        sharedWithUsers: dto.userIds || [],
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.USER_DATA_TABLE,
      entityId: table.id,
      action: "table_shared",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Updated sharing for table "${table.name}" to ${dto.visibility}`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: { visibility: dto.visibility },
    });

    return updated;
  }

  /**
   * Clone a table with a new name.
   */
  async clone(
    id: string,
    dto: CloneTableDto,
    userId: string,
    organizationId: string,
  ): Promise<UserDataTable> {
    const original = await this.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "view",
    );

    const cloned = await this.prisma.userDataTable.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description || original.description,
        createdVia: TableCreationMethod.BUILDER, // Clones are manual
        aiPrompt: original.aiPrompt,
        createdById: userId,
        dataSources: original.dataSources,
        columns: original.columns as Prisma.InputJsonValue,
        filters: original.filters as Prisma.InputJsonValue,
        groupBy: original.groupBy,
        aggregates: original.aggregates as Prisma.InputJsonValue,
        sortBy: original.sortBy as Prisma.InputJsonValue,
        destinations: [], // Don't copy destinations
        visibility: TableVisibility.PRIVATE, // Clones start private
        sharedWithTeams: [],
        sharedWithUsers: [],
        scheduleConfig: Prisma.JsonNull, // Don't copy schedule
        nextScheduledRun: null,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.USER_DATA_TABLE,
      entityId: cloned.id,
      action: "table_cloned",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Cloned table "${original.name}" as "${dto.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: { sourceTableId: id },
    });

    return cloned;
  }

  /**
   * Get a table by ID.
   */
  async findById(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<UserDataTable> {
    return this.findByIdWithPermissionCheck(id, userId, organizationId, "view");
  }

  /**
   * List tables with visibility filtering.
   */
  async findMany(
    query: TableQueryDto,
    userId: string,
    organizationId: string,
  ): Promise<{ data: UserDataTable[]; total: number }> {
    const where: Prisma.UserDataTableWhereInput = {
      organizationId,
      deletedAt: null, // Exclude soft-deleted
      OR: [
        // User can see their own tables
        { createdById: userId },
        // Or TEAM tables they're part of
        { visibility: TableVisibility.TEAM, sharedWithUsers: { has: userId } },
        // Or ORG-wide tables
        { visibility: TableVisibility.ORG },
      ],
    };

    // Apply filters
    if (query.visibility) {
      where.visibility = query.visibility;
    }

    if (query.createdVia) {
      where.createdVia = query.createdVia;
    }

    if (query.search) {
      where.name = { contains: query.search, mode: "insensitive" };
    }

    // Filter by pinned destination (using string_contains for JSON array search)
    if (query.pinnedToType) {
      where.destinations = {
        string_contains: `"type":"${query.pinnedToType}"`,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.userDataTable.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: query.limit || 50,
        skip: query.offset || 0,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.userDataTable.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Soft delete a table.
   */
  async delete(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const table = await this.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "edit",
    );

    // Remove scheduled job if exists
    await this.removeScheduledJob(id);

    // Soft delete
    await this.prisma.userDataTable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.USER_DATA_TABLE,
      entityId: table.id,
      action: "table_deleted",
      actionCategory: AuditActionCategory.DELETE,
      actionDescription: `Deleted data table "${table.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });
  }

  // =====================
  // Private Helper Methods
  // =====================

  /**
   * Find table by ID with permission check.
   */
  private async findByIdWithPermissionCheck(
    id: string,
    userId: string,
    organizationId: string,
    action: "view" | "edit",
  ): Promise<UserDataTable> {
    const table = await this.prisma.userDataTable.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!table) {
      throw new NotFoundException(`Table with ID ${id} not found`);
    }

    // Check permission
    const canAccess = this.checkPermission(table, userId, action);
    if (!canAccess) {
      throw new ForbiddenException(
        `You do not have permission to ${action} this table`,
      );
    }

    return table;
  }

  /**
   * Check if user has permission to access table.
   */
  private checkPermission(
    table: UserDataTable,
    userId: string,
    action: "view" | "edit",
  ): boolean {
    // Creator always has full access
    if (table.createdById === userId) {
      return true;
    }

    // For edit actions, only creator can modify
    if (action === "edit") {
      return false;
    }

    // For view actions, check visibility
    switch (table.visibility) {
      case TableVisibility.PRIVATE:
        return false;

      case TableVisibility.TEAM:
        return (
          table.sharedWithUsers.includes(userId) ||
          table.sharedWithTeams.length > 0 // TODO: Check team membership
        );

      case TableVisibility.ORG:
        return true;

      default:
        return false;
    }
  }

  /**
   * Build Prisma where clause from filters.
   */
  private buildWhereClause(
    organizationId: string,
    filters: TableFilterCriteria[],
  ): Record<string, unknown> {
    const where: Record<string, unknown> = { organizationId };

    for (const filter of filters) {
      switch (filter.operator) {
        case "eq":
          where[filter.field] = filter.value;
          break;
        case "neq":
          where[filter.field] = { not: filter.value };
          break;
        case "gt":
          where[filter.field] = { gt: filter.value };
          break;
        case "gte":
          where[filter.field] = { gte: filter.value };
          break;
        case "lt":
          where[filter.field] = { lt: filter.value };
          break;
        case "lte":
          where[filter.field] = { lte: filter.value };
          break;
        case "in":
          where[filter.field] = { in: filter.value as unknown[] };
          break;
        case "contains":
          where[filter.field] = { contains: filter.value, mode: "insensitive" };
          break;
        case "between":
          const [min, max] = filter.value as [unknown, unknown];
          where[filter.field] = { gte: min, lte: max };
          break;
        case "isNull":
          where[filter.field] = null;
          break;
        case "isNotNull":
          where[filter.field] = { not: null };
          break;
      }
    }

    return where;
  }

  /**
   * Build Prisma select clause from columns.
   */
  private buildSelectClause(columns: TableColumn[]): Record<string, boolean> {
    const select: Record<string, boolean> = { id: true };

    for (const col of columns) {
      if (col.field.includes(".")) {
        // Handle nested fields
        const [relation] = col.field.split(".");
        select[relation] = true;
      } else {
        select[col.field] = true;
      }
    }

    return select;
  }

  /**
   * Execute aggregation query with groupBy.
   */
  private async executeAggregationQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delegate: any,
    where: Record<string, unknown>,
    groupBy: string[],
    aggregates?: { field: string; function: string }[],
  ): Promise<Record<string, unknown>[]> {
    const aggArgs: Record<string, unknown> = {};

    if (aggregates) {
      for (const agg of aggregates) {
        const key = `_${agg.function}`;
        if (!aggArgs[key]) {
          aggArgs[key] = {};
        }
        (aggArgs[key] as Record<string, boolean>)[agg.field] = true;
      }
    }

    // Always include count
    if (!aggArgs["_count"]) {
      aggArgs["_count"] = { _all: true };
    }

    return delegate.groupBy({
      by: groupBy,
      where,
      ...aggArgs,
    });
  }

  /**
   * Calculate next scheduled run time.
   */
  private calculateNextRun(config: TableScheduleConfig): Date {
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
    } catch (error) {
      // Job may not exist, which is fine
      this.logger.debug(`No existing job to remove for table ${tableId}`);
    }
  }

  /**
   * Generate CSV content from data.
   */
  private generateCsv(
    data: Record<string, unknown>[],
    columns: TableColumn[],
  ): string {
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
  private async generateExcel(
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
}
