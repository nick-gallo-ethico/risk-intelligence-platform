/**
 * Workflows API Service
 *
 * API client functions for workflow template and instance management.
 * Handles CRUD operations for templates, workflow instance lifecycle,
 * and transitions.
 */

import { apiClient } from "@/lib/api";
import type {
  WorkflowTemplate,
  WorkflowInstance,
  WorkflowEntityType,
  WorkflowInstanceStatus,
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  StartWorkflowDto,
  TransitionDto,
  TransitionResult,
  AllowedTransition,
  PaginatedResponse,
  WorkflowTemplateQueryParams,
  WorkflowInstanceQueryParams,
} from "@/types/workflow";

// ============================================================================
// Template Endpoints
// ============================================================================

/**
 * List all workflow templates with optional filtering.
 *
 * @param params - Optional query parameters for filtering
 * @returns Array of workflow templates
 */
export async function listTemplates(
  params?: WorkflowTemplateQueryParams
): Promise<WorkflowTemplate[]> {
  const searchParams = new URLSearchParams();

  if (params?.entityType) {
    searchParams.set("entityType", params.entityType);
  }
  if (params?.isActive !== undefined) {
    searchParams.set("isActive", String(params.isActive));
  }

  const queryString = searchParams.toString();
  const url = queryString
    ? `/workflows/templates?${queryString}`
    : "/workflows/templates";

  return apiClient.get<WorkflowTemplate[]>(url);
}

/**
 * Get a workflow template by ID.
 *
 * @param id - Template ID
 * @returns Workflow template
 */
export async function getTemplate(id: string): Promise<WorkflowTemplate> {
  return apiClient.get<WorkflowTemplate>(`/workflows/templates/${id}`);
}

/**
 * Get the default workflow template for an entity type.
 *
 * @param entityType - Entity type (CASE, INVESTIGATION, etc.)
 * @returns Default template for the entity type, or null if none
 */
export async function getDefaultTemplate(
  entityType: WorkflowEntityType
): Promise<WorkflowTemplate | null> {
  return apiClient.get<WorkflowTemplate | null>(
    `/workflows/templates/default/${entityType}`
  );
}

/**
 * Create a new workflow template.
 *
 * @param dto - Template creation data
 * @returns Created template
 */
export async function createTemplate(
  dto: CreateWorkflowTemplateDto
): Promise<WorkflowTemplate> {
  return apiClient.post<WorkflowTemplate>("/workflows/templates", dto);
}

/**
 * Update a workflow template.
 * If template has active instances and significant changes are made,
 * a new version will be created instead of updating in-place.
 *
 * @param id - Template ID
 * @param dto - Update data
 * @returns Updated (or new version) template
 */
export async function updateTemplate(
  id: string,
  dto: UpdateWorkflowTemplateDto
): Promise<WorkflowTemplate> {
  return apiClient.patch<WorkflowTemplate>(`/workflows/templates/${id}`, dto);
}

/**
 * Delete a workflow template.
 * Only allowed if the template has no instances.
 *
 * @param id - Template ID
 */
export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/workflows/templates/${id}`);
}

/**
 * Clone a workflow template.
 * Creates a new template with:
 * - Name appended with " (Copy)"
 * - Version reset to 1
 * - isActive = false (draft state)
 * - isDefault = false
 *
 * @param id - Template ID to clone
 * @returns Cloned template
 */
export async function cloneTemplate(id: string): Promise<WorkflowTemplate> {
  return apiClient.post<WorkflowTemplate>(`/workflows/templates/${id}/clone`);
}

/**
 * Get all versions of a workflow template.
 * Uses name matching since versioned templates share the same name.
 *
 * @param id - Any version's template ID
 * @returns All versions of the template, ordered by version descending
 */
export async function getTemplateVersions(
  id: string
): Promise<WorkflowTemplate[]> {
  return apiClient.get<WorkflowTemplate[]>(
    `/workflows/templates/${id}/versions`
  );
}

// ============================================================================
// Instance Endpoints
// ============================================================================

/**
 * List workflow instances with optional filtering and pagination.
 *
 * @param params - Optional query parameters
 * @returns Paginated list of workflow instances
 */
export async function listInstances(
  params?: WorkflowInstanceQueryParams
): Promise<PaginatedResponse<WorkflowInstance>> {
  const searchParams = new URLSearchParams();

  if (params?.templateId) {
    searchParams.set("templateId", params.templateId);
  }
  if (params?.status) {
    searchParams.set("status", params.status);
  }
  if (params?.entityType) {
    searchParams.set("entityType", params.entityType);
  }
  if (params?.page !== undefined) {
    searchParams.set("page", String(params.page));
  }
  if (params?.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();
  const url = queryString
    ? `/workflows/instances?${queryString}`
    : "/workflows/instances";

  return apiClient.get<PaginatedResponse<WorkflowInstance>>(url);
}

/**
 * Get a workflow instance by ID.
 *
 * @param id - Instance ID
 * @returns Workflow instance
 */
export async function getInstance(id: string): Promise<WorkflowInstance> {
  return apiClient.get<WorkflowInstance>(`/workflows/instances/${id}`);
}

/**
 * Get the workflow instance for a specific entity.
 *
 * @param entityType - Entity type
 * @param entityId - Entity ID
 * @returns Workflow instance, or null if none exists
 */
export async function getInstanceByEntity(
  entityType: WorkflowEntityType,
  entityId: string
): Promise<WorkflowInstance | null> {
  return apiClient.get<WorkflowInstance | null>(
    `/workflows/entity/${entityType}/${entityId}`
  );
}

/**
 * Get allowed transitions for a workflow instance.
 * Returns transitions that can be triggered from the current stage.
 *
 * @param instanceId - Instance ID
 * @returns Array of allowed transitions
 */
export async function getAllowedTransitions(
  instanceId: string
): Promise<AllowedTransition[]> {
  return apiClient.get<AllowedTransition[]>(
    `/workflows/instances/${instanceId}/transitions`
  );
}

/**
 * Start a new workflow instance for an entity.
 *
 * @param dto - Workflow start data
 * @returns Created instance ID
 */
export async function startWorkflow(
  dto: StartWorkflowDto
): Promise<{ instanceId: string }> {
  return apiClient.post<{ instanceId: string }>("/workflows/instances", dto);
}

/**
 * Transition a workflow instance to a new stage.
 *
 * @param id - Instance ID
 * @param dto - Transition data
 * @returns Transition result
 */
export async function transitionInstance(
  id: string,
  dto: TransitionDto
): Promise<TransitionResult> {
  return apiClient.post<TransitionResult>(
    `/workflows/instances/${id}/transition`,
    dto
  );
}

/**
 * Complete a workflow instance.
 *
 * @param id - Instance ID
 * @param outcome - Optional outcome description
 * @returns Success indicator
 */
export async function completeInstance(
  id: string,
  outcome?: string
): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(
    `/workflows/instances/${id}/complete`,
    { outcome }
  );
}

/**
 * Cancel a workflow instance.
 *
 * @param id - Instance ID
 * @param reason - Optional cancellation reason
 * @returns Success indicator
 */
export async function cancelInstance(
  id: string,
  reason?: string
): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(
    `/workflows/instances/${id}/cancel`,
    { reason }
  );
}

/**
 * Pause a workflow instance.
 *
 * @param id - Instance ID
 * @param reason - Optional pause reason
 * @returns Success indicator
 */
export async function pauseInstance(
  id: string,
  reason?: string
): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(
    `/workflows/instances/${id}/pause`,
    { reason }
  );
}

/**
 * Resume a paused workflow instance.
 *
 * @param id - Instance ID
 * @returns Success indicator
 */
export async function resumeInstance(id: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(
    `/workflows/instances/${id}/resume`
  );
}

// ============================================================================
// Exported API Object
// ============================================================================

/**
 * Workflows API object for convenient access to all functions.
 */
export const workflowsApi = {
  // Templates
  listTemplates,
  getTemplate,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  getTemplateVersions,

  // Instances
  listInstances,
  getInstance,
  getInstanceByEntity,
  getAllowedTransitions,
  startWorkflow,
  transitionInstance,
  completeInstance,
  cancelInstance,
  pauseInstance,
  resumeInstance,
};
