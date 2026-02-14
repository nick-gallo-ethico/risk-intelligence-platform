/**
 * Employee task types for the unified "My Tasks" view.
 * Aggregates tasks from multiple sources: campaigns, remediation, approvals.
 */

/**
 * TaskType identifies the source/nature of the task.
 */
export enum TaskType {
  /** Policy acknowledgment from attestation campaigns */
  ATTESTATION = "ATTESTATION",
  /** COI, gift, or other disclosure form from disclosure campaigns */
  DISCLOSURE = "DISCLOSURE",
  /** Approval request (e.g., disclosure approval for managers) */
  APPROVAL = "APPROVAL",
  /** Anonymous reporter communication follow-up */
  REPORT_FOLLOW_UP = "REPORT_FOLLOW_UP",
  /** Assigned remediation action from a remediation plan */
  REMEDIATION_STEP = "REMEDIATION_STEP",
}

/**
 * TaskStatus represents the current state of a task.
 * Calculated from the source entity's status and due date.
 */
export enum TaskStatus {
  /** Not started */
  PENDING = "PENDING",
  /** Past due date and not completed */
  OVERDUE = "OVERDUE",
  /** Started but not complete */
  IN_PROGRESS = "IN_PROGRESS",
  /** Done */
  COMPLETED = "COMPLETED",
}

/**
 * EmployeeTask is the unified task interface that abstracts
 * different task sources into a common structure.
 */
export interface EmployeeTask {
  /** Unique ID across all task types (prefixed by source type) */
  id: string;
  /** Type of task */
  type: TaskType;
  /** Current status */
  status: TaskStatus;
  /** Human-readable task name */
  title: string;
  /** Brief context about the task */
  description?: string;
  /** Due date (null for tasks without deadlines) */
  dueDate: Date | null;
  /** When the task was created/assigned */
  createdAt: Date;
  /** ID of the underlying entity */
  sourceId: string;
  /** Type of source entity (e.g., "CampaignAssignment", "RemediationStep") */
  sourceType: string;
  /** Type-specific additional data */
  metadata?: Record<string, unknown>;
  /** Deep link URL to complete the task */
  actionUrl: string;
}

/**
 * TaskCounts for badge display showing pending and overdue counts.
 */
export interface TaskCounts {
  /** Total active tasks (not completed) */
  total: number;
  /** Tasks that are pending (not started) */
  pending: number;
  /** Tasks that are past due date */
  overdue: number;
  /** Tasks completed recently (last 7 days) */
  completed: number;
}

/**
 * TaskFilters for filtering the task list.
 */
export interface TaskFilters {
  /** Filter by task types */
  types?: TaskType[];
  /** Filter by status */
  status?: TaskStatus[];
  /** Filter tasks due before this date */
  dueBefore?: Date;
  /** Filter tasks due after this date */
  dueAfter?: Date;
}

/**
 * Source type identifiers for task ID parsing and routing.
 */
export const TASK_SOURCE_TYPES = {
  CAMPAIGN_ASSIGNMENT: "campaign_assignment",
  REMEDIATION_STEP: "remediation_step",
  APPROVAL_REQUEST: "approval_request",
} as const;

export type TaskSourceType =
  (typeof TASK_SOURCE_TYPES)[keyof typeof TASK_SOURCE_TYPES];

/**
 * Helper to build a task ID from source type and source ID.
 * Format: {sourceType}-{sourceId}
 */
export function buildTaskId(
  sourceType: TaskSourceType,
  sourceId: string,
): string {
  return `${sourceType}-${sourceId}`;
}

/**
 * Helper to parse a task ID into source type and source ID.
 */
export function parseTaskId(taskId: string): {
  sourceType: TaskSourceType;
  sourceId: string;
} | null {
  const parts = taskId.split("-");
  if (parts.length < 2) return null;

  // Source type is everything before the last UUID segment
  // Format: source_type-uuid
  const sourceType = parts[0] as TaskSourceType;
  const sourceId = parts.slice(1).join("-");

  if (!Object.values(TASK_SOURCE_TYPES).includes(sourceType)) {
    return null;
  }

  return { sourceType, sourceId };
}
