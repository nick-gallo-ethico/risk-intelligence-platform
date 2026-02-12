import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDate,
  IsInt,
  Min,
  Max,
  IsArray,
  IsObject,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { PartialType } from "@nestjs/mapped-types";
import { ProjectTaskStatus, ProjectTaskPriority } from "@prisma/client";

// ===========================================
// Create DTOs
// ===========================================

/**
 * DTO for creating a new project task.
 */
export class CreateProjectTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectTaskStatus)
  status?: ProjectTaskStatus;

  @IsOptional()
  @IsEnum(ProjectTaskPriority)
  priority?: ProjectTaskPriority;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}

// ===========================================
// Update DTOs
// ===========================================

/**
 * DTO for updating a project task.
 * All fields are optional.
 */
export class UpdateProjectTaskDto extends PartialType(CreateProjectTaskDto) {}

/**
 * DTO for bulk updating multiple tasks.
 */
export class BulkUpdateTasksDto {
  @IsArray()
  @IsUUID("4", { each: true })
  taskIds: string[];

  @IsOptional()
  @IsEnum(ProjectTaskStatus)
  status?: ProjectTaskStatus;

  @IsOptional()
  @IsEnum(ProjectTaskPriority)
  priority?: ProjectTaskPriority;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;
}

/**
 * DTO for reordering tasks within a group.
 */
export class ReorderTasksDto {
  @IsArray()
  @IsUUID("4", { each: true })
  orderedIds: string[];
}

// ===========================================
// Query DTOs
// ===========================================

/**
 * DTO for querying project tasks with filtering and pagination.
 */
export class ProjectTaskQueryDto {
  @IsOptional()
  @IsEnum(ProjectTaskStatus)
  status?: ProjectTaskStatus;

  @IsOptional()
  @IsEnum(ProjectTaskPriority)
  priority?: ProjectTaskPriority;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?:
    | "title"
    | "dueDate"
    | "priority"
    | "status"
    | "createdAt"
    | "sortOrder";

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc";

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

// ===========================================
// Response DTOs
// ===========================================

/**
 * Response DTO for project task data.
 */
export class ProjectTaskResponseDto {
  id: string;
  title: string;
  description?: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assignee?: {
    id: string;
    name: string;
  };
  startDate?: Date;
  dueDate?: Date;
  completedAt?: Date;
  sortOrder: number;
  groupId?: string;
  parentTaskId?: string;
  customFields?: Record<string, unknown>;
  subtaskCount: number;
  completedSubtaskCount: number;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated result wrapper for project tasks.
 */
export interface PaginatedProjectTaskResult {
  items: ProjectTaskResponseDto[];
  total: number;
  offset: number;
  limit: number;
}
