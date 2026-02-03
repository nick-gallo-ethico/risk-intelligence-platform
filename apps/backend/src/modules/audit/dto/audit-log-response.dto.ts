import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";

/**
 * Response shape for a single audit log entry.
 */
export class AuditLogResponseDto {
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
  changes: Record<string, { old: unknown; new: unknown }> | null;
  context: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: Date;
}

/**
 * Paginated response for audit log queries.
 */
export class AuditLogPaginatedResponseDto {
  data: AuditLogResponseDto[];
  total: number;
  limit: number;
  offset: number;
}
