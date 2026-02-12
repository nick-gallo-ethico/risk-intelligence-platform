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
  ProjectColumnType,
  ProjectTaskStatus,
  ProjectTaskPriority,
  UpdateProjectDto,
  TaskUpdate,
  TaskActivity,
  TaskFile,
  TaskSubscriber,
  TaskDependency,
  CreateTaskUpdateDto,
  CreateTaskDependencyDto,
  CreateColumnDto,
  UpdateColumnDto,
  ReorderColumnsDto,
} from "@/types/project";

// Query keys for cache management
export const projectDetailQueryKeys = {
  all: ["projects"] as const,
  detail: (id: string) =>
    [...projectDetailQueryKeys.all, "detail", id] as const,
  stats: (id: string) => [...projectDetailQueryKeys.all, "stats", id] as const,
  tasks: (projectId: string) =>
    [...projectDetailQueryKeys.all, projectId, "tasks"] as const,
  groups: (projectId: string) =>
    [...projectDetailQueryKeys.all, projectId, "groups"] as const,
  columns: (projectId: string) =>
    [...projectDetailQueryKeys.all, projectId, "columns"] as const,
  members: (projectId: string) =>
    [...projectDetailQueryKeys.all, projectId, "members"] as const,
  taskUpdates: (projectId: string, taskId: string) =>
    [
      ...projectDetailQueryKeys.all,
      projectId,
      "tasks",
      taskId,
      "updates",
    ] as const,
  taskActivity: (projectId: string, taskId: string) =>
    [
      ...projectDetailQueryKeys.all,
      projectId,
      "tasks",
      taskId,
      "activity",
    ] as const,
  taskFiles: (projectId: string, taskId: string) =>
    [
      ...projectDetailQueryKeys.all,
      projectId,
      "tasks",
      taskId,
      "files",
    ] as const,
  taskSubscribers: (projectId: string, taskId: string) =>
    [
      ...projectDetailQueryKeys.all,
      projectId,
      "tasks",
      taskId,
      "subscribers",
    ] as const,
  taskDependencies: (projectId: string, taskId: string) =>
    [
      ...projectDetailQueryKeys.all,
      projectId,
      "tasks",
      taskId,
      "dependencies",
    ] as const,
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
 * Response type for project statistics endpoint.
 */
export interface ProjectStatsResponse {
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  workload: WorkloadEntry[];
  overdueTasks: number;
  unassignedTasks: number;
  completedByDay: Record<string, number>;
  groupProgress: GroupProgressEntry[];
  daysUntilTarget: number | null;
}

/**
 * Workload entry for a single team member.
 */
export interface WorkloadEntry {
  user: {
    id: string;
    name: string;
    email: string;
  };
  total: number;
  done: number;
  inProgress: number;
  stuck: number;
  overdue: number;
}

/**
 * Progress entry for a single group.
 */
export interface GroupProgressEntry {
  groupId: string;
  groupName: string;
  groupColor: string | null;
  total: number;
  done: number;
  progressPercent: number;
}

/**
 * Hook for fetching aggregated project statistics.
 * Used by Workload and Dashboard views.
 */
export function useProjectStats(projectId: string | undefined) {
  return useQuery({
    queryKey: projectDetailQueryKeys.stats(projectId ?? ""),
    queryFn: async () => {
      if (!projectId) return null;
      return apiClient.get<ProjectStatsResponse>(
        `/projects/${projectId}/stats`,
      );
    },
    enabled: !!projectId,
    refetchInterval: 60000, // Refresh every 60 seconds
    staleTime: 30 * 1000,
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

// ============================================
// Project Columns Hooks
// ============================================

/**
 * Hook for fetching project columns.
 */
export function useProjectColumns(projectId: string | undefined) {
  return useQuery({
    queryKey: projectDetailQueryKeys.columns(projectId ?? ""),
    queryFn: async () => {
      if (!projectId) return [];
      // Columns are included in project detail, but we can also fetch separately
      const detail = await apiClient.get<ProjectDetailResponse>(
        `/projects/${projectId}`,
      );
      return detail.columns ?? [];
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for creating a column.
 */
export function useCreateColumn(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateColumnDto) => {
      return apiClient.post<ProjectColumn>(
        `/projects/${projectId}/columns`,
        dto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.columns(projectId),
      });
      toast.success("Column created");
    },
    onError: () => {
      toast.error("Failed to create column");
    },
  });
}

/**
 * Hook for updating a column.
 */
export function useUpdateColumn(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      columnId,
      dto,
    }: {
      columnId: string;
      dto: UpdateColumnDto;
    }) => {
      return apiClient.put<ProjectColumn>(
        `/projects/${projectId}/columns/${columnId}`,
        dto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.columns(projectId),
      });
      toast.success("Column updated");
    },
    onError: () => {
      toast.error("Failed to update column");
    },
  });
}

/**
 * Hook for deleting a column.
 */
export function useDeleteColumn(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (columnId: string) => {
      await apiClient.delete(`/projects/${projectId}/columns/${columnId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.columns(projectId),
      });
      toast.success("Column deleted");
    },
    onError: () => {
      toast.error("Failed to delete column");
    },
  });
}

/**
 * Hook for reordering columns.
 */
export function useReorderColumns(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: ReorderColumnsDto) => {
      return apiClient.put(`/projects/${projectId}/columns/reorder`, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.columns(projectId),
      });
    },
    onError: () => {
      toast.error("Failed to reorder columns");
    },
  });
}

// ============================================
// Project Members Hooks
// ============================================

interface ProjectMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

/**
 * Hook for fetching project members for @mention autocomplete.
 */
export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: projectDetailQueryKeys.members(projectId ?? ""),
    queryFn: async () => {
      if (!projectId) return [];
      // For now, fetch from /users endpoint since project-specific members may not exist
      const users = await apiClient.get<ProjectMember[]>("/users");
      return Array.isArray(users) ? users : [];
    },
    enabled: !!projectId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================
// Task Updates (Conversation Thread) Hooks
// ============================================

/**
 * Hook for fetching task updates/conversation thread.
 */
export function useTaskUpdates(projectId: string, taskId: string | undefined) {
  return useQuery({
    queryKey: projectDetailQueryKeys.taskUpdates(projectId, taskId ?? ""),
    queryFn: async () => {
      if (!taskId) return [];
      return apiClient.get<TaskUpdate[]>(
        `/projects/${projectId}/tasks/${taskId}/updates`,
      );
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for creating a task update.
 */
export function useCreateTaskUpdate(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTaskUpdateDto) => {
      return apiClient.post<TaskUpdate>(
        `/projects/${projectId}/tasks/${taskId}/updates`,
        dto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskUpdates(projectId, taskId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskActivity(projectId, taskId),
      });
    },
    onError: () => {
      toast.error("Failed to post update");
    },
  });
}

/**
 * Hook for editing a task update.
 */
export function useEditTaskUpdate(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      updateId,
      content,
    }: {
      updateId: string;
      content: string;
    }) => {
      return apiClient.put<TaskUpdate>(
        `/projects/${projectId}/tasks/${taskId}/updates/${updateId}`,
        { content },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskUpdates(projectId, taskId),
      });
    },
    onError: () => {
      toast.error("Failed to edit update");
    },
  });
}

/**
 * Hook for deleting a task update.
 */
export function useDeleteTaskUpdate(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateId: string) => {
      await apiClient.delete(
        `/projects/${projectId}/tasks/${taskId}/updates/${updateId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskUpdates(projectId, taskId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskActivity(projectId, taskId),
      });
    },
    onError: () => {
      toast.error("Failed to delete update");
    },
  });
}

/**
 * Hook for adding a reaction to an update.
 */
export function useAddTaskUpdateReaction(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      updateId,
      emoji,
    }: {
      updateId: string;
      emoji: string;
    }) => {
      return apiClient.post(
        `/projects/${projectId}/tasks/${taskId}/updates/${updateId}/reactions`,
        { emoji },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskUpdates(projectId, taskId),
      });
    },
    onError: () => {
      toast.error("Failed to add reaction");
    },
  });
}

// ============================================
// Task Activity Log Hooks
// ============================================

/**
 * Hook for fetching task activity log.
 */
export function useTaskActivity(
  projectId: string,
  taskId: string | undefined,
  filter?: string,
) {
  return useQuery({
    queryKey: [
      ...projectDetailQueryKeys.taskActivity(projectId, taskId ?? ""),
      filter,
    ],
    queryFn: async () => {
      if (!taskId) return [];
      const params = filter ? `?filter=${filter}` : "";
      return apiClient.get<TaskActivity[]>(
        `/projects/${projectId}/tasks/${taskId}/activity${params}`,
      );
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}

// ============================================
// Task Files Hooks
// ============================================

/**
 * Hook for fetching task file attachments.
 */
export function useTaskFiles(projectId: string, taskId: string | undefined) {
  return useQuery({
    queryKey: projectDetailQueryKeys.taskFiles(projectId, taskId ?? ""),
    queryFn: async () => {
      if (!taskId) return [];
      return apiClient.get<TaskFile[]>(
        `/projects/${projectId}/tasks/${taskId}/files`,
      );
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for uploading a task file.
 */
export function useUploadTaskFile(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post<TaskFile>(
        `/projects/${projectId}/tasks/${taskId}/files`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskFiles(projectId, taskId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskActivity(projectId, taskId),
      });
      toast.success("File uploaded");
    },
    onError: () => {
      toast.error("Failed to upload file");
    },
  });
}

/**
 * Hook for deleting a task file.
 */
export function useDeleteTaskFile(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      await apiClient.delete(
        `/projects/${projectId}/tasks/${taskId}/files/${fileId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskFiles(projectId, taskId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskActivity(projectId, taskId),
      });
      toast.success("File deleted");
    },
    onError: () => {
      toast.error("Failed to delete file");
    },
  });
}

/**
 * Hook for getting a download URL for a task file.
 */
export function useDownloadTaskFile(projectId: string, taskId: string) {
  return useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiClient.get<{ downloadUrl: string }>(
        `/projects/${projectId}/tasks/${taskId}/files/${fileId}/download`,
      );
      return response.downloadUrl;
    },
    onError: () => {
      toast.error("Failed to get download link");
    },
  });
}

// ============================================
// Task Subscribers Hooks
// ============================================

/**
 * Hook for fetching task subscribers.
 */
export function useTaskSubscribers(
  projectId: string,
  taskId: string | undefined,
) {
  return useQuery({
    queryKey: projectDetailQueryKeys.taskSubscribers(projectId, taskId ?? ""),
    queryFn: async () => {
      if (!taskId) return [];
      return apiClient.get<TaskSubscriber[]>(
        `/projects/${projectId}/tasks/${taskId}/subscribers`,
      );
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for subscribing a user to a task.
 */
export function useSubscribeToTask(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return apiClient.post<TaskSubscriber>(
        `/projects/${projectId}/tasks/${taskId}/subscribers`,
        { userId },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskSubscribers(projectId, taskId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskActivity(projectId, taskId),
      });
      toast.success("Subscribed to task");
    },
    onError: () => {
      toast.error("Failed to subscribe");
    },
  });
}

/**
 * Hook for unsubscribing a user from a task.
 */
export function useUnsubscribeFromTask(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriberId: string) => {
      await apiClient.delete(
        `/projects/${projectId}/tasks/${taskId}/subscribers/${subscriberId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskSubscribers(projectId, taskId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskActivity(projectId, taskId),
      });
      toast.success("Unsubscribed from task");
    },
    onError: () => {
      toast.error("Failed to unsubscribe");
    },
  });
}

// ============================================
// Task Dependencies Hooks
// ============================================

/**
 * Hook for fetching task dependencies.
 */
export function useTaskDependencies(
  projectId: string,
  taskId: string | undefined,
) {
  return useQuery({
    queryKey: projectDetailQueryKeys.taskDependencies(projectId, taskId ?? ""),
    queryFn: async () => {
      if (!taskId) return { dependsOn: [], blocking: [] };
      return apiClient.get<{
        dependsOn: TaskDependency[];
        blocking: TaskDependency[];
      }>(`/projects/${projectId}/tasks/${taskId}/dependencies`);
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for creating a task dependency.
 */
export function useCreateTaskDependency(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTaskDependencyDto) => {
      return apiClient.post<TaskDependency>(
        `/projects/${projectId}/tasks/${taskId}/dependencies`,
        dto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskDependencies(projectId, taskId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskActivity(projectId, taskId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      toast.success("Dependency added");
    },
    onError: () => {
      toast.error("Failed to add dependency");
    },
  });
}

/**
 * Hook for removing a task dependency.
 */
export function useDeleteTaskDependency(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dependencyId: string) => {
      await apiClient.delete(
        `/projects/${projectId}/tasks/${taskId}/dependencies/${dependencyId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskDependencies(projectId, taskId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.taskActivity(projectId, taskId),
      });
      queryClient.invalidateQueries({
        queryKey: projectDetailQueryKeys.detail(projectId),
      });
      toast.success("Dependency removed");
    },
    onError: () => {
      toast.error("Failed to remove dependency");
    },
  });
}
