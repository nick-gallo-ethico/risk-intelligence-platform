import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  TaskPriority,
  TaskSection,
  TaskStatus,
  TaskType,
  UnifiedTask,
} from '../entities/unified-task.entity';

/**
 * Query parameters for My Work queue.
 */
export class MyWorkQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by task types',
    enum: TaskType,
    isArray: true,
    example: [TaskType.CASE_ASSIGNMENT, TaskType.INVESTIGATION_STEP],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TaskType, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  types?: TaskType[];

  @ApiPropertyOptional({
    description: 'Filter by priority levels',
    enum: TaskPriority,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TaskPriority, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  priorities?: TaskPriority[];

  @ApiPropertyOptional({
    description: 'Filter by task statuses',
    enum: TaskStatus,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TaskStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  statuses?: TaskStatus[];

  @ApiPropertyOptional({
    description: 'Filter tasks due on or after this date',
    example: '2026-02-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dueDateStart?: string;

  @ApiPropertyOptional({
    description: 'Filter tasks due on or before this date',
    example: '2026-02-28T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dueDateEnd?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['priority_due_date', 'due_date', 'created_at'],
    default: 'priority_due_date',
  })
  @IsOptional()
  @IsEnum(['priority_due_date', 'due_date', 'created_at'])
  sortBy?: 'priority_due_date' | 'due_date' | 'created_at' = 'priority_due_date';

  @ApiPropertyOptional({
    description: 'Group by field',
    enum: ['entity_type', 'type', 'due_date', 'priority'],
  })
  @IsOptional()
  @IsEnum(['entity_type', 'type', 'due_date', 'priority'])
  groupBy?: 'entity_type' | 'type' | 'due_date' | 'priority';

  @ApiPropertyOptional({
    description: 'Include available (claimable) tasks',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAvailable?: boolean = false;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

/**
 * Task filters for aggregator service.
 */
export class TaskFiltersDto {
  @IsOptional()
  @IsArray()
  @IsEnum(TaskType, { each: true })
  types?: TaskType[];

  @IsOptional()
  @IsArray()
  @IsEnum(TaskPriority, { each: true })
  priorities?: TaskPriority[];

  @IsOptional()
  @IsArray()
  @IsEnum(TaskStatus, { each: true })
  statuses?: TaskStatus[];

  @IsOptional()
  @IsDateString()
  dueDateStart?: string;

  @IsOptional()
  @IsDateString()
  dueDateEnd?: string;
}

/**
 * Request to mark a task as complete.
 */
export class MarkCompleteDto {
  @ApiProperty({
    description: 'Completion notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Request to snooze a task until later.
 */
export class SnoozeTaskDto {
  @ApiProperty({
    description: 'Date/time to snooze until',
    example: '2026-02-10T09:00:00Z',
  })
  @IsDateString()
  until: string;
}

/**
 * Request to reassign a task to another user.
 */
export class ReassignTaskDto {
  @ApiProperty({
    description: 'ID of user to reassign to',
  })
  @IsUUID()
  newAssigneeId: string;

  @ApiPropertyOptional({
    description: 'Reason for reassignment',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Response DTO for My Work queue.
 */
export class MyWorkResponseDto {
  @ApiProperty({
    description: 'Task sections (My Tasks, Available)',
    type: 'array',
  })
  sections: TaskSection[];

  @ApiProperty({
    description: 'Total number of tasks across all sections',
  })
  total: number;

  @ApiProperty({
    description: 'Whether there are more tasks to load',
  })
  hasMore: boolean;
}

/**
 * Response DTO for task counts by type.
 */
export class TaskCountsResponseDto {
  @ApiProperty({
    description: 'Count of case assignment tasks',
  })
  [TaskType.CASE_ASSIGNMENT]: number;

  @ApiProperty({
    description: 'Count of investigation step tasks',
  })
  [TaskType.INVESTIGATION_STEP]: number;

  @ApiProperty({
    description: 'Count of remediation tasks',
  })
  [TaskType.REMEDIATION_TASK]: number;

  @ApiProperty({
    description: 'Count of disclosure review tasks',
  })
  [TaskType.DISCLOSURE_REVIEW]: number;

  @ApiProperty({
    description: 'Count of campaign response tasks',
  })
  [TaskType.CAMPAIGN_RESPONSE]: number;

  @ApiProperty({
    description: 'Count of approval request tasks',
  })
  [TaskType.APPROVAL_REQUEST]: number;
}

/**
 * Response DTO for a single unified task.
 */
export class UnifiedTaskResponseDto implements UnifiedTask {
  @ApiProperty({ description: 'Composite task ID' })
  id: string;

  @ApiProperty({ enum: TaskType })
  type: TaskType;

  @ApiProperty({ description: 'Source entity type' })
  entityType: string;

  @ApiProperty({ description: 'Source entity ID' })
  entityId: string;

  @ApiProperty({ description: 'Task title' })
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  description?: string;

  @ApiProperty({ description: 'Due date', nullable: true })
  dueDate: Date | null;

  @ApiProperty({ enum: TaskPriority })
  priority: TaskPriority;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ description: 'When task was assigned' })
  assignedAt: Date;

  @ApiPropertyOptional({ description: 'Assignee user ID' })
  assigneeId?: string;

  @ApiProperty({ description: 'Additional metadata' })
  metadata: Record<string, unknown>;

  @ApiProperty({ description: 'Deep link URL' })
  url: string;

  @ApiPropertyOptional({ description: 'Related case number' })
  caseNumber?: string;

  @ApiPropertyOptional({ description: 'Category name' })
  categoryName?: string;

  @ApiPropertyOptional({ description: 'Severity level' })
  severity?: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;
}
