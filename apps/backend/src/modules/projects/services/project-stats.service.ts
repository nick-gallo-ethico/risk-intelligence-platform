import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ProjectTaskStatus, ProjectTaskPriority } from "@prisma/client";

/**
 * Response type for project statistics.
 */
export interface ProjectStatsResponse {
  /** Total number of top-level tasks */
  totalTasks: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Overall progress percentage */
  progressPercent: number;
  /** Task count by status */
  statusCounts: Record<ProjectTaskStatus, number>;
  /** Task count by priority */
  priorityCounts: Record<ProjectTaskPriority, number>;
  /** Workload distribution per assignee */
  workload: WorkloadEntry[];
  /** Number of overdue tasks */
  overdueTasks: number;
  /** Number of unassigned tasks (excluding DONE/CANCELLED) */
  unassignedTasks: number;
  /** Completed tasks per day (last 30 days) */
  completedByDay: Record<string, number>;
  /** Progress per group */
  groupProgress: GroupProgressEntry[];
  /** Days until target date (null if no target date) */
  daysUntilTarget: number | null;
}

/**
 * Workload entry for a single team member.
 */
export interface WorkloadEntry {
  user: {
    id: string;
    name: string;
    email: string;
  };
  /** Total assigned tasks */
  total: number;
  /** Completed tasks */
  done: number;
  /** In-progress tasks */
  inProgress: number;
  /** Stuck tasks */
  stuck: number;
  /** Overdue tasks (past due date, not done) */
  overdue: number;
}

/**
 * Progress entry for a single group.
 */
export interface GroupProgressEntry {
  groupId: string;
  groupName: string;
  groupColor: string | null;
  /** Total tasks in group */
  total: number;
  /** Completed tasks in group */
  done: number;
  /** Progress percentage */
  progressPercent: number;
}

/**
 * ProjectStatsService provides aggregated statistics for project dashboards.
 *
 * Features:
 * - Status and priority distribution
 * - Workload per assignee with overdue tracking
 * - Progress over time (completed by day)
 * - Group progress breakdown
 * - Days until target date
 */
@Injectable()
export class ProjectStatsService {
  private readonly logger = new Logger(ProjectStatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets aggregated statistics for a project.
   *
   * @param projectId - The project (milestone) ID
   * @param organizationId - The organization ID for tenant isolation
   */
  async getProjectStats(
    projectId: string,
    organizationId: string,
  ): Promise<ProjectStatsResponse> {
    // Verify project exists and belongs to organization
    const project = await this.prisma.milestone.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Fetch all top-level tasks for this project
    const tasks = await this.prisma.projectTask.findMany({
      where: {
        milestoneId: projectId,
        organizationId,
        parentTaskId: null, // Only top-level tasks
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const now = new Date();

    // Status breakdown
    const statusCounts: Record<ProjectTaskStatus, number> = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      STUCK: 0,
      DONE: 0,
      CANCELLED: 0,
    };
    tasks.forEach((t) => {
      statusCounts[t.status]++;
    });

    // Priority breakdown
    const priorityCounts: Record<ProjectTaskPriority, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    tasks.forEach((t) => {
      priorityCounts[t.priority]++;
    });

    // Workload per assignee
    const workloadMap = new Map<string, WorkloadEntry>();
    tasks.forEach((t) => {
      if (!t.assigneeId || !t.assignee) return;

      if (!workloadMap.has(t.assigneeId)) {
        workloadMap.set(t.assigneeId, {
          user: {
            id: t.assignee.id,
            name: `${t.assignee.firstName} ${t.assignee.lastName}`,
            email: t.assignee.email,
          },
          total: 0,
          done: 0,
          inProgress: 0,
          stuck: 0,
          overdue: 0,
        });
      }

      const entry = workloadMap.get(t.assigneeId)!;
      entry.total++;

      if (t.status === ProjectTaskStatus.DONE) {
        entry.done++;
      } else if (t.status === ProjectTaskStatus.IN_PROGRESS) {
        entry.inProgress++;
      } else if (t.status === ProjectTaskStatus.STUCK) {
        entry.stuck++;
      }

      // Count overdue tasks (past due date, not completed/cancelled)
      if (
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== ProjectTaskStatus.DONE &&
        t.status !== ProjectTaskStatus.CANCELLED
      ) {
        entry.overdue++;
      }
    });

    // Count overdue tasks overall
    const overdueTasks = tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== ProjectTaskStatus.DONE &&
        t.status !== ProjectTaskStatus.CANCELLED,
    ).length;

    // Count unassigned tasks (excluding completed/cancelled)
    const unassignedTasks = tasks.filter(
      (t) =>
        !t.assigneeId &&
        t.status !== ProjectTaskStatus.DONE &&
        t.status !== ProjectTaskStatus.CANCELLED,
    ).length;

    // Completed tasks by day (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const completedByDay: Record<string, number> = {};
    tasks
      .filter((t) => t.completedAt && new Date(t.completedAt) >= thirtyDaysAgo)
      .forEach((t) => {
        const day = new Date(t.completedAt!).toISOString().split("T")[0];
        completedByDay[day] = (completedByDay[day] || 0) + 1;
      });

    // Group progress
    const groups = await this.prisma.projectGroup.findMany({
      where: { milestoneId: projectId, organizationId },
      orderBy: { sortOrder: "asc" },
    });

    const groupProgress: GroupProgressEntry[] = groups.map((g) => {
      const groupTasks = tasks.filter((t) => t.groupId === g.id);
      const done = groupTasks.filter(
        (t) => t.status === ProjectTaskStatus.DONE,
      ).length;
      const total = groupTasks.length;

      return {
        groupId: g.id,
        groupName: g.name,
        groupColor: g.color,
        total,
        done,
        progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });

    // Days until target date
    const daysUntilTarget = project.targetDate
      ? Math.ceil(
          (new Date(project.targetDate).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    return {
      totalTasks: tasks.length,
      completedTasks: statusCounts.DONE,
      progressPercent:
        tasks.length > 0
          ? Math.round((statusCounts.DONE / tasks.length) * 100)
          : 0,
      statusCounts,
      priorityCounts,
      workload: Array.from(workloadMap.values()),
      overdueTasks,
      unassignedTasks,
      completedByDay,
      groupProgress,
      daysUntilTarget,
    };
  }
}
