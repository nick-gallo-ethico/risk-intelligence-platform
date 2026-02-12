import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AuditService } from "../audit/audit.service";
import {
  ProjectTask,
  Prisma,
  ProjectTaskStatus,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";
import {
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
  ProjectTaskQueryDto,
  BulkUpdateTasksDto,
  ProjectTaskResponseDto,
  PaginatedProjectTaskResult,
} from "./dto/project-task.dto";
import {
  ProjectTaskCreatedEvent,
  ProjectTaskUpdatedEvent,
  ProjectTaskCompletedEvent,
  ProjectTaskDeletedEvent,
} from "./events/project.events";
import { ProjectService } from "./project.service";

/**
 * ProjectTaskService manages project tasks for Monday.com-style boards.
 *
 * Features:
 * - CRUD operations for tasks with subtask support
 * - Status transitions with completion tracking
 * - Bulk updates for drag-drop operations
 * - Task reordering within groups
 */
@Injectable()
export class ProjectTaskService {
  private readonly logger = new Logger(ProjectTaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
    private readonly projectService: ProjectService,
  ) {}

  /**
   * Creates a new project task.
   */
  async create(
    orgId: string,
    projectId: string,
    userId: string,
    dto: CreateProjectTaskDto,
  ): Promise<ProjectTask> {
    // Verify project exists and belongs to org
    const project = await this.prisma.milestone.findFirst({
      where: { id: projectId, organizationId: orgId },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    // If groupId provided, verify it belongs to this project
    if (dto.groupId) {
      const group = await this.prisma.projectGroup.findFirst({
        where: {
          id: dto.groupId,
          milestoneId: projectId,
          organizationId: orgId,
        },
      });
      if (!group) {
        throw new NotFoundException("Group not found in this project");
      }
    }

    // If parentTaskId provided, verify it belongs to this project
    if (dto.parentTaskId) {
      const parentTask = await this.prisma.projectTask.findFirst({
        where: {
          id: dto.parentTaskId,
          milestoneId: projectId,
          organizationId: orgId,
        },
      });
      if (!parentTask) {
        throw new NotFoundException("Parent task not found in this project");
      }
    }

    // Get max sort order for placement
    const maxSortTask = await this.prisma.projectTask.findFirst({
      where: {
        milestoneId: projectId,
        organizationId: orgId,
        groupId: dto.groupId ?? null,
        parentTaskId: dto.parentTaskId ?? null,
      },
      orderBy: { sortOrder: "desc" },
    });

    const sortOrder = dto.sortOrder ?? (maxSortTask?.sortOrder ?? 0) + 1;

    const task = await this.prisma.projectTask.create({
      data: {
        organizationId: orgId,
        milestoneId: projectId,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? ProjectTaskStatus.NOT_STARTED,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        startDate: dto.startDate,
        dueDate: dto.dueDate,
        groupId: dto.groupId,
        parentTaskId: dto.parentTaskId,
        sortOrder,
        customFields: dto.customFields as Prisma.InputJsonValue,
        createdById: userId,
      },
    });

    // Emit event
    this.eventEmitter.emit(
      ProjectTaskCreatedEvent.eventName,
      new ProjectTaskCreatedEvent({
        organizationId: orgId,
        actorUserId: userId,
        actorType: "USER",
        taskId: task.id,
        milestoneId: projectId,
        title: dto.title,
        groupId: dto.groupId,
      }),
    );

    // Audit log
    await this.auditService.log({
      entityType: AuditEntityType.PROJECT_TASK,
      entityId: task.id,
      action: "created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Task "${dto.title}" created in project "${project.name}"`,
      organizationId: orgId,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: { milestoneId: projectId, groupId: dto.groupId },
    });

    // Update project progress
    await this.projectService.updateProgress(orgId, projectId);

    this.logger.log(`Task created: ${task.id} - ${task.title}`);

    return task;
  }

  /**
   * Updates a project task.
   */
  async update(
    orgId: string,
    taskId: string,
    userId: string,
    dto: UpdateProjectTaskDto,
  ): Promise<ProjectTask> {
    const existing = await this.prisma.projectTask.findFirst({
      where: { id: taskId, organizationId: orgId },
      include: { milestone: true },
    });

    if (!existing) {
      throw new NotFoundException("Task not found");
    }

    // Track changes for event
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const wasCompleted = existing.status === ProjectTaskStatus.DONE;
    const willBeCompleted = dto.status === ProjectTaskStatus.DONE;

    // Handle completion timestamp
    let completedAt = existing.completedAt;
    if (dto.status !== undefined && dto.status !== existing.status) {
      changes.status = { old: existing.status, new: dto.status };
      if (dto.status === ProjectTaskStatus.DONE && !wasCompleted) {
        completedAt = new Date();
      } else if (dto.status !== ProjectTaskStatus.DONE && wasCompleted) {
        completedAt = null;
      }
    }

    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      changes.priority = { old: existing.priority, new: dto.priority };
    }
    if (
      dto.assigneeId !== undefined &&
      dto.assigneeId !== existing.assigneeId
    ) {
      changes.assigneeId = { old: existing.assigneeId, new: dto.assigneeId };
    }
    if (dto.dueDate !== undefined) {
      const oldDate = existing.dueDate?.toISOString();
      const newDate = dto.dueDate?.toISOString();
      if (oldDate !== newDate) {
        changes.dueDate = { old: oldDate, new: newDate };
      }
    }

    const task = await this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        ...dto,
        completedAt,
        customFields: dto.customFields as Prisma.InputJsonValue,
      },
    });

    // Emit events
    if (Object.keys(changes).length > 0) {
      this.eventEmitter.emit(
        ProjectTaskUpdatedEvent.eventName,
        new ProjectTaskUpdatedEvent({
          organizationId: orgId,
          actorUserId: userId,
          actorType: "USER",
          taskId: task.id,
          milestoneId: task.milestoneId,
          changes,
        }),
      );
    }

    // Emit completion event if newly completed
    if (willBeCompleted && !wasCompleted) {
      this.eventEmitter.emit(
        ProjectTaskCompletedEvent.eventName,
        new ProjectTaskCompletedEvent({
          organizationId: orgId,
          actorUserId: userId,
          actorType: "USER",
          taskId: task.id,
          milestoneId: task.milestoneId,
          title: task.title,
        }),
      );
    }

    // Audit log
    if (Object.keys(changes).length > 0) {
      await this.auditService.log({
        entityType: AuditEntityType.PROJECT_TASK,
        entityId: taskId,
        action: willBeCompleted && !wasCompleted ? "completed" : "updated",
        actionCategory: AuditActionCategory.UPDATE,
        actionDescription:
          willBeCompleted && !wasCompleted
            ? `Task "${task.title}" completed`
            : `Task "${task.title}" updated`,
        organizationId: orgId,
        actorUserId: userId,
        actorType: ActorType.USER,
        changes,
        context: { milestoneId: task.milestoneId },
      });
    }

    // Update project progress
    await this.projectService.updateProgress(orgId, task.milestoneId);

    return task;
  }

  /**
   * Deletes a project task and its subtasks.
   */
  async delete(orgId: string, taskId: string, userId: string): Promise<void> {
    const existing = await this.prisma.projectTask.findFirst({
      where: { id: taskId, organizationId: orgId },
      include: { milestone: true },
    });

    if (!existing) {
      throw new NotFoundException("Task not found");
    }

    // Delete task (cascade deletes subtasks)
    await this.prisma.projectTask.delete({
      where: { id: taskId },
    });

    // Emit event
    this.eventEmitter.emit(
      ProjectTaskDeletedEvent.eventName,
      new ProjectTaskDeletedEvent({
        organizationId: orgId,
        actorUserId: userId,
        actorType: "USER",
        taskId,
        milestoneId: existing.milestoneId,
        title: existing.title,
      }),
    );

    // Audit log
    await this.auditService.log({
      entityType: AuditEntityType.PROJECT_TASK,
      entityId: taskId,
      action: "deleted",
      actionCategory: AuditActionCategory.DELETE,
      actionDescription: `Task "${existing.title}" deleted from project "${existing.milestone.name}"`,
      organizationId: orgId,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: { milestoneId: existing.milestoneId },
    });

    // Update project progress
    await this.projectService.updateProgress(orgId, existing.milestoneId);

    this.logger.log(`Task deleted: ${taskId}`);
  }

  /**
   * Lists tasks for a project with filtering and pagination.
   */
  async list(
    orgId: string,
    projectId: string,
    query: ProjectTaskQueryDto,
  ): Promise<PaginatedProjectTaskResult> {
    const where: Prisma.ProjectTaskWhereInput = {
      organizationId: orgId,
      milestoneId: projectId,
      parentTaskId: null, // Only top-level tasks by default
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.assigneeId && { assigneeId: query.assigneeId }),
      ...(query.groupId && { groupId: query.groupId }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    // Determine sort order
    const orderBy: Prisma.ProjectTaskOrderByWithRelationInput = {};
    const sortField = query.sortBy || "sortOrder";
    const sortDir = query.sortOrder || "asc";
    (orderBy as Record<string, unknown>)[sortField] = sortDir;

    const [tasks, total] = await Promise.all([
      this.prisma.projectTask.findMany({
        where,
        skip: query.offset ?? 0,
        take: query.limit ?? 50,
        orderBy,
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { subtasks: true } },
        },
      }),
      this.prisma.projectTask.count({ where }),
    ]);

    // Get completed subtask counts
    const taskIds = tasks.map((t) => t.id);
    const completedSubtasks = await this.prisma.projectTask.groupBy({
      by: ["parentTaskId"],
      where: {
        parentTaskId: { in: taskIds },
        status: ProjectTaskStatus.DONE,
      },
      _count: true,
    });

    const completedMap = new Map(
      completedSubtasks.map((s) => [s.parentTaskId, s._count]),
    );

    const items = tasks.map(
      (t): ProjectTaskResponseDto => ({
        id: t.id,
        title: t.title,
        description: t.description ?? undefined,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee
          ? {
              id: t.assignee.id,
              name: `${t.assignee.firstName} ${t.assignee.lastName}`,
            }
          : undefined,
        startDate: t.startDate ?? undefined,
        dueDate: t.dueDate ?? undefined,
        completedAt: t.completedAt ?? undefined,
        sortOrder: t.sortOrder,
        groupId: t.groupId ?? undefined,
        parentTaskId: t.parentTaskId ?? undefined,
        customFields: t.customFields as Record<string, unknown> | undefined,
        subtaskCount: t._count.subtasks,
        completedSubtaskCount: completedMap.get(t.id) || 0,
        createdBy: {
          id: t.createdBy.id,
          name: `${t.createdBy.firstName} ${t.createdBy.lastName}`,
        },
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }),
    );

    return {
      items,
      total,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    };
  }

  /**
   * Bulk updates multiple tasks at once (for drag-drop operations).
   */
  async bulkUpdate(
    orgId: string,
    userId: string,
    dto: BulkUpdateTasksDto,
  ): Promise<{ updated: number }> {
    // Verify all tasks exist and belong to org
    const tasks = await this.prisma.projectTask.findMany({
      where: {
        id: { in: dto.taskIds },
        organizationId: orgId,
      },
    });

    if (tasks.length !== dto.taskIds.length) {
      throw new NotFoundException("One or more tasks not found");
    }

    const updateData: Prisma.ProjectTaskUpdateManyMutationInput = {};
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate;

    // Handle completion timestamps
    if (dto.status === ProjectTaskStatus.DONE) {
      updateData.completedAt = new Date();
    } else if (dto.status !== undefined) {
      updateData.completedAt = null;
    }

    // If assigneeId is provided, we need to update each task individually
    // because updateMany doesn't support relation updates
    if (dto.assigneeId !== undefined) {
      await Promise.all(
        dto.taskIds.map((taskId) =>
          this.prisma.projectTask.update({
            where: { id: taskId },
            data: {
              ...updateData,
              assigneeId: dto.assigneeId,
            },
          }),
        ),
      );
    } else {
      await this.prisma.projectTask.updateMany({
        where: {
          id: { in: dto.taskIds },
          organizationId: orgId,
        },
        data: updateData,
      });
    }

    // Update progress for affected projects
    const projectIds = [...new Set(tasks.map((t) => t.milestoneId))];
    for (const projectId of projectIds) {
      await this.projectService.updateProgress(orgId, projectId);
    }

    this.logger.log(`Bulk updated ${tasks.length} tasks`);

    return { updated: tasks.length };
  }

  /**
   * Reorders tasks within a group.
   */
  async reorder(
    orgId: string,
    projectId: string,
    groupId: string | null,
    orderedIds: string[],
  ): Promise<void> {
    // Verify tasks exist and belong to the specified group
    const tasks = await this.prisma.projectTask.findMany({
      where: {
        id: { in: orderedIds },
        organizationId: orgId,
        milestoneId: projectId,
        groupId: groupId ?? null,
      },
    });

    if (tasks.length !== orderedIds.length) {
      throw new NotFoundException(
        "One or more tasks not found in the specified group",
      );
    }

    // Update sort orders
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.projectTask.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    this.logger.debug(
      `Reordered ${orderedIds.length} tasks in project ${projectId}`,
    );
  }

  /**
   * Gets subtasks for a parent task.
   */
  async getSubtasks(
    orgId: string,
    parentTaskId: string,
  ): Promise<ProjectTaskResponseDto[]> {
    const tasks = await this.prisma.projectTask.findMany({
      where: {
        organizationId: orgId,
        parentTaskId,
      },
      orderBy: { sortOrder: "asc" },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { subtasks: true } },
      },
    });

    return tasks.map(
      (t): ProjectTaskResponseDto => ({
        id: t.id,
        title: t.title,
        description: t.description ?? undefined,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee
          ? {
              id: t.assignee.id,
              name: `${t.assignee.firstName} ${t.assignee.lastName}`,
            }
          : undefined,
        startDate: t.startDate ?? undefined,
        dueDate: t.dueDate ?? undefined,
        completedAt: t.completedAt ?? undefined,
        sortOrder: t.sortOrder,
        groupId: t.groupId ?? undefined,
        parentTaskId: t.parentTaskId ?? undefined,
        customFields: t.customFields as Record<string, unknown> | undefined,
        subtaskCount: t._count.subtasks,
        completedSubtaskCount: 0, // Nested subtasks not supported yet
        createdBy: {
          id: t.createdBy.id,
          name: `${t.createdBy.firstName} ${t.createdBy.lastName}`,
        },
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }),
    );
  }
}
