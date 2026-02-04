// =============================================================================
// ACTIVITY TIMELINE SERVICE - Aggregates audit events into unified timelines
// =============================================================================
//
// This service provides entity-level activity timelines with related entity
// inclusion. For example, a Case timeline includes Investigation activities.
//
// KEY FEATURES:
// - Timeline aggregation from AuditLog table
// - Related entity inclusion (Case -> Investigation, etc.)
// - Pagination with hasMore indicator
// - Date range filtering
// - User's recent activity across all entities
// =============================================================================

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditEntityType, Prisma } from "@prisma/client";

/**
 * Timeline entry representing a single activity event.
 */
export interface TimelineEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  actionDescription: string;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: Date;
  isRelatedEntity: boolean;
  relatedEntityInfo?: {
    parentEntityType: AuditEntityType;
    parentEntityId: string;
    relationship: string;
  };
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  context?: Record<string, unknown> | null;
}

/**
 * Paginated timeline response.
 */
export interface TimelineResponse {
  entries: TimelineEntry[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

/**
 * Query options for timeline retrieval.
 */
export interface TimelineQueryOptions {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  includeRelated?: boolean;
}

/**
 * Related entity configuration.
 */
interface RelatedEntityConfig {
  entityType: AuditEntityType;
  relationship: string;
  foreignKey: string;
}

/**
 * Map of entity types to their related entity types.
 * Used to determine which related entities to include in timelines.
 */
const ENTITY_RELATIONSHIPS: Partial<
  Record<AuditEntityType, RelatedEntityConfig[]>
> = {
  // Case includes Investigation activities
  [AuditEntityType.CASE]: [
    {
      entityType: AuditEntityType.INVESTIGATION,
      relationship: "investigation",
      foreignKey: "caseId",
    },
  ],
  // Other entities can have relationships added as needed
};

/**
 * ActivityTimelineService aggregates audit events into unified timelines
 * for any entity type, with support for related entity inclusion.
 */
@Injectable()
export class ActivityTimelineService {
  private readonly logger = new Logger(ActivityTimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // GET TIMELINE - Main entry point for entity timelines
  // -------------------------------------------------------------------------

  /**
   * Gets the activity timeline for a specific entity.
   *
   * @param entityType - The type of entity (CASE, INVESTIGATION, etc.)
   * @param entityId - The entity's UUID
   * @param organizationId - Organization ID for tenant isolation
   * @param options - Query options (pagination, date range, includeRelated)
   * @returns Paginated timeline with entries from main and related entities
   */
  async getTimeline(
    entityType: AuditEntityType,
    entityId: string,
    organizationId: string,
    options?: TimelineQueryOptions,
  ): Promise<TimelineResponse> {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      includeRelated = true,
    } = options || {};

    this.logger.debug(
      `Getting timeline for ${entityType}:${entityId} in org ${organizationId}`,
    );

    // Build WHERE clause for main entity
    const baseWhere: Prisma.AuditLogWhereInput = {
      organizationId,
      entityType,
      entityId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    // Get related entity IDs if enabled
    let relatedEntityIds: string[] = [];
    const relationships: RelatedEntityConfig[] =
      ENTITY_RELATIONSHIPS[entityType] || [];

    if (includeRelated && relationships.length > 0) {
      relatedEntityIds = await this.getRelatedEntityIds(
        entityType,
        entityId,
        organizationId,
      );
    }

    // Build combined WHERE clause (main entity OR related entities)
    let combinedWhere: Prisma.AuditLogWhereInput;

    if (relatedEntityIds.length > 0) {
      const relatedEntityType = relationships[0].entityType;
      combinedWhere = {
        organizationId,
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
        OR: [
          { entityType, entityId },
          { entityType: relatedEntityType, entityId: { in: relatedEntityIds } },
        ],
      };
    } else {
      combinedWhere = baseWhere;
    }

    // Get total count for pagination
    const total = await this.prisma.auditLog.count({ where: combinedWhere });

    // Get paginated entries
    const skip = (page - 1) * limit;
    const entries = await this.prisma.auditLog.findMany({
      where: combinedWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Map to timeline entries, marking which are from related entities
    const timelineEntries: TimelineEntry[] = entries.map((entry) => {
      const isRelatedEntity =
        entry.entityType !== entityType || entry.entityId !== entityId;

      return {
        id: entry.id,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actionDescription: entry.actionDescription,
        actorUserId: entry.actorUserId,
        actorName: entry.actorName,
        createdAt: entry.createdAt,
        isRelatedEntity,
        ...(isRelatedEntity && {
          relatedEntityInfo: {
            parentEntityType: entityType,
            parentEntityId: entityId,
            relationship: relationships[0]?.relationship || "related",
          },
        }),
        changes: entry.changes as Record<
          string,
          { old: unknown; new: unknown }
        > | null,
        context: entry.context as Record<string, unknown> | null,
      };
    });

    return {
      entries: timelineEntries,
      total,
      hasMore: skip + entries.length < total,
      page,
      limit,
    };
  }

  // -------------------------------------------------------------------------
  // GET RELATED ENTITY IDS - Find IDs of related entities
  // -------------------------------------------------------------------------

  /**
   * Finds IDs of related entities for timeline inclusion.
   *
   * For example, for a CASE entity, this returns all Investigation IDs
   * that belong to that case.
   *
   * @param entityType - Parent entity type
   * @param entityId - Parent entity ID
   * @param organizationId - Organization ID for tenant isolation
   * @returns Array of related entity IDs
   */
  async getRelatedEntityIds(
    entityType: AuditEntityType,
    entityId: string,
    organizationId: string,
  ): Promise<string[]> {
    const relationships: RelatedEntityConfig[] | undefined =
      ENTITY_RELATIONSHIPS[entityType];

    if (!relationships || relationships.length === 0) {
      return [];
    }

    const relatedIds: string[] = [];

    for (const rel of relationships) {
      if (rel.entityType === AuditEntityType.INVESTIGATION) {
        // Get Investigation IDs for a Case
        const investigations = await this.prisma.investigation.findMany({
          where: {
            caseId: entityId,
            organizationId,
          },
          select: { id: true },
        });
        relatedIds.push(...investigations.map((inv) => inv.id));
      }
      // Add more relationship types as needed
    }

    return relatedIds;
  }

  // -------------------------------------------------------------------------
  // GET RECENT ACTIVITY - User's recent activity across all entities
  // -------------------------------------------------------------------------

  /**
   * Gets a user's recent activity across all entities.
   *
   * This is useful for "My Recent Activity" panels showing what
   * the current user has been working on.
   *
   * @param userId - User's UUID
   * @param organizationId - Organization ID for tenant isolation
   * @param options - Query options (pagination, date range)
   * @returns Paginated timeline of user's actions
   */
  async getRecentActivity(
    userId: string,
    organizationId: string,
    options?: Omit<TimelineQueryOptions, "includeRelated">,
  ): Promise<TimelineResponse> {
    const { page = 1, limit = 20, startDate, endDate } = options || {};

    this.logger.debug(
      `Getting recent activity for user ${userId} in org ${organizationId}`,
    );

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      actorUserId: userId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    const total = await this.prisma.auditLog.count({ where });

    const skip = (page - 1) * limit;
    const entries = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const timelineEntries: TimelineEntry[] = entries.map((entry) => ({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actionDescription: entry.actionDescription,
      actorUserId: entry.actorUserId,
      actorName: entry.actorName,
      createdAt: entry.createdAt,
      isRelatedEntity: false,
      changes: entry.changes as Record<
        string,
        { old: unknown; new: unknown }
      > | null,
      context: entry.context as Record<string, unknown> | null,
    }));

    return {
      entries: timelineEntries,
      total,
      hasMore: skip + entries.length < total,
      page,
      limit,
    };
  }

  // -------------------------------------------------------------------------
  // GET ENTITY SUMMARY - Quick stats for an entity's activity
  // -------------------------------------------------------------------------

  /**
   * Gets activity summary statistics for an entity.
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param organizationId - Organization ID for tenant isolation
   * @returns Summary with counts and last activity info
   */
  async getEntitySummary(
    entityType: AuditEntityType,
    entityId: string,
    organizationId: string,
  ): Promise<{
    totalActivities: number;
    lastActivityAt: Date | null;
    lastActivityBy: string | null;
    uniqueActors: number;
  }> {
    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      entityType,
      entityId,
    };

    const [totalActivities, lastActivity, uniqueActorsResult] =
      await Promise.all([
        this.prisma.auditLog.count({ where }),
        this.prisma.auditLog.findFirst({
          where,
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, actorName: true },
        }),
        this.prisma.auditLog.groupBy({
          by: ["actorUserId"],
          where: {
            ...where,
            actorUserId: { not: null },
          },
        }),
      ]);

    return {
      totalActivities,
      lastActivityAt: lastActivity?.createdAt || null,
      lastActivityBy: lastActivity?.actorName || null,
      uniqueActors: uniqueActorsResult.length,
    };
  }
}
