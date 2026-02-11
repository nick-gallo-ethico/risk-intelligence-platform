/**
 * Workflow Types
 *
 * Type definitions for the workflow engine feature matching backend models
 * and API responses. Used by the Workflow Builder UI and workflow management pages.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Entity types that can have workflows attached.
 */
export type WorkflowEntityType =
  | "CASE"
  | "INVESTIGATION"
  | "DISCLOSURE"
  | "POLICY"
  | "CAMPAIGN";

/**
 * Status of a workflow instance.
 */
export type WorkflowInstanceStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "PAUSED";

/**
 * SLA tracking status for workflow instances.
 */
export type SlaStatus = "ON_TRACK" | "WARNING" | "OVERDUE";

/**
 * Status of a step within a workflow instance.
 */
export type StepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped"
  | "failed";

/**
 * Type of workflow step execution.
 */
export type StepType = "manual" | "automatic" | "approval" | "notification";

/**
 * Action to take when a step times out.
 */
export type TimeoutAction = "pause" | "skip" | "escalate";

/**
 * Type of gate validation.
 */
export type GateType = "required_fields" | "approval" | "condition" | "time";

/**
 * Type of transition condition evaluation.
 */
export type ConditionType = "field" | "approval" | "time" | "expression";

/**
 * Type of transition action.
 */
export type ActionType =
  | "notification"
  | "assignment"
  | "field_update"
  | "webhook";

// ============================================================================
// Assignee Strategy Types
// ============================================================================

/**
 * Strategy for assigning workflow steps to users.
 */
export type AssigneeStrategy =
  | { type: "specific_user"; userId: string }
  | { type: "round_robin"; teamId: string }
  | { type: "least_loaded"; teamId: string }
  | { type: "manager_of"; field: string }
  | { type: "team_queue"; teamId: string }
  | { type: "skill_based"; skillId: string }
  | { type: "geographic"; regionField: string };

// ============================================================================
// Stage, Step, Gate Definitions
// ============================================================================

/**
 * Defines a step within a workflow stage.
 * Steps can be manual tasks, automatic actions, approvals, or notifications.
 */
export interface WorkflowStep {
  /** Unique identifier for the step */
  id: string;

  /** Display name for the step */
  name: string;

  /** Type of step execution */
  type: StepType;

  /** Step-specific configuration */
  config?: Record<string, unknown>;

  /** How to assign this step */
  assigneeStrategy?: AssigneeStrategy;

  /** Timeout in hours (undefined = no timeout) */
  timeoutHours?: number;

  /** Action to take when step times out */
  onTimeout?: TimeoutAction;

  /** Whether this step can be skipped */
  isOptional?: boolean;

  /** Description of what this step accomplishes */
  description?: string;
}

/**
 * Gate that must be satisfied before a stage transition.
 * Used to enforce business rules before progression.
 */
export interface StageGate {
  /** Type of gate validation */
  type: GateType;

  /** Gate-specific configuration */
  config: Record<string, unknown>;

  /** Error message if gate fails */
  errorMessage?: string;
}

/**
 * UI display configuration for a stage.
 */
export interface StageDisplay {
  /** Color for the stage (hex or CSS color) */
  color?: string;

  /** Icon name for the stage */
  icon?: string;

  /** Sort order for display */
  sortOrder?: number;
}

/**
 * Defines a stage in the workflow pipeline.
 * Stages contain steps and can have gates that block transitions.
 */
export interface WorkflowStage {
  /** Unique identifier for the stage (e.g., 'new', 'investigation', 'closed') */
  id: string;

  /** Display name for the stage */
  name: string;

  /** Optional description of the stage */
  description?: string;

  /** Steps within this stage (executed in order or parallel based on config) */
  steps: WorkflowStep[];

  /** SLA days for this specific stage (overrides workflow default) */
  slaDays?: number;

  /** Gates that must be satisfied before transitioning out of this stage */
  gates?: StageGate[];

  /** Whether this is a terminal stage (no outgoing transitions) */
  isTerminal?: boolean;

  /** UI display configuration */
  display?: StageDisplay;
}

// ============================================================================
// Transition Definitions
// ============================================================================

/**
 * Condition that must be met for a transition to be allowed.
 */
export interface TransitionCondition {
  /** Type of condition evaluation */
  type: ConditionType;

  /** Condition-specific configuration */
  config: Record<string, unknown>;
}

/**
 * Action to execute when a transition occurs.
 */
export interface TransitionAction {
  /** Type of action to perform */
  type: ActionType;

  /** Action-specific configuration */
  config: Record<string, unknown>;
}

/**
 * Defines an allowed transition between stages.
 * from='*' means transition is allowed from any stage.
 */
export interface WorkflowTransition {
  /** Source stage ID (or '*' for any) */
  from: string;

  /** Target stage ID */
  to: string;

  /** Conditions that must be met for this transition */
  conditions?: TransitionCondition[];

  /** Actions to execute when this transition occurs */
  actions?: TransitionAction[];

  /** Display name for this transition (e.g., 'Close Case', 'Escalate') */
  label?: string;

  /** Roles that can trigger this transition */
  allowedRoles?: string[];

  /** Whether this transition requires a reason */
  requiresReason?: boolean;
}

// ============================================================================
// Workflow Template
// ============================================================================

/**
 * SLA configuration for workflows.
 */
export interface SlaConfig {
  /** Enable SLA tracking */
  enabled: boolean;

  /** Warning threshold in hours before due date */
  warningThresholdHours?: number;

  /** Escalation email addresses */
  escalationEmails?: string[];
}

/**
 * Workflow template defining stages, transitions, and behavior.
 */
export interface WorkflowTemplate {
  /** Unique identifier */
  id: string;

  /** Organization ID (tenant) */
  organizationId: string;

  /** Template name */
  name: string;

  /** Optional description */
  description?: string;

  /** Entity type this workflow applies to */
  entityType: WorkflowEntityType;

  /** Template version (increments on publish with active instances) */
  version: number;

  /** Whether this template is active and can be used */
  isActive: boolean;

  /** Whether this is the default template for its entity type */
  isDefault: boolean;

  /** Stages in this workflow */
  stages: WorkflowStage[];

  /** Allowed transitions between stages */
  transitions: WorkflowTransition[];

  /** Initial stage when workflow starts */
  initialStage: string;

  /** Default SLA days for the workflow */
  defaultSlaDays?: number;

  /** SLA configuration */
  slaConfig?: SlaConfig;

  /** Source template ID if this was cloned/versioned */
  sourceTemplateId?: string;

  /** Tags for categorization */
  tags: string[];

  /** User who created this template */
  createdById?: string;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Number of active instances (enriched field from API) */
  _instanceCount?: number;
}

// ============================================================================
// Workflow Instance
// ============================================================================

/**
 * State of a completed step within a workflow instance.
 */
export interface StepState {
  /** Current status of the step */
  status: StepStatus;

  /** When the step was completed */
  completedAt?: string;

  /** User ID who completed the step */
  completedBy?: string;

  /** Result data from the step */
  result?: Record<string, unknown>;
}

/**
 * Step states stored in WorkflowInstance.stepStates.
 * Maps step IDs to their states.
 */
export type StepStates = Record<string, StepState>;

/**
 * Active instance of a workflow attached to an entity.
 */
export interface WorkflowInstance {
  /** Unique identifier */
  id: string;

  /** Organization ID (tenant) */
  organizationId: string;

  /** Template ID this instance is based on */
  templateId: string;

  /** Template version (frozen at instance creation) */
  templateVersion: number;

  /** Entity type this workflow is attached to */
  entityType: WorkflowEntityType;

  /** Entity ID this workflow is attached to */
  entityId: string;

  /** Current stage ID */
  currentStage: string;

  /** Current step ID (within current stage) */
  currentStep?: string;

  /** Instance status */
  status: WorkflowInstanceStatus;

  /** States of all steps */
  stepStates: StepStates;

  /** Due date for SLA tracking */
  dueDate?: string;

  /** SLA status */
  slaStatus?: SlaStatus;

  /** When SLA was breached (if applicable) */
  slaBreachedAt?: string;

  /** When the workflow was completed */
  completedAt?: string;

  /** Outcome of the workflow (e.g., 'resolved', 'dismissed') */
  outcome?: string;

  /** User who started this workflow */
  startedById?: string;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Template reference (included in some API responses) */
  template?: {
    id: string;
    name: string;
    version: number;
  };
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a workflow stage.
 */
export interface CreateWorkflowStageDto {
  id: string;
  name: string;
  description?: string;
  steps?: WorkflowStep[];
  slaDays?: number;
  gates?: StageGate[];
  isTerminal?: boolean;
  display?: StageDisplay;
}

/**
 * DTO for creating a workflow transition.
 */
export interface CreateWorkflowTransitionDto {
  from: string;
  to: string;
  label?: string;
  conditions?: TransitionCondition[];
  actions?: TransitionAction[];
  allowedRoles?: string[];
  requiresReason?: boolean;
}

/**
 * DTO for creating a new workflow template.
 */
export interface CreateWorkflowTemplateDto {
  name: string;
  description?: string;
  entityType: WorkflowEntityType;
  stages: CreateWorkflowStageDto[];
  transitions: CreateWorkflowTransitionDto[];
  initialStage: string;
  defaultSlaDays?: number;
  tags?: string[];
  isDefault?: boolean;
}

/**
 * DTO for updating a workflow template.
 * All fields are optional.
 */
export interface UpdateWorkflowTemplateDto {
  name?: string;
  description?: string;
  stages?: CreateWorkflowStageDto[];
  transitions?: CreateWorkflowTransitionDto[];
  initialStage?: string;
  defaultSlaDays?: number;
  tags?: string[];
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * DTO for starting a new workflow instance.
 */
export interface StartWorkflowDto {
  entityType: WorkflowEntityType;
  entityId: string;
  templateId?: string;
}

/**
 * DTO for transitioning a workflow instance.
 */
export interface TransitionDto {
  toStage: string;
  validateGates?: boolean;
  reason?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Generic paginated response.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Response for workflow template list.
 */
export type WorkflowTemplateListResponse = PaginatedResponse<WorkflowTemplate>;

/**
 * Response for workflow instance list.
 */
export type WorkflowInstanceListResponse = PaginatedResponse<WorkflowInstance>;

/**
 * Result of a transition attempt.
 */
export interface TransitionResult {
  /** Whether the transition succeeded */
  success: boolean;

  /** Stage before the transition */
  previousStage: string;

  /** Target stage of the transition */
  newStage: string;

  /** Error message if transition failed */
  error?: string;

  /** Actions that were executed (for successful transitions) */
  executedActions?: string[];
}

/**
 * Allowed transition for UI rendering.
 */
export interface AllowedTransition {
  /** Target stage ID */
  to: string;

  /** Display label */
  label?: string;

  /** Whether a reason is required */
  requiresReason: boolean;
}

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for listing workflow templates.
 */
export interface WorkflowTemplateQueryParams {
  entityType?: WorkflowEntityType;
  isActive?: boolean;
}

/**
 * Query parameters for listing workflow instances.
 */
export interface WorkflowInstanceQueryParams {
  templateId?: string;
  status?: WorkflowInstanceStatus;
  entityType?: WorkflowEntityType;
  page?: number;
  limit?: number;
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Display labels for entity types.
 */
export const WORKFLOW_ENTITY_TYPE_LABELS: Record<WorkflowEntityType, string> = {
  CASE: "Case",
  INVESTIGATION: "Investigation",
  DISCLOSURE: "Disclosure",
  POLICY: "Policy",
  CAMPAIGN: "Campaign",
};

/**
 * Display labels for instance statuses.
 */
export const WORKFLOW_INSTANCE_STATUS_LABELS: Record<
  WorkflowInstanceStatus,
  string
> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PAUSED: "Paused",
};

/**
 * CSS classes for instance status badges.
 */
export const WORKFLOW_INSTANCE_STATUS_COLORS: Record<
  WorkflowInstanceStatus,
  string
> = {
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
};

/**
 * Display labels for SLA statuses.
 */
export const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  ON_TRACK: "On Track",
  WARNING: "Warning",
  OVERDUE: "Overdue",
};

/**
 * CSS classes for SLA status badges.
 */
export const SLA_STATUS_COLORS: Record<SlaStatus, string> = {
  ON_TRACK: "bg-green-100 text-green-800",
  WARNING: "bg-yellow-100 text-yellow-800",
  OVERDUE: "bg-red-100 text-red-800",
};

/**
 * Display labels for step statuses.
 */
export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
  failed: "Failed",
};

/**
 * Display labels for step types.
 */
export const STEP_TYPE_LABELS: Record<StepType, string> = {
  manual: "Manual Task",
  automatic: "Automatic",
  approval: "Approval",
  notification: "Notification",
};
