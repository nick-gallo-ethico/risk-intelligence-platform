import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma, ProjectTaskStatus } from "@prisma/client";
import {
  ProjectDetailResponseDto,
  ProjectQueryDto,
  PaginatedProjectResult,
  ProjectGroupResponseDto,
  ProjectColumnResponseDto,
  ProjectTaskSummaryDto,
} from "./dto/project.dto";
import {
  MilestoneResponseDto,
  MilestoneItemResponseDto,
} from "./dto/milestone.dto";
import { differenceInDays, isPast } from "date-fns";

/**
 * ProjectService provides extended project functionality for Monday.com-style boards.
 *
 * Features:
 * - Project detail with groups, tasks, columns
 * - Progress recalculation based on ProjectTask completion
 * - List projects with task count summaries
 */
@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Gets detailed project information including groups, tasks, and columns.
   */
  async getDetail(
    orgId: string,
    projectId: string,
  ): Promise<ProjectDetailResponseDto | null> {
    const project = await this.prisma.milestone.findFirst({
      where: { id: projectId, organizationId: orgId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        items: { orderBy: { sortOrder: "asc" } },
        groups: {
          orderBy: { sortOrder: "asc" },
          include: {
            _count: { select: { tasks: true } },
          },
        },
        columns: { orderBy: { sortOrder: "asc" } },
        tasks: {
          where: { parentTaskId: null }, // Only top-level tasks
          orderBy: { sortOrder: "asc" },
          take: 50,
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
            _count: {
              select: {
                subtasks: true,
              },
            },
          },
        },
      },
    });

    if (!project) return null;

    // Count completed tasks
    const taskCounts = await this.prisma.projectTask.groupBy({
      by: ["status"],
      where: {
        milestoneId: projectId,
        organizationId: orgId,
        parentTaskId: null, // Only count top-level tasks
      },
      _count: true,
    });

    const totalTaskCount = taskCounts.reduce((sum, t) => sum + t._count, 0);
    const completedTaskCount =
      taskCounts.find((t) => t.status === ProjectTaskStatus.DONE)?._count || 0;

    // Count completed subtasks for each task
    const subtaskCounts = await this.prisma.projectTask.groupBy({
      by: ["parentTaskId", "status"],
      where: {
        milestoneId: projectId,
        organizationId: orgId,
        parentTaskId: { not: null },
      },
      _count: true,
    });

    const subtaskCountMap = new Map<
      string,
      { total: number; completed: number }
    >();
    subtaskCounts.forEach((s) => {
      if (!s.parentTaskId) return;
      const current = subtaskCountMap.get(s.parentTaskId) || {
        total: 0,
        completed: 0,
      };
      current.total += s._count;
      if (s.status === ProjectTaskStatus.DONE) {
        current.completed += s._count;
      }
      subtaskCountMap.set(s.parentTaskId, current);
    });

    const daysUntilTarget = differenceInDays(project.targetDate, new Date());
    const isOverdue =
      isPast(project.targetDate) && project.status !== "COMPLETED";

    // Build response
    const response: ProjectDetailResponseDto = {
      id: project.id,
      name: project.name,
      description: project.description ?? undefined,
      category: project.category,
      targetDate: project.targetDate,
      completedAt: project.completedAt ?? undefined,
      status: project.status,
      totalItems: project.totalItems,
      completedItems: project.completedItems,
      progressPercent: project.progressPercent,
      owner: project.owner
        ? {
            id: project.owner.id,
            name: `${project.owner.firstName} ${project.owner.lastName}`,
          }
        : undefined,
      items:
        project.items?.map(
          (item): MilestoneItemResponseDto => ({
            id: item.id,
            entityType: item.entityType,
            entityId: item.entityId ?? undefined,
            customTitle: item.customTitle ?? undefined,
            isCompleted: item.isCompleted,
            completedAt: item.completedAt ?? undefined,
            dueDate: item.dueDate ?? undefined,
            weight: item.weight,
            sortOrder: item.sortOrder,
          }),
        ) || [],
      notes: project.notes ?? undefined,
      lastStatusUpdate: project.lastStatusUpdate ?? undefined,
      daysUntilTarget,
      isOverdue,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      // Extended fields
      groups: project.groups.map(
        (g): ProjectGroupResponseDto => ({
          id: g.id,
          name: g.name,
          color: g.color ?? undefined,
          sortOrder: g.sortOrder,
          isCollapsed: g.isCollapsed,
          taskCount: g._count.tasks,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        }),
      ),
      taskCount: totalTaskCount,
      completedTaskCount,
      columns: project.columns.map(
        (c): ProjectColumnResponseDto => ({
          id: c.id,
          name: c.name,
          type: c.type,
          settings: c.settings as Record<string, unknown> | undefined,
          sortOrder: c.sortOrder,
          width: c.width ?? undefined,
          isRequired: c.isRequired,
        }),
      ),
      tasks: project.tasks.map(
        (t): ProjectTaskSummaryDto => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee
            ? {
                id: t.assignee.id,
                name: `${t.assignee.firstName} ${t.assignee.lastName}`,
              }
            : undefined,
          dueDate: t.dueDate ?? undefined,
          groupId: t.groupId ?? undefined,
          subtaskCount: subtaskCountMap.get(t.id)?.total || 0,
          completedSubtaskCount: subtaskCountMap.get(t.id)?.completed || 0,
        }),
      ),
    };

    return response;
  }

  /**
   * Recalculates project progress based on ProjectTask completion.
   * Updates the Milestone's progressPercent, totalItems, and completedItems.
   */
  async updateProgress(orgId: string, projectId: string): Promise<void> {
    // Count tasks by status
    const taskCounts = await this.prisma.projectTask.groupBy({
      by: ["status"],
      where: {
        milestoneId: projectId,
        organizationId: orgId,
        parentTaskId: null, // Only count top-level tasks
      },
      _count: true,
    });

    const totalTasks = taskCounts.reduce((sum, t) => sum + t._count, 0);
    const completedTasks =
      taskCounts.find((t) => t.status === ProjectTaskStatus.DONE)?._count || 0;

    const progressPercent =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const milestone = await this.prisma.milestone.findUnique({
      where: { id: projectId },
    });

    if (!milestone || milestone.organizationId !== orgId) {
      this.logger.warn(
        `Cannot update progress: project ${projectId} not found`,
      );
      return;
    }

    // Determine status based on progress and target date
    let status = milestone.status;
    if (milestone.status !== "CANCELLED") {
      if (progressPercent === 100) {
        status = "COMPLETED";
      } else if (progressPercent > 0) {
        status = isPast(milestone.targetDate) ? "AT_RISK" : "IN_PROGRESS";
      } else {
        status = isPast(milestone.targetDate) ? "AT_RISK" : "NOT_STARTED";
      }
    }

    await this.prisma.milestone.update({
      where: { id: projectId },
      data: {
        totalItems: totalTasks,
        completedItems: completedTasks,
        progressPercent,
        status,
        completedAt: progressPercent === 100 ? new Date() : null,
      },
    });

    this.logger.debug(
      `Project ${projectId} progress updated: ${progressPercent}% (${completedTasks}/${totalTasks})`,
    );
  }

  /**
   * Lists projects with task count summaries.
   */
  async getProjectsWithTaskCounts(
    orgId: string,
    query: ProjectQueryDto,
  ): Promise<PaginatedProjectResult> {
    const where: Prisma.MilestoneWhereInput = {
      organizationId: orgId,
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.ownerId && { ownerId: query.ownerId }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
        ],
      }),
      ...((query.targetDateFrom || query.targetDateTo) && {
        targetDate: {
          ...(query.targetDateFrom && { gte: query.targetDateFrom }),
          ...(query.targetDateTo && { lte: query.targetDateTo }),
        },
      }),
    };

    const [projects, total] = await Promise.all([
      this.prisma.milestone.findMany({
        where,
        skip: query.offset ?? 0,
        take: query.limit ?? 20,
        orderBy: { targetDate: "asc" },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
          items: { orderBy: { sortOrder: "asc" } },
          groups: {
            orderBy: { sortOrder: "asc" },
            include: { _count: { select: { tasks: true } } },
          },
          columns: { orderBy: { sortOrder: "asc" } },
          _count: { select: { tasks: true } },
        },
      }),
      this.prisma.milestone.count({ where }),
    ]);

    // Get completed task counts for each project
    const projectIds = projects.map((p) => p.id);
    const completedCounts = await this.prisma.projectTask.groupBy({
      by: ["milestoneId"],
      where: {
        milestoneId: { in: projectIds },
        organizationId: orgId,
        status: ProjectTaskStatus.DONE,
        parentTaskId: null,
      },
      _count: true,
    });

    const completedCountMap = new Map(
      completedCounts.map((c) => [c.milestoneId, c._count]),
    );

    const items = projects.map((p): ProjectDetailResponseDto => {
      const daysUntilTarget = differenceInDays(p.targetDate, new Date());
      const isOverdue = isPast(p.targetDate) && p.status !== "COMPLETED";

      return {
        id: p.id,
        name: p.name,
        description: p.description ?? undefined,
        category: p.category,
        targetDate: p.targetDate,
        completedAt: p.completedAt ?? undefined,
        status: p.status,
        totalItems: p.totalItems,
        completedItems: p.completedItems,
        progressPercent: p.progressPercent,
        owner: p.owner
          ? {
              id: p.owner.id,
              name: `${p.owner.firstName} ${p.owner.lastName}`,
            }
          : undefined,
        items:
          p.items?.map(
            (item): MilestoneItemResponseDto => ({
              id: item.id,
              entityType: item.entityType,
              entityId: item.entityId ?? undefined,
              customTitle: item.customTitle ?? undefined,
              isCompleted: item.isCompleted,
              completedAt: item.completedAt ?? undefined,
              dueDate: item.dueDate ?? undefined,
              weight: item.weight,
              sortOrder: item.sortOrder,
            }),
          ) || [],
        notes: p.notes ?? undefined,
        lastStatusUpdate: p.lastStatusUpdate ?? undefined,
        daysUntilTarget,
        isOverdue,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        groups: p.groups.map(
          (g): ProjectGroupResponseDto => ({
            id: g.id,
            name: g.name,
            color: g.color ?? undefined,
            sortOrder: g.sortOrder,
            isCollapsed: g.isCollapsed,
            taskCount: g._count.tasks,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
          }),
        ),
        taskCount: (p._count as { tasks: number }).tasks,
        completedTaskCount: completedCountMap.get(p.id) || 0,
        columns: p.columns.map(
          (c): ProjectColumnResponseDto => ({
            id: c.id,
            name: c.name,
            type: c.type,
            settings: c.settings as Record<string, unknown> | undefined,
            sortOrder: c.sortOrder,
            width: c.width ?? undefined,
            isRequired: c.isRequired,
          }),
        ),
      };
    });

    return {
      items,
      total,
      offset: query.offset ?? 0,
      limit: query.limit ?? 20,
    };
  }
}
