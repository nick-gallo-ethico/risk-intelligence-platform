import { Injectable, Logger } from "@nestjs/common";
import { Engine, Rule, TopLevelCondition } from "json-rules-engine";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { registerAllOperators } from "./operators";
import type {
  RuleActionExecutor,
  ActionContext,
  ActionResult,
} from "./actions/base.action";
import type { RuleAction, RuleConditions } from "../types/rule.types";

/**
 * Result of rule evaluation.
 */
export interface RuleEvaluationResult {
  /** Whether any rule matched */
  matched: boolean;
  /** ID of the matched rule (first match wins) */
  matchedRuleId?: string;
  /** Name of the matched rule */
  matchedRuleName?: string;
  /** Actions triggered by the matched rule */
  triggeredActions: RuleAction[];
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Facts snapshot for audit logging */
  facts: Record<string, unknown>;
}

/**
 * Result of action execution phase.
 */
export interface ActionExecutionResult {
  /** ID of the rule that triggered these actions */
  ruleId: string;
  /** Results from each action execution */
  actions: ActionResult[];
  /** Whether all actions completed successfully */
  allSuccessful: boolean;
}

/**
 * RulesEngineService wraps json-rules-engine for domain rule evaluation.
 *
 * Key design decisions:
 * - Fresh engine instance per evaluation (tenant isolation, no cache pollution)
 * - Custom operators for domain-specific conditions (category, severity, location)
 * - Priority-based rule matching (lower priority number = higher priority)
 * - First matching rule wins (stop on first match)
 *
 * Usage:
 * 1. Call evaluate() with organization, trigger event, and facts
 * 2. If matched, call executeActions() with triggered actions
 * 3. Call logExecution() to record audit trail
 */
@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);
  private actionExecutors: Map<string, RuleActionExecutor> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register an action executor for a specific action type.
   * Called during module initialization to register all action handlers.
   *
   * @param executor - Action executor instance
   */
  registerActionExecutor(executor: RuleActionExecutor): void {
    this.actionExecutors.set(executor.type, executor);
    this.logger.log(`Registered action executor: ${executor.type}`);
  }

  /**
   * Get all registered action executors.
   * Useful for debugging and testing.
   *
   * @returns Array of registered action types
   */
  getRegisteredActionTypes(): string[] {
    return Array.from(this.actionExecutors.keys());
  }

  /**
   * Evaluate all active rules for a trigger event.
   *
   * CRITICAL: Creates fresh Engine instance per evaluation for tenant isolation.
   * Never cache the Engine instance - facts would leak across tenants.
   *
   * @param organizationId - Tenant ID (CRITICAL for isolation)
   * @param triggerEvent - Event type (e.g., 'case.created')
   * @param facts - Facts to evaluate against
   * @returns Evaluation result with matched rule and actions
   */
  async evaluate(
    organizationId: string,
    triggerEvent: string,
    facts: Record<string, unknown>,
  ): Promise<RuleEvaluationResult> {
    const startTime = Date.now();

    // Load active rules for this org and event (tenant-scoped!)
    const rules = await this.prisma.ruleDefinition.findMany({
      where: {
        organizationId,
        triggerEvent,
        isActive: true,
      },
      orderBy: { priority: "asc" }, // Lower priority number = higher priority
    });

    if (rules.length === 0) {
      this.logger.debug(
        `No active rules for org ${organizationId}, event ${triggerEvent}`,
      );
      return {
        matched: false,
        triggeredActions: [],
        executionTimeMs: Date.now() - startTime,
        facts,
      };
    }

    // Create fresh engine instance (CRITICAL: no cross-tenant cache pollution)
    const engine = new Engine();
    registerAllOperators(engine);

    // Add rules to engine
    for (const rule of rules) {
      const conditions = rule.conditions as unknown as RuleConditions;
      const actions = rule.actions as unknown as RuleAction[];

      engine.addRule(
        new Rule({
          name: rule.id,
          conditions: conditions as unknown as TopLevelCondition,
          event: {
            type: rule.id,
            params: {
              ruleId: rule.id,
              ruleName: rule.name,
              actions,
            },
          },
          priority: rule.priority,
        }),
      );
    }

    // Evaluate facts
    const { events } = await engine.run(facts);
    const executionTimeMs = Date.now() - startTime;

    // Take first matching rule (highest priority wins)
    const matchedEvent = events[0];

    if (!matchedEvent) {
      this.logger.debug(
        `No rules matched for org ${organizationId}, event ${triggerEvent}`,
      );
      return {
        matched: false,
        triggeredActions: [],
        executionTimeMs,
        facts,
      };
    }

    this.logger.log(
      `Rule matched: ${matchedEvent.params?.ruleName} (${matchedEvent.params?.ruleId}) in ${executionTimeMs}ms`,
    );

    return {
      matched: true,
      matchedRuleId: matchedEvent.params?.ruleId as string,
      matchedRuleName: matchedEvent.params?.ruleName as string,
      triggeredActions: (matchedEvent.params?.actions as RuleAction[]) || [],
      executionTimeMs,
      facts,
    };
  }

  /**
   * Evaluate a single rule definition against facts (for testing/preview).
   * Does not require rule to be persisted in database.
   *
   * @param ruleDefinition - Rule conditions and priority
   * @param facts - Facts to evaluate against
   * @param _options - Reserved for future options (e.g., dryRun)
   * @returns Whether the rule matched
   */
  async evaluateRule(
    ruleDefinition: { conditions: RuleConditions; priority?: number },
    facts: Record<string, unknown>,
    _options: { dryRun?: boolean } = {},
  ): Promise<boolean> {
    const engine = new Engine();
    registerAllOperators(engine);

    engine.addRule(
      new Rule({
        name: "test-rule",
        conditions: ruleDefinition.conditions as unknown as TopLevelCondition,
        event: { type: "match" },
        priority: ruleDefinition.priority || 1,
      }),
    );

    const { events } = await engine.run(facts);
    return events.length > 0;
  }

  /**
   * Execute triggered actions from rule evaluation.
   * Calls registered action executors for each action type.
   *
   * @param actions - Actions to execute
   * @param context - Execution context with org, entity, and rule info
   * @returns Results from all action executions
   */
  async executeActions(
    actions: RuleAction[],
    context: ActionContext,
  ): Promise<ActionExecutionResult> {
    const results: ActionResult[] = [];

    for (const action of actions) {
      const executor = this.actionExecutors.get(action.type);

      if (!executor) {
        this.logger.warn(
          `No executor registered for action type: ${action.type}`,
        );
        results.push({
          success: false,
          actionType: action.type,
          details: action.params,
          error: `No executor registered for action type: ${action.type}`,
        });
        continue;
      }

      try {
        const result = await executor.execute(action.params, context);
        results.push(result);

        if (!result.success) {
          this.logger.warn(`Action ${action.type} failed: ${result.error}`);
        }
      } catch (error) {
        this.logger.error(
          `Action execution failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        results.push({
          success: false,
          actionType: action.type,
          details: action.params,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      ruleId: context.triggeredByRuleId,
      actions: results,
      allSuccessful: results.every((r) => r.success),
    };
  }

  /**
   * Log rule execution to audit trail.
   * Should be called after every rule evaluation for compliance.
   *
   * @param organizationId - Tenant ID
   * @param ruleId - Rule that was evaluated
   * @param entityType - Type of entity evaluated (e.g., 'CASE')
   * @param entityId - ID of the entity
   * @param result - Evaluation result
   * @param actionResults - Optional results from action execution
   */
  async logExecution(
    organizationId: string,
    ruleId: string,
    entityType: string,
    entityId: string,
    result: RuleEvaluationResult,
    actionResults?: ActionResult[],
  ): Promise<void> {
    await this.prisma.ruleExecutionLog.create({
      data: {
        organizationId,
        ruleId,
        entityType,
        entityId,
        facts: result.facts as Prisma.InputJsonValue,
        matched: result.matched,
        actionsTaken: actionResults
          ? (actionResults as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        executionTimeMs: result.executionTimeMs,
      },
    });

    this.logger.debug(
      `Logged execution for rule ${ruleId} on ${entityType}:${entityId}`,
    );
  }
}
