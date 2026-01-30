// =============================================================================
// SERVICE PATTERN - All NestJS services MUST follow this structure
// =============================================================================
//
// This is the canonical pattern for all services in the Risk Intelligence Platform.
// Copy this structure when creating new services.
//
// KEY REQUIREMENTS:
// 1. All queries filter by organizationId
// 2. All mutations log to ActivityService
// 3. All methods include proper error handling
// 4. All methods are typed with DTOs
// =============================================================================

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { ActivityService } from '../common/services/activity.service';
import { CreateExampleDto, UpdateExampleDto, ExampleResponseDto } from './dto';
import { ExampleStatus } from '@prisma/client';

@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  // -------------------------------------------------------------------------
  // CREATE - Always requires organizationId and userId
  // -------------------------------------------------------------------------
  async create(
    dto: CreateExampleDto,
    userId: string,
    organizationId: string,
  ): Promise<ExampleResponseDto> {
    this.logger.debug(`Creating example for org ${organizationId}`);

    const entity = await this.prisma.example.create({
      data: {
        ...dto,
        organizationId,      // CRITICAL: Set from JWT, never from DTO
        createdById: userId,
        updatedById: userId,
        status: ExampleStatus.DRAFT,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // REQUIRED: Log activity with natural language description
    await this.activityService.log({
      entityType: 'EXAMPLE',
      entityId: entity.id,
      action: 'created',
      actionDescription: `Created "${entity.name}"`,
      actorUserId: userId,
      organizationId,
      metadata: { source: 'api' },
    });

    return entity;
  }

  // -------------------------------------------------------------------------
  // FIND ALL - Paginated, filtered, ALWAYS scoped to organization
  // -------------------------------------------------------------------------
  async findAll(
    organizationId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: ExampleStatus;
      search?: string;
    },
  ) {
    const { page = 1, limit = 20, status, search } = options || {};
    const skip = (page - 1) * limit;

    // Build where clause - ALWAYS includes organizationId
    const where: any = {
      organizationId, // CRITICAL: Always filter by tenant
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Parallel query for data and count
    const [items, total] = await Promise.all([
      this.prisma.example.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.example.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -------------------------------------------------------------------------
  // FIND ONE - Returns 404 if not found OR not in organization
  // -------------------------------------------------------------------------
  async findOne(id: string, organizationId: string): Promise<ExampleResponseDto> {
    const entity = await this.prisma.example.findFirst({
      where: {
        id,
        organizationId, // CRITICAL: Include org filter to prevent cross-tenant access
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // IMPORTANT: Return 404 for both "not found" AND "wrong org"
    // This prevents enumeration attacks
    if (!entity) {
      throw new NotFoundException('Resource not found');
    }

    return entity;
  }

  // -------------------------------------------------------------------------
  // UPDATE - Logs old and new values
  // -------------------------------------------------------------------------
  async update(
    id: string,
    dto: UpdateExampleDto,
    userId: string,
    organizationId: string,
  ): Promise<ExampleResponseDto> {
    // First, verify entity exists and belongs to this org
    const existing = await this.findOne(id, organizationId);

    // Capture old values for activity log
    const oldValues = {
      name: existing.name,
      status: existing.status,
      description: existing.description,
    };

    // Perform update
    const updated = await this.prisma.example.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Build human-readable description of changes
    const changes = [];
    if (dto.name && dto.name !== oldValues.name) {
      changes.push(`name from "${oldValues.name}" to "${dto.name}"`);
    }
    if (dto.status && dto.status !== oldValues.status) {
      changes.push(`status from ${oldValues.status} to ${dto.status}`);
    }

    const description = changes.length > 0
      ? `Updated ${changes.join(', ')}`
      : 'Updated record';

    // REQUIRED: Log activity
    await this.activityService.log({
      entityType: 'EXAMPLE',
      entityId: id,
      action: 'updated',
      actionDescription: description,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: oldValues,
        newValue: dto,
      },
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // DELETE - Soft delete preferred, logs deletion
  // -------------------------------------------------------------------------
  async remove(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    // Verify entity exists and belongs to this org
    const existing = await this.findOne(id, organizationId);

    // Soft delete by setting status
    await this.prisma.example.update({
      where: { id },
      data: {
        status: ExampleStatus.DELETED,
        updatedById: userId,
      },
    });

    // REQUIRED: Log deletion
    await this.activityService.log({
      entityType: 'EXAMPLE',
      entityId: id,
      action: 'deleted',
      actionDescription: `Deleted "${existing.name}"`,
      actorUserId: userId,
      organizationId,
    });
  }

  // -------------------------------------------------------------------------
  // STATUS CHANGE - Special method with rationale tracking
  // -------------------------------------------------------------------------
  async changeStatus(
    id: string,
    newStatus: ExampleStatus,
    rationale: string,
    userId: string,
    organizationId: string,
  ): Promise<ExampleResponseDto> {
    const existing = await this.findOne(id, organizationId);
    const oldStatus = existing.status;

    // Validate transition (add your state machine logic)
    if (!this.isValidTransition(oldStatus, newStatus)) {
      throw new ForbiddenException(
        `Cannot transition from ${oldStatus} to ${newStatus}`,
      );
    }

    const updated = await this.prisma.example.update({
      where: { id },
      data: {
        status: newStatus,
        statusRationale: rationale, // AI-first: Store why
        updatedById: userId,
      },
    });

    // REQUIRED: Log status change with context
    await this.activityService.log({
      entityType: 'EXAMPLE',
      entityId: id,
      action: 'status_changed',
      actionDescription: `Changed status from ${oldStatus} to ${newStatus}. Reason: ${rationale}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { status: oldStatus },
        newValue: { status: newStatus, rationale },
      },
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // HELPER - State machine validation
  // -------------------------------------------------------------------------
  private isValidTransition(from: ExampleStatus, to: ExampleStatus): boolean {
    const transitions: Record<ExampleStatus, ExampleStatus[]> = {
      DRAFT: [ExampleStatus.ACTIVE, ExampleStatus.DELETED],
      ACTIVE: [ExampleStatus.ARCHIVED, ExampleStatus.DELETED],
      ARCHIVED: [ExampleStatus.ACTIVE, ExampleStatus.DELETED],
      DELETED: [], // No transitions out of deleted
    };

    return transitions[from]?.includes(to) ?? false;
  }
}
