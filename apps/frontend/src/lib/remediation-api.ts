import { apiClient } from './api';
import type {
  RemediationPlan,
  CreateRemediationPlanInput,
  UpdateRemediationPlanInput,
  CreateRemediationStepInput,
  UpdateRemediationStepInput,
  CompleteStepInput,
  StepReorderInput,
  RemediationStep,
} from '@/types/remediation';

/**
 * API client functions for Remediation entity.
 */

/**
 * Get all remediation plans for a specific case.
 */
export async function getRemediationPlansByCase(
  caseId: string
): Promise<RemediationPlan[]> {
  return apiClient.get<RemediationPlan[]>(`/remediation/plans/by-case/${caseId}`);
}

/**
 * Get a single remediation plan by ID.
 */
export async function getRemediationPlan(planId: string): Promise<RemediationPlan> {
  return apiClient.get<RemediationPlan>(`/remediation/plans/${planId}`);
}

/**
 * Create a new remediation plan.
 */
export async function createRemediationPlan(
  input: CreateRemediationPlanInput
): Promise<RemediationPlan> {
  return apiClient.post<RemediationPlan>('/remediation/plans', input);
}

/**
 * Update a remediation plan.
 */
export async function updateRemediationPlan(
  planId: string,
  input: UpdateRemediationPlanInput
): Promise<RemediationPlan> {
  return apiClient.put<RemediationPlan>(`/remediation/plans/${planId}`, input);
}

/**
 * Activate a remediation plan (change from DRAFT to ACTIVE).
 */
export async function activateRemediationPlan(
  planId: string
): Promise<RemediationPlan> {
  return apiClient.post<RemediationPlan>(`/remediation/plans/${planId}/activate`);
}

/**
 * Complete a remediation plan.
 */
export async function completeRemediationPlan(
  planId: string
): Promise<RemediationPlan> {
  return apiClient.post<RemediationPlan>(`/remediation/plans/${planId}/complete`);
}

/**
 * Cancel a remediation plan.
 */
export async function cancelRemediationPlan(
  planId: string
): Promise<RemediationPlan> {
  return apiClient.post<RemediationPlan>(`/remediation/plans/${planId}/cancel`);
}

/**
 * Create a new remediation step.
 */
export async function createRemediationStep(
  input: CreateRemediationStepInput
): Promise<RemediationStep> {
  return apiClient.post<RemediationStep>('/remediation/steps', input);
}

/**
 * Update a remediation step.
 */
export async function updateRemediationStep(
  stepId: string,
  input: UpdateRemediationStepInput
): Promise<RemediationStep> {
  return apiClient.put<RemediationStep>(`/remediation/steps/${stepId}`, input);
}

/**
 * Complete a remediation step.
 */
export async function completeRemediationStep(
  stepId: string,
  input?: CompleteStepInput
): Promise<RemediationStep> {
  return apiClient.post<RemediationStep>(`/remediation/steps/${stepId}/complete`, input ?? {});
}

/**
 * Skip a remediation step.
 */
export async function skipRemediationStep(
  stepId: string,
  reason: string
): Promise<RemediationStep> {
  return apiClient.post<RemediationStep>(`/remediation/steps/${stepId}/skip`, { reason });
}

/**
 * Delete a remediation step.
 */
export async function deleteRemediationStep(stepId: string): Promise<void> {
  return apiClient.delete(`/remediation/steps/${stepId}`);
}

/**
 * Reorder steps within a plan.
 */
export async function reorderRemediationSteps(
  planId: string,
  stepOrders: StepReorderInput[]
): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(
    `/remediation/plans/${planId}/steps/reorder`,
    stepOrders
  );
}

/**
 * Export remediation API client object for consistent pattern.
 */
export const remediationApi = {
  getByCase: getRemediationPlansByCase,
  getById: getRemediationPlan,
  create: createRemediationPlan,
  update: updateRemediationPlan,
  activate: activateRemediationPlan,
  complete: completeRemediationPlan,
  cancel: cancelRemediationPlan,
  createStep: createRemediationStep,
  updateStep: updateRemediationStep,
  completeStep: completeRemediationStep,
  skipStep: skipRemediationStep,
  deleteStep: deleteRemediationStep,
  reorderSteps: reorderRemediationSteps,
};
