"use client";

/**
 * Forms React Query Hooks
 *
 * Provides data fetching hooks for form definitions with React Query.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formsApi } from "@/lib/forms-api";
import type {
  FormQueryParams,
  FormDefinition,
  CreateFormDto,
  UpdateFormDto,
} from "@/lib/forms-api";

// Query keys for cache management
export const formQueryKeys = {
  all: ["forms"] as const,
  lists: () => [...formQueryKeys.all, "list"] as const,
  list: (params?: FormQueryParams) =>
    [...formQueryKeys.lists(), params] as const,
  details: () => [...formQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...formQueryKeys.details(), id] as const,
};

/**
 * Hook for fetching paginated form definitions list with filters.
 */
export function useForms(params?: FormQueryParams) {
  return useQuery({
    queryKey: formQueryKeys.list(params),
    queryFn: () => formsApi.list(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for fetching a single form definition by ID.
 */
export function useForm(id: string) {
  return useQuery({
    queryKey: formQueryKeys.detail(id),
    queryFn: () => formsApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for creating a new form definition.
 */
export function useCreateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateFormDto) => formsApi.create(dto),
    onSuccess: () => {
      // Invalidate form lists to refetch
      queryClient.invalidateQueries({ queryKey: formQueryKeys.lists() });
    },
  });
}

/**
 * Hook for updating a form definition.
 */
export function useUpdateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFormDto }) =>
      formsApi.update(id, dto),
    onSuccess: (updatedForm) => {
      // Update the specific form in cache
      queryClient.setQueryData(
        formQueryKeys.detail(updatedForm.id),
        updatedForm,
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: formQueryKeys.lists() });
    },
  });
}

/**
 * Hook for publishing a form definition.
 */
export function usePublishForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => formsApi.publish(id),
    onSuccess: (updatedForm) => {
      // Update the specific form in cache
      queryClient.setQueryData(
        formQueryKeys.detail(updatedForm.id),
        updatedForm,
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: formQueryKeys.lists() });
    },
  });
}

/**
 * Hook for cloning a form definition.
 */
export function useCloneForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => formsApi.clone(id),
    onSuccess: () => {
      // Invalidate lists to show new cloned form
      queryClient.invalidateQueries({ queryKey: formQueryKeys.lists() });
    },
  });
}
