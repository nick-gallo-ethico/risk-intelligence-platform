/**
 * EmployeePortalController - Employee Portal Endpoints
 *
 * Provides REST endpoints for employees:
 * - Task management (attestations, disclosures, remediation, follow-ups)
 * - History views (my reports, disclosures, attestations)
 * - Compliance overview with score
 * - Manager proxy reporting
 *
 * All endpoints require authentication. Data is scoped to the
 * authenticated user's organization and employee/person record.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmployeeTasksService } from './employee-tasks.service';
import { EmployeeHistoryService } from './employee-history.service';
import { ManagerProxyService } from './manager-proxy.service';
import { GetTasksQueryDto, TaskListResponse } from './dto/employee-task.dto';
import {
  GetReportsQueryDto,
  GetDisclosuresQueryDto,
  GetAttestationsQueryDto,
} from './dto/employee-views.dto';
import {
  ProxyReportDto,
  TeamMember,
  ProxySubmissionResult,
  ProxySubmission,
} from './dto/proxy-report.dto';
import { TaskFilters, EmployeeTask, TaskCounts } from './types/employee-task.types';
import {
  ReportSummary,
  DisclosureSummary,
  AttestationSummary,
  ComplianceOverview,
  PaginatedResult,
} from './types/employee-history.types';

/**
 * Interface for authenticated user from JWT token.
 */
interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
}

/**
 * Controller for employee portal.
 *
 * Base path: /api/v1/employee
 */
@Controller('employee')
@UseGuards(JwtAuthGuard)
export class EmployeePortalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: EmployeeTasksService,
    private readonly historyService: EmployeeHistoryService,
    private readonly proxyService: ManagerProxyService,
  ) {}

  // ==================== Task Endpoints ====================

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

  // ==================== History View Endpoints ====================

  /**
   * Get employee's submitted reports.
   *
   * Returns reports (RIUs) where the employee is the reporter.
   * Includes case status if linked.
   *
   * @param user - Authenticated user from JWT
   * @param query - Pagination options
   * @returns Paginated list of report summaries
   */
  @Get('reports')
  async getMyReports(
    @CurrentUser() user: AuthUser,
    @Query() query: GetReportsQueryDto,
  ): Promise<PaginatedResult<ReportSummary>> {
    const personId = await this.getPersonIdForUser(user);
    if (!personId) {
      return { data: [], total: 0, page: 1, limit: 20, hasMore: false };
    }

    return this.historyService.getMyReports(personId, user.organizationId, {
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Get employee's disclosure history.
   *
   * Returns disclosure campaign assignments for the employee.
   *
   * @param user - Authenticated user from JWT
   * @param query - Pagination and filter options
   * @returns Paginated list of disclosure summaries
   */
  @Get('disclosures')
  async getMyDisclosures(
    @CurrentUser() user: AuthUser,
    @Query() query: GetDisclosuresQueryDto,
  ): Promise<PaginatedResult<DisclosureSummary>> {
    const personId = await this.getPersonIdForUser(user);
    if (!personId) {
      return { data: [], total: 0, page: 1, limit: 20, hasMore: false };
    }

    return this.historyService.getMyDisclosures(personId, user.organizationId, {
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Get employee's attestation history.
   *
   * Returns attestation campaign assignments with pending/completed split.
   *
   * @param user - Authenticated user from JWT
   * @param query - Pagination and filter options
   * @returns Paginated list of attestation summaries
   */
  @Get('attestations')
  async getMyAttestations(
    @CurrentUser() user: AuthUser,
    @Query() query: GetAttestationsQueryDto,
  ): Promise<PaginatedResult<AttestationSummary>> {
    const personId = await this.getPersonIdForUser(user);
    if (!personId) {
      return { data: [], total: 0, page: 1, limit: 20, hasMore: false };
    }

    return this.historyService.getMyAttestations(personId, user.organizationId, {
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Get employee's compliance overview.
   *
   * Returns summary counts and compliance score.
   *
   * @param user - Authenticated user from JWT
   * @returns Compliance overview with counts and score
   */
  @Get('overview')
  async getComplianceOverview(
    @CurrentUser() user: AuthUser,
  ): Promise<ComplianceOverview> {
    const personId = await this.getPersonIdForUser(user);
    if (!personId) {
      // Return empty overview if no person record
      return {
        reports: { total: 0, pending: 0 },
        disclosures: { total: 0, upcomingReviews: 0 },
        attestations: { total: 0, pending: 0, overdue: 0 },
        complianceScore: 100, // No items = fully compliant
      };
    }

    return this.historyService.getComplianceOverview(personId, user.organizationId);
  }

  // ==================== Manager Proxy Endpoints ====================

  /**
   * Get manager's team members (direct reports).
   *
   * Requires user to have direct reports in the person hierarchy.
   *
   * @param user - Authenticated user from JWT
   * @returns List of team members
   */
  @Get('team')
  async getTeamMembers(@CurrentUser() user: AuthUser): Promise<TeamMember[]> {
    const personId = await this.getPersonIdForUser(user);
    if (!personId) {
      return [];
    }

    const teamMembers = await this.proxyService.getTeamMembers(
      personId,
      user.organizationId,
    );

    return teamMembers;
  }

  /**
   * Submit a proxy report on behalf of an employee.
   *
   * Requires manager to have a reporting relationship with the employee.
   * Access code is generated for the employee, not the manager.
   *
   * @param user - Authenticated user from JWT
   * @param dto - Proxy report details
   * @returns Submission result with access code for employee
   */
  @Post('proxy-report')
  async submitProxyReport(
    @CurrentUser() user: AuthUser,
    @Body() dto: ProxyReportDto,
  ): Promise<ProxySubmissionResult> {
    const personId = await this.getPersonIdForUser(user);
    if (!personId) {
      throw new ForbiddenException('You must be linked to a person record to submit proxy reports');
    }

    // Verify user is a manager (has direct reports)
    const teamMembers = await this.proxyService.getTeamMembers(
      personId,
      user.organizationId,
    );

    if (teamMembers.length === 0) {
      throw new ForbiddenException('You must be a manager to submit proxy reports');
    }

    return this.proxyService.submitProxyReport(
      personId,
      user.id,
      dto,
      user.organizationId,
    );
  }

  /**
   * Get proxy submissions made by this manager.
   *
   * Returns list of reports submitted on behalf of team members.
   *
   * @param user - Authenticated user from JWT
   * @returns List of proxy submissions
   */
  @Get('proxy-submissions')
  async getProxySubmissions(
    @CurrentUser() user: AuthUser,
  ): Promise<ProxySubmission[]> {
    const personId = await this.getPersonIdForUser(user);
    if (!personId) {
      return [];
    }

    return this.proxyService.getProxySubmissions(personId, user.organizationId);
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get the Person ID for the authenticated user.
   * Looks up Person by email match (User-Employee-Person linkage).
   */
  private async getPersonIdForUser(user: AuthUser): Promise<string | null> {
    // Find person by email (User-Employee-Person link is via email)
    const person = await this.prisma.person.findFirst({
      where: {
        organizationId: user.organizationId,
        email: user.email,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    return person?.id ?? null;
  }
}
