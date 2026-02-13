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
  | "sla_breached"
  // Additional activity types for HubSpot-style filtering
  | "note"
  | "email_sent"
  | "email_received"
  | "call_logged"
  | "interview_logged"
  | "document_uploaded"
  | "assignment_change"
  | "system_event";

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

export type ActivityVisibility = "internal" | "shared";

export interface ActivityChanges {
  [field: string]: {
    old: unknown;
    new: unknown;
  };
}

export interface ActivityComment {
  id: string;
  text: string;
  author: string;
  authorId: string;
  createdAt: string;
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
  // Extended fields for HubSpot-style activity management
  isPinned?: boolean;
  comments?: ActivityComment[];
  visibility?: ActivityVisibility;
  // Context for additional metadata (e.g., due dates for tasks)
  context?: Record<string, unknown> | null;
}

export interface ActivityListResponse {
  data: Activity[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Activity type categories for checkbox-style filtering
 * Maps to specific activity actions
 */
export type ActivityTypeFilter =
  | "notes"
  | "emails"
  | "calls"
  | "tasks"
  | "interviews"
  | "documents"
  | "status_changes"
  | "system_events";

/**
 * Mapping of filter types to activity actions
 */
export const ACTIVITY_TYPE_FILTER_ACTIONS: Record<
  ActivityTypeFilter,
  ActivityAction[]
> = {
  notes: ["note", "commented"],
  emails: ["email_sent", "email_received"],
  calls: ["call_logged"],
  tasks: ["task_created", "task_assigned", "task_completed"],
  interviews: ["interview_logged"],
  documents: ["file_uploaded", "document_uploaded"],
  status_changes: [
    "status_changed",
    "assignment_change",
    "assigned",
    "unassigned",
  ],
  system_events: [
    "created",
    "updated",
    "viewed",
    "exported",
    "approved",
    "rejected",
    "ai_generated",
    "synced",
    "sla_warning",
    "sla_updated",
    "sla_breached",
    "system_event",
  ],
};

/**
 * @deprecated Use ActivityTypeFilter for checkbox-style filtering
 */
export type ActivityFilterType = "all" | "notes" | "status" | "files";
