// =============================================================================
// ACTIVITY SERVICE - Core audit logging service for the platform
// =============================================================================
//
// This service handles all activity/audit logging. It follows the pattern
// where activity logging is non-blocking - errors are logged but not thrown.
//
// KEY DESIGN DECISIONS:
// 1. organizationId is required on ALL operations (tenant isolation)
// 2. Actor names are denormalized for display efficiency
// 3. actionDescription is auto-generated if not provided
// 4. Errors are caught and logged - never thrown to caller
// =============================================================================

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";
import {
  ActivityDescriptionGenerator,
  ActorType as DescriptionActorType,
  DescriptionContext,
} from "./activity-description.service";
import {
  CreateActivityDto,
  ActivityQueryDto,
  ActivityResponseDto,
  ActivityListResponseDto,
} from "../dto";
import {
  AuditActionCategory,
  ActorType,
  AuditEntityType,
} from "@prisma/client";

/**
 * Input for creating an activity log entry.
 * Extends CreateActivityDto with context fields that come from the request.
 */
export interface LogActivityInput extends Omit<
  CreateActivityDto,
  "actionDescription"
> {
  /** Human-readable description (auto-generated if not provided) */
  actionDescription?: string;

  /** Organization ID - REQUIRED for tenant isolation */
  organizationId: string;

  /** User who performed the action (null for system actions) */
  actorUserId?: string | null;

  /** Type of actor (defaults to USER if actorUserId provided) */
  actorType?: ActorType;

  /** IP address of the request */
  ipAddress?: string;

  /** User agent of the request */
  userAgent?: string;

  /** Request correlation ID */
  requestId?: string;
}

/**
 * Core activity logging service for the platform.
 *
 * This service handles all audit log operations with the following guarantees:
 * - All queries are filtered by organizationId for tenant isolation
 * - Log operations never throw - errors are caught and logged
 * - Actor names are denormalized for efficient display
 *
 * @example
 * ```typescript
 * // In a feature service
 * await this.activityService.log({
 *   entityType: AuditEntityType.CASE,
 *   entityId: case.id,
 *   action: 'status_changed',
 *   organizationId,
 *   actorUserId: userId,
 *   changes: { oldValue: { status: 'OPEN' }, newValue: { status: 'CLOSED' } },
 * });
 * ```
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly descriptionGenerator: ActivityDescriptionGenerator,
  ) {}

  // -------------------------------------------------------------------------
  // LOG - Create audit log entry (non-blocking)
  // -------------------------------------------------------------------------

  /**
   * Creates an audit log entry for an action.
   *
   * This method is designed to be non-blocking:
   * - Errors are caught and logged, never thrown
   * - The calling code continues even if logging fails
   *
   * @param input - Activity log input data
   * @returns The created activity record, or null if creation failed
   */
  async log(input: LogActivityInput): Promise<ActivityResponseDto | null> {
    try {
      const {
        entityType,
        entityId,
        action,
        actionDescription,
        actionCategory,
        changes,
        context,
        metadata,
        organizationId,
        actorUserId,
        actorType,
        ipAddress,
        userAgent,
        requestId,
      } = input;

      // Determine actor type
      const resolvedActorType = this.resolveActorType(actorUserId, actorType);

      // Look up actor name if we have a user ID
      const actorName = await this.resolveActorName(
        actorUserId,
        organizationId,
      );

      // Auto-generate description if not provided
      const resolvedDescription =
        actionDescription ||
        this.generateDescription({
          action,
          entityType: this.formatEntityType(entityType),
          actorName,
          actorType: this.mapActorTypeToDescriptionType(resolvedActorType),
          oldValue: changes?.oldValue
            ? String(Object.values(changes.oldValue)[0])
            : undefined,
          newValue: changes?.newValue
            ? String(Object.values(changes.newValue)[0])
            : undefined,
        });

      // Determine action category if not provided
      const resolvedActionCategory =
        actionCategory || this.inferActionCategory(action);

      // Create the audit log entry
      const activity = await this.prisma.auditLog.create({
        data: {
          organizationId,
          entityType,
          entityId,
          action,
          actionCategory: resolvedActionCategory,
          actionDescription: resolvedDescription,
          actorUserId: actorUserId || null,
          actorType: resolvedActorType,
          actorName,
          changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
          context: context ? JSON.parse(JSON.stringify(context)) : null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          requestId: requestId || null,
        },
        include: {
          actorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.debug(
        `Activity logged: ${resolvedDescription} [${entityType}:${entityId}]`,
      );

      return this.mapToResponseDto(activity);
    } catch (error) {
      // Log the error but don't throw - activity logging should not break main flow
      this.logger.error(
        `Failed to log activity: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // GET ENTITY TIMELINE - Activity for specific entity
  // -------------------------------------------------------------------------

  /**
   * Retrieves the activity timeline for a specific entity.
   *
   * @param entityType - The type of entity
   * @param entityId - The entity's UUID
   * @param organizationId - Organization ID (REQUIRED for tenant isolation)
   * @param options - Query options (pagination, sorting)
   * @returns Paginated list of activities
   */
  async getEntityTimeline(
    entityType: AuditEntityType,
    entityId: string,
    organizationId: string,
    options?: Pick<ActivityQueryDto, "page" | "limit" | "sortOrder">,
  ): Promise<ActivityListResponseDto> {
    const { page = 1, limit = 20, sortOrder = "desc" } = options || {};
    const skip = (page - 1) * limit;

    const where = {
      organizationId, // CRITICAL: Always filter by tenant
      entityType,
      entityId,
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
        include: {
          actorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map(this.mapToResponseDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -------------------------------------------------------------------------
  // GET ORGANIZATION ACTIVITY - Recent activity for org
  // -------------------------------------------------------------------------

  /**
   * Retrieves recent activity for an organization.
   *
   * @param organizationId - Organization ID (REQUIRED for tenant isolation)
   * @param query - Query filters and pagination
   * @returns Paginated list of activities
   */
  async getOrganizationActivity(
    organizationId: string,
    query?: ActivityQueryDto,
  ): Promise<ActivityListResponseDto> {
    const {
      actionCategory,
      startDate,
      endDate,
      action,
      page = 1,
      limit = 20,
      sortOrder = "desc",
    } = query || {};

    const skip = (page - 1) * limit;

    // Build where clause - ALWAYS includes organizationId
    const where: Record<string, unknown> = {
      organizationId, // CRITICAL: Always filter by tenant
    };

    if (actionCategory) {
      where.actionCategory = actionCategory;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = startDate;
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = endDate;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
        include: {
          actorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map(this.mapToResponseDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -------------------------------------------------------------------------
  // GET USER ACTIVITY - Activity by specific user
  // -------------------------------------------------------------------------

  /**
   * Retrieves activity performed by a specific user.
   *
   * @param actorUserId - The user's UUID
   * @param organizationId - Organization ID (REQUIRED for tenant isolation)
   * @param options - Query options (pagination, sorting, date range)
   * @returns Paginated list of activities
   */
  async getUserActivity(
    actorUserId: string,
    organizationId: string,
    options?: Pick<
      ActivityQueryDto,
      "page" | "limit" | "sortOrder" | "startDate" | "endDate"
    >,
  ): Promise<ActivityListResponseDto> {
    const {
      page = 1,
      limit = 20,
      sortOrder = "desc",
      startDate,
      endDate,
    } = options || {};
    const skip = (page - 1) * limit;

    // Build where clause - ALWAYS includes organizationId
    const where: Record<string, unknown> = {
      organizationId, // CRITICAL: Always filter by tenant
      actorUserId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = startDate;
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = endDate;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
        include: {
          actorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map(this.mapToResponseDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -------------------------------------------------------------------------
  // HELPER METHODS
  // -------------------------------------------------------------------------

  /**
   * Resolves the actor type based on provided inputs.
   * Defaults to USER if actorUserId is provided, SYSTEM otherwise.
   */
  private resolveActorType(
    actorUserId: string | null | undefined,
    actorType?: ActorType,
  ): ActorType {
    if (actorType) {
      return actorType;
    }
    return actorUserId ? ActorType.USER : ActorType.SYSTEM;
  }

  /**
   * Looks up the user's display name from the database.
   * Returns null for system actions or if user not found.
   */
  private async resolveActorName(
    actorUserId: string | null | undefined,
    organizationId: string,
  ): Promise<string | null> {
    if (!actorUserId) {
      return null;
    }

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: actorUserId,
          organizationId, // Verify user belongs to same org
        },
        select: {
          firstName: true,
          lastName: true,
        },
      });

      if (!user) {
        return null;
      }

      // Combine first + last name
      return `${user.firstName} ${user.lastName}`.trim();
    } catch (error) {
      this.logger.warn(
        `Failed to resolve actor name for user ${actorUserId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  /**
   * Generates a description using the ActivityDescriptionGenerator.
   */
  private generateDescription(context: DescriptionContext): string {
    return this.descriptionGenerator.generate(context);
  }

  /**
   * Formats entity type for display in descriptions.
   */
  private formatEntityType(entityType: AuditEntityType): string {
    // Convert SNAKE_CASE to Title Case
    return entityType
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Maps Prisma ActorType to description generator's ActorType.
   */
  private mapActorTypeToDescriptionType(
    actorType: ActorType,
  ): DescriptionActorType {
    return actorType as DescriptionActorType;
  }

  /**
   * Infers action category from the action string.
   */
  private inferActionCategory(action: string): AuditActionCategory {
    if (action === "created") {
      return AuditActionCategory.CREATE;
    }
    if (action === "deleted") {
      return AuditActionCategory.DELETE;
    }
    if (["viewed", "exported"].includes(action)) {
      return AuditActionCategory.ACCESS;
    }
    if (["login", "login_failed", "logout"].includes(action)) {
      return AuditActionCategory.SECURITY;
    }
    if (["ai_generated", "ai_edited"].includes(action)) {
      return AuditActionCategory.AI;
    }
    if (["synced"].includes(action)) {
      return AuditActionCategory.SYSTEM;
    }
    // Default to UPDATE for most actions
    return AuditActionCategory.UPDATE;
  }

  // -------------------------------------------------------------------------
  // PIN ACTIVITY - Mark an activity as pinned/unpinned
  // -------------------------------------------------------------------------

  /**
   * Pins or unpins an activity entry.
   *
   * @param activityId - The activity UUID
   * @param isPinned - Whether to pin or unpin
   * @param organizationId - Organization ID (REQUIRED for tenant isolation)
   * @returns The updated activity record, or null if not found
   */
  async pinActivity(
    activityId: string,
    isPinned: boolean,
    organizationId: string,
  ): Promise<ActivityResponseDto | null> {
    try {
      // First verify the activity exists and belongs to this org
      const existing = await this.prisma.auditLog.findFirst({
        where: {
          id: activityId,
          organizationId,
        },
      });

      if (!existing) {
        return null;
      }

      // Update the context field with isPinned flag
      const currentContext =
        (existing.context as Record<string, unknown>) || {};
      const updatedContext = {
        ...currentContext,
        isPinned,
      };

      const updated = await this.prisma.auditLog.update({
        where: { id: activityId },
        data: {
          context: updatedContext,
        },
        include: {
          actorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return this.mapToResponseDto(updated);
    } catch (error) {
      this.logger.error(
        `Failed to pin activity: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // GET STATUS HISTORY - Status changes for an entity
  // -------------------------------------------------------------------------

  /**
   * Retrieves status change history for an entity.
   *
   * @param entityType - The type of entity
   * @param entityId - The entity's UUID
   * @param organizationId - Organization ID (REQUIRED for tenant isolation)
   * @returns Array of status change records
   */
  async getStatusHistory(
    entityType: AuditEntityType,
    entityId: string,
    organizationId: string,
  ): Promise<
    Array<{
      id: string;
      status: string;
      date: Date;
      changedBy: { id: string; name: string } | null;
      rationale: string | null;
    }>
  > {
    try {
      const activities = await this.prisma.auditLog.findMany({
        where: {
          organizationId,
          entityType,
          entityId,
          action: "status_changed",
        },
        orderBy: { createdAt: "desc" },
        include: {
          actorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return activities.map((activity) => {
        const changes = activity.changes as {
          newValue?: { status?: string };
          rationale?: string;
        } | null;

        return {
          id: activity.id,
          status: changes?.newValue?.status || "Unknown",
          date: activity.createdAt,
          changedBy: activity.actorUser
            ? {
                id: activity.actorUser.id,
                name: `${activity.actorUser.firstName} ${activity.actorUser.lastName}`.trim(),
              }
            : null,
          rationale: changes?.rationale || null,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to get status history: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // HELPER METHODS (continued)
  // -------------------------------------------------------------------------

  /**
   * Maps a Prisma AuditLog record to ActivityResponseDto.
   */
  private mapToResponseDto = (record: {
    id: string;
    organizationId: string;
    entityType: AuditEntityType;
    entityId: string;
    action: string;
    actionCategory: AuditActionCategory;
    actionDescription: string;
    actorUserId: string | null;
    actorType: ActorType;
    actorName: string | null;
    changes: unknown;
    context: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    requestId: string | null;
    createdAt: Date;
    actorUser?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
  }): ActivityResponseDto => {
    return {
      id: record.id,
      organizationId: record.organizationId,
      entityType: record.entityType,
      entityId: record.entityId,
      action: record.action,
      actionCategory: record.actionCategory,
      actionDescription: record.actionDescription,
      actorUserId: record.actorUserId,
      actorType: record.actorType,
      actorName: record.actorName,
      changes: record.changes as Record<string, unknown> | null,
      context: record.context as Record<string, unknown> | null,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      requestId: record.requestId,
      createdAt: record.createdAt,
      actorUser: record.actorUser
        ? {
            id: record.actorUser.id,
            name: `${record.actorUser.firstName} ${record.actorUser.lastName}`.trim(),
            email: record.actorUser.email,
          }
        : undefined,
    };
  };
}
