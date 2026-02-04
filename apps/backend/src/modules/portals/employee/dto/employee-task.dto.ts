/**
 * DTOs for employee task endpoints.
 */
import {
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TaskType, TaskStatus } from '../types/employee-task.types';

/**
 * Query parameters for fetching employee tasks.
 */
export class GetTasksQueryDto {
  /**
   * Filter by task types (comma-separated).
   * Example: ATTESTATION,DISCLOSURE
   */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.split(',').map((s) => s.trim() as TaskType)
      : value,
  )
  @IsArray()
  types?: TaskType[];

  /**
   * Filter by task status (comma-separated).
   * Example: PENDING,OVERDUE
   */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.split(',').map((s) => s.trim() as TaskStatus)
      : value,
  )
  @IsArray()
  status?: TaskStatus[];

  /**
   * Filter tasks due before this date (ISO 8601).
   */
  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  /**
   * Filter tasks due after this date (ISO 8601).
   */
  @IsOptional()
  @IsDateString()
  dueAfter?: string;

  /**
   * Page number (1-indexed).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Number of items per page.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Response for paginated task list.
 */
export interface TaskListResponse {
  data: import('../types/employee-task.types').EmployeeTask[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
