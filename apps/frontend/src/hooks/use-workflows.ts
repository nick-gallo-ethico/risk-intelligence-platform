"use client";

/**
 * Workflows React Query Hooks
 *
 * Provides data fetching hooks for workflow templates and instances
 * with React Query for caching and state management.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workflowsApi } from "@/services/workflows";
import type {
  WorkflowEntityType,
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  StartWorkflowDto,
  TransitionDto,
  WorkflowTemplateQueryParams,
  WorkflowInstanceQueryParams,
} from "@/types/workflow";

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query keys for workflow data cache management.
 */
export const workflowQueryKeys = {
  // Base keys
  all: ["workflows"] as const,
  templates: () => [...workflowQueryKeys.all, "templates"] as const,
  instances: () => [...workflowQueryKeys.all, "instances"] as const,

  // Template keys
  templateList: (params?: WorkflowTemplateQueryParams) =>
    [...workflowQueryKeys.templates(), "list", params] as const,
  templateDetail: (id: string) =>
    [...workflowQueryKeys.templates(), "detail", id] as const,
  templateVersions: (id: string) =>
    [...workflowQueryKeys.templates(), "versions", id] as const,
  templateDefault: (entityType: WorkflowEntityType) =>
    [...workflowQueryKeys.templates(), "default", entityType] as const,

  // Instance keys
  instanceList: (params?: WorkflowInstanceQueryParams) =>
    [...workflowQueryKeys.instances(), "list", params] as const,
  instanceDetail: (id: string) =>
    [...workflowQueryKeys.instances(), "detail", id] as const,
  instanceByEntity: (entityType: WorkflowEntityType, entityId: string) =>
    [...workflowQueryKeys.instances(), "entity", entityType, entityId] as const,
  instanceTransitions: (id: string) =>
    [...workflowQueryKeys.instances(), "transitions", id] as const,
};

// ============================================================================
// Template Query Hooks
// ============================================================================

/**
 * Hook for fetching workflow templates with optional filters.
 *
 * @param params - Optional query parameters (entityType, isActive)
 */
export function useWorkflowTemplates(params?: WorkflowTemplateQueryParams) {
  return useQuery({
    queryKey: workflowQueryKeys.templateList(params),
    queryFn: () => workflowsApi.listTemplates(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for fetching a single workflow template by ID.
 *
 * @param id - Template ID
 */
export function useWorkflowTemplate(id: string | undefined) {
  return useQuery({
    queryKey: workflowQueryKeys.templateDetail(id || ""),
    queryFn: () => workflowsApi.getTemplate(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for fetching the default template for an entity type.
 *
 * @param entityType - Entity type
 */
export function useDefaultWorkflowTemplate(
  entityType: WorkflowEntityType | undefined
) {
  return useQuery({
    queryKey: workflowQueryKeys.templateDefault(entityType || "CASE"),
    queryFn: () => workflowsApi.getDefaultTemplate(entityType!),
    enabled: !!entityType,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching all versions of a workflow template.
 *
 * @param id - Template ID (any version)
 */
export function useWorkflowTemplateVersions(id: string | undefined) {
  return useQuery({
    queryKey: workflowQueryKeys.templateVersions(id || ""),
    queryFn: () => workflowsApi.getTemplateVersions(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// Instance Query Hooks
// ============================================================================

/**
 * Hook for fetching workflow instances with optional filters and pagination.
 *
 * @param params - Optional query parameters
 */
export function useWorkflowInstances(params?: WorkflowInstanceQueryParams) {
  return useQuery({
    queryKey: workflowQueryKeys.instanceList(params),
    queryFn: () => workflowsApi.listInstances(params),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for fetching a single workflow instance by ID.
 *
 * @param id - Instance ID
 */
export function useWorkflowInstance(id: string | undefined) {
  return useQuery({
    queryKey: workflowQueryKeys.instanceDetail(id || ""),
    queryFn: () => workflowsApi.getInstance(id!),
    enabled: !!id,
    staleTime: 15 * 1000, // 15 seconds - instances change more frequently
  });
}

/**
 * Hook for fetching the workflow instance for a specific entity.
 *
 * @param entityType - Entity type
 * @param entityId - Entity ID
 */
export function useWorkflowInstanceByEntity(
  entityType: WorkflowEntityType | undefined,
  entityId: string | undefined
) {
  return useQuery({
    queryKey: workflowQueryKeys.instanceByEntity(
      entityType || "CASE",
      entityId || ""
    ),
    queryFn: () => workflowsApi.getInstanceByEntity(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
    staleTime: 15 * 1000,
  });
}

/**
 * Hook for fetching allowed transitions for a workflow instance.
 *
 * @param instanceId - Instance ID
 */
export function useAllowedTransitions(instanceId: string | undefined) {
  return useQuery({
    queryKey: workflowQueryKeys.instanceTransitions(instanceId || ""),
    queryFn: () => workflowsApi.getAllowedTransitions(instanceId!),
    enabled: !!instanceId,
    staleTime: 15 * 1000,
  });
}

// ============================================================================
// Template Mutation Hooks
// ============================================================================

/**
 * Hook for creating a new workflow template.
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateWorkflowTemplateDto) =>
      workflowsApi.createTemplate(dto),
    onSuccess: (newTemplate) => {
      // Invalidate template lists to refetch
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.templates(),
      });
      // Also invalidate default template for this entity type in case it was set
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.templateDefault(newTemplate.entityType),
      });
    },
  });
}

/**
 * Hook for updating a workflow template.
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWorkflowTemplateDto }) =>
      workflowsApi.updateTemplate(id, dto),
    onSuccess: (updatedTemplate) => {
      // Update the specific template in cache
      queryClient.setQueryData(
        workflowQueryKeys.templateDetail(updatedTemplate.id),
        updatedTemplate
      );
      // Invalidate lists (a new version might have been created)
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.templates(),
      });
    },
  });
}

/**
 * Hook for deleting a workflow template.
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workflowsApi.deleteTemplate(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: workflowQueryKeys.templateDetail(deletedId),
      });
      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.templates(),
      });
    },
  });
}

/**
 * Hook for cloning a workflow template.
 */
export function useCloneTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workflowsApi.cloneTemplate(id),
    onSuccess: () => {
      // Invalidate template lists to show the new clone
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.templates(),
      });
    },
  });
}

// ============================================================================
// Instance Mutation Hooks
// ============================================================================

/**
 * Hook for starting a new workflow instance.
 */
export function useStartWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: StartWorkflowDto) => workflowsApi.startWorkflow(dto),
    onSuccess: (_, variables) => {
      // Invalidate instance lists
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instances(),
      });
      // Invalidate instance by entity
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instanceByEntity(
          variables.entityType,
          variables.entityId
        ),
      });
    },
  });
}

/**
 * Hook for transitioning a workflow instance to a new stage.
 */
export function useTransitionInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: TransitionDto }) =>
      workflowsApi.transitionInstance(id, dto),
    onSuccess: (_, variables) => {
      // Invalidate the specific instance
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instanceDetail(variables.id),
      });
      // Invalidate transitions for this instance
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instanceTransitions(variables.id),
      });
      // Invalidate instance lists
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instanceList(),
      });
    },
  });
}

/**
 * Hook for completing a workflow instance.
 */
export function useCompleteInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome?: string }) =>
      workflowsApi.completeInstance(id, outcome),
    onSuccess: (_, variables) => {
      // Invalidate the specific instance
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instanceDetail(variables.id),
      });
      // Invalidate instance lists
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instances(),
      });
    },
  });
}

/**
 * Hook for canceling a workflow instance.
 */
export function useCancelInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      workflowsApi.cancelInstance(id, reason),
    onSuccess: (_, variables) => {
      // Invalidate the specific instance
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instanceDetail(variables.id),
      });
      // Invalidate instance lists
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instances(),
      });
    },
  });
}

/**
 * Hook for pausing a workflow instance.
 */
export function usePauseInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      workflowsApi.pauseInstance(id, reason),
    onSuccess: (_, variables) => {
      // Invalidate the specific instance
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instanceDetail(variables.id),
      });
      // Invalidate instance lists
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instances(),
      });
    },
  });
}

/**
 * Hook for resuming a paused workflow instance.
 */
export function useResumeInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workflowsApi.resumeInstance(id),
    onSuccess: (_, instanceId) => {
      // Invalidate the specific instance
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instanceDetail(instanceId),
      });
      // Invalidate instance lists
      queryClient.invalidateQueries({
        queryKey: workflowQueryKeys.instances(),
      });
    },
  });
}
