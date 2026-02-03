import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import {
  CampaignAssignment,
  Employee,
  AssignmentStatus,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  Prisma,
} from "@prisma/client";

export interface EmployeeSnapshot {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department?: string | null;
  businessUnit?: string | null;
  location?: string | null;
  manager?: string | null;
}

export interface AssignmentWithEmployee extends CampaignAssignment {
  employee: Pick<Employee, "id" | "firstName" | "lastName" | "email" | "jobTitle">;
}

@Injectable()
export class CampaignAssignmentService {
  private readonly logger = new Logger(CampaignAssignmentService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Generate assignments for a campaign based on target employee IDs.
   * Creates one CampaignAssignment per target employee with employee snapshot.
   */
  async generateAssignments(
    campaignId: string,
    employeeIds: string[],
    dueDate: Date,
    organizationId: string,
    userId: string,
  ): Promise<CampaignAssignment[]> {
    if (employeeIds.length === 0) {
      return [];
    }

    // Fetch employee details for snapshots
    const employees = await this.prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        organizationId,
      },
      include: {
        locationAssignment: {
          select: { name: true },
        },
      },
    });

    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // Create assignments with snapshots
    const assignmentData: Prisma.CampaignAssignmentCreateManyInput[] = [];
    const now = new Date();

    for (const employeeId of employeeIds) {
      const employee = employeeMap.get(employeeId);
      if (!employee) {
        this.logger.warn(
          `Employee ${employeeId} not found, skipping assignment`,
        );
        continue;
      }

      const snapshot: EmployeeSnapshot = {
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        jobTitle: employee.jobTitle,
        department: employee.department,
        businessUnit: employee.departmentCode,
        location: employee.locationAssignment?.name ?? employee.location,
        manager: employee.managerName,
      };

      assignmentData.push({
        organizationId,
        campaignId,
        employeeId,
        status: AssignmentStatus.PENDING,
        dueDate,
        assignedAt: now,
        employeeSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      });
    }

    // Batch create assignments
    await this.prisma.campaignAssignment.createMany({
      data: assignmentData,
      skipDuplicates: true, // Prevent duplicates if regenerating
    });

    // Fetch created assignments
    const assignments = await this.prisma.campaignAssignment.findMany({
      where: { campaignId, organizationId },
    });

    // Log audit
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: campaignId,
      action: "assignments_generated",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Generated ${assignments.length} assignments for campaign`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return assignments;
  }

  /**
   * Mark an assignment as completed.
   */
  async completeAssignment(
    assignmentId: string,
    organizationId: string,
    riuId?: string,
    formSubmissionId?: string,
  ): Promise<CampaignAssignment> {
    const assignment = await this.prisma.campaignAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    const updated = await this.prisma.campaignAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.COMPLETED,
        completedAt: new Date(),
        riuId,
        formSubmissionId,
      },
    });

    // Update campaign statistics
    await this.updateCampaignStatistics(assignment.campaignId);

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN_ASSIGNMENT,
      entityId: assignmentId,
      action: "completed",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Assignment completed for employee`,
      actorUserId: null,
      actorType: ActorType.SYSTEM,
    });

    return updated;
  }

  /**
   * Mark an assignment as notified (first notification sent).
   */
  async markNotified(
    assignmentId: string,
    organizationId: string,
  ): Promise<CampaignAssignment> {
    const assignment = await this.prisma.campaignAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    return this.prisma.campaignAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.NOTIFIED,
        notifiedAt: new Date(),
      },
    });
  }

  /**
   * Mark an assignment as started (employee began form).
   */
  async markStarted(
    assignmentId: string,
    organizationId: string,
  ): Promise<CampaignAssignment> {
    const assignment = await this.prisma.campaignAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    return this.prisma.campaignAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });
  }

  /**
   * Skip an assignment (admin exemption).
   */
  async skipAssignment(
    assignmentId: string,
    organizationId: string,
    userId: string,
    reason: string,
  ): Promise<CampaignAssignment> {
    const assignment = await this.prisma.campaignAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    const updated = await this.prisma.campaignAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.SKIPPED,
        skippedBy: userId,
        skipReason: reason,
      },
    });

    // Update campaign statistics
    await this.updateCampaignStatistics(assignment.campaignId);

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN_ASSIGNMENT,
      entityId: assignmentId,
      action: "skipped",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Assignment skipped: ${reason}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return updated;
  }

  /**
   * Record a reminder sent for an assignment.
   */
  async recordReminderSent(
    assignmentId: string,
    organizationId: string,
  ): Promise<CampaignAssignment> {
    const assignment = await this.prisma.campaignAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    return this.prisma.campaignAssignment.update({
      where: { id: assignmentId },
      data: {
        reminderCount: { increment: 1 },
        lastReminderSentAt: new Date(),
      },
    });
  }

  /**
   * Find all assignments for a campaign.
   */
  async findByCampaign(
    campaignId: string,
    organizationId: string,
    options?: {
      status?: AssignmentStatus;
      skip?: number;
      take?: number;
    },
  ): Promise<{ assignments: AssignmentWithEmployee[]; total: number }> {
    const where: Prisma.CampaignAssignmentWhereInput = {
      campaignId,
      organizationId,
      ...(options?.status && { status: options.status }),
    };

    const [assignments, total] = await Promise.all([
      this.prisma.campaignAssignment.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobTitle: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        skip: options?.skip,
        take: options?.take,
      }),
      this.prisma.campaignAssignment.count({ where }),
    ]);

    return { assignments, total };
  }

  /**
   * Find all assignments for an employee.
   */
  async findByEmployee(
    employeeId: string,
    organizationId: string,
    options?: {
      status?: AssignmentStatus;
      activeOnly?: boolean;
      skip?: number;
      take?: number;
    },
  ): Promise<{ assignments: CampaignAssignment[]; total: number }> {
    const where: Prisma.CampaignAssignmentWhereInput = {
      employeeId,
      organizationId,
      ...(options?.status && { status: options.status }),
      ...(options?.activeOnly && {
        status: {
          in: [
            AssignmentStatus.PENDING,
            AssignmentStatus.NOTIFIED,
            AssignmentStatus.IN_PROGRESS,
          ],
        },
      }),
    };

    const [assignments, total] = await Promise.all([
      this.prisma.campaignAssignment.findMany({
        where,
        orderBy: { dueDate: "asc" },
        skip: options?.skip,
        take: options?.take,
      }),
      this.prisma.campaignAssignment.count({ where }),
    ]);

    return { assignments, total };
  }

  /**
   * Find overdue assignments for a campaign.
   */
  async findOverdue(
    campaignId: string,
    organizationId: string,
  ): Promise<CampaignAssignment[]> {
    const now = new Date();

    return this.prisma.campaignAssignment.findMany({
      where: {
        campaignId,
        organizationId,
        dueDate: { lt: now },
        status: {
          in: [
            AssignmentStatus.PENDING,
            AssignmentStatus.NOTIFIED,
            AssignmentStatus.IN_PROGRESS,
          ],
        },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  /**
   * Mark overdue assignments with OVERDUE status.
   * Called by scheduler or manual sync.
   */
  async syncOverdueStatus(
    campaignId: string,
    organizationId: string,
  ): Promise<number> {
    const now = new Date();

    const result = await this.prisma.campaignAssignment.updateMany({
      where: {
        campaignId,
        organizationId,
        dueDate: { lt: now },
        status: {
          in: [
            AssignmentStatus.PENDING,
            AssignmentStatus.NOTIFIED,
            AssignmentStatus.IN_PROGRESS,
          ],
        },
      },
      data: {
        status: AssignmentStatus.OVERDUE,
      },
    });

    if (result.count > 0) {
      await this.updateCampaignStatistics(campaignId);
    }

    return result.count;
  }

  /**
   * Update campaign statistics (total, completed, overdue counts).
   */
  private async updateCampaignStatistics(campaignId: string): Promise<void> {
    const [total, completed, overdue] = await Promise.all([
      this.prisma.campaignAssignment.count({ where: { campaignId } }),
      this.prisma.campaignAssignment.count({
        where: {
          campaignId,
          status: { in: [AssignmentStatus.COMPLETED, AssignmentStatus.SKIPPED] },
        },
      }),
      this.prisma.campaignAssignment.count({
        where: {
          campaignId,
          status: AssignmentStatus.OVERDUE,
        },
      }),
    ]);

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        totalAssignments: total,
        completedAssignments: completed,
        overdueAssignments: overdue,
        completionPercentage: percentage,
      },
    });
  }
}
