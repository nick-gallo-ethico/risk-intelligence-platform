/**
 * Rules Engine Types
 *
 * TypeScript types for the routing rules management system.
 * Matches the backend RulesModule data structures.
 */

// ============================================================================
// Condition Types
// ============================================================================

/**
 * Rule condition block for json-rules-engine.
 */
export interface RuleConditionBlock {
  fact: string;
  operator: string;
  value: unknown;
  path?: string;
}

/**
 * Root conditions structure.
 */
export interface RuleConditions {
  all?: RuleConditionBlock[];
  any?: RuleConditionBlock[];
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Rule action types.
 */
export type RuleActionType =
  | "assign_user"
  | "assign_team"
  | "round_robin"
  | "set_priority";

/**
 * Rule action definition.
 */
export interface RuleAction {
  type: RuleActionType;
  params: Record<string, unknown>;
}

// ============================================================================
// Trigger Events
// ============================================================================

/**
 * Trigger events that can start rule evaluation.
 */
export type RuleTriggerEvent =
  | "case.created"
  | "case.updated"
  | "investigation.status_changed";

// ============================================================================
// Test Result Types
// ============================================================================

/**
 * Test result sample.
 */
export interface RuleTestSample {
  caseId: string;
  referenceNumber: string;
  wouldMatch: boolean;
  currentAssignee: string | null;
  predictedAssignee: string | null;
  caseDetails?: {
    severity: string;
    categoryName?: string;
    locationName?: string;
    createdAt: string;
  };
}

/**
 * Test results from rule testing.
 */
export interface RuleTestResult {
  totalCases: number;
  matchedCases: number;
  matchRate: number;
  samples: RuleTestSample[];
  testedAt: string;
}

// ============================================================================
// Rule Definition Types
// ============================================================================

/**
 * Rule definition from API.
 */
export interface RuleDefinition {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  priority: number;
  isActive: boolean;
  triggerEvent: RuleTriggerEvent;
  conditions: RuleConditions;
  actions: RuleAction[];
  lastTestedAt?: string;
  testResults?: RuleTestResult;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

/**
 * Create rule request.
 */
export interface CreateRuleRequest {
  name: string;
  description?: string;
  priority?: number;
  triggerEvent: RuleTriggerEvent;
  conditions: RuleConditions;
  actions: RuleAction[];
}

/**
 * Update rule request.
 */
export interface UpdateRuleRequest extends Partial<CreateRuleRequest> {
  isActive?: boolean;
}

/**
 * Test rule request.
 */
export interface TestRuleRequest {
  limit?: number;
  dateFrom?: string;
  categoryIds?: string[];
  severities?: string[];
}

// ============================================================================
// Execution Log Types
// ============================================================================

/**
 * Rule execution log entry.
 */
export interface RuleExecutionLog {
  id: string;
  ruleId: string;
  entityType: string;
  entityId: string;
  facts: Record<string, unknown>;
  matched: boolean;
  actionsTaken: unknown[];
  executionTimeMs: number;
  errorMessage?: string;
  executedAt: string;
}

// ============================================================================
// UI Constants
// ============================================================================

/**
 * Available operators for conditions.
 */
export const RULE_OPERATORS = [
  { value: "equal", label: "Equals" },
  { value: "notEqual", label: "Not equals" },
  { value: "in", label: "Is in list" },
  { value: "notIn", label: "Is not in list" },
  { value: "contains", label: "Contains" },
  { value: "greaterThan", label: "Greater than" },
  { value: "lessThan", label: "Less than" },
  { value: "categoryIn", label: "Category is in" },
  { value: "severityAtLeast", label: "Severity at least" },
  { value: "severityIn", label: "Severity is in" },
  { value: "locationIn", label: "Location is in" },
  { value: "regionIn", label: "Region is in" },
] as const;

/**
 * Available facts for conditions.
 */
export const RULE_FACTS = [
  { value: "severity", label: "Severity", type: "string" },
  { value: "categoryId", label: "Category", type: "category" },
  { value: "sourceChannel", label: "Source Channel", type: "string" },
  { value: "locationId", label: "Location", type: "location" },
  { value: "regionId", label: "Region", type: "region" },
  { value: "priority", label: "Priority", type: "string" },
] as const;

/**
 * Severity options.
 */
export const SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
] as const;

/**
 * Trigger event display labels.
 */
export const TRIGGER_EVENT_LABELS: Record<RuleTriggerEvent, string> = {
  "case.created": "Case Created",
  "case.updated": "Case Updated",
  "investigation.status_changed": "Investigation Status Changed",
};
