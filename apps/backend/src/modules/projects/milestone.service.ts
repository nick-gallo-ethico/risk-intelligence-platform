import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  Milestone,
  MilestoneStatus,
  MilestoneItem,
  Prisma,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";
import { differenceInDays, isPast } from "date-fns";
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CreateMilestoneItemDto,
  UpdateMilestoneItemDto,
  MilestoneQueryDto,
  MilestoneResponseDto,
  MilestoneItemResponseDto,
  PaginatedMilestoneResult,
} from "./dto/milestone.dto";

// ===========================================
// Service
// ===========================================

/**
 * MilestoneService manages project milestones for tracking compliance deliverables.
 *
 * Features:
 * - CRUD operations for milestones and milestone items
 * - Progress calculation based on weighted items
 * - Automatic status updates based on progress and target date
 * - Entity completion sync for linked cases/investigations/campaigns
 */
@Injectable()
export class MilestoneService {
  private readonly logger = new Logger(MilestoneService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ===========================================
  // CRUD Operations
  // ===========================================

  /**
   * Creates a new milestone with optional items.
   */
  async create(
    orgId: string,
    userId: string,
    dto: CreateMilestoneDto,
  ): Promise<Milestone> {
    const milestone = await this.prisma.milestone.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        targetDate: dto.targetDate,
        status: "NOT_STARTED",
        ownerId: dto.ownerId,
        notes: dto.notes,
        createdById: userId,
        items: dto.items
          ? {
              create: dto.items.map((item, index) => ({
                organizationId: orgId,
                entityType: item.entityType,
                entityId: item.entityId,
                customTitle: item.customTitle,
                dueDate: item.dueDate,
                weight: item.weight || 1,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });

    // Calculate initial progress
    await this.recalculateProgress(milestone.id);

    // Audit log
    await this.auditService.log({
      entityType: AuditEntityType.MILESTONE,
      entityId: milestone.id,
      action: "created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Milestone "${dto.name}" created with target date ${dto.targetDate.toISOString().split("T")[0]}`,
      organizationId: orgId,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.logger.log(`Milestone created: ${milestone.id} - ${milestone.name}`);

    return milestone;
  }

  /**
   * Updates an existing milestone.
   */
  async update(
    orgId: string,
    milestoneId: string,
    userId: string,
    dto: UpdateMilestoneDto,
  ): Promise<Milestone> {
    const existing = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException("Milestone not found");
    }

    // Auto-complete if status changed to COMPLETED
    const completedAt =
      dto.status === "COMPLETED" && existing.status !== "COMPLETED"
        ? new Date()
        : existing.completedAt;

    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...dto,
        completedAt,
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Audit log
    await this.auditService.log({
      entityType: AuditEntityType.MILESTONE,
      entityId: milestoneId,
      action: "updated",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Milestone "${updated.name}" updated`,
      organizationId: orgId,
      actorUserId: userId,
      actorType: ActorType.USER,
      changes: {
        ...(dto.status && {
          status: { old: existing.status, new: dto.status },
        }),
        ...(dto.targetDate && {
          targetDate: { old: existing.targetDate, new: dto.targetDate },
        }),
      },
    });

    return updated;
  }

  /**
   * Deletes a milestone and all its items.
   */
  async delete(
    orgId: string,
    milestoneId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException("Milestone not found");
    }

    await this.prisma.milestone.deleteMany({
      where: { id: milestoneId, organizationId: orgId },
    });

    // Audit log
    await this.auditService.log({
      entityType: AuditEntityType.MILESTONE,
      entityId: milestoneId,
      action: "deleted",
      actionCategory: AuditActionCategory.DELETE,
      actionDescription: `Milestone "${existing.name}" deleted`,
      organizationId: orgId,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.logger.log(`Milestone deleted: ${milestoneId}`);
  }

  /**
   * Gets a milestone by ID with items.
   */
  async get(
    orgId: string,
    milestoneId: string,
  ): Promise<MilestoneResponseDto | null> {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, organizationId: orgId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!milestone) return null;

    return this.toResponseDto(milestone);
  }

  /**
   * Lists milestones with filtering and pagination.
   */
  async list(
    orgId: string,
    query: MilestoneQueryDto,
  ): Promise<PaginatedMilestoneResult> {
    const where: Prisma.MilestoneWhereInput = {
      organizationId: orgId,
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.ownerId && { ownerId: query.ownerId }),
      ...((query.targetDateFrom || query.targetDateTo) && {
        targetDate: {
          ...(query.targetDateFrom && { gte: query.targetDateFrom }),
          ...(query.targetDateTo && { lte: query.targetDateTo }),
        },
      }),
    };

    const [milestones, total] = await Promise.all([
      this.prisma.milestone.findMany({
        where,
        skip: query.offset ?? 0,
        take: query.limit ?? 20,
        orderBy: { targetDate: "asc" },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.milestone.count({ where }),
    ]);

    const items = milestones.map((m) => this.toResponseDto(m));

    return {
      items,
      total,
      offset: query.offset ?? 0,
      limit: query.limit ?? 20,
    };
  }

  // ===========================================
  // Milestone Items
  // ===========================================

  /**
   * Adds an item to a milestone.
   */
  async addItem(
    orgId: string,
    milestoneId: string,
    userId: string,
    dto: CreateMilestoneItemDto,
  ): Promise<MilestoneItem> {
    // Verify milestone belongs to org
    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, organizationId: orgId },
      include: { items: true },
    });

    if (!milestone) {
      throw new NotFoundException("Milestone not found");
    }

    const maxSort = Math.max(...milestone.items.map((i) => i.sortOrder), -1);

    const item = await this.prisma.milestoneItem.create({
      data: {
        organizationId: orgId,
        milestoneId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        customTitle: dto.customTitle,
        dueDate: dto.dueDate,
        weight: dto.weight || 1,
        sortOrder: maxSort + 1,
      },
    });

    await this.recalculateProgress(milestoneId);

    // Audit log
    await this.auditService.log({
      entityType: AuditEntityType.MILESTONE_ITEM,
      entityId: item.id,
      action: "created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Item added to milestone "${milestone.name}"`,
      organizationId: orgId,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: { milestoneId, entityType: dto.entityType },
    });

    return item;
  }

  /**
   * Updates a milestone item.
   */
  async updateItem(
    orgId: string,
    itemId: string,
    userId: string,
    dto: UpdateMilestoneItemDto,
  ): Promise<MilestoneItem> {
    // Verify item belongs to org's milestone
    const item = await this.prisma.milestoneItem.findFirst({
      where: { id: itemId },
      include: { milestone: true },
    });

    if (!item || item.milestone.organizationId !== orgId) {
      throw new NotFoundException("Milestone item not found");
    }

    // Handle completion state changes
    let completedAt = item.completedAt;
    if (dto.isCompleted !== undefined) {
      if (dto.isCompleted && !item.isCompleted) {
        completedAt = new Date();
      } else if (!dto.isCompleted && item.isCompleted) {
        completedAt = null;
      }
    }

    const updated = await this.prisma.milestoneItem.update({
      where: { id: itemId },
      data: {
        ...dto,
        completedAt,
      },
    });

    await this.recalculateProgress(item.milestoneId);

    // Audit log for completion changes
    if (dto.isCompleted !== undefined && dto.isCompleted !== item.isCompleted) {
      await this.auditService.log({
        entityType: AuditEntityType.MILESTONE_ITEM,
        entityId: item.id,
        action: dto.isCompleted ? "completed" : "reopened",
        actionCategory: AuditActionCategory.UPDATE,
        actionDescription: dto.isCompleted
          ? `Item completed in milestone "${item.milestone.name}"`
          : `Item reopened in milestone "${item.milestone.name}"`,
        organizationId: orgId,
        actorUserId: userId,
        actorType: ActorType.USER,
        context: { milestoneId: item.milestoneId },
      });
    }

    return updated;
  }

  /**
   * Removes an item from a milestone.
   */
  async removeItem(
    orgId: string,
    itemId: string,
    userId: string,
  ): Promise<void> {
    const item = await this.prisma.milestoneItem.findFirst({
      where: { id: itemId },
      include: { milestone: true },
    });

    if (!item || item.milestone.organizationId !== orgId) {
      throw new NotFoundException("Milestone item not found");
    }

    await this.prisma.milestoneItem.delete({ where: { id: itemId } });
    await this.recalculateProgress(item.milestoneId);

    // Audit log
    await this.auditService.log({
      entityType: AuditEntityType.MILESTONE_ITEM,
      entityId: itemId,
      action: "deleted",
      actionCategory: AuditActionCategory.DELETE,
      actionDescription: `Item removed from milestone "${item.milestone.name}"`,
      organizationId: orgId,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: { milestoneId: item.milestoneId },
    });
  }

  // ===========================================
  // Progress Calculation
  // ===========================================

  /**
   * Recalculates progress for a milestone based on its items.
   * Updates totalItems, completedItems, progressPercent, and status.
   */
  async recalculateProgress(milestoneId: string): Promise<void> {
    const items = await this.prisma.milestoneItem.findMany({
      where: { milestoneId },
    });

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const completedWeight = items
      .filter((item) => item.isCompleted)
      .reduce((sum, item) => sum + item.weight, 0);

    const progressPercent =
      totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      this.logger.warn(
        `Cannot recalculate progress: milestone ${milestoneId} not found`,
      );
      return;
    }

    // Determine status based on progress and target date
    let status: MilestoneStatus = milestone.status;

    // Only auto-update status if not manually cancelled
    if (milestone.status !== "CANCELLED") {
      if (progressPercent === 100) {
        status = "COMPLETED";
      } else if (progressPercent > 0) {
        status = isPast(milestone.targetDate) ? "AT_RISK" : "IN_PROGRESS";
      } else {
        status = isPast(milestone.targetDate) ? "AT_RISK" : "NOT_STARTED";
      }
    }

    await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        totalItems: items.length,
        completedItems: items.filter((i) => i.isCompleted).length,
        progressPercent,
        status,
        completedAt: progressPercent === 100 ? new Date() : null,
      },
    });

    this.logger.debug(
      `Milestone ${milestoneId} progress: ${progressPercent}% (${status})`,
    );
  }

  // ===========================================
  // Entity Sync
  // ===========================================

  /**
   * Syncs entity completion to linked milestone items.
   * Call this when a case/investigation/campaign status changes.
   */
  async syncEntityCompletion(
    entityType: string,
    entityId: string,
    isCompleted: boolean,
  ): Promise<void> {
    const items = await this.prisma.milestoneItem.findMany({
      where: {
        entityType: entityType as Prisma.EnumMilestoneItemTypeFilter,
        entityId,
      },
    });

    for (const item of items) {
      if (item.isCompleted !== isCompleted) {
        await this.prisma.milestoneItem.update({
          where: { id: item.id },
          data: {
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        });
        await this.recalculateProgress(item.milestoneId);

        this.logger.debug(
          `Synced ${entityType}/${entityId} completion (${isCompleted}) to milestone item ${item.id}`,
        );
      }
    }
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  /**
   * Transforms a milestone database record to response DTO.
   */
  private toResponseDto(
    milestone: Milestone & {
      items?: MilestoneItem[];
      owner?: { id: string; firstName: string; lastName: string } | null;
    },
  ): MilestoneResponseDto {
    const daysUntilTarget = differenceInDays(milestone.targetDate, new Date());
    const isOverdue =
      isPast(milestone.targetDate) && milestone.status !== "COMPLETED";

    return {
      id: milestone.id,
      name: milestone.name,
      description: milestone.description ?? undefined,
      category: milestone.category,
      targetDate: milestone.targetDate,
      completedAt: milestone.completedAt ?? undefined,
      status: milestone.status,
      totalItems: milestone.totalItems,
      completedItems: milestone.completedItems,
      progressPercent: milestone.progressPercent,
      owner: milestone.owner
        ? {
            id: milestone.owner.id,
            name: `${milestone.owner.firstName} ${milestone.owner.lastName}`,
          }
        : undefined,
      items:
        milestone.items?.map(
          (item): MilestoneItemResponseDto => ({
            id: item.id,
            entityType: item.entityType,
            entityId: item.entityId ?? undefined,
            customTitle: item.customTitle ?? undefined,
            isCompleted: item.isCompleted,
            completedAt: item.completedAt ?? undefined,
            dueDate: item.dueDate ?? undefined,
            weight: item.weight,
            sortOrder: item.sortOrder,
          }),
        ) || [],
      notes: milestone.notes ?? undefined,
      lastStatusUpdate: milestone.lastStatusUpdate ?? undefined,
      daysUntilTarget,
      isOverdue,
      createdAt: milestone.createdAt,
      updatedAt: milestone.updatedAt,
    };
  }
}
