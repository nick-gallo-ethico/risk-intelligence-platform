/**
 * Common Workflow Type Definitions
 *
 * Re-exports workflow types from the workflow module for use in common utilities.
 * The canonical definitions are in apps/backend/src/modules/workflow/types/workflow.types.ts
 *
 * This barrel file provides convenient access from @common/types
 * for services that need workflow types without depending on the workflow module.
 */

export {
  WorkflowStage,
  WorkflowStep,
  StageGate,
  WorkflowTransition,
  TransitionCondition,
  TransitionAction,
  AssigneeStrategy,
  TransitionResult,
  StartWorkflowParams,
  TransitionParams,
  CompleteWorkflowParams,
  StepState,
  StepStates,
} from "../../modules/workflow/types/workflow.types";
