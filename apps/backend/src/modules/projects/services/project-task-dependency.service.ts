import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { TaskDependencyType } from "@prisma/client";

@Injectable()
export class ProjectTaskDependencyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all dependencies for a task (both directions)
   */
  async getTaskDependencies(organizationId: string, taskId: string) {
    const [dependsOn, blocking] = await Promise.all([
      // Tasks this task depends on
      this.prisma.projectTaskDependency.findMany({
        where: { organizationId, taskId },
        include: {
          dependsOnTask: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      // Tasks that depend on this task (blocked by this task)
      this.prisma.projectTaskDependency.findMany({
        where: { organizationId, dependsOnTaskId: taskId },
        include: {
          task: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return {
      dependsOn: dependsOn.map((d) => ({
        id: d.id,
        taskId: d.taskId,
        dependsOnTaskId: d.dependsOnTaskId,
        dependsOnTask: d.dependsOnTask,
        type: d.type,
        isViolated: this.isDependencyViolated(d.type, d.dependsOnTask.status),
        createdAt: d.createdAt,
      })),
      blocking: blocking.map((d) => ({
        id: d.id,
        taskId: d.taskId,
        dependsOnTaskId: d.dependsOnTaskId,
        dependsOnTask: {
          id: d.task.id,
          title: d.task.title,
          status: d.task.status,
        },
        type: d.type,
        isViolated: false,
        createdAt: d.createdAt,
      })),
    };
  }

  /**
   * Create a task dependency
   */
  async createDependency(
    organizationId: string,
    taskId: string,
    dependsOnTaskId: string,
    type: string,
    createdById: string,
  ) {
    // Prevent self-dependency
    if (taskId === dependsOnTaskId) {
      throw new BadRequestException("A task cannot depend on itself");
    }

    // Verify both tasks exist and belong to same org
    const [task, dependsOnTask] = await Promise.all([
      this.prisma.projectTask.findFirst({
        where: { id: taskId, organizationId },
      }),
      this.prisma.projectTask.findFirst({
        where: { id: dependsOnTaskId, organizationId },
      }),
    ]);
    if (!task) throw new NotFoundException("Task not found");
    if (!dependsOnTask)
      throw new NotFoundException("Dependency task not found");

    // Check for circular dependency (simple check: reverse dependency exists)
    const reverse = await this.prisma.projectTaskDependency.findFirst({
      where: {
        organizationId,
        taskId: dependsOnTaskId,
        dependsOnTaskId: taskId,
      },
    });
    if (reverse) {
      throw new BadRequestException(
        "Circular dependency: the target task already depends on this task",
      );
    }

    const depType =
      (type as TaskDependencyType) || TaskDependencyType.FINISH_TO_START;

    const dependency = await this.prisma.projectTaskDependency.create({
      data: {
        organizationId,
        taskId,
        dependsOnTaskId,
        type: depType,
        createdById,
      },
      include: {
        dependsOnTask: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return {
      id: dependency.id,
      taskId: dependency.taskId,
      dependsOnTaskId: dependency.dependsOnTaskId,
      dependsOnTask: dependency.dependsOnTask,
      type: dependency.type,
      isViolated: this.isDependencyViolated(
        dependency.type,
        dependency.dependsOnTask.status,
      ),
      createdAt: dependency.createdAt,
    };
  }

  /**
   * Delete a task dependency
   */
  async deleteDependency(organizationId: string, dependencyId: string) {
    const existing = await this.prisma.projectTaskDependency.findFirst({
      where: { id: dependencyId, organizationId },
    });
    if (!existing) throw new NotFoundException("Dependency not found");

    await this.prisma.projectTaskDependency.delete({
      where: { id: dependencyId },
    });
  }

  /**
   * Check if a dependency is violated based on predecessor status
   */
  private isDependencyViolated(
    type: TaskDependencyType,
    predecessorStatus: string,
  ): boolean {
    // For FINISH_TO_START: violated if predecessor is not DONE/COMPLETED
    if (type === TaskDependencyType.FINISH_TO_START) {
      return !["DONE", "COMPLETED"].includes(predecessorStatus);
    }
    // For START_TO_START: violated if predecessor hasn't started
    if (type === TaskDependencyType.START_TO_START) {
      return predecessorStatus === "NOT_STARTED";
    }
    return false;
  }
}
