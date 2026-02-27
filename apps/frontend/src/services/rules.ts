/**
 * Rules API Service
 *
 * API client functions for routing rules management.
 * Handles CRUD operations for rules, activation, testing,
 * and execution log retrieval.
 */

import { apiClient } from "@/lib/api";
import type {
  RuleDefinition,
  CreateRuleRequest,
  UpdateRuleRequest,
  TestRuleRequest,
  RuleTestResult,
  RuleExecutionLog,
  RuleTriggerEvent,
} from "@/types/rules";

// ============================================================================
// Rule CRUD Endpoints
// ============================================================================

/**
 * Get all rules for the current organization.
 *
 * @param params - Optional filtering parameters
 * @returns Array of rule definitions
 */
export async function listRules(params?: {
  triggerEvent?: RuleTriggerEvent;
  isActive?: boolean;
}): Promise<RuleDefinition[]> {
  const searchParams = new URLSearchParams();

  if (params?.triggerEvent) {
    searchParams.set("triggerEvent", params.triggerEvent);
  }
  if (params?.isActive !== undefined) {
    searchParams.set("isActive", String(params.isActive));
  }

  const queryString = searchParams.toString();
  const url = queryString ? `/rules?${queryString}` : "/rules";

  return apiClient.get<RuleDefinition[]>(url);
}

/**
 * Get a single rule by ID.
 *
 * @param id - Rule ID
 * @returns Rule definition
 */
export async function getRule(id: string): Promise<RuleDefinition> {
  return apiClient.get<RuleDefinition>(`/rules/${id}`);
}

/**
 * Create a new rule.
 *
 * @param data - Rule creation data
 * @returns Created rule definition
 */
export async function createRule(
  data: CreateRuleRequest,
): Promise<RuleDefinition> {
  return apiClient.post<RuleDefinition>("/rules", data);
}

/**
 * Update an existing rule.
 *
 * @param id - Rule ID
 * @param data - Update data
 * @returns Updated rule definition
 */
export async function updateRule(
  id: string,
  data: UpdateRuleRequest,
): Promise<RuleDefinition> {
  return apiClient.patch<RuleDefinition>(`/rules/${id}`, data);
}

/**
 * Delete a rule.
 * Rules with execution logs are soft-deleted (deactivated).
 *
 * @param id - Rule ID
 */
export async function deleteRule(id: string): Promise<void> {
  await apiClient.delete(`/rules/${id}`);
}

// ============================================================================
// Activation Endpoints
// ============================================================================

/**
 * Activate a rule.
 *
 * @param id - Rule ID
 * @returns Updated rule definition
 */
export async function activateRule(id: string): Promise<RuleDefinition> {
  return apiClient.post<RuleDefinition>(`/rules/${id}/activate`);
}

/**
 * Deactivate a rule.
 *
 * @param id - Rule ID
 * @returns Updated rule definition
 */
export async function deactivateRule(id: string): Promise<RuleDefinition> {
  return apiClient.post<RuleDefinition>(`/rules/${id}/deactivate`);
}

// ============================================================================
// Testing Endpoints
// ============================================================================

/**
 * Test a rule against historical data.
 *
 * @param id - Rule ID
 * @param options - Test options
 * @returns Test results with match rate and samples
 */
export async function testRule(
  id: string,
  options?: TestRuleRequest,
): Promise<RuleTestResult> {
  return apiClient.post<RuleTestResult>(`/rules/${id}/test`, options || {});
}

/**
 * Get stored test results for a rule.
 *
 * @param id - Rule ID
 * @returns Last test date and results
 */
export async function getTestResults(id: string): Promise<{
  lastTestedAt: string | null;
  testResults: RuleTestResult | null;
}> {
  return apiClient.get<{
    lastTestedAt: string | null;
    testResults: RuleTestResult | null;
  }>(`/rules/${id}/test-results`);
}

// ============================================================================
// Execution Log Endpoints
// ============================================================================

/**
 * Get execution logs for a rule.
 *
 * @param id - Rule ID
 * @param limit - Optional limit (default 50)
 * @returns Array of execution logs
 */
export async function getExecutionLogs(
  id: string,
  limit?: number,
): Promise<RuleExecutionLog[]> {
  const url = limit ? `/rules/${id}/logs?limit=${limit}` : `/rules/${id}/logs`;
  return apiClient.get<RuleExecutionLog[]>(url);
}

// ============================================================================
// Exported API Object
// ============================================================================

/**
 * Rules API object for convenient access to all functions.
 */
export const rulesApi = {
  // CRUD
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,

  // Activation
  activateRule,
  deactivateRule,

  // Testing
  testRule,
  getTestResults,

  // Execution logs
  getExecutionLogs,
};
