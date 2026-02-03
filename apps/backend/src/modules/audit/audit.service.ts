import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  Prisma,
} from "@prisma/client";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";
import { AuditLogPaginatedResponseDto } from "./dto/audit-log-response.dto";

/**
 * DTO for creating an audit log entry.
 */
export interface CreateAuditLogDto {
  organizationId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  actionCategory: AuditActionCategory;
  actionDescription: string;
  actorUserId?: string | null;
  actorType: ActorType;
  actorName?: string | null;
  changes?: Record<string, { old: unknown; new: unknown }>;
  context?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Unified audit logging service for all domain events.
 *
 * Key behaviors:
 * - Audit failures don't crash main operations (error is logged, not thrown)
 * - All entries include both structured data AND natural language descriptions
 * - Supports querying by entity, actor, category, and time range
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs an audit entry.
   *
   * IMPORTANT: This method catches and logs errors rather than throwing.
   * Audit failures should never crash the main operation.
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: dto.organizationId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          action: dto.action,
          actionCategory: dto.actionCategory,
          actionDescription: dto.actionDescription,
          actorUserId: dto.actorUserId ?? null,
          actorType: dto.actorType,
          actorName: dto.actorName ?? null,
          changes: dto.changes as Prisma.InputJsonValue,
          context: dto.context as Prisma.InputJsonValue,
          ipAddress: dto.ipAddress ?? null,
          userAgent: dto.userAgent ?? null,
          requestId: dto.requestId ?? null,
        },
      });

      this.logger.debug(
        `Audit log created: ${dto.entityType}/${dto.entityId} - ${dto.action}`,
      );
    } catch (error) {
      // Log error but don't throw - audit failures shouldn't break operations
      this.logger.error(
        `Failed to create audit log: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Finds audit logs for a specific entity.
   * Returns entries ordered by createdAt descending (most recent first).
   */
  async findByEntity(
    organizationId: string,
    entityType: AuditEntityType,
    entityId: string,
    limit = 50,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Queries audit logs with filtering and pagination.
   * Supports filtering by entity type, entity ID, actor, category, and date range.
   */
  async query(
    organizationId: string,
    query: AuditLogQueryDto,
  ): Promise<AuditLogPaginatedResponseDto> {
    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.entityId && { entityId: query.entityId }),
      ...(query.actorUserId && { actorUserId: query.actorUserId }),
      ...(query.actionCategory && { actionCategory: query.actionCategory }),
      ...((query.startDate || query.endDate) && {
        createdAt: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        },
      }),
    };

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map((entry) => ({
        ...entry,
        changes: entry.changes as Record<
          string,
          { old: unknown; new: unknown }
        > | null,
        context: entry.context as Record<string, unknown> | null,
      })),
      total,
      limit,
      offset,
    };
  }
}
