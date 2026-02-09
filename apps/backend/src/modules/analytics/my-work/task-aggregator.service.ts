import { Injectable, Logger } from "@nestjs/common";
import {
  Case,
  CaseStatus,
  Investigation,
  InvestigationStatus,
  RemediationStep,
  StepStatus,
  ConflictAlert,
  ConflictStatus,
  CampaignAssignment,
  AssignmentStatus,
  WorkflowInstance,
  WorkflowInstanceStatus,
  Severity,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  UnifiedTask,
  TaskType,
  TaskPriority,
  TaskStatus,
  PRIORITY_WEIGHTS,
  TaskCountsByType,
} from "./entities/unified-task.entity";
import { TaskFiltersDto } from "./dto/my-work.dto";

/**
 * Parameters for fetching tasks.
 */
interface FetchTasksParams {
  organizationId: string;
  userId: string;
  filters?: TaskFiltersDto;
  sortBy?: "priority_due_date" | "due_date" | "created_at";
  limit?: number;
  offset?: number;
}

/**
 * Parameters for fetching available (claimable) tasks.
 */
interface FetchAvailableParams {
  organizationId: string;
  userId: string;
  userRole: string;
  userRegion?: string;
  limit?: number;
}

/**
 * Result from task fetch operations.
 */
interface TaskFetchResult {
  tasks: UnifiedTask[];
  total: number;
  hasMore: boolean;
}

// Type aliases for Prisma includes
type CaseWithCategory = Case & {
  primaryCategory?: { id: string; name: string } | null;
};

type InvestigationWithCase = Investigation & {
  case: { referenceNumber: string };
};

type RemediationStepWithPlan = RemediationStep & {
  plan: {
    caseId: string;
    title: string;
    case?: { referenceNumber: string };
  };
};

type ConflictAlertWithDisclosure = ConflictAlert & {
  disclosure: {
    riu: { id: string };
  };
};

type CampaignAssignmentWithCampaign = CampaignAssignment & {
  campaign: { name: string; type: string };
};

type WorkflowInstanceWithTemplate = WorkflowInstance & {
  template: { name: string };
};

/**
 * TaskAggregatorService aggregates tasks from multiple entity types
 * into a unified "My Work" queue.
 *
 * Supports:
 * - Case assignments
 * - Investigation steps
 * - Remediation tasks
 * - Disclosure reviews (conflict alerts)
 * - Campaign responses
 * - Approval requests (workflow instances)
 */
@Injectable()
export class TaskAggregatorService {
  private readonly logger = new Logger(TaskAggregatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all tasks assigned to the user.
   * Tasks are sorted by priority-weighted due date (overdue first).
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

    // Fetch from multiple sources in parallel
    const [
      cases,
      investigations,
      remediations,
      disclosures,
      campaigns,
      approvals,
    ] = await Promise.all([
      this.fetchCaseAssignments({ organizationId, userId, filters }),
      this.fetchInvestigationSteps({ organizationId, userId, filters }),
      this.fetchRemediationTasks({ organizationId, userId, filters }),
      this.fetchDisclosureReviews({ organizationId, userId, filters }),
      this.fetchCampaignResponses({ organizationId, userId, filters }),
      this.fetchApprovalRequests({ organizationId, userId, filters }),
    ]);

    // Transform to unified format
    const allTasks: UnifiedTask[] = [
      ...cases.map((c) => this.caseToTask(c, organizationId)),
      ...investigations.map((i) =>
        this.investigationStepToTask(i, organizationId),
      ),
      ...remediations.map((r) => this.remediationToTask(r, organizationId)),
      ...disclosures.map((d) => this.disclosureToTask(d, organizationId)),
      ...campaigns.map((c) => this.campaignToTask(c, organizationId)),
      ...approvals.map((a) => this.approvalToTask(a, organizationId)),
    ];

    // Apply type filters if specified
    const filtered = this.applyFilters(allTasks, filters);

    // Apply sorting
    const sorted = this.sortTasks(filtered, sortBy);

    // Calculate total before pagination
    const total = sorted.length;

    // Paginate
    const paginated = sorted.slice(offset, offset + limit);

    return {
      tasks: paginated,
      total,
      hasMore: offset + paginated.length < total,
    };
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
    const unassignedCases = await this.fetchUnassignedCases(
      organizationId,
      limit,
    );

    // Transform to unified format
    const tasks: UnifiedTask[] = unassignedCases.map((c) =>
      this.caseToTask(c, organizationId),
    );

    // Sort by priority-weighted due date
    const sorted = this.sortByPriorityDueDate(tasks);

    return {
      tasks: sorted.slice(0, limit),
      total: sorted.length,
    };
  }

  /**
   * Get task counts by type for dashboard widgets.
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
    ] = await Promise.all([
      this.prisma.case.count({
        where: {
          organizationId,
          createdById: userId,
          status: { notIn: [CaseStatus.CLOSED] },
        },
      }),
      this.prisma.investigation.count({
        where: {
          organizationId,
          primaryInvestigatorId: userId,
          status: { notIn: [InvestigationStatus.CLOSED] },
        },
      }),
      this.prisma.remediationStep.count({
        where: {
          organizationId,
          assigneeUserId: userId,
          status: { notIn: [StepStatus.COMPLETED, StepStatus.SKIPPED] },
        },
      }),
      this.prisma.conflictAlert.count({
        where: {
          organizationId,
          status: ConflictStatus.OPEN,
        },
      }),
      this.prisma.campaignAssignment.count({
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
      }),
      this.prisma.workflowInstance.count({
        where: {
          organizationId,
          status: WorkflowInstanceStatus.ACTIVE,
        },
      }),
    ]);

    return {
      [TaskType.CASE_ASSIGNMENT]: casesCount,
      [TaskType.INVESTIGATION_STEP]: investigationsCount,
      [TaskType.REMEDIATION_TASK]: remediationsCount,
      [TaskType.DISCLOSURE_REVIEW]: disclosuresCount,
      [TaskType.CAMPAIGN_RESPONSE]: campaignsCount,
      [TaskType.APPROVAL_REQUEST]: approvalsCount,
    };
  }

  // ==========================================
  // Private: Fetch Methods
  // ==========================================

  /**
   * Fetch cases assigned to the user.
   */
  private async fetchCaseAssignments(params: {
    organizationId: string;
    userId: string;
    filters?: TaskFiltersDto;
  }): Promise<CaseWithCategory[]> {
    const { organizationId, userId, filters } = params;

    // Skip if type filter excludes case assignments
    if (filters?.types && !filters.types.includes(TaskType.CASE_ASSIGNMENT)) {
      return [];
    }

    const where: Prisma.CaseWhereInput = {
      organizationId,
      createdById: userId, // User who created the case is responsible
      status: { notIn: [CaseStatus.CLOSED] },
      isMerged: false,
    };

    // Apply due date filters if provided
    if (filters?.dueDateStart || filters?.dueDateEnd) {
      where.createdAt = {};
      if (filters.dueDateStart) {
        where.createdAt.gte = new Date(filters.dueDateStart);
      }
      if (filters.dueDateEnd) {
        where.createdAt.lte = new Date(filters.dueDateEnd);
      }
    }

    return this.prisma.case.findMany({
      where,
      include: {
        primaryCategory: {
          select: { id: true, name: true },
        },
      },
      take: 100, // Reasonable limit per type
    });
  }

  /**
   * Fetch investigation steps assigned to the user.
   */
  private async fetchInvestigationSteps(params: {
    organizationId: string;
    userId: string;
    filters?: TaskFiltersDto;
  }): Promise<InvestigationWithCase[]> {
    const { organizationId, userId, filters } = params;

    if (
      filters?.types &&
      !filters.types.includes(TaskType.INVESTIGATION_STEP)
    ) {
      return [];
    }

    const where: Prisma.InvestigationWhereInput = {
      organizationId,
      primaryInvestigatorId: userId,
      status: { notIn: [InvestigationStatus.CLOSED] },
    };

    if (filters?.dueDateStart || filters?.dueDateEnd) {
      where.dueDate = {};
      if (filters.dueDateStart) {
        where.dueDate.gte = new Date(filters.dueDateStart);
      }
      if (filters.dueDateEnd) {
        where.dueDate.lte = new Date(filters.dueDateEnd);
      }
    }

    return this.prisma.investigation.findMany({
      where,
      include: {
        case: {
          select: { referenceNumber: true },
        },
      },
      take: 100,
    });
  }

  /**
   * Fetch remediation tasks assigned to the user.
   */
  private async fetchRemediationTasks(params: {
    organizationId: string;
    userId: string;
    filters?: TaskFiltersDto;
  }): Promise<RemediationStepWithPlan[]> {
    const { organizationId, userId, filters } = params;

    if (filters?.types && !filters.types.includes(TaskType.REMEDIATION_TASK)) {
      return [];
    }

    const where: Prisma.RemediationStepWhereInput = {
      organizationId,
      assigneeUserId: userId,
      status: { notIn: [StepStatus.COMPLETED, StepStatus.SKIPPED] },
    };

    if (filters?.dueDateStart || filters?.dueDateEnd) {
      where.dueDate = {};
      if (filters.dueDateStart) {
        where.dueDate.gte = new Date(filters.dueDateStart);
      }
      if (filters.dueDateEnd) {
        where.dueDate.lte = new Date(filters.dueDateEnd);
      }
    }

    return this.prisma.remediationStep.findMany({
      where,
      include: {
        plan: {
          select: {
            caseId: true,
            title: true,
            case: {
              select: { referenceNumber: true },
            },
          },
        },
      },
      take: 100,
    });
  }

  /**
   * Fetch disclosure conflict alerts requiring review.
   * Note: These are org-level tasks, not user-specific assignments.
   */
  private async fetchDisclosureReviews(params: {
    organizationId: string;
    userId: string;
    filters?: TaskFiltersDto;
  }): Promise<ConflictAlertWithDisclosure[]> {
    const { organizationId, filters } = params;

    if (filters?.types && !filters.types.includes(TaskType.DISCLOSURE_REVIEW)) {
      return [];
    }

    return this.prisma.conflictAlert.findMany({
      where: {
        organizationId,
        status: ConflictStatus.OPEN,
      },
      include: {
        disclosure: {
          select: {
            riu: { select: { id: true } },
          },
        },
      },
      take: 100,
    });
  }

  /**
   * Fetch campaign assignments for the user (as employee).
   */
  private async fetchCampaignResponses(params: {
    organizationId: string;
    userId: string;
    filters?: TaskFiltersDto;
  }): Promise<CampaignAssignmentWithCampaign[]> {
    const { organizationId, userId, filters } = params;

    if (filters?.types && !filters.types.includes(TaskType.CAMPAIGN_RESPONSE)) {
      return [];
    }

    const where: Prisma.CampaignAssignmentWhereInput = {
      organizationId,
      employeeId: userId,
      status: {
        in: [
          AssignmentStatus.PENDING,
          AssignmentStatus.NOTIFIED,
          AssignmentStatus.IN_PROGRESS,
        ],
      },
    };

    if (filters?.dueDateStart || filters?.dueDateEnd) {
      where.dueDate = {};
      if (filters.dueDateStart) {
        where.dueDate.gte = new Date(filters.dueDateStart);
      }
      if (filters.dueDateEnd) {
        where.dueDate.lte = new Date(filters.dueDateEnd);
      }
    }

    return this.prisma.campaignAssignment.findMany({
      where,
      include: {
        campaign: {
          select: { name: true, type: true },
        },
      },
      take: 100,
    });
  }

  /**
   * Fetch workflow approval requests.
   * Note: This is simplified - in production, would check step assignees.
   */
  private async fetchApprovalRequests(params: {
    organizationId: string;
    userId: string;
    filters?: TaskFiltersDto;
  }): Promise<WorkflowInstanceWithTemplate[]> {
    const { organizationId, filters } = params;

    if (filters?.types && !filters.types.includes(TaskType.APPROVAL_REQUEST)) {
      return [];
    }

    const where: Prisma.WorkflowInstanceWhereInput = {
      organizationId,
      status: WorkflowInstanceStatus.ACTIVE,
    };

    if (filters?.dueDateStart || filters?.dueDateEnd) {
      where.dueDate = {};
      if (filters.dueDateStart) {
        where.dueDate.gte = new Date(filters.dueDateStart);
      }
      if (filters.dueDateEnd) {
        where.dueDate.lte = new Date(filters.dueDateEnd);
      }
    }

    return this.prisma.workflowInstance.findMany({
      where,
      include: {
        template: {
          select: { name: true },
        },
      },
      take: 100,
    });
  }

  /**
   * Fetch unassigned cases for "Available" queue.
   */
  private async fetchUnassignedCases(
    organizationId: string,
    limit: number,
  ): Promise<CaseWithCategory[]> {
    return this.prisma.case.findMany({
      where: {
        organizationId,
        status: CaseStatus.NEW,
        isMerged: false,
      },
      include: {
        primaryCategory: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  // ==========================================
  // Private: Transform Methods
  // ==========================================

  /**
   * Transform Case to UnifiedTask.
   */
  private caseToTask(
    caseRecord: CaseWithCategory,
    organizationId: string,
  ): UnifiedTask {
    // Cases don't have explicit due dates - could derive from SLA
    const dueDate = null;

    return {
      id: `${TaskType.CASE_ASSIGNMENT}-${caseRecord.id}`,
      type: TaskType.CASE_ASSIGNMENT,
      entityType: "Case",
      entityId: caseRecord.id,
      title: `Case ${caseRecord.referenceNumber}`,
      description: caseRecord.summary || caseRecord.details?.substring(0, 200),
      dueDate,
      priority: this.severityToPriority(caseRecord.severity),
      status: this.determineTaskStatus(
        dueDate,
        caseRecord.status === CaseStatus.OPEN,
      ),
      assignedAt: caseRecord.createdAt,
      assigneeId: caseRecord.createdById,
      metadata: {
        sourceChannel: caseRecord.sourceChannel,
        caseType: caseRecord.caseType,
        status: caseRecord.status,
      },
      url: `/cases/${caseRecord.id}`,
      caseNumber: caseRecord.referenceNumber,
      categoryName: caseRecord.primaryCategory?.name,
      severity: caseRecord.severity,
      organizationId,
    };
  }

  /**
   * Transform Investigation to UnifiedTask.
   */
  private investigationStepToTask(
    investigation: InvestigationWithCase,
    organizationId: string,
  ): UnifiedTask {
    return {
      id: `${TaskType.INVESTIGATION_STEP}-${investigation.id}`,
      type: TaskType.INVESTIGATION_STEP,
      entityType: "Investigation",
      entityId: investigation.id,
      title: `Investigation for ${investigation.case.referenceNumber}`,
      description: investigation.findingsSummary || undefined,
      dueDate: investigation.dueDate,
      priority: this.slaStatusToPriority(investigation.slaStatus),
      status: this.determineTaskStatus(
        investigation.dueDate,
        investigation.status === InvestigationStatus.INVESTIGATING,
      ),
      assignedAt: investigation.assignedAt || investigation.createdAt,
      assigneeId: investigation.primaryInvestigatorId || undefined,
      metadata: {
        investigationType: investigation.investigationType,
        department: investigation.department,
        status: investigation.status,
        slaStatus: investigation.slaStatus,
      },
      url: `/investigations/${investigation.id}`,
      caseNumber: investigation.case.referenceNumber,
      organizationId,
    };
  }

  /**
   * Transform RemediationStep to UnifiedTask.
   */
  private remediationToTask(
    step: RemediationStepWithPlan,
    organizationId: string,
  ): UnifiedTask {
    return {
      id: `${TaskType.REMEDIATION_TASK}-${step.id}`,
      type: TaskType.REMEDIATION_TASK,
      entityType: "RemediationStep",
      entityId: step.id,
      title: step.title,
      description: step.description || undefined,
      dueDate: step.dueDate,
      priority: TaskPriority.MEDIUM, // Remediation steps don't have severity
      status: this.determineTaskStatus(
        step.dueDate,
        step.status === StepStatus.IN_PROGRESS,
      ),
      assignedAt: step.createdAt,
      assigneeId: step.assigneeUserId || undefined,
      metadata: {
        planTitle: step.plan.title,
        planId: step.planId,
        order: step.order,
        requiresCoApproval: step.requiresCoApproval,
        status: step.status,
      },
      url: `/cases/${step.plan.caseId}/remediation/${step.planId}`,
      caseNumber: step.plan.case?.referenceNumber,
      organizationId,
    };
  }

  /**
   * Transform ConflictAlert to UnifiedTask.
   */
  private disclosureToTask(
    alert: ConflictAlertWithDisclosure,
    organizationId: string,
  ): UnifiedTask {
    return {
      id: `${TaskType.DISCLOSURE_REVIEW}-${alert.id}`,
      type: TaskType.DISCLOSURE_REVIEW,
      entityType: "ConflictAlert",
      entityId: alert.id,
      title: `Conflict Alert: ${alert.summary}`,
      description: `${alert.conflictType} - ${alert.matchedEntity}`,
      dueDate: null, // Conflict alerts don't have due dates
      priority: this.conflictSeverityToPriority(alert.severity),
      status: TaskStatus.PENDING,
      assignedAt: alert.createdAt,
      metadata: {
        conflictType: alert.conflictType,
        severity: alert.severity,
        matchConfidence: alert.matchConfidence,
        disclosureId: alert.disclosureId,
      },
      url: `/compliance/conflicts`,
      organizationId,
    };
  }

  /**
   * Transform CampaignAssignment to UnifiedTask.
   */
  private campaignToTask(
    assignment: CampaignAssignmentWithCampaign,
    organizationId: string,
  ): UnifiedTask {
    return {
      id: `${TaskType.CAMPAIGN_RESPONSE}-${assignment.id}`,
      type: TaskType.CAMPAIGN_RESPONSE,
      entityType: "CampaignAssignment",
      entityId: assignment.id,
      title: `${assignment.campaign.name}`,
      description: `Complete your ${assignment.campaign.type.toLowerCase()} response`,
      dueDate: assignment.dueDate,
      priority: TaskPriority.MEDIUM,
      status: this.assignmentStatusToTaskStatus(
        assignment.status,
        assignment.dueDate,
      ),
      assignedAt: assignment.assignedAt,
      assigneeId: assignment.employeeId,
      metadata: {
        campaignId: assignment.campaignId,
        campaignType: assignment.campaign.type,
        reminderCount: assignment.reminderCount,
        status: assignment.status,
      },
      url: `/disclosures/respond/${assignment.id}`,
      organizationId,
    };
  }

  /**
   * Transform WorkflowInstance to UnifiedTask (approval request).
   */
  private approvalToTask(
    instance: WorkflowInstanceWithTemplate,
    organizationId: string,
  ): UnifiedTask {
    return {
      id: `${TaskType.APPROVAL_REQUEST}-${instance.id}`,
      type: TaskType.APPROVAL_REQUEST,
      entityType: "WorkflowInstance",
      entityId: instance.id,
      title: `Approval: ${instance.template.name}`,
      description: `Workflow at stage: ${instance.currentStage}`,
      dueDate: instance.dueDate,
      priority: this.slaStatusToPriority(instance.slaStatus),
      status: this.determineTaskStatus(instance.dueDate, true),
      assignedAt: instance.createdAt,
      metadata: {
        templateId: instance.templateId,
        entityType: instance.entityType,
        entityId: instance.entityId,
        currentStage: instance.currentStage,
        currentStep: instance.currentStep,
        slaStatus: instance.slaStatus,
      },
      url: `/workflows/${instance.id}`,
      organizationId,
    };
  }

  // ==========================================
  // Private: Sorting & Filtering
  // ==========================================

  /**
   * Sort tasks based on specified method.
   */
  private sortTasks(
    tasks: UnifiedTask[],
    sortBy: "priority_due_date" | "due_date" | "created_at",
  ): UnifiedTask[] {
    switch (sortBy) {
      case "priority_due_date":
        return this.sortByPriorityDueDate(tasks);
      case "due_date":
        return tasks.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        });
      case "created_at":
        return tasks.sort(
          (a, b) => b.assignedAt.getTime() - a.assignedAt.getTime(),
        );
      default:
        return this.sortByPriorityDueDate(tasks);
    }
  }

  /**
   * Sort tasks by priority-weighted due date.
   * Algorithm: Overdue first, then priority x days until due.
   * Higher priority items with same due date come first.
   */
  private sortByPriorityDueDate(tasks: UnifiedTask[]): UnifiedTask[] {
    const now = new Date();

    return [...tasks].sort((a, b) => {
      // Overdue items always first
      const aOverdue = a.dueDate && a.dueDate < now;
      const bOverdue = b.dueDate && b.dueDate < now;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // If both overdue, sort by how overdue (most overdue first)
      if (aOverdue && bOverdue && a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }

      // Priority-weighted score (lower = more urgent)
      // Score = (time until due) / priority_weight
      const aScore = a.dueDate
        ? (a.dueDate.getTime() - now.getTime()) / PRIORITY_WEIGHTS[a.priority]
        : Infinity;
      const bScore = b.dueDate
        ? (b.dueDate.getTime() - now.getTime()) / PRIORITY_WEIGHTS[b.priority]
        : Infinity;

      // Lower score = more urgent = should come first
      if (aScore !== bScore) {
        return aScore - bScore;
      }

      // Tie-breaker: higher priority first
      return PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
    });
  }

  /**
   * Apply filters to tasks.
   */
  private applyFilters(
    tasks: UnifiedTask[],
    filters?: TaskFiltersDto,
  ): UnifiedTask[] {
    if (!filters) return tasks;

    let result = tasks;

    // Filter by priorities
    if (filters.priorities && filters.priorities.length > 0) {
      result = result.filter((t) => filters.priorities!.includes(t.priority));
    }

    // Filter by statuses
    if (filters.statuses && filters.statuses.length > 0) {
      result = result.filter((t) => filters.statuses!.includes(t.status));
    }

    return result;
  }

  // ==========================================
  // Private: Helper Methods
  // ==========================================

  /**
   * Convert case severity to task priority.
   */
  private severityToPriority(severity: Severity): TaskPriority {
    switch (severity) {
      case Severity.HIGH:
        return TaskPriority.HIGH;
      case Severity.MEDIUM:
        return TaskPriority.MEDIUM;
      case Severity.LOW:
      default:
        return TaskPriority.LOW;
    }
  }

  /**
   * Convert SLA status to task priority.
   */
  private slaStatusToPriority(slaStatus: string): TaskPriority {
    switch (slaStatus) {
      case "OVERDUE":
        return TaskPriority.HIGH;
      case "WARNING":
        return TaskPriority.HIGH;
      case "ON_TRACK":
      default:
        return TaskPriority.MEDIUM;
    }
  }

  /**
   * Convert conflict severity to task priority.
   */
  private conflictSeverityToPriority(severity: string): TaskPriority {
    switch (severity) {
      case "CRITICAL":
      case "HIGH":
        return TaskPriority.HIGH;
      case "MEDIUM":
        return TaskPriority.MEDIUM;
      case "LOW":
      default:
        return TaskPriority.LOW;
    }
  }

  /**
   * Convert assignment status to task status.
   */
  private assignmentStatusToTaskStatus(
    status: AssignmentStatus,
    dueDate: Date,
  ): TaskStatus {
    const now = new Date();

    if (dueDate < now && status !== AssignmentStatus.COMPLETED) {
      return TaskStatus.OVERDUE;
    }

    switch (status) {
      case AssignmentStatus.IN_PROGRESS:
        return TaskStatus.IN_PROGRESS;
      case AssignmentStatus.PENDING:
      case AssignmentStatus.NOTIFIED:
      default:
        return TaskStatus.PENDING;
    }
  }

  /**
   * Determine task status based on due date and in-progress flag.
   */
  private determineTaskStatus(
    dueDate: Date | null,
    isInProgress: boolean,
  ): TaskStatus {
    const now = new Date();

    if (dueDate && dueDate < now) {
      return TaskStatus.OVERDUE;
    }

    if (isInProgress) {
      return TaskStatus.IN_PROGRESS;
    }

    return TaskStatus.PENDING;
  }
}
