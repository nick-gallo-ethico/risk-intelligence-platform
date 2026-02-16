import { Injectable, Logger } from "@nestjs/common";
import {
  ConflictAlert,
  ConflictStatus,
  CampaignAssignment,
  AssignmentStatus,
  WorkflowInstance,
  WorkflowInstanceStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  UnifiedTask,
  TaskType,
  TaskPriority,
  TaskStatus,
} from "../entities/unified-task.entity";
import { TaskFiltersDto } from "../dto/my-work.dto";

// Type Aliases

/**
 * Conflict alert with disclosure and RIU context.
 */
export type ConflictAlertWithDisclosure = ConflictAlert & {
  disclosure: {
    riu: { id: string };
  };
};

/**
 * Campaign assignment with campaign details.
 */
export type CampaignAssignmentWithCampaign = CampaignAssignment & {
  campaign: { name: string; type: string };
};

/**
 * Workflow instance with template information.
 */
export type WorkflowInstanceWithTemplate = WorkflowInstance & {
  template: { name: string };
};

/**
 * Parameters for fetching workflow-related tasks.
 */
interface WorkflowTaskFetchParams {
  organizationId: string;
  userId: string;
  filters?: TaskFiltersDto;
}

/**
 * TaskWorkflowFetcherService handles fetching and transforming workflow-related tasks:
 * - Disclosure reviews (conflict alerts)
 * - Campaign responses (disclosure/attestation/survey assignments)
 * - Approval requests (active workflow instances)
 *
 * This service is a focused sub-service of TaskAggregatorService,
 * extracted to follow the thin coordinator pattern.
 */
@Injectable()
export class TaskWorkflowFetcherService {
  private readonly logger = new Logger(TaskWorkflowFetcherService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Public: Aggregated Fetch

  /**
   * Fetch all workflow-related tasks for a user in parallel.
   * Returns transformed UnifiedTask array.
   */
  async fetchAllWorkflowTasks(
    params: WorkflowTaskFetchParams,
  ): Promise<UnifiedTask[]> {
    const { organizationId, userId, filters } = params;

    const [disclosures, campaigns, approvals] = await Promise.all([
      this.fetchDisclosureReviews({ organizationId, userId, filters }),
      this.fetchCampaignResponses({ organizationId, userId, filters }),
      this.fetchApprovalRequests({ organizationId, userId, filters }),
    ]);

    return [
      ...disclosures.map((d) =>
        this.mapConflictToUnifiedTask(d, organizationId),
      ),
      ...campaigns.map((c) =>
        this.mapCampaignAssignmentToUnifiedTask(c, organizationId),
      ),
      ...approvals.map((a) =>
        this.mapWorkflowInstanceToUnifiedTask(a, organizationId),
      ),
    ];
  }

  // Disclosure/Conflict Methods

  /**
   * Fetch disclosure conflict alerts requiring review.
   * Note: These are org-level tasks, not user-specific assignments.
   */
  async fetchDisclosureReviews(
    params: WorkflowTaskFetchParams,
  ): Promise<ConflictAlertWithDisclosure[]> {
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
   * Transform ConflictAlert to UnifiedTask.
   */
  mapConflictToUnifiedTask(
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

  // Campaign Methods

  /**
   * Fetch campaign assignments for the user (as employee).
   */
  async fetchCampaignResponses(
    params: WorkflowTaskFetchParams,
  ): Promise<CampaignAssignmentWithCampaign[]> {
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
   * Transform CampaignAssignment to UnifiedTask.
   */
  mapCampaignAssignmentToUnifiedTask(
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

  // Approval/Workflow Methods

  /**
   * Fetch workflow approval requests.
   * Note: This is simplified - in production, would check step assignees.
   */
  async fetchApprovalRequests(
    params: WorkflowTaskFetchParams,
  ): Promise<WorkflowInstanceWithTemplate[]> {
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
   * Transform WorkflowInstance to UnifiedTask (approval request).
   */
  mapWorkflowInstanceToUnifiedTask(
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

  // Private: Helper Methods

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
