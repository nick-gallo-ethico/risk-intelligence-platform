/**
 * EmployeePortalController - Employee Task Management Endpoints
 *
 * Provides REST endpoints for employees to view and manage their tasks:
 * - Attestations from compliance campaigns
 * - Disclosure requirements
 * - Remediation action items
 * - Report follow-ups
 *
 * All endpoints require authentication. Tasks are scoped to the
 * authenticated user's organization and employee record.
 */
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { EmployeeTasksService } from './employee-tasks.service';
import { GetTasksQueryDto, TaskListResponse } from './dto/employee-task.dto';
import { TaskFilters, EmployeeTask, TaskCounts } from './types/employee-task.types';

/**
 * Interface for authenticated user from JWT token.
 */
interface AuthUser {
  id: string;
  organizationId: string;
  role: UserRole;
}

/**
 * Controller for employee portal task management.
 *
 * Base path: /api/v1/employee
 */
@Controller('api/v1/employee')
@UseGuards(JwtAuthGuard)
export class EmployeePortalController {
  constructor(private readonly tasksService: EmployeeTasksService) {}

  /**
   * Get all tasks for the authenticated user.
   *
   * Returns a paginated list of tasks from all sources (campaigns, remediation, etc.).
   * Tasks are sorted with overdue items first, then by due date ascending.
   *
   * @param user - Authenticated user from JWT
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated task list
   */
  @Get('tasks')
  async getTasks(
    @CurrentUser() user: AuthUser,
    @Query() query: GetTasksQueryDto,
  ): Promise<TaskListResponse> {
    // Convert query to TaskFilters
    const filters: TaskFilters = {};

    if (query.types && query.types.length > 0) {
      filters.types = query.types;
    }

    if (query.status && query.status.length > 0) {
      filters.status = query.status;
    }

    if (query.dueBefore) {
      filters.dueBefore = new Date(query.dueBefore);
    }

    if (query.dueAfter) {
      filters.dueAfter = new Date(query.dueAfter);
    }

    // Get all tasks (service handles filtering)
    const allTasks = await this.tasksService.getMyTasks(
      user.id,
      user.organizationId,
      Object.keys(filters).length > 0 ? filters : undefined,
    );

    // Apply pagination
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedTasks = allTasks.slice(startIndex, endIndex);
    const hasMore = endIndex < allTasks.length;

    return {
      data: paginatedTasks,
      total: allTasks.length,
      page,
      limit,
      hasMore,
    };
  }

  /**
   * Get task counts for badge display.
   *
   * Returns counts of pending, overdue, and recently completed tasks.
   * Useful for displaying notification badges in the UI.
   *
   * @param user - Authenticated user from JWT
   * @returns Task counts by status
   */
  @Get('tasks/counts')
  async getTaskCounts(@CurrentUser() user: AuthUser): Promise<TaskCounts> {
    return this.tasksService.getTaskCounts(user.id, user.organizationId);
  }

  /**
   * Get a single task by ID.
   *
   * Returns the full task detail with metadata.
   * Only returns tasks that belong to the authenticated user.
   *
   * @param user - Authenticated user from JWT
   * @param taskId - Task ID (format: {sourceType}-{sourceId})
   * @returns Task detail
   */
  @Get('tasks/:taskId')
  async getTask(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
  ): Promise<EmployeeTask> {
    return this.tasksService.getTaskById(user.id, user.organizationId, taskId);
  }

  /**
   * Mark a task as completed.
   *
   * For remediation steps, this marks the step as done.
   * For campaign tasks (attestations/disclosures), this will throw an error
   * since those require form submission via the actionUrl.
   *
   * @param user - Authenticated user from JWT
   * @param taskId - Task ID (format: {sourceType}-{sourceId})
   * @returns Updated task
   */
  @Post('tasks/:taskId/complete')
  async completeTask(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
  ): Promise<EmployeeTask> {
    return this.tasksService.markTaskCompleted(
      user.id,
      user.organizationId,
      taskId,
    );
  }
}
