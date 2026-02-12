import { IsOptional, IsString } from "class-validator";
import {
  MilestoneResponseDto,
  MilestoneQueryDto,
  MilestoneItemResponseDto,
} from "./milestone.dto";
import {
  ProjectGroup,
  ProjectColumn,
  ProjectTaskStatus,
  ProjectTaskPriority,
  ProjectColumnType,
} from "@prisma/client";

// ===========================================
// Response DTOs
// ===========================================

/**
 * Response DTO for project group data.
 */
export class ProjectGroupResponseDto {
  id: string;
  name: string;
  color?: string;
  sortOrder: number;
  isCollapsed: boolean;
  taskCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response DTO for project column data.
 */
export class ProjectColumnResponseDto {
  id: string;
  name: string;
  type: ProjectColumnType;
  settings?: Record<string, unknown>;
  sortOrder: number;
  width?: number;
  isRequired: boolean;
}

/**
 * Response DTO for project task summary.
 */
export class ProjectTaskSummaryDto {
  id: string;
  title: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assignee?: {
    id: string;
    name: string;
  };
  dueDate?: Date;
  groupId?: string;
  subtaskCount: number;
  completedSubtaskCount: number;
}

/**
 * Extended response DTO for project detail with groups, tasks, and columns.
 */
export class ProjectDetailResponseDto extends MilestoneResponseDto {
  /**
   * Groups/sections within the project board.
   */
  groups: ProjectGroupResponseDto[];

  /**
   * Total number of project tasks (not MilestoneItems).
   */
  taskCount: number;

  /**
   * Number of completed tasks (status = DONE).
   */
  completedTaskCount: number;

  /**
   * Custom column definitions for this project.
   */
  columns: ProjectColumnResponseDto[];

  /**
   * Task summary for quick view (first 50 tasks).
   */
  tasks?: ProjectTaskSummaryDto[];
}

// ===========================================
// Query DTOs
// ===========================================

/**
 * Query DTO for listing projects with filtering.
 * Extends MilestoneQueryDto with additional search capability.
 */
export class ProjectQueryDto extends MilestoneQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * Paginated result wrapper for projects.
 */
export interface PaginatedProjectResult {
  items: ProjectDetailResponseDto[];
  total: number;
  offset: number;
  limit: number;
}
