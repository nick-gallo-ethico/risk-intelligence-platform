/**
 * ImpersonationAuditLog Entity Description
 *
 * This file documents the ImpersonationAuditLog Prisma model for tracking
 * all actions performed during an impersonation session.
 *
 * AUDIT REQUIREMENTS (per CONTEXT.md):
 * Every cross-tenant action MUST log:
 * - Who (operator user ID via session)
 * - What (action type + entity affected)
 * - When (timestamp)
 * - Where (IP, user agent via session)
 * - Why (reason via session)
 * - Before/After (for mutations, stored in details)
 *
 * This provides:
 * 1. SOC 2 compliance - complete audit trail of internal access
 * 2. Security forensics - investigate any potential misuse
 * 3. Customer transparency - answer "who accessed our data" queries
 * 4. Undo capability - know exactly what was changed
 *
 * @see schema.prisma for the actual model definition
 * @see impersonation-session.entity.ts for session tracking
 */

/**
 * ImpersonationAuditLog captures every action during an impersonation session.
 *
 * Prisma model:
 * ```prisma
 * model ImpersonationAuditLog {
 *   id          String   @id @default(uuid())
 *   sessionId   String   @map("session_id")
 *   action      String
 *   entityType  String?  @map("entity_type")
 *   entityId    String?  @map("entity_id")
 *   details     Json?
 *   createdAt   DateTime @default(now()) @map("created_at")
 *
 *   // Relations
 *   session     ImpersonationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
 *
 *   @@index([sessionId])
 *   @@index([action])
 *   @@index([createdAt])
 *   @@map("impersonation_audit_logs")
 * }
 * ```
 */
export interface ImpersonationAuditLog {
  /** Unique identifier */
  id: string;

  /** FK to ImpersonationSession */
  sessionId: string;

  /** Action type (e.g., VIEW_CASE, UPDATE_USER, DELETE_WORKFLOW) */
  action: string;

  /** Type of entity affected (e.g., CASE, USER, WORKFLOW) */
  entityType: string | null;

  /** ID of the entity affected */
  entityId: string | null;

  /** Additional details (changes, before/after state) */
  details: Record<string, unknown> | null;

  /** Timestamp of the action */
  createdAt: Date;
}

/**
 * Standard action types for audit logging.
 * Use these constants for consistent action naming.
 */
export const ImpersonationAction = {
  // View actions (read-only)
  VIEW_CASE: "VIEW_CASE",
  VIEW_INVESTIGATION: "VIEW_INVESTIGATION",
  VIEW_RIU: "VIEW_RIU",
  VIEW_USER: "VIEW_USER",
  VIEW_CONFIG: "VIEW_CONFIG",
  VIEW_ERRORS: "VIEW_ERRORS",
  VIEW_JOBS: "VIEW_JOBS",
  VIEW_QA_QUEUE: "VIEW_QA_QUEUE",
  VIEW_DIRECTIVE: "VIEW_DIRECTIVE",
  VIEW_HEALTH_SCORE: "VIEW_HEALTH_SCORE",
  SEARCH_CASES: "SEARCH_CASES",
  SEARCH_USERS: "SEARCH_USERS",
  LIST_CAMPAIGNS: "LIST_CAMPAIGNS",

  // Update actions (mutations)
  UPDATE_CASE: "UPDATE_CASE",
  UPDATE_INVESTIGATION: "UPDATE_INVESTIGATION",
  UPDATE_RIU: "UPDATE_RIU",
  UPDATE_USER: "UPDATE_USER",
  UPDATE_CONFIG: "UPDATE_CONFIG",
  UPDATE_DIRECTIVE: "UPDATE_DIRECTIVE",
  APPROVE_QA: "APPROVE_QA",
  REJECT_QA: "REJECT_QA",

  // Create actions
  CREATE_USER: "CREATE_USER",
  CREATE_DIRECTIVE: "CREATE_DIRECTIVE",
  CREATE_WORKFLOW: "CREATE_WORKFLOW",
  RUN_MIGRATION: "RUN_MIGRATION",

  // Delete actions
  DELETE_USER: "DELETE_USER",
  DELETE_DIRECTIVE: "DELETE_DIRECTIVE",
  DELETE_WORKFLOW: "DELETE_WORKFLOW",
  ROLLBACK_MIGRATION: "ROLLBACK_MIGRATION",

  // Session actions
  SESSION_START: "SESSION_START",
  SESSION_END: "SESSION_END",
  SESSION_EXPIRED: "SESSION_EXPIRED",
} as const;

export type ImpersonationAction =
  (typeof ImpersonationAction)[keyof typeof ImpersonationAction];

/**
 * Entity types that can be affected by impersonation actions.
 */
export const ImpersonationEntityType = {
  CASE: "CASE",
  INVESTIGATION: "INVESTIGATION",
  RIU: "RIU",
  USER: "USER",
  ORGANIZATION: "ORGANIZATION",
  CONFIG: "CONFIG",
  WORKFLOW: "WORKFLOW",
  DIRECTIVE: "DIRECTIVE",
  CAMPAIGN: "CAMPAIGN",
  POLICY: "POLICY",
  MIGRATION: "MIGRATION",
  QA_ITEM: "QA_ITEM",
} as const;

export type ImpersonationEntityType =
  (typeof ImpersonationEntityType)[keyof typeof ImpersonationEntityType];

/**
 * DTO for creating an audit log entry.
 */
export interface CreateImpersonationAuditLogDto {
  sessionId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * DTO for audit log response with session context.
 */
export interface ImpersonationAuditLogResponse extends ImpersonationAuditLog {
  /** Operator name from session */
  operatorName: string;

  /** Organization name from session */
  organizationName: string;

  /** Reason from session */
  reason: string;

  /** Ticket ID from session */
  ticketId: string | null;
}

/**
 * Query parameters for audit log search.
 */
export interface AuditLogQueryParams {
  /** Filter by session ID */
  sessionId?: string;

  /** Filter by operator ID */
  operatorId?: string;

  /** Filter by organization ID */
  organizationId?: string;

  /** Filter by action type */
  action?: string;

  /** Filter by entity type */
  entityType?: string;

  /** Filter by entity ID */
  entityId?: string;

  /** Start date for time range */
  startDate?: Date;

  /** End date for time range */
  endDate?: Date;

  /** Pagination offset */
  offset?: number;

  /** Pagination limit */
  limit?: number;
}

/**
 * Helper to create audit details for update actions.
 * Captures before and after state for undo capability.
 */
export function createUpdateDetails<T extends Record<string, unknown>>(
  before: T,
  after: T,
  changedFields: (keyof T)[],
): Record<string, unknown> {
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  for (const field of changedFields) {
    if (before[field] !== after[field]) {
      changes[field as string] = {
        before: before[field],
        after: after[field],
      };
    }
  }

  return {
    changes,
    changedFieldCount: Object.keys(changes).length,
  };
}
