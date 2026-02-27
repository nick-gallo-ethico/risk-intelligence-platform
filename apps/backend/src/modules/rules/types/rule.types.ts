/**
 * Types for the Rules Engine.
 *
 * These types define the structure of rule conditions, actions, and execution results.
 * Conditions follow the json-rules-engine format for evaluation compatibility.
 */

/**
 * Condition block for json-rules-engine.
 * Represents a single condition that evaluates a fact.
 */
export interface RuleConditionBlock {
  fact: string; // 'case.category', 'case.severity', 'case.location'
  operator: string; // 'equal', 'in', 'contains', 'greaterThan', custom operators
  value: unknown;
  path?: string; // JSON path for nested facts
}

/**
 * Root conditions structure.
 * Supports both 'all' (AND) and 'any' (OR) logic.
 */
export interface RuleConditions {
  all?: RuleConditionBlock[];
  any?: RuleConditionBlock[];
}

/**
 * Available action types for rules.
 */
export type RuleActionType =
  | "assign_user"
  | "assign_team"
  | "round_robin"
  | "set_priority"
  | "set_field"
  | "send_notification"
  | "add_tag";

/**
 * Action definition with type and parameters.
 */
export interface RuleAction {
  type: RuleActionType;
  params: Record<string, unknown>;
}

/**
 * Supported trigger events for rules.
 */
export type RuleTriggerEvent =
  | "case.created"
  | "case.updated"
  | "case.status_changed"
  | "investigation.created"
  | "investigation.status_changed"
  | "riu.released";

/**
 * Case details included in test samples.
 */
export interface RuleTestSampleCaseDetails {
  severity: string;
  categoryName: string | null;
  locationName: string | null;
  createdAt: Date;
}

/**
 * Sample case data from rule testing.
 */
export interface RuleTestSample {
  caseId: string;
  referenceNumber: string;
  wouldMatch: boolean;
  currentAssignee: string | null;
  predictedAssignee: string | null;
  caseDetails: RuleTestSampleCaseDetails;
}

/**
 * Result of testing a rule against historical data.
 */
export interface RuleTestResult {
  totalCases: number;
  matchedCases: number;
  matchRate: number;
  samples: RuleTestSample[];
  testedAt: Date;
}

/**
 * Filter options for listing rules.
 */
export interface RuleFilterOptions {
  triggerEvent?: string;
  isActive?: boolean;
}

/**
 * Execution log entry for audit.
 */
export interface RuleExecutionSummary {
  ruleId: string;
  ruleName: string;
  entityType: string;
  entityId: string;
  matched: boolean;
  actionsTaken: RuleAction[] | null;
  executionTimeMs: number;
  errorMessage: string | null;
  executedAt: Date;
}
