/**
 * Activity entity types - matches backend AuditLog schema
 */

export type ActivityAction =
  | "created"
  | "updated"
  | "status_changed"
  | "assigned"
  | "unassigned"
  | "commented"
  | "file_uploaded"
  | "viewed"
  | "exported"
  | "approved"
  | "rejected"
  | "ai_generated"
  | "synced"
  // Task-related actions for upcoming items
  | "task_created"
  | "task_assigned"
  | "task_completed"
  // SLA-related actions
  | "sla_warning"
  | "sla_updated"
  | "sla_breached";

export type ActivityEntityType =
  | "CASE"
  | "INVESTIGATION"
  | "DISCLOSURE"
  | "POLICY"
  | "ATTESTATION"
  | "WORKFLOW"
  | "USER"
  | "EMPLOYEE";

export type ActorType = "USER" | "SYSTEM" | "AI" | "INTEGRATION" | "ANONYMOUS";

export interface ActivityChanges {
  [field: string]: {
    old: unknown;
    new: unknown;
  };
}

export interface Activity {
  id: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  actionDescription: string;
  changes: ActivityChanges | null;
  actorUserId: string | null;
  actorType: ActorType;
  actorName: string | null;
  createdAt: string;
}

export interface ActivityListResponse {
  data: Activity[];
  total: number;
  limit: number;
  offset: number;
}

export type ActivityFilterType = "all" | "notes" | "status" | "files";
