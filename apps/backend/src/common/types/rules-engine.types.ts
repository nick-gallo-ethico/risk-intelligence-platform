/**
 * Rules Engine Type Definitions
 *
 * Types compatible with json-rules-engine for threshold and automation rules.
 * Replaces untyped `any` in rule condition and action definitions.
 */

/**
 * Operators supported by the rules engine.
 */
export type RuleOperator =
  | "equal"
  | "notEqual"
  | "greaterThan"
  | "greaterThanInclusive"
  | "lessThan"
  | "lessThanInclusive"
  | "in"
  | "notIn"
  | "contains"
  | "doesNotContain";

/**
 * Shorthand operators used in DTO definitions.
 */
export type ConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains";

/**
 * Maps shorthand operators to json-rules-engine operators.
 */
export const OPERATOR_MAP: Record<ConditionOperator, RuleOperator> = {
  eq: "equal",
  neq: "notEqual",
  gt: "greaterThan",
  gte: "greaterThanInclusive",
  lt: "lessThan",
  lte: "lessThanInclusive",
  in: "in",
  not_in: "notIn",
  contains: "contains",
};

/**
 * Single condition in a rule.
 * Compatible with json-rules-engine condition format.
 */
export interface RuleCondition {
  /** Fact name to evaluate */
  fact: string;
  /** Comparison operator */
  operator: RuleOperator;
  /** Value to compare against */
  value: unknown;
  /** JSON path for nested fact values */
  path?: string;
  /** Priority for evaluation order (lower = earlier) */
  priority?: number;
}

/**
 * Condition as used in DTOs (shorthand operators).
 */
export interface RuleConditionDto {
  /** Field name to evaluate */
  field: string;
  /** Comparison operator (shorthand) */
  operator: ConditionOperator;
  /** Value to compare against */
  value: unknown;
  /** Conjunction with next condition */
  conjunction?: "AND" | "OR";
}

/**
 * Action to execute when a rule fires.
 */
export interface RuleAction {
  /** Type of action */
  type: string;
  /** Action-specific parameters */
  params: Record<string, unknown>;
}

/**
 * Action configuration for threshold rules.
 */
export interface ThresholdActionConfig {
  /** User/team to notify */
  notifyUserId?: string;
  notifyTeamId?: string;
  /** Case creation settings */
  caseTemplateId?: string;
  caseAssigneeId?: string;
  casePriority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** Approval settings */
  approverUserId?: string;
  approverTeamId?: string;
  /** Custom message for notifications */
  message?: string;
}

/**
 * Aggregate configuration for rolling window calculations.
 */
export interface AggregateConfig {
  /** Aggregate function to apply */
  aggregateFunction: "SUM" | "COUNT" | "AVG" | "MAX" | "MIN";
  /** Time window configuration */
  timeWindow?: {
    period: "days" | "months" | "years";
    value: number;
    type: "rolling" | "calendar";
  };
  /** Dimensions to group by */
  dimensions?: ("person" | "entity" | "category" | "businessUnit")[];
}

/**
 * Complete threshold rule structure.
 * Compatible with json-rules-engine Rule format.
 */
export interface ThresholdRule {
  /** Conditions that must all be met (AND) or any be met (ANY) */
  conditions: {
    all?: RuleCondition[];
    any?: RuleCondition[];
  };
  /** Event to emit when rule fires */
  event: {
    type: string;
    params: Record<string, unknown>;
  };
  /** Rule priority (higher = evaluated first) */
  priority?: number;
  /** Rule name for identification */
  name?: string;
}

/**
 * Result of evaluating a threshold rule.
 */
export interface RuleEvaluationResult {
  /** Whether the rule triggered */
  triggered: boolean;
  /** Computed value that was evaluated */
  evaluatedValue: number;
  /** Threshold value it was compared against */
  thresholdValue: number;
  /** Breakdown of aggregate calculation (if applicable) */
  aggregateBreakdown?: {
    relatedDisclosures: Array<{ id: string; date: Date; value: number }>;
    totalValue: number;
    windowStart: Date;
    windowEnd: Date;
  };
}

/**
 * Converts a DTO condition to a json-rules-engine condition.
 */
export function toEngineCondition(dto: RuleConditionDto): RuleCondition {
  return {
    fact: dto.field,
    operator: OPERATOR_MAP[dto.operator],
    value: dto.value,
  };
}

/**
 * Builds json-rules-engine conditions structure from DTOs.
 */
export function buildEngineConditions(
  conditions: RuleConditionDto[],
): ThresholdRule["conditions"] {
  if (conditions.length === 0) {
    return { all: [] };
  }

  const engineConditions = conditions.map(toEngineCondition);

  // Check for OR conjunction
  const hasOr = conditions.some((c) => c.conjunction === "OR");
  if (hasOr) {
    return { any: engineConditions };
  }

  return { all: engineConditions };
}
