/**
 * UnifiedTask Entity
 *
 * Represents a task aggregated from multiple entity types (Cases, Investigations,
 * Disclosures, Campaigns, etc.) into a unified work queue.
 *
 * This entity is not stored in the database - it's a runtime representation
 * that merges tasks from various sources into a single sortable queue.
 */

/**
 * Task types correspond to different source entities.
 * Each type maps to a specific entity table in the database.
 */
export enum TaskType {
  /** Case assigned to user for triage or investigation */
  CASE_ASSIGNMENT = "case_assignment",
  /** Investigation step requiring action */
  INVESTIGATION_STEP = "investigation_step",
  /** Remediation action item */
  REMEDIATION_TASK = "remediation_task",
  /** Disclosure requiring review (conflict alert) */
  DISCLOSURE_REVIEW = "disclosure_review",
  /** Campaign assignment (disclosure, attestation, survey response) */
  CAMPAIGN_RESPONSE = "campaign_response",
  /** Workflow approval request */
  APPROVAL_REQUEST = "approval_request",
  /** Project task from Monday.com-style project board */
  PROJECT_TASK = "project_task",
}

/**
 * Priority levels for tasks.
 * Used in priority-weighted due date sorting.
 */
export enum TaskPriority {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * Task status indicating current state.
 */
export enum TaskStatus {
  /** Task not yet started */
  PENDING = "pending",
  /** Task currently being worked on */
  IN_PROGRESS = "in_progress",
  /** Task past due date */
  OVERDUE = "overdue",
}

/**
 * Priority weights used for sorting.
 * Higher weight = more urgent at same time distance.
 */
export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  [TaskPriority.CRITICAL]: 4,
  [TaskPriority.HIGH]: 3,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 1,
};

/**
 * UnifiedTask represents any actionable work item from any module.
 * Provides a consistent interface for the "My Work" queue.
 */
export interface UnifiedTask {
  /**
   * Composite ID in format: {type}-{sourceId}
   * e.g., "case_assignment-abc123", "investigation_step-def456"
   */
  id: string;

  /** The type of task (determines which entity it came from) */
  type: TaskType;

  /** The source entity type name (e.g., 'Case', 'Investigation', 'ConflictAlert') */
  entityType: string;

  /** The source entity's database ID */
  entityId: string;

  /** Human-readable task title */
  title: string;

  /** Optional detailed description */
  description?: string;

  /** When the task is due (null if no deadline) */
  dueDate: Date | null;

  /** Task priority level */
  priority: TaskPriority;

  /** Current task status */
  status: TaskStatus;

  /** When the task was assigned/created */
  assignedAt: Date;

  /** User ID the task is assigned to (undefined for available/claimable tasks) */
  assigneeId?: string;

  /** Additional type-specific metadata */
  metadata: Record<string, unknown>;

  // Navigation

  /** Deep link URL to the entity (relative path) */
  url: string;

  // Context (optional fields for display)

  /** Case reference number if task relates to a case */
  caseNumber?: string;

  /** Category name for classification context */
  categoryName?: string;

  /** Severity level if applicable */
  severity?: string;

  /** Organization ID for tenant isolation */
  organizationId: string;
}

/**
 * TaskSection groups tasks under a heading (e.g., "My Tasks", "Available").
 */
export interface TaskSection {
  /** Section title */
  title: string;

  /** Tasks in this section */
  tasks: UnifiedTask[];

  /** Total count (may differ from tasks.length if paginated) */
  count: number;
}

/**
 * Grouped tasks for alternative view modes.
 */
export interface TaskGroup {
  /** Group key (entity type, due date bucket, etc.) */
  key: string;

  /** Group display label */
  label: string;

  /** Tasks in this group */
  tasks: UnifiedTask[];

  /** Total count */
  count: number;
}

/**
 * Task counts by type for dashboard widgets.
 */
export type TaskCountsByType = Record<TaskType, number>;
