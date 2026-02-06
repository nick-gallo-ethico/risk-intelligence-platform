/**
 * Implementation Project DTOs
 *
 * Data transfer objects for implementation project and task management.
 */

import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import {
  ImplementationType,
  ImplementationPhase,
  ProjectStatus,
} from "@prisma/client";
import {
  TaskStatus,
  BlockerCategory,
  BlockerStatus,
} from "../../types/implementation.types";

/**
 * DTO for creating a new implementation project
 */
export class CreateProjectDto {
  @IsUUID()
  clientOrganizationId: string;

  @IsEnum(ImplementationType)
  type: ImplementationType;

  @IsUUID()
  leadImplementerId: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  assignedUserIds?: string[];

  @IsOptional()
  @IsDateString()
  targetGoLiveDate?: string;

  @IsOptional()
  @IsDateString()
  kickoffDate?: string;

  @IsOptional()
  @IsString()
  clientVisibleNotes?: string;
}

/**
 * DTO for updating project details
 */
export class UpdateProjectDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ImplementationPhase)
  currentPhase?: ImplementationPhase;

  @IsOptional()
  @IsUUID()
  leadImplementerId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  assignedUserIds?: string[];

  @IsOptional()
  @IsDateString()
  targetGoLiveDate?: string;

  @IsOptional()
  @IsDateString()
  kickoffDate?: string;

  @IsOptional()
  @IsString()
  clientVisibleNotes?: string;
}

/**
 * DTO for updating a task
 */
export class UpdateTaskDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for creating a blocker
 */
export class CreateBlockerDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(BlockerCategory)
  category: BlockerCategory;

  @IsOptional()
  @IsUUID()
  taskId?: string;
}

/**
 * DTO for updating a blocker
 */
export class UpdateBlockerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(BlockerStatus)
  status?: BlockerStatus;

  @IsOptional()
  @IsDateString()
  snoozeUntil?: string;

  @IsOptional()
  @IsString()
  snoozeReason?: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

/**
 * DTO for phase transition
 */
export class TransitionPhaseDto {
  @IsEnum(ImplementationPhase)
  phase: ImplementationPhase;
}

/**
 * Query parameters for listing projects
 */
export class ListProjectsQueryDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsUUID()
  leadImplementerId?: string;

  @IsOptional()
  @IsUUID()
  clientOrganizationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

/**
 * Response type for project list with pagination
 */
export interface ProjectListResponse {
  items: unknown[]; // ImplementationProject with relations
  total: number;
  limit: number;
  offset: number;
}

/**
 * Response type for health score calculation
 */
export interface HealthScoreResponse {
  score: number;
  components: {
    taskCompletionRate: number;
    blockerPenalty: number;
    overduePenalty: number;
  };
  requiredTasks: {
    completed: number;
    total: number;
  };
  blockedTasks: number;
  overdueTasks: number;
}
