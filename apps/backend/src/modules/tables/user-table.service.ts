import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { UserDataTable } from "@prisma/client";
import { TableCrudService } from "./services/table-crud.service";
import { TableQueryService } from "./services/table-query.service";
import {
  TableDeliveryService,
  TABLE_DELIVERY_QUEUE,
} from "./services/table-delivery.service";
import {
  CreateTableDto,
  UpdateTableDto,
  ScheduleTableDto,
  ShareTableDto,
  CloneTableDto,
  TableQueryDto,
  ExportTableDto,
} from "./dto";
import { TableQueryResult, TableColumn } from "./types/table.types";

// Re-export queue name for backward compatibility
export { TABLE_DELIVERY_QUEUE };

/**
 * UserTableService manages user-created custom data tables (RS.48).
 *
 * Features:
 * - Dual-path creation: manual builder or AI-generated
 * - Multi-source data queries with filters and aggregates
 * - Table pinning to dashboards/views/reports
 * - Scheduled email delivery (CSV, Excel, PDF)
 * - Visibility controls (private, team, org-wide)
 *
 * Architecture:
 * This is a thin coordinator service that delegates to focused sub-services:
 * - TableCrudService: CRUD operations and permission management
 * - TableQueryService: Query execution and result caching
 * - TableDeliveryService: Scheduled delivery and export generation
 */
@Injectable()
export class UserTableService {
  private readonly logger = new Logger(UserTableService.name);

  constructor(
    private readonly tableCrud: TableCrudService,
    private readonly tableQuery: TableQueryService,
    private readonly tableDelivery: TableDeliveryService,
  ) {}

  /**
   * Create a new user data table.
   */
  async create(
    dto: CreateTableDto,
    userId: string,
    organizationId: string,
  ): Promise<UserDataTable> {
    const table = await this.tableCrud.create(
      dto,
      userId,
      organizationId,
      (config) => this.tableDelivery.calculateNextRun(config),
    );

    // If scheduled, create repeatable job
    if (dto.scheduleConfig) {
      await this.tableDelivery.createScheduledJobForTable(table);
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
    return this.tableCrud.update(id, dto, userId, organizationId);
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
    const table = await this.tableCrud.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "view",
    );
    return this.tableQuery.execute(table, organizationId, options);
  }

  /**
   * Refresh table results and update cache.
   */
  async refresh(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<TableQueryResult> {
    const table = await this.tableCrud.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "view",
    );
    return this.tableQuery.refreshAndCache(id, table, organizationId);
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
    const table = await this.tableCrud.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "view",
    );

    const result = await this.tableQuery.execute(table, organizationId, {
      limit: 10000,
    });

    const filename =
      dto.filename ||
      `${table.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
    const columns = table.columns as unknown as TableColumn[];

    switch (dto.format) {
      case "csv":
        const csvContent = this.tableDelivery.generateCsv(result.data, columns);
        return { content: csvContent, filename: `${filename}.csv` };

      case "excel":
        const excelBuffer = await this.tableDelivery.generateExcel(
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
        const pdfBuffer = await this.tableDelivery.generateExcel(
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
    const table = await this.tableCrud.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "edit",
    );
    return this.tableDelivery.schedule(id, table, dto, userId, organizationId);
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
    return this.tableCrud.share(id, dto, userId, organizationId);
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
    return this.tableCrud.clone(id, dto, userId, organizationId);
  }

  /**
   * Get a table by ID.
   */
  async findById(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<UserDataTable> {
    return this.tableCrud.findById(id, userId, organizationId);
  }

  /**
   * List tables with visibility filtering.
   */
  async findMany(
    query: TableQueryDto,
    userId: string,
    organizationId: string,
  ): Promise<{ data: UserDataTable[]; total: number }> {
    return this.tableCrud.findMany(query, userId, organizationId);
  }

  /**
   * Soft delete a table.
   */
  async delete(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const table = await this.tableCrud.delete(id, userId, organizationId);
    // Remove scheduled job if exists
    await this.tableDelivery.removeScheduledJobForTable(table.id);
  }
}
