import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CampaignAssignment,
  RemediationStep,
  AssignmentStatus,
  StepStatus,
  CampaignType,
} from "@prisma/client";
import {
  EmployeeTask,
  TaskType,
  TaskStatus,
  TaskCounts,
  TaskFilters,
  TASK_SOURCE_TYPES,
  buildTaskId,
  parseTaskId,
} from "./types/employee-task.types";

/**
 * Campaign assignment with campaign relation for type determination.
 */
interface CampaignAssignmentWithCampaign extends CampaignAssignment {
  campaign: {
    id: string;
    name: string;
    type: CampaignType;
    description?: string | null;
  };
}

/**
 * Remediation step with plan relation for context.
 */
interface RemediationStepWithPlan extends RemediationStep {
  plan: {
    id: string;
    title: string;
    caseId: string;
  };
}

/**
 * EmployeeTasksService aggregates tasks from multiple sources into
 * a unified "My Tasks" view for employees.
 *
 * Sources:
 * - CampaignAssignments (attestations, disclosures)
 * - RemediationSteps (assigned remediation actions)
 * - (Future) ApprovalRequests for manager approvals
 */
@Injectable()
export class EmployeeTasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all tasks for a user from all sources.
   * Returns unified list sorted by overdue first, then by due date.
   */
  async getMyTasks(
    userId: string,
    organizationId: string,
    filters?: TaskFilters,
  ): Promise<EmployeeTask[]> {
    // First, get the user's email to find their employee record
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Find employee by email (User-Employee link is via email)
    const employee = user
      ? await this.prisma.employee.findFirst({
          where: {
            organizationId,
            email: user.email,
          },
          select: { id: true, email: true },
        })
      : null;

    // Run queries in parallel for efficiency
    const [campaignAssignments, remediationSteps] = await Promise.all([
      this.getCampaignAssignments(employee?.id, organizationId),
      this.getRemediationSteps(userId, organizationId, employee?.email),
    ]);

    // Map to unified task format
    let tasks: EmployeeTask[] = [
      ...campaignAssignments.map((a) => this.mapCampaignAssignmentToTask(a)),
      ...remediationSteps.map((s) => this.mapRemediationStepToTask(s)),
    ];

    // Apply filters if provided
    if (filters) {
      tasks = this.applyFilters(tasks, filters);
    }

    // Sort: overdue first, then by dueDate ASC, then by createdAt DESC for null dates
    tasks.sort((a, b) => {
      // Overdue tasks first
      const aOverdue = a.status === TaskStatus.OVERDUE ? 0 : 1;
      const bOverdue = b.status === TaskStatus.OVERDUE ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;

      // Then by due date (nulls last)
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      // Finally by creation date (newest first for same due date)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return tasks;
  }

  /**
   * Get task counts for badge display.
   */
  async getTaskCounts(
    userId: string,
    organizationId: string,
  ): Promise<TaskCounts> {
    // First, get the user's email to find their employee record
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Find employee by email (User-Employee link is via email)
    const employee = user
      ? await this.prisma.employee.findFirst({
          where: {
            organizationId,
            email: user.email,
          },
          select: { id: true, email: true },
        })
      : null;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Run all count queries in parallel
    const [
      pendingCampaignCount,
      overdueCampaignCount,
      pendingRemediationCount,
      overdueRemediationCount,
      completedCampaignCount,
      completedRemediationCount,
    ] = await Promise.all([
      // Pending campaign assignments (not overdue) - due in future or no due date
      employee?.id
        ? this.prisma.campaignAssignment.count({
            where: {
              organizationId,
              employeeId: employee.id,
              status: {
                in: [
                  AssignmentStatus.PENDING,
                  AssignmentStatus.NOTIFIED,
                  AssignmentStatus.IN_PROGRESS,
                ],
              },
              // Due date is in future OR null (no deadline)
              NOT: {
                dueDate: { lt: now },
              },
            },
          })
        : 0,
      // Overdue campaign assignments
      employee?.id
        ? this.prisma.campaignAssignment.count({
            where: {
              organizationId,
              employeeId: employee.id,
              status: AssignmentStatus.OVERDUE,
            },
          })
        : 0,
      // Pending remediation steps (not overdue) - due in future or no due date
      this.prisma.remediationStep.count({
        where: {
          organizationId,
          OR: [
            { assigneeUserId: userId },
            ...(employee?.email ? [{ assigneeEmail: employee.email }] : []),
          ],
          status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
          // Due date is in future OR null (no deadline)
          NOT: {
            dueDate: { lt: now },
          },
        },
      }),
      // Overdue remediation steps
      this.prisma.remediationStep.count({
        where: {
          organizationId,
          OR: [
            { assigneeUserId: userId },
            ...(employee?.email ? [{ assigneeEmail: employee.email }] : []),
          ],
          status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
          dueDate: { lt: now },
        },
      }),
      // Completed campaign assignments in last 7 days
      employee?.id
        ? this.prisma.campaignAssignment.count({
            where: {
              organizationId,
              employeeId: employee.id,
              status: AssignmentStatus.COMPLETED,
              completedAt: { gte: sevenDaysAgo },
            },
          })
        : 0,
      // Completed remediation steps in last 7 days
      this.prisma.remediationStep.count({
        where: {
          organizationId,
          OR: [
            { assigneeUserId: userId },
            ...(employee?.email ? [{ assigneeEmail: employee.email }] : []),
          ],
          status: StepStatus.COMPLETED,
          completedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    const pending = pendingCampaignCount + pendingRemediationCount;
    const overdue = overdueCampaignCount + overdueRemediationCount;
    const completed = completedCampaignCount + completedRemediationCount;

    return {
      total: pending + overdue,
      pending,
      overdue,
      completed,
    };
  }

  /**
   * Get a single task by ID.
   */
  async getTaskById(
    userId: string,
    organizationId: string,
    taskId: string,
  ): Promise<EmployeeTask> {
    const parsed = parseTaskId(taskId);
    if (!parsed) {
      throw new BadRequestException("Invalid task ID format");
    }

    const { sourceType, sourceId } = parsed;

    if (sourceType === TASK_SOURCE_TYPES.CAMPAIGN_ASSIGNMENT) {
      const assignment = await this.prisma.campaignAssignment.findFirst({
        where: {
          id: sourceId,
          organizationId,
        },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              type: true,
              description: true,
            },
          },
        },
      });

      if (!assignment) {
        throw new NotFoundException("Task not found");
      }

      // Verify user owns this assignment via employee (link via email)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const employee = user
        ? await this.prisma.employee.findFirst({
            where: { organizationId, email: user.email },
          })
        : null;

      if (!employee || assignment.employeeId !== employee.id) {
        throw new NotFoundException("Task not found");
      }

      return this.mapCampaignAssignmentToTask(
        assignment as CampaignAssignmentWithCampaign,
      );
    }

    if (sourceType === TASK_SOURCE_TYPES.REMEDIATION_STEP) {
      const step = await this.prisma.remediationStep.findFirst({
        where: {
          id: sourceId,
          organizationId,
        },
        include: {
          plan: {
            select: { id: true, title: true, caseId: true },
          },
        },
      });

      if (!step) {
        throw new NotFoundException("Task not found");
      }

      // Verify user owns this step (link via email)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const employee = user
        ? await this.prisma.employee.findFirst({
            where: { organizationId, email: user.email },
          })
        : null;

      if (
        step.assigneeUserId !== userId &&
        step.assigneeEmail !== employee?.email
      ) {
        throw new NotFoundException("Task not found");
      }

      return this.mapRemediationStepToTask(step as RemediationStepWithPlan);
    }

    throw new BadRequestException("Unknown task source type");
  }

  /**
   * Mark a task as completed.
   * This is a thin wrapper that routes to the appropriate service.
   */
  async markTaskCompleted(
    userId: string,
    organizationId: string,
    taskId: string,
  ): Promise<EmployeeTask> {
    const parsed = parseTaskId(taskId);
    if (!parsed) {
      throw new BadRequestException("Invalid task ID format");
    }

    const { sourceType, sourceId } = parsed;

    if (sourceType === TASK_SOURCE_TYPES.CAMPAIGN_ASSIGNMENT) {
      // Campaign assignments require form submission - return task with action URL
      // The actual completion happens via the form submission flow
      throw new BadRequestException(
        "Campaign tasks must be completed via the task action URL",
      );
    }

    if (sourceType === TASK_SOURCE_TYPES.REMEDIATION_STEP) {
      // Mark remediation step as completed
      const step = await this.prisma.remediationStep.findFirst({
        where: {
          id: sourceId,
          organizationId,
        },
        include: {
          plan: {
            select: { id: true, title: true, caseId: true },
          },
        },
      });

      if (!step) {
        throw new NotFoundException("Task not found");
      }

      // Verify user owns this step (link via email)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const employee = user
        ? await this.prisma.employee.findFirst({
            where: { organizationId, email: user.email },
          })
        : null;

      if (
        step.assigneeUserId !== userId &&
        step.assigneeEmail !== employee?.email
      ) {
        throw new NotFoundException("Task not found");
      }

      // Check dependencies are satisfied
      if (step.dependsOnStepIds.length > 0) {
        const dependencySteps = await this.prisma.remediationStep.findMany({
          where: { id: { in: step.dependsOnStepIds } },
        });

        const unmetDependencies = dependencySteps.filter(
          (s) =>
            s.status !== StepStatus.COMPLETED &&
            s.status !== StepStatus.SKIPPED,
        );

        if (unmetDependencies.length > 0) {
          throw new BadRequestException(
            `Cannot complete: ${unmetDependencies.length} prerequisite steps incomplete`,
          );
        }
      }

      // Update the step status
      const updatedStep = await this.prisma.remediationStep.update({
        where: { id: sourceId },
        data: {
          status: StepStatus.COMPLETED,
          completedAt: new Date(),
          completedById: userId,
        },
        include: {
          plan: {
            select: { id: true, title: true, caseId: true },
          },
        },
      });

      // Update plan step counts
      await this.updateRemediationPlanCounts(step.planId);

      return this.mapRemediationStepToTask(
        updatedStep as RemediationStepWithPlan,
      );
    }

    throw new BadRequestException("Unknown task source type");
  }

  // ==================== Private Methods ====================

  /**
   * Get active campaign assignments for an employee.
   */
  private async getCampaignAssignments(
    employeeId: string | undefined,
    organizationId: string,
  ): Promise<CampaignAssignmentWithCampaign[]> {
    if (!employeeId) return [];

    return this.prisma.campaignAssignment.findMany({
      where: {
        organizationId,
        employeeId,
        status: {
          in: [
            AssignmentStatus.PENDING,
            AssignmentStatus.NOTIFIED,
            AssignmentStatus.IN_PROGRESS,
            AssignmentStatus.OVERDUE,
          ],
        },
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }) as Promise<CampaignAssignmentWithCampaign[]>;
  }

  /**
   * Get active remediation steps assigned to a user.
   */
  private async getRemediationSteps(
    userId: string,
    organizationId: string,
    email?: string | null,
  ): Promise<RemediationStepWithPlan[]> {
    return this.prisma.remediationStep.findMany({
      where: {
        organizationId,
        OR: [
          { assigneeUserId: userId },
          ...(email ? [{ assigneeEmail: email }] : []),
        ],
        status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
      },
      include: {
        plan: {
          select: { id: true, title: true, caseId: true },
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }) as Promise<RemediationStepWithPlan[]>;
  }

  /**
   * Map a campaign assignment to the unified EmployeeTask format.
   */
  private mapCampaignAssignmentToTask(
    assignment: CampaignAssignmentWithCampaign,
  ): EmployeeTask {
    const type =
      assignment.campaign.type === CampaignType.ATTESTATION
        ? TaskType.ATTESTATION
        : assignment.campaign.type === CampaignType.DISCLOSURE
          ? TaskType.DISCLOSURE
          : TaskType.ATTESTATION; // Default for SURVEY type

    return {
      id: buildTaskId(TASK_SOURCE_TYPES.CAMPAIGN_ASSIGNMENT, assignment.id),
      type,
      status: this.calculateCampaignStatus(assignment),
      title: assignment.campaign.name,
      description: assignment.campaign.description ?? undefined,
      dueDate: assignment.dueDate,
      createdAt: assignment.assignedAt,
      sourceId: assignment.id,
      sourceType: TASK_SOURCE_TYPES.CAMPAIGN_ASSIGNMENT,
      metadata: {
        campaignId: assignment.campaignId,
        campaignType: assignment.campaign.type,
        reminderCount: assignment.reminderCount,
        formSubmissionId: assignment.formSubmissionId,
      },
      actionUrl: `/employee/tasks/campaign/${assignment.campaignId}/assignment/${assignment.id}`,
    };
  }

  /**
   * Map a remediation step to the unified EmployeeTask format.
   */
  private mapRemediationStepToTask(
    step: RemediationStepWithPlan,
  ): EmployeeTask {
    return {
      id: buildTaskId(TASK_SOURCE_TYPES.REMEDIATION_STEP, step.id),
      type: TaskType.REMEDIATION_STEP,
      status: this.calculateRemediationStatus(step),
      title: step.title,
      description: step.description ?? undefined,
      dueDate: step.dueDate,
      createdAt: step.createdAt,
      sourceId: step.id,
      sourceType: TASK_SOURCE_TYPES.REMEDIATION_STEP,
      metadata: {
        planId: step.planId,
        planTitle: step.plan.title,
        caseId: step.plan.caseId,
        order: step.order,
        requiresCoApproval: step.requiresCoApproval,
        dependsOnStepIds: step.dependsOnStepIds,
      },
      actionUrl: `/employee/tasks/remediation/${step.planId}/step/${step.id}`,
    };
  }

  /**
   * Calculate unified status for a campaign assignment.
   */
  private calculateCampaignStatus(assignment: CampaignAssignment): TaskStatus {
    if (assignment.status === AssignmentStatus.COMPLETED) {
      return TaskStatus.COMPLETED;
    }
    if (assignment.status === AssignmentStatus.OVERDUE) {
      return TaskStatus.OVERDUE;
    }
    if (assignment.status === AssignmentStatus.IN_PROGRESS) {
      return TaskStatus.IN_PROGRESS;
    }

    // Check if past due date
    if (assignment.dueDate && new Date() > assignment.dueDate) {
      return TaskStatus.OVERDUE;
    }

    return TaskStatus.PENDING;
  }

  /**
   * Calculate unified status for a remediation step.
   */
  private calculateRemediationStatus(step: RemediationStep): TaskStatus {
    if (step.status === StepStatus.COMPLETED) {
      return TaskStatus.COMPLETED;
    }
    if (step.status === StepStatus.IN_PROGRESS) {
      return TaskStatus.IN_PROGRESS;
    }

    // Check if past due date
    if (step.dueDate && new Date() > step.dueDate) {
      return TaskStatus.OVERDUE;
    }

    return TaskStatus.PENDING;
  }

  /**
   * Apply filters to the task list.
   */
  private applyFilters(
    tasks: EmployeeTask[],
    filters: TaskFilters,
  ): EmployeeTask[] {
    let filtered = tasks;

    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter((t) => filters.types!.includes(t.type));
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((t) => filters.status!.includes(t.status));
    }

    if (filters.dueBefore) {
      filtered = filtered.filter(
        (t) => t.dueDate && t.dueDate <= filters.dueBefore!,
      );
    }

    if (filters.dueAfter) {
      filtered = filtered.filter(
        (t) => t.dueDate && t.dueDate >= filters.dueAfter!,
      );
    }

    return filtered;
  }

  /**
   * Update remediation plan step counts after a step is completed.
   */
  private async updateRemediationPlanCounts(planId: string): Promise<void> {
    const now = new Date();

    const [total, completed, overdue] = await Promise.all([
      this.prisma.remediationStep.count({ where: { planId } }),
      this.prisma.remediationStep.count({
        where: {
          planId,
          status: { in: [StepStatus.COMPLETED, StepStatus.SKIPPED] },
        },
      }),
      this.prisma.remediationStep.count({
        where: {
          planId,
          status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
          dueDate: { lt: now },
        },
      }),
    ]);

    await this.prisma.remediationPlan.update({
      where: { id: planId },
      data: {
        totalSteps: total,
        completedSteps: completed,
        overdueSteps: overdue,
      },
    });
  }
}
