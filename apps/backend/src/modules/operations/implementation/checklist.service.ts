/**
 * ChecklistService - Implementation Task Management
 *
 * Manages implementation checklist tasks:
 * - Template instantiation for new projects
 * - Task status updates and assignment
 * - Health score calculation
 *
 * Health Score Formula:
 *   score = (completedRequired / totalRequired) * 100
 *         - (blockedTasks * 5)
 *         - (overdueTasks * 10)
 *   Bounded to [0, 100]
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  ImplementationType,
  ImplementationPhase,
  ImplTaskStatus,
  ImplementationTask,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { getTemplate } from "./checklist-templates";
import { UpdateTaskDto, HealthScoreResponse } from "./dto/implementation.dto";
import { TaskStatus } from "../types/implementation.types";

@Injectable()
export class ChecklistService {
  private readonly logger = new Logger(ChecklistService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create checklist tasks from template for a project.
   * Called when a new implementation project is created.
   *
   * @param projectId - The project to create tasks for
   * @param type - The implementation type to use for template selection
   * @returns Task count created
   */
  async createFromTemplate(
    projectId: string,
    type: ImplementationType,
  ): Promise<{ taskCount: number }> {
    const template = getTemplate(type);
    const tasks: Prisma.ImplementationTaskCreateManyInput[] = [];
    let sortOrder = 0;

    this.logger.log(
      `Creating checklist from template ${template.name} for project ${projectId}`,
    );

    for (const phase of template.phases) {
      for (const task of phase.tasks) {
        tasks.push({
          projectId,
          phase: phase.phase as ImplementationPhase,
          name: task.name,
          description: task.description ?? null,
          status: ImplTaskStatus.PENDING,
          isRequired: task.isRequired,
          sortOrder: sortOrder++,
        });
      }
    }

    await this.prisma.implementationTask.createMany({ data: tasks });

    this.logger.log(
      `Created ${tasks.length} tasks from template ${template.name}`,
    );

    return { taskCount: tasks.length };
  }

  /**
   * Get all tasks for a project, grouped by phase.
   */
  async getTasksByPhase(projectId: string): Promise<
    Record<
      ImplementationPhase,
      {
        tasks: ImplementationTask[];
        completed: number;
        total: number;
      }
    >
  > {
    const tasks = await this.prisma.implementationTask.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    });

    const result: Record<
      ImplementationPhase,
      { tasks: ImplementationTask[]; completed: number; total: number }
    > = {} as any;

    // Group by phase
    for (const task of tasks) {
      if (!result[task.phase]) {
        result[task.phase] = { tasks: [], completed: 0, total: 0 };
      }
      result[task.phase].tasks.push(task);
      result[task.phase].total++;
      if (task.status === ImplTaskStatus.COMPLETED) {
        result[task.phase].completed++;
      }
    }

    return result;
  }

  /**
   * Update a task's status, assignment, or other properties.
   */
  async updateTask(
    taskId: string,
    dto: UpdateTaskDto,
    completedById?: string,
  ): Promise<ImplementationTask> {
    // Verify task exists
    const existing = await this.prisma.implementationTask.findUnique({
      where: { id: taskId },
    });

    if (!existing) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const data: Prisma.ImplementationTaskUpdateInput = {};

    if (dto.status !== undefined) {
      // Map our TaskStatus enum to Prisma's ImplTaskStatus
      data.status = dto.status as unknown as ImplTaskStatus;

      // If marking as completed, record who and when
      if (dto.status === TaskStatus.COMPLETED) {
        data.completedAt = new Date();
        if (completedById) {
          data.completedById = completedById;
        }
      } else {
        // If changing from completed to something else, clear completion data
        if (existing.status === ImplTaskStatus.COMPLETED) {
          data.completedAt = null;
          data.completedById = null;
        }
      }
    }

    if (dto.assignedToId !== undefined) {
      data.assignedToId = dto.assignedToId || null;
    }

    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes || null;
    }

    const updated = await this.prisma.implementationTask.update({
      where: { id: taskId },
      data,
    });

    this.logger.log(`Updated task ${taskId}: ${JSON.stringify(dto)}`);

    return updated;
  }

  /**
   * Get a single task by ID.
   */
  async getTask(taskId: string): Promise<ImplementationTask> {
    const task = await this.prisma.implementationTask.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: { id: true, status: true, currentPhase: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    return task;
  }

  /**
   * Calculate project health score based on task completion.
   *
   * Formula:
   *   Base score = (completed required / total required) * 100
   *   Penalties:
   *     - 5 points per blocked task
   *     - 10 points per overdue task
   *   Final score bounded to [0, 100]
   */
  async calculateProjectHealth(
    projectId: string,
  ): Promise<HealthScoreResponse> {
    const tasks = await this.prisma.implementationTask.findMany({
      where: { projectId },
    });

    const required = tasks.filter((t) => t.isRequired);
    const completedRequired = required.filter(
      (t) => t.status === ImplTaskStatus.COMPLETED,
    );
    const blocked = tasks.filter((t) => t.status === ImplTaskStatus.BLOCKED);
    const now = new Date();
    const overdue = tasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < now &&
        t.status !== ImplTaskStatus.COMPLETED &&
        t.status !== ImplTaskStatus.SKIPPED,
    );

    // Base score: required completion percentage
    const taskCompletionRate =
      required.length > 0
        ? (completedRequired.length / required.length) * 100
        : 100;

    // Penalties
    const blockerPenalty = blocked.length * 5;
    const overduePenalty = overdue.length * 10;

    // Final score
    let score = taskCompletionRate - blockerPenalty - overduePenalty;
    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
      score,
      components: {
        taskCompletionRate: Math.round(taskCompletionRate),
        blockerPenalty,
        overduePenalty,
      },
      requiredTasks: {
        completed: completedRequired.length,
        total: required.length,
      },
      blockedTasks: blocked.length,
      overdueTasks: overdue.length,
    };
  }

  /**
   * Update the health score on the project record.
   * Called after task updates to keep score current.
   */
  async updateProjectHealthScore(projectId: string): Promise<number> {
    const health = await this.calculateProjectHealth(projectId);

    await this.prisma.implementationProject.update({
      where: { id: projectId },
      data: { healthScore: health.score },
    });

    return health.score;
  }

  /**
   * Bulk update tasks for a phase (e.g., mark all phase tasks complete).
   */
  async bulkUpdatePhase(
    projectId: string,
    phase: ImplementationPhase,
    status: ImplTaskStatus,
    completedById?: string,
  ): Promise<{ updatedCount: number }> {
    const data: Prisma.ImplementationTaskUpdateManyMutationInput = {
      status,
    };

    if (status === ImplTaskStatus.COMPLETED) {
      data.completedAt = new Date();
      if (completedById) {
        data.completedById = completedById;
      }
    }

    const result = await this.prisma.implementationTask.updateMany({
      where: { projectId, phase },
      data,
    });

    this.logger.log(
      `Bulk updated ${result.count} tasks in phase ${phase} for project ${projectId}`,
    );

    return { updatedCount: result.count };
  }
}
