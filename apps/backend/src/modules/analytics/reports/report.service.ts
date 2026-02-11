/**
 * ReportService - CRUD operations for saved reports
 *
 * Manages the lifecycle of saved report configurations:
 * - Create, read, update, delete reports
 * - Run reports against the database
 * - Duplicate reports
 * - Toggle favorites
 * - List templates
 *
 * All operations enforce tenant isolation via organizationId.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  Prisma,
  UserRole,
} from "@prisma/client";
import {
  ReportExecutionService,
  ReportConfig,
  ReportResult,
  ReportFilter,
} from "./report-execution.service";
import {
  CreateReportDto,
  UpdateReportDto,
  RunReportDto,
} from "./dto/report.dto";
import {
  ReportFilterGroup,
  ReportFilterCondition,
  isFilterCondition,
} from "./entities/saved-report.entity";

/**
 * Valid entity types for reports
 */
const VALID_ENTITY_TYPES = [
  "cases",
  "rius",
  "persons",
  "campaigns",
  "policies",
  "disclosures",
  "investigations",
];

/**
 * SavedReport type from Prisma
 */
interface SavedReport {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  entityType: string;
  columns: Prisma.JsonValue;
  filters: Prisma.JsonValue;
  groupBy: Prisma.JsonValue | null;
  aggregation: Prisma.JsonValue | null;
  visualization: string;
  chartConfig: Prisma.JsonValue | null;
  sortBy: string | null;
  sortOrder: string | null;
  isTemplate: boolean;
  templateCategory: string | null;
  visibility: string;
  lastRunAt: Date | null;
  lastRunDuration: number | null;
  lastRunRowCount: number | null;
  isFavorite: boolean;
  scheduledExportId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
}

/**
 * Query options for listing reports
 */
interface ListReportsQuery {
  visibility?: string;
  isTemplate?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly reportExecutionService: ReportExecutionService,
  ) {}

  /**
   * Create a new saved report.
   *
   * @param organizationId Tenant ID
   * @param userId Creator's user ID
   * @param dto Report creation data
   * @returns Created SavedReport
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreateReportDto,
  ): Promise<SavedReport> {
    // Validate entity type
    if (!VALID_ENTITY_TYPES.includes(dto.entityType)) {
      throw new BadRequestException(
        `Invalid entity type: ${dto.entityType}. Allowed: ${VALID_ENTITY_TYPES.join(", ")}`,
      );
    }

    const report = await this.prisma.savedReport.create({
      data: {
        organizationId,
        createdById: userId,
        name: dto.name,
        description: dto.description || null,
        entityType: dto.entityType,
        columns: JSON.parse(JSON.stringify(dto.columns)),
        filters: dto.filters ? JSON.parse(JSON.stringify(dto.filters)) : [],
        groupBy: dto.groupBy
          ? JSON.parse(JSON.stringify(dto.groupBy))
          : Prisma.JsonNull,
        aggregation: dto.aggregation
          ? JSON.parse(JSON.stringify(dto.aggregation))
          : Prisma.JsonNull,
        visualization: dto.visualization || "table",
        chartConfig: dto.chartConfig
          ? JSON.parse(JSON.stringify(dto.chartConfig))
          : Prisma.JsonNull,
        sortBy: dto.sortBy || null,
        sortOrder: dto.sortOrder || null,
        isTemplate: dto.isTemplate || false,
        templateCategory: dto.templateCategory || null,
        visibility: dto.visibility || "PRIVATE",
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.REPORT,
      entityId: report.id,
      action: "created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Created report '${dto.name}' for ${dto.entityType}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.logger.log(
      `Created report ${report.id} '${dto.name}' for org ${organizationId}`,
    );

    return report;
  }

  /**
   * List reports with filtering and pagination.
   *
   * Filter logic:
   * - PRIVATE: Only creator's reports
   * - TEAM/EVERYONE: Reports visible to the organization
   * - Templates: isTemplate = true (accessible to all in org)
   *
   * @param organizationId Tenant ID
   * @param userId Current user ID
   * @param query Filter and pagination options
   * @returns Paginated list of reports
   */
  async findAll(
    organizationId: string,
    userId: string,
    query: ListReportsQuery = {},
  ): Promise<{ data: SavedReport[]; total: number }> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.SavedReportWhereInput = {
      organizationId,
    };

    // Filter by template status
    if (query.isTemplate !== undefined) {
      where.isTemplate = query.isTemplate;
    }

    // Filter by visibility
    if (query.visibility) {
      if (query.visibility === "PRIVATE") {
        // Only show creator's private reports
        where.visibility = "PRIVATE";
        where.createdById = userId;
      } else {
        // Show TEAM or EVERYONE reports (visible to org)
        where.visibility = { in: ["TEAM", "EVERYONE"] };
      }
    } else {
      // Default: show user's reports + shared reports
      where.OR = [
        { createdById: userId },
        { visibility: { in: ["TEAM", "EVERYONE"] } },
      ];
    }

    // Search by name or description
    if (query.search) {
      const searchTerm = query.search;
      where.OR = [
        ...(where.OR || []),
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.savedReport.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
        include: {
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.savedReport.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get a single report by ID.
   *
   * @param organizationId Tenant ID
   * @param reportId Report ID
   * @returns SavedReport or null
   */
  async findOne(
    organizationId: string,
    reportId: string,
  ): Promise<SavedReport | null> {
    return this.prisma.savedReport.findFirst({
      where: {
        id: reportId,
        organizationId,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Update a saved report.
   * Only creator or SYSTEM_ADMIN can update.
   *
   * @param organizationId Tenant ID
   * @param userId Current user ID
   * @param reportId Report ID
   * @param dto Update data
   * @param userRole User's role for permission check
   * @returns Updated SavedReport
   */
  async update(
    organizationId: string,
    userId: string,
    reportId: string,
    dto: UpdateReportDto,
    userRole?: UserRole,
  ): Promise<SavedReport> {
    const existing = await this.findOne(organizationId, reportId);
    if (!existing) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    // Check permissions: only creator or SYSTEM_ADMIN can update
    if (
      existing.createdById !== userId &&
      userRole !== UserRole.SYSTEM_ADMIN
    ) {
      throw new ForbiddenException("Only the report creator can update it");
    }

    // Validate entity type if provided
    if (dto.entityType && !VALID_ENTITY_TYPES.includes(dto.entityType)) {
      throw new BadRequestException(
        `Invalid entity type: ${dto.entityType}. Allowed: ${VALID_ENTITY_TYPES.join(", ")}`,
      );
    }

    // Build update data object - use explicit type to avoid spread issues
    const updateData: Prisma.SavedReportUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined)
      updateData.description = dto.description || null;
    if (dto.entityType !== undefined) updateData.entityType = dto.entityType;
    if (dto.columns !== undefined)
      updateData.columns = JSON.parse(JSON.stringify(dto.columns));
    if (dto.filters !== undefined)
      updateData.filters = dto.filters
        ? JSON.parse(JSON.stringify(dto.filters))
        : [];
    if (dto.groupBy !== undefined)
      updateData.groupBy = dto.groupBy
        ? JSON.parse(JSON.stringify(dto.groupBy))
        : Prisma.JsonNull;
    if (dto.aggregation !== undefined)
      updateData.aggregation = dto.aggregation
        ? JSON.parse(JSON.stringify(dto.aggregation))
        : Prisma.JsonNull;
    if (dto.visualization !== undefined)
      updateData.visualization = dto.visualization;
    if (dto.chartConfig !== undefined)
      updateData.chartConfig = dto.chartConfig
        ? JSON.parse(JSON.stringify(dto.chartConfig))
        : Prisma.JsonNull;
    if (dto.sortBy !== undefined) updateData.sortBy = dto.sortBy || null;
    if (dto.sortOrder !== undefined)
      updateData.sortOrder = dto.sortOrder || null;
    if (dto.isTemplate !== undefined) updateData.isTemplate = dto.isTemplate;
    if (dto.templateCategory !== undefined)
      updateData.templateCategory = dto.templateCategory || null;
    if (dto.visibility !== undefined) updateData.visibility = dto.visibility;
    if (dto.isFavorite !== undefined) updateData.isFavorite = dto.isFavorite;

    const report = await this.prisma.savedReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.REPORT,
      entityId: reportId,
      action: "updated",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Updated report '${report.name}'`,
      actorUserId: userId,
      actorType: ActorType.USER,
      changes: this.computeChanges(dto, existing),
    });

    this.logger.log(`Updated report ${reportId} '${report.name}'`);

    return report;
  }

  /**
   * Delete a saved report.
   * Only creator or SYSTEM_ADMIN can delete.
   *
   * @param organizationId Tenant ID
   * @param userId Current user ID
   * @param reportId Report ID
   * @param userRole User's role for permission check
   */
  async delete(
    organizationId: string,
    userId: string,
    reportId: string,
    userRole?: UserRole,
  ): Promise<void> {
    const existing = await this.findOne(organizationId, reportId);
    if (!existing) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    // Check permissions: only creator or SYSTEM_ADMIN can delete
    if (
      existing.createdById !== userId &&
      userRole !== UserRole.SYSTEM_ADMIN
    ) {
      throw new ForbiddenException("Only the report creator can delete it");
    }

    await this.prisma.savedReport.delete({
      where: { id: reportId },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.REPORT,
      entityId: reportId,
      action: "deleted",
      actionCategory: AuditActionCategory.DELETE,
      actionDescription: `Deleted report '${existing.name}'`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.logger.log(`Deleted report ${reportId} '${existing.name}'`);
  }

  /**
   * Run a saved report and return results.
   * Updates lastRunAt, lastRunDuration, lastRunRowCount.
   *
   * @param organizationId Tenant ID
   * @param reportId Report ID
   * @param options Optional run overrides
   * @returns Report execution results
   */
  async run(
    organizationId: string,
    reportId: string,
    options?: RunReportDto,
  ): Promise<ReportResult> {
    const report = await this.findOne(organizationId, reportId);
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    const startTime = Date.now();

    // Build config from saved report
    const config: ReportConfig = {
      entityType: report.entityType,
      columns: report.columns as string[],
      filters: this.flattenFilters(
        options?.overrideFilters
          ? (options.overrideFilters as unknown as ReportFilterGroup[])
          : (report.filters as unknown as ReportFilterGroup[]),
      ),
      groupBy: report.groupBy as string[] | undefined,
      aggregation: this.mapAggregation(report.aggregation),
      sortBy: report.sortBy || undefined,
      sortOrder: (report.sortOrder as "asc" | "desc") || undefined,
      limit: options?.limit || 1000,
      offset: options?.offset || 0,
    };

    // Add date range filters if provided
    if (options?.dateRangeStart || options?.dateRangeEnd) {
      const dateFilter: ReportFilter = {
        field: "createdAt",
        operator: "between",
        value: options.dateRangeStart
          ? new Date(options.dateRangeStart)
          : new Date(0),
        valueTo: options.dateRangeEnd
          ? new Date(options.dateRangeEnd)
          : new Date(),
      };
      config.filters.push(dateFilter);
    }

    // Execute the report
    const result = await this.reportExecutionService.runReport(
      config,
      organizationId,
    );

    const duration = Date.now() - startTime;

    // Update run statistics
    await this.prisma.savedReport.update({
      where: { id: reportId },
      data: {
        lastRunAt: new Date(),
        lastRunDuration: duration,
        lastRunRowCount: result.totalCount,
      },
    });

    this.logger.log(
      `Ran report ${reportId} '${report.name}': ${result.totalCount} rows in ${duration}ms`,
    );

    return result;
  }

  /**
   * Duplicate a saved report.
   * Creates a copy with "{original} (Copy)" name, PRIVATE visibility, new creator.
   *
   * @param organizationId Tenant ID
   * @param userId New creator's user ID
   * @param reportId Report ID to duplicate
   * @returns Duplicated SavedReport
   */
  async duplicate(
    organizationId: string,
    userId: string,
    reportId: string,
  ): Promise<SavedReport> {
    const original = await this.findOne(organizationId, reportId);
    if (!original) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    const report = await this.prisma.savedReport.create({
      data: {
        organizationId,
        createdById: userId,
        name: `${original.name} (Copy)`,
        description: original.description,
        entityType: original.entityType,
        columns: JSON.parse(JSON.stringify(original.columns)),
        filters: JSON.parse(JSON.stringify(original.filters)),
        groupBy: original.groupBy
          ? JSON.parse(JSON.stringify(original.groupBy))
          : Prisma.JsonNull,
        aggregation: original.aggregation
          ? JSON.parse(JSON.stringify(original.aggregation))
          : Prisma.JsonNull,
        visualization: original.visualization,
        chartConfig: original.chartConfig
          ? JSON.parse(JSON.stringify(original.chartConfig))
          : Prisma.JsonNull,
        sortBy: original.sortBy,
        sortOrder: original.sortOrder,
        isTemplate: false, // Duplicates are not templates
        templateCategory: null,
        visibility: "PRIVATE", // Duplicates start as private
        isFavorite: false,
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.REPORT,
      entityId: report.id,
      action: "duplicated",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Duplicated report '${original.name}' as '${report.name}'`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: { originalReportId: reportId },
    });

    this.logger.log(
      `Duplicated report ${reportId} -> ${report.id} '${report.name}'`,
    );

    return report;
  }

  /**
   * Toggle the favorite status of a report.
   *
   * @param organizationId Tenant ID
   * @param userId User ID (only tracks favorites for the user context)
   * @param reportId Report ID
   * @returns Updated favorite status
   */
  async toggleFavorite(
    organizationId: string,
    userId: string,
    reportId: string,
  ): Promise<{ isFavorite: boolean }> {
    const report = await this.findOne(organizationId, reportId);
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    const newFavorite = !report.isFavorite;

    await this.prisma.savedReport.update({
      where: { id: reportId },
      data: { isFavorite: newFavorite },
    });

    this.logger.debug(
      `Toggled favorite for report ${reportId}: ${newFavorite}`,
    );

    return { isFavorite: newFavorite };
  }

  /**
   * Get all report templates for an organization.
   * Includes org templates and system templates (createdById is null for system).
   *
   * @param organizationId Tenant ID
   * @returns List of template reports
   */
  async getTemplates(organizationId: string): Promise<SavedReport[]> {
    return this.prisma.savedReport.findMany({
      where: {
        isTemplate: true,
        OR: [
          { organizationId }, // Org-specific templates
          // System templates would have a special marker if we add them
        ],
      },
      orderBy: [{ templateCategory: "asc" }, { name: "asc" }],
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Compute changes between DTO and existing report for audit logging.
   */
  private computeChanges(
    dto: UpdateReportDto,
    existing: SavedReport,
  ): Record<string, { old: unknown; new: unknown }> {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const existingObj = existing as unknown as Record<string, unknown>;

    for (const key of Object.keys(dto)) {
      const dtoValue = (dto as Record<string, unknown>)[key];
      const existingValue = existingObj[key];
      if (dtoValue !== existingValue) {
        changes[key] = { old: existingValue, new: dtoValue };
      }
    }

    return changes;
  }

  /**
   * Flatten nested filter groups into flat filter array.
   * Converts ReportFilterGroup[] to ReportFilter[] for execution.
   */
  private flattenFilters(
    filterGroups: ReportFilterGroup[] | unknown[],
  ): ReportFilter[] {
    const filters: ReportFilter[] = [];

    if (!filterGroups || !Array.isArray(filterGroups)) {
      return filters;
    }

    const processGroup = (group: ReportFilterGroup | unknown) => {
      if (!group || typeof group !== "object") return;

      const typedGroup = group as ReportFilterGroup;
      if (typedGroup.conditions) {
        for (const item of typedGroup.conditions) {
          if (
            isFilterCondition(item as ReportFilterCondition | ReportFilterGroup)
          ) {
            const condition = item as ReportFilterCondition;
            filters.push({
              field: condition.field,
              operator: condition.operator as ReportFilter["operator"],
              value: condition.value,
              valueTo: condition.valueTo,
            });
          } else {
            // Nested group
            processGroup(item);
          }
        }
      }
    };

    for (const group of filterGroups) {
      processGroup(group);
    }

    return filters;
  }

  /**
   * Map saved aggregation config to execution format.
   */
  private mapAggregation(
    aggregation: Prisma.JsonValue | null,
  ):
    | {
        function: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
        field?: string;
      }
    | undefined {
    if (!aggregation) return undefined;

    // Handle array of aggregations - take the first one
    const aggs = aggregation as Array<{
      function: string;
      field?: string;
    }>;
    if (!Array.isArray(aggs) || aggs.length === 0) return undefined;

    const firstAgg = aggs[0];
    return {
      function: firstAgg.function.toUpperCase() as
        | "COUNT"
        | "SUM"
        | "AVG"
        | "MIN"
        | "MAX",
      field: firstAgg.field,
    };
  }
}
