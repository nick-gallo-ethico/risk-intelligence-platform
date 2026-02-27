/**
 * Context passed to action executors when a rule triggers.
 * Contains all information needed to execute the action.
 */
export interface ActionContext {
  /** Organization ID for tenant scoping (CRITICAL: must always be validated) */
  organizationId: string;

  /** Type of entity the rule was evaluated against (e.g., 'CASE', 'INVESTIGATION') */
  entityType: string;

  /** ID of the specific entity */
  entityId: string;

  /** ID of the rule that triggered this action */
  triggeredByRuleId: string;

  /** Actor type is always SYSTEM for rule-triggered actions */
  actorType: "SYSTEM";
}

/**
 * Result of action execution.
 * All actions return this structure for consistent handling.
 */
export interface ActionResult {
  /** Whether the action completed successfully */
  success: boolean;

  /** The type of action that was executed */
  actionType: string;

  /** Details about what was done (for audit logging) */
  details: Record<string, unknown>;

  /** Error message if action failed */
  error?: string;
}

/**
 * Base interface for rule action executors.
 *
 * Action executors are injectable services that handle specific
 * action types (assign_user, assign_team, etc.) when rules trigger.
 *
 * Each executor is registered with the RulesEngineService and
 * called when a matching action type is triggered.
 */
export interface RuleActionExecutor {
  /** Action type this executor handles (e.g., 'assign_user', 'assign_team') */
  readonly type: string;

  /**
   * Execute the action.
   *
   * @param params - Action parameters from rule definition (e.g., { userId: '...' })
   * @param context - Execution context with org, entity, and rule info
   * @returns Action result indicating success/failure and details
   */
  execute(
    params: Record<string, unknown>,
    context: ActionContext,
  ): Promise<ActionResult>;
}
