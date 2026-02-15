import { Injectable, Logger } from "@nestjs/common";
import {
  CaseStatus,
  InvestigationStatus,
  StepStatus,
  ConflictStatus,
  AssignmentStatus,
  WorkflowInstanceStatus,
  ProjectTaskStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  UnifiedTask,
  TaskType,
  TaskCountsByType,
} from "./entities/unified-task.entity";
import { TaskFiltersDto } from "./dto/my-work.dto";
import { TaskCaseFetcherService } from "./services/task-case-fetcher.service";
import { TaskWorkflowFetcherService } from "./services/task-workflow-fetcher.service";
import {
  TaskSorterService,
  TaskFetchResult,
  TaskSortBy,
} from "./services/task-sorter.service";

/**
 * Parameters for fetching tasks.
 */
export interface FetchTasksParams {
  organizationId: string;
  userId: string;
  filters?: TaskFiltersDto;
  sortBy?: TaskSortBy;
  limit?: number;
  offset?: number;
}

/**
 * Parameters for fetching available (claimable) tasks.
 */
export interface FetchAvailableParams {
  organizationId: string;
  userId: string;
  userRole: string;
  userRegion?: string;
  limit?: number;
}

/**
 * TaskAggregatorService is a thin coordinator that aggregates tasks
 * from multiple entity types into a unified "My Work" queue.
 *
 * This service delegates to specialized sub-services:
 * - TaskCaseFetcherService: Case, investigation, remediation, project tasks
 * - TaskWorkflowFetcherService: Disclosure, campaign, approval tasks
 * - TaskSorterService: Sorting, filtering, and pagination
 *
 * Supports:
 * - Case assignments
 * - Investigation steps
 * - Remediation tasks
 * - Disclosure reviews (conflict alerts)
 * - Campaign responses
 * - Approval requests (workflow instances)
 * - Project tasks (Monday.com-style board tasks)
 */
@Injectable()
export class TaskAggregatorService {
  private readonly logger = new Logger(TaskAggregatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskCaseFetcherService: TaskCaseFetcherService,
    private readonly taskWorkflowFetcherService: TaskWorkflowFetcherService,
    private readonly taskSorterService: TaskSorterService,
  ) {}

  // ==========================================
  // Public: Main Entry Points
  // ==========================================

  /**
   * Get all tasks assigned to the user.
   * Tasks are sorted by priority-weighted due date (overdue first).
   *
   * Orchestrates sub-services to:
   * 1. Fetch tasks from case-related and workflow-related sources in parallel
   * 2. Apply filters
   * 3. Sort by specified criteria
   * 4. Paginate results
   */
  async getMyTasks(params: FetchTasksParams): Promise<TaskFetchResult> {
    const {
      organizationId,
      userId,
      filters,
      sortBy = "priority_due_date",
      limit = 50,
      offset = 0,
    } = params;

    // Fetch from all sources in parallel via sub-services
    const [caseTasks, workflowTasks] = await Promise.all([
      this.taskCaseFetcherService.fetchAllCaseTasks({
        organizationId,
        userId,
        filters,
      }),
      this.taskWorkflowFetcherService.fetchAllWorkflowTasks({
        organizationId,
        userId,
        filters,
      }),
    ]);

    // Combine all tasks
    const allTasks: UnifiedTask[] = [...caseTasks, ...workflowTasks];

    // Apply filters (type filters already applied at fetch level)
    const filtered = this.taskSorterService.applyFilters(allTasks, filters);

    // Sort by specified criteria
    const sorted = this.taskSorterService.sortTasks(filtered, sortBy);

    // Paginate and return
    return this.taskSorterService.paginateResults(sorted, limit, offset);
  }

  /**
   * Get tasks available for the user to claim based on role/region.
   * These are unassigned tasks that the user could take ownership of.
   */
  async getAvailableTasks(
    params: FetchAvailableParams,
  ): Promise<{ tasks: UnifiedTask[]; total: number }> {
    // Note: userId, userRole, userRegion reserved for future permission-based filtering
    const { organizationId, limit = 50 } = params;

    // Fetch unassigned cases the user could claim
    const unassignedCases =
      await this.taskCaseFetcherService.fetchUnassignedCases(
        organizationId,
        limit,
      );

    // Transform to unified format
    const tasks: UnifiedTask[] = unassignedCases.map((c) =>
      this.taskCaseFetcherService.mapCaseToUnifiedTask(c, organizationId),
    );

    // Sort by priority-weighted due date
    const sorted = this.taskSorterService.sortByPriorityAndDueDate(tasks);

    return {
      tasks: sorted.slice(0, limit),
      total: sorted.length,
    };
  }

  /**
   * Get task counts by type for dashboard widgets.
   * Performs direct database counts for efficiency.
   */
  async getTaskCounts(
    organizationId: string,
    userId: string,
  ): Promise<TaskCountsByType> {
    const [
      casesCount,
      investigationsCount,
      remediationsCount,
      disclosuresCount,
      campaignsCount,
      approvalsCount,
      projectTasksCount,
    ] = await Promise.all([
      this.countCaseAssignments(organizationId, userId),
      this.countInvestigationSteps(organizationId, userId),
      this.countRemediationTasks(organizationId, userId),
      this.countDisclosureReviews(organizationId),
      this.countCampaignResponses(organizationId, userId),
      this.countApprovalRequests(organizationId),
      this.countProjectTasks(organizationId, userId),
    ]);

    return {
      [TaskType.CASE_ASSIGNMENT]: casesCount,
      [TaskType.INVESTIGATION_STEP]: investigationsCount,
      [TaskType.REMEDIATION_TASK]: remediationsCount,
      [TaskType.DISCLOSURE_REVIEW]: disclosuresCount,
      [TaskType.CAMPAIGN_RESPONSE]: campaignsCount,
      [TaskType.APPROVAL_REQUEST]: approvalsCount,
      [TaskType.PROJECT_TASK]: projectTasksCount,
    };
  }

  // ==========================================
  // Private: Count Methods (for getTaskCounts)
  // ==========================================

  private async countCaseAssignments(
    organizationId: string,
    userId: string,
  ): Promise<number> {
    return this.prisma.case.count({
      where: {
        organizationId,
        createdById: userId,
        status: { notIn: [CaseStatus.CLOSED] },
      },
    });
  }

  private async countInvestigationSteps(
    organizationId: string,
    userId: string,
  ): Promise<number> {
    return this.prisma.investigation.count({
      where: {
        organizationId,
        primaryInvestigatorId: userId,
        status: { notIn: [InvestigationStatus.CLOSED] },
      },
    });
  }

  private async countRemediationTasks(
    organizationId: string,
    userId: string,
  ): Promise<number> {
    return this.prisma.remediationStep.count({
      where: {
        organizationId,
        assigneeUserId: userId,
        status: { notIn: [StepStatus.COMPLETED, StepStatus.SKIPPED] },
      },
    });
  }

  private async countDisclosureReviews(organizationId: string): Promise<number> {
    return this.prisma.conflictAlert.count({
      where: {
        organizationId,
        status: ConflictStatus.OPEN,
      },
    });
  }

  private async countCampaignResponses(
    organizationId: string,
    userId: string,
  ): Promise<number> {
    return this.prisma.campaignAssignment.count({
      where: {
        organizationId,
        employeeId: userId,
        status: {
          in: [
            AssignmentStatus.PENDING,
            AssignmentStatus.NOTIFIED,
            AssignmentStatus.IN_PROGRESS,
          ],
        },
      },
    });
  }

  private async countApprovalRequests(organizationId: string): Promise<number> {
    return this.prisma.workflowInstance.count({
      where: {
        organizationId,
        status: WorkflowInstanceStatus.ACTIVE,
      },
    });
  }

  private async countProjectTasks(
    organizationId: string,
    userId: string,
  ): Promise<number> {
    return this.prisma.projectTask.count({
      where: {
        organizationId,
        assigneeId: userId,
        status: {
          notIn: [ProjectTaskStatus.DONE, ProjectTaskStatus.CANCELLED],
        },
      },
    });
  }
}
