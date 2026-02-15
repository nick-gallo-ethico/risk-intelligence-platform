import { Injectable, Logger } from "@nestjs/common";
import {
  Case,
  CaseStatus,
  Investigation,
  InvestigationStatus,
  RemediationStep,
  StepStatus,
  Prisma,
  ProjectTask,
  ProjectTaskStatus,
  ProjectTaskPriority,
  Severity,
} from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  UnifiedTask,
  TaskType,
  TaskPriority,
  TaskStatus,
} from "../entities/unified-task.entity";
import { TaskFiltersDto } from "../dto/my-work.dto";

// ==========================================
// Type Aliases
// ==========================================

/**
 * Case with related category information.
 */
export type CaseWithCategory = Case & {
  primaryCategory?: { id: string; name: string } | null;
};

/**
 * Investigation with case reference.
 */
export type InvestigationWithCase = Investigation & {
  case: { referenceNumber: string };
};

/**
 * Remediation step with plan and case context.
 */
export type RemediationStepWithPlan = RemediationStep & {
  plan: {
    caseId: string;
    title: string;
    case?: { referenceNumber: string };
  };
};

/**
 * Project task with milestone and group context.
 */
export type ProjectTaskWithMilestone = ProjectTask & {
  milestone: { id: string; name: string };
  group?: { id: string; name: string } | null;
};

/**
 * Parameters for fetching case-related tasks.
 */
interface CaseTaskFetchParams {
  organizationId: string;
  userId: string;
  filters?: TaskFiltersDto;
}

/**
 * TaskCaseFetcherService handles fetching and transforming case-related tasks:
 * - Case assignments
 * - Investigation steps
 * - Remediation tasks
 * - Project tasks (Monday.com-style board tasks)
 *
 * This service is a focused sub-service of TaskAggregatorService,
 * extracted to follow the thin coordinator pattern.
 */
@Injectable()
export class TaskCaseFetcherService {
  private readonly logger = new Logger(TaskCaseFetcherService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Public: Aggregated Fetch
  // ==========================================

  /**
   * Fetch all case-related tasks for a user in parallel.
   * Returns transformed UnifiedTask array.
   */
  async fetchAllCaseTasks(params: CaseTaskFetchParams): Promise<UnifiedTask[]> {
    const { organizationId, userId, filters } = params;

    const [cases, investigations, remediations, projectTasks] =
      await Promise.all([
        this.fetchCaseAssignments({ organizationId, userId, filters }),
        this.fetchInvestigationSteps({ organizationId, userId, filters }),
        this.fetchRemediationTasks({ organizationId, userId, filters }),
        this.fetchProjectTasks({ organizationId, userId, filters }),
      ]);

    return [
      ...cases.map((c) => this.mapCaseToUnifiedTask(c, organizationId)),
      ...investigations.map((i) =>
        this.mapInvestigationToUnifiedTask(i, organizationId),
      ),
      ...remediations.map((r) =>
        this.mapRemediationToUnifiedTask(r, organizationId),
      ),
      ...projectTasks.map((t) =>
        this.mapProjectTaskToUnifiedTask(t, organizationId),
      ),
    ];
  }

  // ==========================================
  // Case Assignment Methods
  // ==========================================

  /**
   * Fetch cases assigned to the user.
   */
  async fetchCaseAssignments(
    params: CaseTaskFetchParams,
  ): Promise<CaseWithCategory[]> {
    const { organizationId, userId, filters } = params;

    // Skip if type filter excludes case assignments
    if (filters?.types && !filters.types.includes(TaskType.CASE_ASSIGNMENT)) {
      return [];
    }

    const where = this.buildCaseWhereClause(organizationId, userId, filters);

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
   * Fetch unassigned cases for "Available" queue.
   */
  async fetchUnassignedCases(
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

  /**
   * Build Prisma where clause for case queries.
   */
  buildCaseWhereClause(
    organizationId: string,
    userId: string,
    filters?: TaskFiltersDto,
  ): Prisma.CaseWhereInput {
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

    return where;
  }

  /**
   * Transform Case to UnifiedTask.
   */
  mapCaseToUnifiedTask(
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

  // ==========================================
  // Investigation Methods
  // ==========================================

  /**
   * Fetch investigation steps assigned to the user.
   */
  async fetchInvestigationSteps(
    params: CaseTaskFetchParams,
  ): Promise<InvestigationWithCase[]> {
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
   * Transform Investigation to UnifiedTask.
   */
  mapInvestigationToUnifiedTask(
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

  // ==========================================
  // Remediation Methods
  // ==========================================

  /**
   * Fetch remediation tasks assigned to the user.
   */
  async fetchRemediationTasks(
    params: CaseTaskFetchParams,
  ): Promise<RemediationStepWithPlan[]> {
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
   * Transform RemediationStep to UnifiedTask.
   */
  mapRemediationToUnifiedTask(
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

  // ==========================================
  // Project Task Methods
  // ==========================================

  /**
   * Fetch project tasks assigned to the user.
   * Includes tasks from Monday.com-style project boards.
   */
  async fetchProjectTasks(
    params: CaseTaskFetchParams,
  ): Promise<ProjectTaskWithMilestone[]> {
    const { organizationId, userId, filters } = params;

    // Skip if type filter excludes project tasks
    if (filters?.types && !filters.types.includes(TaskType.PROJECT_TASK)) {
      return [];
    }

    const where: Prisma.ProjectTaskWhereInput = {
      organizationId,
      assigneeId: userId,
      status: {
        notIn: [ProjectTaskStatus.DONE, ProjectTaskStatus.CANCELLED],
      },
    };

    // Apply due date filters if provided
    if (filters?.dueDateStart || filters?.dueDateEnd) {
      where.dueDate = {};
      if (filters.dueDateStart) {
        where.dueDate.gte = new Date(filters.dueDateStart);
      }
      if (filters.dueDateEnd) {
        where.dueDate.lte = new Date(filters.dueDateEnd);
      }
    }

    return this.prisma.projectTask.findMany({
      where,
      include: {
        milestone: {
          select: { id: true, name: true },
        },
        group: {
          select: { id: true, name: true },
        },
      },
      take: 100,
    });
  }

  /**
   * Transform ProjectTask to UnifiedTask.
   */
  mapProjectTaskToUnifiedTask(
    task: ProjectTaskWithMilestone,
    organizationId: string,
  ): UnifiedTask {
    return {
      id: `${TaskType.PROJECT_TASK}-${task.id}`,
      type: TaskType.PROJECT_TASK,
      entityType: "ProjectTask",
      entityId: task.id,
      title: task.title,
      description: task.description || undefined,
      dueDate: task.dueDate,
      priority: this.projectPriorityToTaskPriority(task.priority),
      status: this.projectStatusToTaskStatus(task.status, task.dueDate),
      assignedAt: task.createdAt,
      assigneeId: task.assigneeId || undefined,
      metadata: {
        projectId: task.milestoneId,
        projectName: task.milestone.name,
        groupId: task.groupId,
        groupName: task.group?.name,
        status: task.status,
        priority: task.priority,
      },
      url: `/projects/${task.milestoneId}?task=${task.id}`,
      organizationId,
    };
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

  /**
   * Convert ProjectTaskPriority to TaskPriority.
   */
  private projectPriorityToTaskPriority(
    priority: ProjectTaskPriority,
  ): TaskPriority {
    switch (priority) {
      case ProjectTaskPriority.CRITICAL:
        return TaskPriority.CRITICAL;
      case ProjectTaskPriority.HIGH:
        return TaskPriority.HIGH;
      case ProjectTaskPriority.MEDIUM:
        return TaskPriority.MEDIUM;
      case ProjectTaskPriority.LOW:
      default:
        return TaskPriority.LOW;
    }
  }

  /**
   * Convert ProjectTaskStatus to TaskStatus.
   */
  private projectStatusToTaskStatus(
    status: ProjectTaskStatus,
    dueDate: Date | null,
  ): TaskStatus {
    const now = new Date();

    // Check for overdue first
    if (
      dueDate &&
      dueDate < now &&
      status !== ProjectTaskStatus.DONE &&
      status !== ProjectTaskStatus.CANCELLED
    ) {
      return TaskStatus.OVERDUE;
    }

    switch (status) {
      case ProjectTaskStatus.IN_PROGRESS:
      case ProjectTaskStatus.STUCK:
        return TaskStatus.IN_PROGRESS;
      case ProjectTaskStatus.NOT_STARTED:
      default:
        return TaskStatus.PENDING;
    }
  }
}
