"use client";

/**
 * Project Detail React Query Hooks
 *
 * Data fetching hooks for project detail page operations.
 * Includes hooks for project detail, tasks, groups, and mutations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import type {
  Project,
  ProjectGroup,
  ProjectTask,
  ProjectColumn,
  ProjectTaskStatus,
  ProjectTaskPriority,
  UpdateProjectDto,
} from "@/types/project";

// Query keys for cache management
export const projectDetailQueryKeys = {
  all: ["projects"] as const,
  detail: (id: string) =>
    [...projectDetailQueryKeys.all, "detail", id] as const,
  tasks: (projectId: string) =>
    [...projectDetailQueryKeys.all, projectId, "tasks"] as const,
  groups: (projectId: string) =>
    [...projectDetailQueryKeys.all, projectId, "groups"] as const,
};

/**
 * Response type for project detail endpoint.
 */
export interface ProjectDetailResponse extends Project {
  groups: ProjectGroup[];
  tasks: ProjectTask[];
  columns: ProjectColumn[];
}

/**
 * DTO for creating a task.
 */
export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: ProjectTaskStatus;
  priority?: ProjectTaskPriority;
  assigneeId?: string;
  groupId?: string;
  startDate?: string;
  dueDate?: string;
  parentTaskId?: string;
}

/**
 * DTO for updating a task.
 */
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: ProjectTaskStatus;
  priority?: ProjectTaskPriority;
  assigneeId?: string | null;
  groupId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  sortOrder?: number;
  customFields?: Record<string, unknown>;
}

/**
 * DTO for bulk updating tasks.
 */
export interface BulkUpdateTasksDto {
  taskIds: string[];
  updates: UpdateTaskDto;
}

/**
 * DTO for reordering tasks.
 */
export interface ReorderTasksDto {
  orderedIds: string[];
}

/**
 * DTO for creating a group.
 */
export interface CreateGroupDto {
  name: string;
  color?: string;
}

/**
 * DTO for updating a group.
 */
export interface UpdateGroupDto {
  name?: string;
  color?: string;
  isCollapsed?: boolean;
}

/**
 * DTO for reordering groups.
 */
export interface ReorderGroupsDto {
  orderedIds: string[];
}

/**
 * Hook for fetching project detail with groups, tasks, and columns.
 */
export function useProjectDetail(projectId: string | undefined) {
  return useQuery({
    queryKey: projectDetailQueryKeys.detail(projectId ?? ""),
    queryFn: async () => {
      if (!projectId) return null;
      return apiClient.get<ProjectDetailResponse>(`/projects/${projectId}`);
    },
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for fetching project tasks with optional filters.
 */
export function useProjectTasks(
  projectId: string | undefined,
  filters?: {
    status?: ProjectTaskStatus;
    priority?: ProjectTaskPriority;
    assigneeId?: string;
    groupId?: string;
  },
) {
  return useQuery({
    queryKey: [...projectDetailQueryKeys.tasks(projectId ?? ""), filters],
    queryFn: async () => {
      if (!projectId) return [];
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.priority) params.set("priority", filters.priority);
      if (filters?.assigneeId) params.set("assigneeId", filters.assigneeId);
      if (filters?.groupId) params.set("groupId", filters.groupId);
      const query = params.toString() ? `?${params}` : "";
      return apiClient.get<ProjectTask[]>(
        `/projects/${projectId}/tasks${query}`,
      );
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for updating a project.
 */
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpdateProjectDto) => {
      return apiClient.patch<Project>(`/projects/${projectId}`, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.all,
      });
      toast.success("Project updated");
    },
    onError: () => {
      toast.error("Failed to update project");
    },
  });
}

/**
 * Hook for creating a task.
 */
export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTaskDto) => {
      return apiClient.post<ProjectTask>(`/projects/${projectId}/tasks`, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.tasks(projectId),
      });
      toast.success("Task created");
    },
    onError: () => {
      toast.error("Failed to create task");
    },
  });
}

/**
 * Hook for updating a task.
 */
export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      dto,
    }: {
      taskId: string;
      dto: UpdateTaskDto;
    }) => {
      return apiClient.put<ProjectTask>(
        `/projects/${projectId}/tasks/${taskId}`,
        dto,
      );
    },
    // Optimistic update for immediate UI feedback
    onMutate: async ({ taskId, dto }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<ProjectDetailResponse>(
        projectDetailQueryKeys.detail(projectId),
      );

      // Optimistically update to the new value
      if (previousData) {
        queryClient.setQueryData<ProjectDetailResponse>(
          projectDetailQueryKeys.detail(projectId),
          {
            ...previousData,
            tasks: previousData.tasks.map((task) => {
              if (task.id !== taskId) return task;
              // Create updated task, converting nulls to undefined for type compatibility
              const updated: ProjectTask = { ...task };
              if (dto.title !== undefined) updated.title = dto.title;
              if (dto.description !== undefined)
                updated.description = dto.description ?? undefined;
              if (dto.status !== undefined) updated.status = dto.status;
              if (dto.priority !== undefined) updated.priority = dto.priority;
              if (dto.assigneeId !== undefined)
                updated.assigneeId = dto.assigneeId ?? undefined;
              if (dto.groupId !== undefined)
                updated.groupId = dto.groupId ?? undefined;
              if (dto.startDate !== undefined)
                updated.startDate = dto.startDate ?? undefined;
              if (dto.dueDate !== undefined)
                updated.dueDate = dto.dueDate ?? undefined;
              if (dto.sortOrder !== undefined)
                updated.sortOrder = dto.sortOrder;
              if (dto.customFields !== undefined)
                updated.customFields = dto.customFields;
              return updated;
            }),
          },
        );
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          projectDetailQueryKeys.detail(projectId),
          context.previousData,
        );
      }
      toast.error("Failed to update task");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
    },
  });
}

/**
 * Hook for deleting a task.
 */
export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.tasks(projectId),
      });
      toast.success("Task deleted");
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });
}

/**
 * Hook for bulk updating tasks.
 */
export function useBulkUpdateTasks(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: BulkUpdateTasksDto) => {
      return apiClient.put<ProjectTask[]>(
        `/projects/${projectId}/tasks/bulk`,
        dto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.tasks(projectId),
      });
      toast.success("Tasks updated");
    },
    onError: () => {
      toast.error("Failed to update tasks");
    },
  });
}

/**
 * Hook for reordering tasks within a group.
 */
export function useReorderTasks(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: ReorderTasksDto) => {
      return apiClient.put(`/projects/${projectId}/tasks/reorder`, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
    },
    onError: () => {
      toast.error("Failed to reorder tasks");
    },
  });
}

/**
 * Hook for creating a group.
 */
export function useCreateGroup(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateGroupDto) => {
      return apiClient.post<ProjectGroup>(`/projects/${projectId}/groups`, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      toast.success("Group created");
    },
    onError: () => {
      toast.error("Failed to create group");
    },
  });
}

/**
 * Hook for updating a group.
 */
export function useUpdateGroup(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      dto,
    }: {
      groupId: string;
      dto: UpdateGroupDto;
    }) => {
      return apiClient.put<ProjectGroup>(
        `/projects/${projectId}/groups/${groupId}`,
        dto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      toast.success("Group updated");
    },
    onError: () => {
      toast.error("Failed to update group");
    },
  });
}

/**
 * Hook for deleting a group.
 */
export function useDeleteGroup(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      await apiClient.delete(`/projects/${projectId}/groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      toast.success("Group deleted");
    },
    onError: () => {
      toast.error("Failed to delete group");
    },
  });
}

/**
 * Hook for reordering groups.
 */
export function useReorderGroups(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: ReorderGroupsDto) => {
      return apiClient.put(`/projects/${projectId}/groups/reorder`, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
    },
    onError: () => {
      toast.error("Failed to reorder groups");
    },
  });
}
