import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  ViewEntityType,
  Prisma,
  CaseStatus,
  Severity,
  RiuStatus,
  InvestigationStatus,
  SlaStatus,
} from "@prisma/client";
import {
  CreateSavedViewDto,
  UpdateSavedViewDto,
  SavedViewQueryDto,
  FilterCriteria,
  ApplyViewResponseDto,
} from "./dto/saved-view.dto";

/**
 * Valid enum values for filter validation by entity type.
 * Used to validate filter values against current database enums.
 */
const VALID_ENUMS: Record<string, Record<string, string[]>> = {
  CASES: {
    status: Object.values(CaseStatus),
    severity: Object.values(Severity),
  },
  RIUS: {
    status: Object.values(RiuStatus),
    severity: Object.values(Severity),
  },
  INVESTIGATIONS: {
    status: Object.values(InvestigationStatus),
    slaStatus: Object.values(SlaStatus),
  },
};

/**
 * Service for managing saved views.
 *
 * Saved views allow users to persist filter combinations, column layouts,
 * and sort preferences for quick access to frequently-used views.
 */
@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new saved view.
   *
   * - Validates filters against known enum values
   * - If setting as default, unsets other defaults for this entity type
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreateSavedViewDto,
  ) {
    // Validate filters against known enum values
    const { invalid } = this.validateFilters(dto.entityType, dto.filters);

    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid filter values: ${invalid.join(", ")}`,
      );
    }

    // If setting as default, unset other defaults for this entity type
    if (dto.isDefault) {
      await this.prisma.savedView.updateMany({
        where: {
          organizationId,
          createdById: userId,
          entityType: dto.entityType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.savedView.create({
      data: {
        organizationId,
        createdById: userId,
        name: dto.name,
        description: dto.description,
        entityType: dto.entityType,
        filters: dto.filters as Prisma.InputJsonValue,
        sortBy: dto.sortBy,
        sortOrder: dto.sortOrder,
        columns: dto.columns
          ? (dto.columns as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        isShared: dto.isShared || false,
        sharedWithTeamId: dto.sharedWithTeamId,
        isDefault: dto.isDefault || false,
        isPinned: dto.isPinned || false,
        color: dto.color,
      },
    });
  }

  /**
   * Finds a saved view by ID.
   * Users can access their own views or shared views.
   */
  async findById(organizationId: string, userId: string, id: string) {
    const view = await this.prisma.savedView.findFirst({
      where: {
        id,
        organizationId,
        OR: [{ createdById: userId }, { isShared: true }],
      },
    });

    if (!view) {
      throw new NotFoundException("Saved view not found");
    }

    return view;
  }

  /**
   * Lists all saved views accessible to the user.
   * Includes personal views and optionally shared views.
   * Groups views by entity type for frontend convenience.
   */
  async findAll(
    organizationId: string,
    userId: string,
    query: SavedViewQueryDto,
  ) {
    const where: Prisma.SavedViewWhereInput = {
      organizationId,
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.pinnedOnly && { isPinned: true }),
      OR: [
        { createdById: userId },
        ...(query.includeShared !== false ? [{ isShared: true }] : []),
      ],
    };

    const views = await this.prisma.savedView.findMany({
      where,
      orderBy: [
        { isPinned: "desc" },
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    });

    // Group by entity type for easier frontend consumption
    const grouped = views.reduce(
      (acc, view) => {
        const key = view.entityType;
        if (!acc[key]) acc[key] = [];
        acc[key].push(view);
        return acc;
      },
      {} as Record<string, typeof views>,
    );

    return {
      data: views,
      grouped,
      total: views.length,
    };
  }

  /**
   * Updates an existing saved view.
   * Only the owner can edit a view.
   */
  async update(
    organizationId: string,
    userId: string,
    id: string,
    dto: UpdateSavedViewDto,
  ) {
    const existing = await this.findById(organizationId, userId, id);

    // Only owner can edit
    if (existing.createdById !== userId) {
      throw new ForbiddenException("Cannot edit another user's view");
    }

    // Validate filters if provided
    if (dto.filters) {
      const { invalid } = this.validateFilters(existing.entityType, dto.filters);
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Invalid filter values: ${invalid.join(", ")}`,
        );
      }
    }

    // Handle default toggle
    if (dto.isDefault === true) {
      await this.prisma.savedView.updateMany({
        where: {
          organizationId,
          createdById: userId,
          entityType: existing.entityType,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.savedView.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.filters && {
          filters: dto.filters as Prisma.InputJsonValue,
        }),
        ...(dto.sortBy !== undefined && { sortBy: dto.sortBy }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.columns !== undefined && {
          columns: dto.columns
            ? (dto.columns as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        }),
        ...(dto.isShared !== undefined && { isShared: dto.isShared }),
        ...(dto.sharedWithTeamId !== undefined && {
          sharedWithTeamId: dto.sharedWithTeamId,
        }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
        ...(dto.displayOrder !== undefined && {
          displayOrder: dto.displayOrder,
        }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });
  }

  /**
   * Deletes a saved view.
   * Only the owner can delete a view.
   */
  async delete(organizationId: string, userId: string, id: string) {
    const existing = await this.findById(organizationId, userId, id);

    if (existing.createdById !== userId) {
      throw new ForbiddenException("Cannot delete another user's view");
    }

    await this.prisma.savedView.delete({ where: { id } });
  }

  /**
   * Applies a saved view and tracks usage.
   * Returns validated filters with any invalid filter keys noted.
   */
  async applyView(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<ApplyViewResponseDto> {
    const view = await this.findById(organizationId, userId, id);

    // Track usage
    await this.prisma.savedView.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        useCount: { increment: 1 },
      },
    });

    // Validate filters are still valid (enums may have changed)
    const filters = view.filters as FilterCriteria;
    const { valid, invalid } = this.validateFilters(view.entityType, filters);

    return {
      filters: valid,
      sortBy: view.sortBy || undefined,
      sortOrder: view.sortOrder || undefined,
      columns: (view.columns as any) || undefined,
      invalidFilters: invalid,
    };
  }

  /**
   * Duplicates a saved view.
   * Creates a personal copy for the requesting user.
   */
  async duplicate(
    organizationId: string,
    userId: string,
    id: string,
    newName?: string,
  ) {
    const existing = await this.findById(organizationId, userId, id);

    return this.prisma.savedView.create({
      data: {
        organizationId,
        createdById: userId,
        name: newName || `${existing.name} (Copy)`,
        description: existing.description,
        entityType: existing.entityType,
        filters: existing.filters as Prisma.InputJsonValue,
        sortBy: existing.sortBy,
        sortOrder: existing.sortOrder,
        columns: existing.columns
          ? (existing.columns as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        isShared: false, // Duplicates start as personal
        isPinned: false,
        isDefault: false,
      },
    });
  }

  /**
   * Gets the default view for an entity type.
   */
  async getDefaultView(
    organizationId: string,
    userId: string,
    entityType: ViewEntityType,
  ) {
    return this.prisma.savedView.findFirst({
      where: {
        organizationId,
        createdById: userId,
        entityType,
        isDefault: true,
      },
    });
  }

  /**
   * Reorders saved views.
   * Allows users to customize their view order.
   */
  async reorder(
    organizationId: string,
    userId: string,
    viewOrders: { id: string; displayOrder: number }[],
  ) {
    await this.prisma.$transaction(
      viewOrders.map(({ id, displayOrder }) =>
        this.prisma.savedView.updateMany({
          where: { id, organizationId, createdById: userId },
          data: { displayOrder },
        }),
      ),
    );
  }

  /**
   * Validates filter values against known enums for the entity type.
   * Returns both valid and invalid filter keys for graceful degradation.
   */
  private validateFilters(
    entityType: ViewEntityType,
    filters: FilterCriteria,
  ): { valid: FilterCriteria; invalid: string[] } {
    const invalid: string[] = [];
    const valid: FilterCriteria = { ...filters };
    const validEnums = VALID_ENUMS[entityType] || {};

    // Validate status values
    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      const validStatuses = statuses.filter((s) =>
        validEnums.status?.includes(s),
      );
      const invalidStatuses = statuses.filter(
        (s) => !validEnums.status?.includes(s),
      );

      if (invalidStatuses.length > 0) {
        invalid.push(`status: ${invalidStatuses.join(", ")}`);
      }
      valid.status = validStatuses.length > 0 ? validStatuses : undefined;
    }

    // Validate severity values
    if (filters.severity) {
      const severities = Array.isArray(filters.severity)
        ? filters.severity
        : [filters.severity];
      const validSeverities = severities.filter((s) =>
        validEnums.severity?.includes(s),
      );
      const invalidSeverities = severities.filter(
        (s) => !validEnums.severity?.includes(s),
      );

      if (invalidSeverities.length > 0) {
        invalid.push(`severity: ${invalidSeverities.join(", ")}`);
      }
      valid.severity = validSeverities.length > 0 ? validSeverities : undefined;
    }

    // Validate SLA status for investigations
    if (
      filters.slaStatus &&
      entityType === ViewEntityType.INVESTIGATIONS
    ) {
      if (!validEnums.slaStatus?.includes(filters.slaStatus)) {
        invalid.push(`slaStatus: ${filters.slaStatus}`);
        valid.slaStatus = undefined;
      }
    }

    return { valid, invalid };
  }
}
