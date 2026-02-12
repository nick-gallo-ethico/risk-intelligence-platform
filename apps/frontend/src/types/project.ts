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
 * Extended to support 15 Monday.com-style column types.
 * Note: Backend currently supports STATUS, PERSON, DATE, TEXT, NUMBER, PRIORITY, LABEL.
 * Additional types (TIMELINE, LONG_TEXT, CHECKBOX, DROPDOWN, LINK, TAGS, FILES,
 * DEPENDENCY, CONNECTED_ENTITY, PROGRESS) are handled client-side with backend
 * storing them as custom column types with settings.
 */
export type ProjectColumnType =
  | "STATUS"
  | "PERSON"
  | "DATE"
  | "TIMELINE"
  | "TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "DROPDOWN"
  | "CHECKBOX"
  | "LINK"
  | "TAGS"
  | "FILES"
  | "DEPENDENCY"
  | "CONNECTED_ENTITY"
  | "PROGRESS";

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

/**
 * Task update/comment in conversation thread.
 */
export interface TaskUpdate {
  id: string;
  taskId: string;
  content: string;
  mentionedUserIds: string[];
  parentUpdateId?: string;
  isPinned: boolean;
  reactions: TaskReaction[];
  replies: TaskUpdate[];
  author: ProjectUser;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Reaction on a task update.
 */
export interface TaskReaction {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
}

/**
 * Activity log entry for task changes.
 */
export interface TaskActivity {
  id: string;
  taskId: string;
  activityType:
    | "STATUS_CHANGED"
    | "PRIORITY_CHANGED"
    | "ASSIGNEE_CHANGED"
    | "DUE_DATE_CHANGED"
    | "TITLE_CHANGED"
    | "DESCRIPTION_CHANGED"
    | "GROUP_CHANGED"
    | "FILE_ADDED"
    | "FILE_REMOVED"
    | "COMMENT_ADDED"
    | "MENTION"
    | "CREATED"
    | "DEPENDENCY_ADDED"
    | "DEPENDENCY_REMOVED"
    | "SUBSCRIBER_ADDED"
    | "SUBSCRIBER_REMOVED";
  description: string;
  changes?: {
    oldValue?: string | Record<string, unknown>;
    newValue?: string | Record<string, unknown>;
  };
  actor: ProjectUser;
  actorId: string;
  createdAt: string;
}

/**
 * File attachment on a task.
 */
export interface TaskFile {
  id: string;
  taskId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: ProjectUser;
  uploadedById: string;
  downloadUrl?: string;
  createdAt: string;
}

/**
 * Task subscriber for notification control.
 */
export interface TaskSubscriber {
  id: string;
  taskId: string;
  user: ProjectUser;
  userId: string;
  isAutoSubscribed: boolean;
  subscribedAt: string;
}

/**
 * Task dependency type.
 */
export type TaskDependencyType =
  | "FINISH_TO_START"
  | "START_TO_START"
  | "FINISH_TO_FINISH"
  | "START_TO_FINISH";

/**
 * Task dependency relationship.
 */
export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependsOnTask: {
    id: string;
    title: string;
    status: ProjectTaskStatus;
  };
  type: TaskDependencyType;
  isViolated: boolean;
  createdAt: string;
}

/**
 * DTO for creating a task update.
 */
export interface CreateTaskUpdateDto {
  content: string;
  mentionedUserIds?: string[];
  parentUpdateId?: string;
}

/**
 * DTO for uploading a task file.
 */
export interface UploadTaskFileDto {
  file: File;
}

/**
 * DTO for creating a task dependency.
 */
export interface CreateTaskDependencyDto {
  dependsOnTaskId: string;
  type: TaskDependencyType;
}

/**
 * DTO for creating a project column.
 */
export interface CreateColumnDto {
  name: string;
  type: ProjectColumnType;
  settings?: ColumnSettings;
  isRequired?: boolean;
}

/**
 * DTO for updating a project column.
 */
export interface UpdateColumnDto {
  name?: string;
  settings?: ColumnSettings;
  width?: number;
  isRequired?: boolean;
}

/**
 * DTO for reordering columns.
 */
export interface ReorderColumnsDto {
  orderedIds: string[];
}

/**
 * Column settings based on column type.
 * Each column type has specific configuration options.
 */
export interface ColumnSettings {
  // STATUS settings
  statusLabels?: Array<{
    id: string;
    label: string;
    color: string;
  }>;
  defaultStatusId?: string;

  // PERSON settings
  allowMultiple?: boolean;
  defaultPersonId?: string;

  // DATE settings
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  includeTime?: boolean;
  defaultToToday?: boolean;

  // TIMELINE settings
  defaultDurationDays?: number;
  showOnGantt?: boolean;

  // TEXT settings
  maxLength?: number;
  placeholder?: string;

  // LONG_TEXT settings
  enableRichText?: boolean;

  // NUMBER settings
  unitLabel?: string;
  unitPosition?: "prefix" | "suffix";
  decimalPlaces?: 0 | 1 | 2;
  numberFormat?: "comma" | "none";

  // DROPDOWN settings
  options?: Array<{
    id: string;
    label: string;
    color: string;
  }>;
  allowMultipleSelection?: boolean;
  defaultOptionId?: string;

  // CHECKBOX settings
  defaultChecked?: boolean;

  // LINK settings
  placeholderUrl?: string;

  // TAGS settings
  availableTags?: Array<{
    id: string;
    label: string;
    color: string;
  }>;

  // FILES settings
  allowedFileTypes?: "all" | "images" | "documents" | string[];
  maxFileSize?: number;

  // DEPENDENCY settings
  allowedDependencyTypes?: Array<"FS" | "SS" | "FF" | "SF">;
  defaultDependencyType?: "FS" | "SS" | "FF" | "SF";

  // CONNECTED_ENTITY settings
  entityType?: "CASE" | "INVESTIGATION" | "CAMPAIGN" | "POLICY" | "PERSON";
  displayField?: string;

  // PROGRESS settings
  autoCalculateFromSubtasks?: boolean;
  allowManualOverride?: boolean;
}
