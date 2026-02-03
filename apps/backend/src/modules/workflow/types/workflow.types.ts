/**
 * Workflow Type Definitions
 *
 * These types define the structure of workflow configurations stored as JSON
 * in WorkflowTemplate.stages and WorkflowTemplate.transitions fields.
 */

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
  display?: {
    color?: string;
    icon?: string;
    sortOrder?: number;
  };
}

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
  type: "manual" | "automatic" | "approval" | "notification";

  /** Step-specific configuration */
  config?: Record<string, unknown>;

  /** How to assign this step */
  assigneeStrategy?: AssigneeStrategy;

  /** Timeout in hours (null = no timeout) */
  timeoutHours?: number;

  /** Action to take when step times out */
  onTimeout?: "pause" | "skip" | "escalate";

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
  type: "required_fields" | "approval" | "condition" | "time";

  /** Gate-specific configuration */
  config: Record<string, unknown>;

  /** Error message if gate fails */
  errorMessage?: string;
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

/**
 * Condition that must be met for a transition to be allowed.
 */
export interface TransitionCondition {
  /** Type of condition evaluation */
  type: "field" | "approval" | "time" | "expression";

  /** Condition-specific configuration */
  config: Record<string, unknown>;
}

/**
 * Action to execute when a transition occurs.
 */
export interface TransitionAction {
  /** Type of action to perform */
  type: "notification" | "assignment" | "field_update" | "webhook";

  /** Action-specific configuration */
  config: Record<string, unknown>;
}

/**
 * Strategy for assigning workflow steps.
 */
export type AssigneeStrategy =
  | { type: "specific_user"; userId: string }
  | { type: "round_robin"; teamId: string }
  | { type: "least_loaded"; teamId: string }
  | { type: "manager_of"; field: string }
  | { type: "team_queue"; teamId: string }
  | { type: "skill_based"; skillId: string }
  | { type: "geographic"; regionField: string };

/**
 * Result of a transition attempt.
 */
export interface TransitionResult {
  /** Whether the transition succeeded */
  success: boolean;

  /** Stage before the transition (empty if instance not found) */
  previousStage: string;

  /** Target stage of the transition */
  newStage: string;

  /** Error message if transition failed */
  error?: string;

  /** Actions that were executed (for successful transitions) */
  executedActions?: string[];
}

/**
 * Parameters for starting a new workflow instance.
 */
export interface StartWorkflowParams {
  organizationId: string;
  entityType: string;
  entityId: string;
  templateId?: string;
  actorUserId?: string;
}

/**
 * Parameters for transitioning a workflow instance.
 */
export interface TransitionParams {
  instanceId: string;
  toStage: string;
  actorUserId?: string;
  validateGates?: boolean;
  reason?: string;
}

/**
 * Parameters for completing a workflow instance.
 */
export interface CompleteWorkflowParams {
  instanceId: string;
  outcome?: string;
  actorUserId?: string;
}

/**
 * State of a completed step within a workflow instance.
 */
export interface StepState {
  status: "pending" | "in_progress" | "completed" | "skipped" | "failed";
  completedAt?: string;
  completedBy?: string;
  result?: Record<string, unknown>;
}

/**
 * Step states stored in WorkflowInstance.stepStates JSON field.
 */
export interface StepStates {
  [stepId: string]: StepState;
}
