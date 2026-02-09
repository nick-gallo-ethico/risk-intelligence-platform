import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CampaignStatus, AssignmentStatus, Campaign } from "@prisma/client";

/**
 * Dashboard statistics for campaign overview.
 */
export interface DashboardStats {
  /** Total campaigns in the organization */
  totalCampaigns: number;
  /** Currently active campaigns */
  activeCampaigns: number;
  /** Completed campaigns */
  completedCampaigns: number;
  /** Draft campaigns awaiting launch */
  draftCampaigns: number;
  /** Scheduled campaigns */
  scheduledCampaigns: number;
  /** Overall completion rate across all active campaigns */
  overallCompletionRate: number;
  /** Total assignments across all active campaigns */
  totalAssignments: number;
  /** Completed assignments across all active campaigns */
  completedAssignments: number;
  /** Overdue assignments across all active campaigns */
  overdueAssignments: number;
  /** Breakdown of assignments by status */
  assignmentsByStatus: {
    pending: number;
    notified: number;
    inProgress: number;
    completed: number;
    overdue: number;
    skipped: number;
  };
}

/**
 * Summary of a campaign for dashboard lists.
 */
export interface CampaignSummary {
  id: string;
  name: string;
  type: string;
  status: CampaignStatus;
  dueDate: Date;
  totalAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  completionPercentage: number;
  launchedAt: Date | null;
}

/**
 * Weekly completion data for trend charts.
 */
export interface WeeklyCompletion {
  weekStart: Date;
  weekEnd: Date;
  completions: number;
  newAssignments: number;
}

/**
 * Detailed campaign statistics with breakdowns.
 */
export interface DetailedCampaignStats {
  campaign: Campaign;
  /** Completion by department */
  byDepartment: Array<{
    department: string | null;
    total: number;
    completed: number;
    overdue: number;
    completionRate: number;
  }>;
  /** Completion by location */
  byLocation: Array<{
    location: string | null;
    total: number;
    completed: number;
    overdue: number;
    completionRate: number;
  }>;
  /** Response time distribution (days to complete) */
  responseTimeDistribution: {
    sameDay: number;
    oneToThreeDays: number;
    fourToSevenDays: number;
    overSevenDays: number;
    averageDays: number;
  };
  /** Non-responders summary */
  nonResponders: {
    total: number;
    byStatus: {
      pending: number;
      notified: number;
      inProgress: number;
      overdue: number;
    };
  };
  /** Conflict summary if applicable */
  conflictSummary?: {
    totalFlagged: number;
    resolved: number;
    pending: number;
  };
}

/**
 * Non-responder report with repeat offender tracking.
 */
export interface NonResponderReport {
  /** Employees who are non-responders across campaigns */
  repeatNonResponders: Array<{
    employeeId: string;
    employeeName: string;
    email: string;
    department: string | null;
    manager: string | null;
    missedCampaigns: number;
    totalAssigned: number;
    missedCampaignNames: string[];
  }>;
  /** Non-responders grouped by department */
  byDepartment: Array<{
    department: string | null;
    nonResponderCount: number;
    totalEmployees: number;
    percentage: number;
  }>;
  /** Non-responders grouped by manager */
  byManager: Array<{
    managerName: string | null;
    managerId: string | null;
    nonResponderCount: number;
    totalReports: number;
    percentage: number;
  }>;
}

/**
 * CampaignDashboardService provides statistics and reporting for campaign management.
 *
 * Features per RS.55:
 * - Dashboard statistics with completion rates
 * - Overdue campaign tracking
 * - Upcoming deadline monitoring
 * - Weekly completion trends
 * - Detailed campaign breakdowns
 * - Non-responder reports
 */
@Injectable()
export class CampaignDashboardService {
  private readonly logger = new Logger(CampaignDashboardService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get overall dashboard statistics for an organization.
   */
  async getDashboardStats(organizationId: string): Promise<DashboardStats> {
    // Get campaign counts by status
    const campaignCounts = await this.prisma.campaign.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { id: true },
    });

    const statusCounts = campaignCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {} as Record<CampaignStatus, number>,
    );

    // Get assignment statistics for active campaigns
    const activeCampaignIds = await this.prisma.campaign.findMany({
      where: {
        organizationId,
        status: CampaignStatus.ACTIVE,
      },
      select: { id: true },
    });

    const activeCampaignIdList = activeCampaignIds.map((c) => c.id);

    // Get assignment counts by status for active campaigns
    const assignmentStats = {
      pending: 0,
      notified: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      skipped: 0,
    };
    let totalAssignments = 0;
    let completedAssignments = 0;
    let overdueAssignments = 0;

    if (activeCampaignIdList.length > 0) {
      const assignmentCounts = await this.prisma.campaignAssignment.groupBy({
        by: ["status"],
        where: {
          organizationId,
          campaignId: { in: activeCampaignIdList },
        },
        _count: { id: true },
      });

      for (const item of assignmentCounts) {
        const count = item._count.id;
        totalAssignments += count;

        switch (item.status) {
          case AssignmentStatus.PENDING:
            assignmentStats.pending = count;
            break;
          case AssignmentStatus.NOTIFIED:
            assignmentStats.notified = count;
            break;
          case AssignmentStatus.IN_PROGRESS:
            assignmentStats.inProgress = count;
            break;
          case AssignmentStatus.COMPLETED:
            assignmentStats.completed = count;
            completedAssignments += count;
            break;
          case AssignmentStatus.OVERDUE:
            assignmentStats.overdue = count;
            overdueAssignments += count;
            break;
          case AssignmentStatus.SKIPPED:
            assignmentStats.skipped = count;
            completedAssignments += count; // Skipped counts as done
            break;
        }
      }
    }

    const totalCampaigns = Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const overallCompletionRate =
      totalAssignments > 0
        ? Math.round((completedAssignments / totalAssignments) * 100)
        : 0;

    return {
      totalCampaigns,
      activeCampaigns: statusCounts[CampaignStatus.ACTIVE] ?? 0,
      completedCampaigns: statusCounts[CampaignStatus.COMPLETED] ?? 0,
      draftCampaigns: statusCounts[CampaignStatus.DRAFT] ?? 0,
      scheduledCampaigns: statusCounts[CampaignStatus.SCHEDULED] ?? 0,
      overallCompletionRate,
      totalAssignments,
      completedAssignments,
      overdueAssignments,
      assignmentsByStatus: assignmentStats,
    };
  }

  /**
   * Get campaigns with overdue assignments, sorted by overdue count.
   */
  async getOverdueCampaigns(
    organizationId: string,
    limit: number = 10,
  ): Promise<CampaignSummary[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        organizationId,
        overdueAssignments: { gt: 0 },
        status: { in: [CampaignStatus.ACTIVE, CampaignStatus.PAUSED] },
      },
      orderBy: { overdueAssignments: "desc" },
      take: limit,
    });

    return campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      dueDate: c.dueDate,
      totalAssignments: c.totalAssignments,
      completedAssignments: c.completedAssignments,
      overdueAssignments: c.overdueAssignments,
      completionPercentage: c.completionPercentage,
      launchedAt: c.launchedAt,
    }));
  }

  /**
   * Get active campaigns with deadlines within the specified number of days.
   */
  async getUpcomingDeadlines(
    organizationId: string,
    days: number = 7,
    limit: number = 10,
  ): Promise<CampaignSummary[]> {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);

    const campaigns = await this.prisma.campaign.findMany({
      where: {
        organizationId,
        status: CampaignStatus.ACTIVE,
        dueDate: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: { dueDate: "asc" },
      take: limit,
    });

    return campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      dueDate: c.dueDate,
      totalAssignments: c.totalAssignments,
      completedAssignments: c.completedAssignments,
      overdueAssignments: c.overdueAssignments,
      completionPercentage: c.completionPercentage,
      launchedAt: c.launchedAt,
    }));
  }

  /**
   * Get weekly completion trend data.
   */
  async getWeeklyCompletionTrend(
    organizationId: string,
    weeks: number = 8,
  ): Promise<WeeklyCompletion[]> {
    const result: WeeklyCompletion[] = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const [completions, newAssignments] = await Promise.all([
        this.prisma.campaignAssignment.count({
          where: {
            organizationId,
            completedAt: {
              gte: weekStart,
              lt: weekEnd,
            },
          },
        }),
        this.prisma.campaignAssignment.count({
          where: {
            organizationId,
            assignedAt: {
              gte: weekStart,
              lt: weekEnd,
            },
          },
        }),
      ]);

      result.push({
        weekStart,
        weekEnd,
        completions,
        newAssignments,
      });
    }

    return result;
  }

  /**
   * Get detailed statistics for a specific campaign.
   */
  async getCampaignDetails(
    campaignId: string,
    organizationId: string,
  ): Promise<DetailedCampaignStats> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    // Get all assignments with employee snapshots
    const assignments = await this.prisma.campaignAssignment.findMany({
      where: { campaignId, organizationId },
      select: {
        id: true,
        status: true,
        assignedAt: true,
        completedAt: true,
        employeeSnapshot: true,
      },
    });

    // Parse snapshots and group by department/location
    const departmentMap = new Map<
      string | null,
      { total: number; completed: number; overdue: number }
    >();
    const locationMap = new Map<
      string | null,
      { total: number; completed: number; overdue: number }
    >();

    // Response time tracking
    const responseTimes: number[] = [];
    let sameDayCount = 0;
    let oneToThreeCount = 0;
    let fourToSevenCount = 0;
    let overSevenCount = 0;

    // Non-responder tracking
    let pendingCount = 0;
    let notifiedCount = 0;
    let inProgressCount = 0;
    let overdueCount = 0;

    for (const assignment of assignments) {
      const snapshot = assignment.employeeSnapshot as {
        department?: string;
        location?: string;
      } | null;
      const department = snapshot?.department ?? null;
      const location = snapshot?.location ?? null;

      // Department aggregation
      if (!departmentMap.has(department)) {
        departmentMap.set(department, { total: 0, completed: 0, overdue: 0 });
      }
      const deptStats = departmentMap.get(department)!;
      deptStats.total++;
      if (
        assignment.status === AssignmentStatus.COMPLETED ||
        assignment.status === AssignmentStatus.SKIPPED
      ) {
        deptStats.completed++;
      }
      if (assignment.status === AssignmentStatus.OVERDUE) {
        deptStats.overdue++;
      }

      // Location aggregation
      if (!locationMap.has(location)) {
        locationMap.set(location, { total: 0, completed: 0, overdue: 0 });
      }
      const locStats = locationMap.get(location)!;
      locStats.total++;
      if (
        assignment.status === AssignmentStatus.COMPLETED ||
        assignment.status === AssignmentStatus.SKIPPED
      ) {
        locStats.completed++;
      }
      if (assignment.status === AssignmentStatus.OVERDUE) {
        locStats.overdue++;
      }

      // Response time calculation
      if (assignment.completedAt && assignment.assignedAt) {
        const days = Math.floor(
          (assignment.completedAt.getTime() - assignment.assignedAt.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        responseTimes.push(days);

        if (days === 0) sameDayCount++;
        else if (days <= 3) oneToThreeCount++;
        else if (days <= 7) fourToSevenCount++;
        else overSevenCount++;
      }

      // Non-responder status tracking
      switch (assignment.status) {
        case AssignmentStatus.PENDING:
          pendingCount++;
          break;
        case AssignmentStatus.NOTIFIED:
          notifiedCount++;
          break;
        case AssignmentStatus.IN_PROGRESS:
          inProgressCount++;
          break;
        case AssignmentStatus.OVERDUE:
          overdueCount++;
          break;
      }
    }

    // Build department breakdown
    const byDepartment = Array.from(departmentMap.entries())
      .map(([department, stats]) => ({
        department,
        total: stats.total,
        completed: stats.completed,
        overdue: stats.overdue,
        completionRate:
          stats.total > 0
            ? Math.round((stats.completed / stats.total) * 100)
            : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Build location breakdown
    const byLocation = Array.from(locationMap.entries())
      .map(([location, stats]) => ({
        location,
        total: stats.total,
        completed: stats.completed,
        overdue: stats.overdue,
        completionRate:
          stats.total > 0
            ? Math.round((stats.completed / stats.total) * 100)
            : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate average response time
    const averageDays =
      responseTimes.length > 0
        ? Math.round(
            (responseTimes.reduce((sum, d) => sum + d, 0) /
              responseTimes.length) *
              10,
          ) / 10
        : 0;

    const totalNonResponders =
      pendingCount + notifiedCount + inProgressCount + overdueCount;

    return {
      campaign,
      byDepartment,
      byLocation,
      responseTimeDistribution: {
        sameDay: sameDayCount,
        oneToThreeDays: oneToThreeCount,
        fourToSevenDays: fourToSevenCount,
        overSevenDays: overSevenCount,
        averageDays,
      },
      nonResponders: {
        total: totalNonResponders,
        byStatus: {
          pending: pendingCount,
          notified: notifiedCount,
          inProgress: inProgressCount,
          overdue: overdueCount,
        },
      },
    };
  }

  /**
   * Get a report of repeat non-responders across campaigns.
   */
  async getNonResponderReport(
    organizationId: string,
  ): Promise<NonResponderReport> {
    // Get all employees who have missed at least one campaign
    const missedAssignments = await this.prisma.campaignAssignment.findMany({
      where: {
        organizationId,
        status: AssignmentStatus.OVERDUE,
        campaign: {
          status: {
            in: [CampaignStatus.ACTIVE, CampaignStatus.COMPLETED],
          },
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            managerName: true,
            managerId: true,
          },
        },
        campaign: {
          select: {
            name: true,
          },
        },
      },
    });

    // Group by employee
    const employeeMap = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        email: string;
        department: string | null;
        manager: string | null;
        missedCampaigns: Set<string>;
        missedCampaignNames: string[];
      }
    >();

    for (const assignment of missedAssignments) {
      if (!assignment.employee) continue;

      const emp = assignment.employee;
      const key = emp.id;

      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          department: emp.department,
          manager: emp.managerName,
          missedCampaigns: new Set(),
          missedCampaignNames: [],
        });
      }

      const record = employeeMap.get(key)!;
      if (
        assignment.campaign &&
        !record.missedCampaigns.has(assignment.campaignId)
      ) {
        record.missedCampaigns.add(assignment.campaignId);
        record.missedCampaignNames.push(assignment.campaign.name);
      }
    }

    // Get total assigned count for each employee
    const employeeIds = Array.from(employeeMap.keys());
    const totalAssignmentCounts = await this.prisma.campaignAssignment.groupBy({
      by: ["employeeId"],
      where: {
        organizationId,
        employeeId: { in: employeeIds },
      },
      _count: { id: true },
    });

    const totalCountMap = new Map(
      totalAssignmentCounts.map((tc) => [tc.employeeId, tc._count.id]),
    );

    // Build repeat non-responders list (2+ missed campaigns)
    const repeatNonResponders = Array.from(employeeMap.values())
      .filter((emp) => emp.missedCampaigns.size >= 2)
      .map((emp) => ({
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        email: emp.email,
        department: emp.department,
        manager: emp.manager,
        missedCampaigns: emp.missedCampaigns.size,
        totalAssigned:
          totalCountMap.get(emp.employeeId) ?? emp.missedCampaigns.size,
        missedCampaignNames: emp.missedCampaignNames,
      }))
      .sort((a, b) => b.missedCampaigns - a.missedCampaigns);

    // Group by department
    const departmentMap = new Map<
      string | null,
      { nonResponderCount: number; employeeIds: Set<string> }
    >();

    for (const [, emp] of employeeMap) {
      if (!departmentMap.has(emp.department)) {
        departmentMap.set(emp.department, {
          nonResponderCount: 0,
          employeeIds: new Set(),
        });
      }
      const dept = departmentMap.get(emp.department)!;
      dept.nonResponderCount++;
      dept.employeeIds.add(emp.employeeId);
    }

    // Get total employees per department for percentage
    const employeesByDepartment = await this.prisma.employee.groupBy({
      by: ["department"],
      where: {
        organizationId,
        employmentStatus: "ACTIVE",
      },
      _count: { id: true },
    });

    const deptEmployeeCounts = new Map(
      employeesByDepartment.map((d) => [d.department, d._count.id]),
    );

    const byDepartment = Array.from(departmentMap.entries())
      .map(([department, stats]) => {
        const totalEmployees =
          deptEmployeeCounts.get(department) ?? stats.nonResponderCount;
        return {
          department,
          nonResponderCount: stats.nonResponderCount,
          totalEmployees,
          percentage: Math.round(
            (stats.nonResponderCount / totalEmployees) * 100,
          ),
        };
      })
      .sort((a, b) => b.nonResponderCount - a.nonResponderCount);

    // Group by manager
    const managerMap = new Map<
      string | null,
      {
        managerId: string | null;
        managerName: string | null;
        nonResponderCount: number;
      }
    >();

    for (const assignment of missedAssignments) {
      if (!assignment.employee) continue;

      const managerId = assignment.employee.managerId ?? null;
      const managerName = assignment.employee.managerName ?? null;

      if (!managerMap.has(managerId)) {
        managerMap.set(managerId, {
          managerId,
          managerName,
          nonResponderCount: 0,
        });
      }
      managerMap.get(managerId)!.nonResponderCount++;
    }

    // Get total direct reports per manager
    const directReports = await this.prisma.employee.groupBy({
      by: ["managerId"],
      where: {
        organizationId,
        employmentStatus: "ACTIVE",
        managerId: { not: null },
      },
      _count: { id: true },
    });

    const managerReportCounts = new Map(
      directReports.map((dr) => [dr.managerId, dr._count.id]),
    );

    const byManager = Array.from(managerMap.values())
      .filter((m) => m.managerId !== null)
      .map((m) => {
        const totalReports =
          managerReportCounts.get(m.managerId) ?? m.nonResponderCount;
        return {
          managerId: m.managerId,
          managerName: m.managerName,
          nonResponderCount: m.nonResponderCount,
          totalReports,
          percentage: Math.round((m.nonResponderCount / totalReports) * 100),
        };
      })
      .sort((a, b) => b.nonResponderCount - a.nonResponderCount);

    return {
      repeatNonResponders,
      byDepartment,
      byManager,
    };
  }
}
