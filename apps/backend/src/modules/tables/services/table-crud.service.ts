import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
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
  ShareTableDto,
  CloneTableDto,
  TableQueryDto,
} from "../dto";
import { TableScheduleConfig } from "../types/table.types";

/**
 * TableCrudService handles table create, read, update, delete operations.
 *
 * Responsibilities:
 * - Create tables from builder or AI-generated prompts
 * - Update table definitions (columns, filters, etc.)
 * - Soft-delete tables
 * - Clone tables with new ownership
 * - Manage sharing and visibility settings
 * - List tables with permission filtering
 * - Audit logging for all mutations
 */
@Injectable()
export class TableCrudService {
  private readonly logger = new Logger(TableCrudService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new user data table.
   */
  async create(
    dto: CreateTableDto,
    userId: string,
    organizationId: string,
    calculateNextRun: (config: TableScheduleConfig) => Date,
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
          ? calculateNextRun(dto.scheduleConfig)
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
   * Note: Scheduled job removal must be handled by caller.
   */
  async delete(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<UserDataTable> {
    const table = await this.findByIdWithPermissionCheck(
      id,
      userId,
      organizationId,
      "edit",
    );

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

    return table;
  }

  /**
   * Find table by ID with permission check.
   */
  async findByIdWithPermissionCheck(
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
}
