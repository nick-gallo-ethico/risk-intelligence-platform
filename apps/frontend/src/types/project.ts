/**
 * Project types for project management module.
 *
 * These types match the backend Prisma models for Milestone (renamed to Project in UI),
 * ProjectGroup, ProjectTask, ProjectColumn, and ProjectTemplate.
 */

/**
 * Project status matching MilestoneStatus enum in backend.
 */
export type ProjectStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "AT_RISK"
  | "COMPLETED"
  | "CANCELLED";

/**
 * Project category matching MilestoneCategory enum in backend.
 */
export type ProjectCategory =
  | "AUDIT"
  | "INVESTIGATION"
  | "CAMPAIGN"
  | "PROJECT"
  | "TRAINING"
  | "REMEDIATION"
  | "OTHER";

/**
 * Project task status matching ProjectTaskStatus enum in backend.
 */
export type ProjectTaskStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "STUCK"
  | "DONE"
  | "CANCELLED";

/**
 * Project task priority matching ProjectTaskPriority enum in backend.
 */
export type ProjectTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Project column type matching ProjectColumnType enum in backend.
 */
export type ProjectColumnType =
  | "STATUS"
  | "PERSON"
  | "DATE"
  | "TEXT"
  | "NUMBER"
  | "CHECKBOX"
  | "DROPDOWN";

/**
 * User reference for project owner and task assignee.
 */
export interface ProjectUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Project entity (maps to Milestone in backend).
 *
 * Projects are containers for groups and tasks, providing
 * a Monday.com-style board experience.
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  category: ProjectCategory;
  status: ProjectStatus;
  targetDate: string;
  completedAt?: string;
  progressPercent: number;
  totalItems: number;
  completedItems: number;
  owner?: ProjectUser;
  ownerId?: string;
  taskCount?: number;
  completedTaskCount?: number;
  notes?: string;
  lastStatusUpdate?: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  updatedById?: string;
}

/**
 * Project group for organizing tasks within a project.
 *
 * Groups provide visual organization in the board view,
 * similar to Monday.com's groups/sections.
 */
export interface ProjectGroup {
  id: string;
  projectId: string;
  name: string;
  color?: string;
  sortOrder: number;
  isCollapsed: boolean;
  tasks?: ProjectTask[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Project task within a group.
 *
 * Tasks are the atomic work items in a project,
 * with status, priority, assignee, and dates.
 */
export interface ProjectTask {
  id: string;
  projectId: string;
  groupId?: string;
  group?: { id: string; name: string };
  title: string;
  description?: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assignee?: ProjectUser;
  assigneeId?: string;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  sortOrder: number;
  parentTaskId?: string;
  subtaskCount?: number;
  completedSubtaskCount?: number;
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  updatedById?: string;
}

/**
 * Project column for customizable table columns.
 *
 * Columns define what fields are shown in the project
 * board's table view.
 */
export interface ProjectColumn {
  id: string;
  projectId: string;
  name: string;
  type: ProjectColumnType;
  settings?: Record<string, unknown>;
  sortOrder: number;
  width?: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Project template for creating pre-configured projects.
 *
 * Templates include groups, columns, and tasks that are
 * cloned when applied to create a new project.
 */
export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  category: ProjectCategory;
  isSystem: boolean;
  templateData: {
    groups?: Array<{
      name: string;
      color?: string;
      tasks?: Array<{
        title: string;
        description?: string;
        priority?: ProjectTaskPriority;
      }>;
    }>;
    columns?: Array<{
      name: string;
      type: ProjectColumnType;
      isRequired?: boolean;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  createdById?: string;
}

/**
 * DTO for creating a new project.
 */
export interface CreateProjectDto {
  name: string;
  description?: string;
  category: ProjectCategory;
  targetDate: string;
  ownerId?: string;
}

/**
 * DTO for updating a project.
 */
export interface UpdateProjectDto {
  name?: string;
  description?: string;
  category?: ProjectCategory;
  status?: ProjectStatus;
  targetDate?: string;
  ownerId?: string;
}

/**
 * Query parameters for listing projects.
 */
export interface ProjectQueryDto {
  status?: ProjectStatus;
  category?: ProjectCategory;
  ownerId?: string;
  targetDateFrom?: Date;
  targetDateTo?: Date;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  offset?: number;
  limit?: number;
}

/**
 * Paginated response for project list.
 */
export interface ProjectsResponse {
  data: Project[];
  total: number;
  page?: number;
  pageSize?: number;
}
