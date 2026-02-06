/**
 * ImplementationService - Project Lifecycle Management
 *
 * Manages implementation projects for client onboarding:
 * - Project creation with auto-generated checklists
 * - Project CRUD operations
 * - Phase transitions with activity logging
 * - Blocker management
 *
 * This is an internal operations service (not tenant-scoped).
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Prisma,
  ImplementationProject,
  ImplementationPhase,
  ProjectStatus,
  BlockerStatus,
  ImplActivityType,
  ImplementationBlocker,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ChecklistService } from "./checklist.service";
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateBlockerDto,
  UpdateBlockerDto,
  ListProjectsQueryDto,
  ProjectListResponse,
} from "./dto/implementation.dto";

/**
 * Project with all relations loaded
 */
export interface ImplementationProjectFull extends ImplementationProject {
  organization: {
    id: string;
    name: string;
  };
  tasks: any[];
  blockers: any[];
  activities: any[];
}

@Injectable()
export class ImplementationService {
  private readonly logger = new Logger(ImplementationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checklistService: ChecklistService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new implementation project with auto-generated checklist.
   *
   * Flow:
   * 1. Validate organization exists
   * 2. Create project record
   * 3. Generate checklist from template
   * 4. Calculate initial health score
   * 5. Emit project created event
   */
  async createProject(
    dto: CreateProjectDto,
    createdById: string,
  ): Promise<ImplementationProjectFull> {
    // Validate organization exists
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.clientOrganizationId },
    });

    if (!org) {
      throw new NotFoundException(
        `Client organization ${dto.clientOrganizationId} not found`,
      );
    }

    // Check for existing active project for this org
    const existing = await this.prisma.implementationProject.findFirst({
      where: {
        clientOrganizationId: dto.clientOrganizationId,
        status: {
          notIn: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Organization ${org.name} already has an active implementation project`,
      );
    }

    this.logger.log(
      `Creating ${dto.type} implementation project for ${org.name}`,
    );

    // Create project
    const project = await this.prisma.implementationProject.create({
      data: {
        clientOrganizationId: dto.clientOrganizationId,
        type: dto.type,
        leadImplementerId: dto.leadImplementerId,
        assignedUserIds: dto.assignedUserIds ?? [dto.leadImplementerId],
        targetGoLiveDate: dto.targetGoLiveDate
          ? new Date(dto.targetGoLiveDate)
          : null,
        kickoffDate: dto.kickoffDate ? new Date(dto.kickoffDate) : null,
        clientVisibleNotes: dto.clientVisibleNotes ?? null,
        status: ProjectStatus.NOT_STARTED,
        currentPhase: ImplementationPhase.DISCOVERY,
      },
    });

    // Create checklist from template
    const { taskCount } = await this.checklistService.createFromTemplate(
      project.id,
      dto.type,
    );

    this.logger.log(
      `Created ${taskCount} checklist tasks for project ${project.id}`,
    );

    // Calculate initial health score (should be 0% since no tasks complete)
    const health = await this.checklistService.calculateProjectHealth(
      project.id,
    );
    await this.prisma.implementationProject.update({
      where: { id: project.id },
      data: { healthScore: health.score },
    });

    // Log creation activity
    await this.prisma.implementationActivity.create({
      data: {
        projectId: project.id,
        type: ImplActivityType.NOTE,
        subject: "Project created",
        content: `Implementation project created for ${org.name} using ${dto.type} template`,
        isAutoLogged: true,
        createdById,
      },
    });

    // Emit event
    this.eventEmitter.emit("implementation.project.created", {
      projectId: project.id,
      type: dto.type,
      organizationId: dto.clientOrganizationId,
      organizationName: org.name,
    });

    return this.getProject(project.id);
  }

  /**
   * Get a project with all relations.
   */
  async getProject(id: string): Promise<ImplementationProjectFull> {
    const project = await this.prisma.implementationProject.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        tasks: {
          orderBy: { sortOrder: "asc" },
        },
        blockers: {
          where: { status: { not: BlockerStatus.RESOLVED } },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project as ImplementationProjectFull;
  }

  /**
   * Update a project.
   */
  async updateProject(
    id: string,
    dto: UpdateProjectDto,
    updatedById: string,
  ): Promise<ImplementationProjectFull> {
    // Verify project exists
    const existing = await this.prisma.implementationProject.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    const data: Prisma.ImplementationProjectUpdateInput = {};

    if (dto.status !== undefined) data.status = dto.status;
    if (dto.currentPhase !== undefined) data.currentPhase = dto.currentPhase;
    if (dto.leadImplementerId !== undefined)
      data.leadImplementerId = dto.leadImplementerId;
    if (dto.assignedUserIds !== undefined)
      data.assignedUserIds = dto.assignedUserIds;
    if (dto.targetGoLiveDate !== undefined)
      data.targetGoLiveDate = dto.targetGoLiveDate
        ? new Date(dto.targetGoLiveDate)
        : null;
    if (dto.kickoffDate !== undefined)
      data.kickoffDate = dto.kickoffDate ? new Date(dto.kickoffDate) : null;
    if (dto.clientVisibleNotes !== undefined)
      data.clientVisibleNotes = dto.clientVisibleNotes;

    await this.prisma.implementationProject.update({
      where: { id },
      data,
    });

    // Log status change if applicable
    if (dto.status && dto.status !== existing.status) {
      await this.prisma.implementationActivity.create({
        data: {
          projectId: id,
          type: ImplActivityType.NOTE,
          subject: "Status changed",
          content: `Project status changed from ${existing.status} to ${dto.status}`,
          isAutoLogged: true,
          createdById: updatedById,
        },
      });
    }

    return this.getProject(id);
  }

  /**
   * List projects with filtering and pagination.
   */
  async listProjects(
    query: ListProjectsQueryDto,
  ): Promise<ProjectListResponse> {
    const where: Prisma.ImplementationProjectWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.leadImplementerId)
      where.leadImplementerId = query.leadImplementerId;
    if (query.clientOrganizationId)
      where.clientOrganizationId = query.clientOrganizationId;

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.implementationProject.findMany({
        where,
        include: {
          organization: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              tasks: true,
              blockers: { where: { status: BlockerStatus.OPEN } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.implementationProject.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  /**
   * Transition a project to a new phase.
   * Logs the transition to the activity table.
   */
  async transitionPhase(
    projectId: string,
    newPhase: ImplementationPhase,
    userId: string,
  ): Promise<void> {
    const project = await this.prisma.implementationProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const oldPhase = project.currentPhase;

    if (oldPhase === newPhase) {
      this.logger.warn(`Project ${projectId} already in phase ${newPhase}`);
      return;
    }

    this.logger.log(
      `Transitioning project ${projectId} from ${oldPhase} to ${newPhase}`,
    );

    // Update phase and log in transaction
    await this.prisma.$transaction([
      this.prisma.implementationProject.update({
        where: { id: projectId },
        data: {
          currentPhase: newPhase,
          // Auto-update status if moving from NOT_STARTED
          status:
            project.status === ProjectStatus.NOT_STARTED
              ? ProjectStatus.IN_PROGRESS
              : project.status,
        },
      }),
      this.prisma.implementationActivity.create({
        data: {
          projectId,
          type: ImplActivityType.PHASE_TRANSITION,
          subject: `Phase transition: ${oldPhase} -> ${newPhase}`,
          content: `Project moved from ${oldPhase} phase to ${newPhase} phase`,
          isAutoLogged: true,
          createdById: userId,
        },
      }),
    ]);

    // Emit event for other services
    this.eventEmitter.emit("implementation.phase.changed", {
      projectId,
      oldPhase,
      newPhase,
      changedBy: userId,
    });
  }

  /**
   * Create a blocker for a project.
   */
  async createBlocker(
    projectId: string,
    dto: CreateBlockerDto,
    createdById: string,
  ): Promise<ImplementationBlocker> {
    // Verify project exists
    const project = await this.prisma.implementationProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Verify task exists if provided
    if (dto.taskId) {
      const task = await this.prisma.implementationTask.findUnique({
        where: { id: dto.taskId },
      });
      if (!task || task.projectId !== projectId) {
        throw new BadRequestException(
          `Task ${dto.taskId} not found in project`,
        );
      }
    }

    const blocker = await this.prisma.implementationBlocker.create({
      data: {
        projectId,
        taskId: dto.taskId ?? null,
        title: dto.title,
        description: dto.description ?? null,
        category: dto.category,
        status: BlockerStatus.OPEN,
      },
    });

    // Log activity
    await this.prisma.implementationActivity.create({
      data: {
        projectId,
        type: ImplActivityType.BLOCKER_CREATED,
        subject: `Blocker created: ${dto.title}`,
        content: dto.description ?? `New ${dto.category} blocker reported`,
        isAutoLogged: true,
        createdById,
      },
    });

    // Update health score (blockers affect score)
    await this.checklistService.updateProjectHealthScore(projectId);

    return blocker;
  }

  /**
   * Update a blocker (e.g., snooze or resolve).
   */
  async updateBlocker(
    blockerId: string,
    dto: UpdateBlockerDto,
    updatedById: string,
  ): Promise<ImplementationBlocker> {
    const existing = await this.prisma.implementationBlocker.findUnique({
      where: { id: blockerId },
    });

    if (!existing) {
      throw new NotFoundException(`Blocker ${blockerId} not found`);
    }

    const data: Prisma.ImplementationBlockerUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === BlockerStatus.RESOLVED) {
        data.resolvedAt = new Date();
        data.resolvedById = updatedById;
      }
      if (dto.status === BlockerStatus.SNOOZED) {
        if (!dto.snoozeUntil) {
          throw new BadRequestException("snoozeUntil required when snoozing");
        }
        if (!dto.snoozeReason) {
          throw new BadRequestException("snoozeReason required when snoozing");
        }
      }
    }
    if (dto.snoozeUntil !== undefined)
      data.snoozeUntil = new Date(dto.snoozeUntil);
    if (dto.snoozeReason !== undefined) data.snoozeReason = dto.snoozeReason;
    if (dto.resolutionNotes !== undefined)
      data.resolutionNotes = dto.resolutionNotes;

    const blocker = await this.prisma.implementationBlocker.update({
      where: { id: blockerId },
      data,
    });

    // Log resolution
    if (dto.status === BlockerStatus.RESOLVED) {
      await this.prisma.implementationActivity.create({
        data: {
          projectId: existing.projectId,
          type: ImplActivityType.BLOCKER_RESOLVED,
          subject: `Blocker resolved: ${existing.title}`,
          content: dto.resolutionNotes ?? "Blocker marked as resolved",
          isAutoLogged: true,
          createdById: updatedById,
        },
      });

      // Update health score
      await this.checklistService.updateProjectHealthScore(existing.projectId);
    }

    return blocker;
  }

  /**
   * Get all blockers for a project.
   */
  async getProjectBlockers(
    projectId: string,
    includeResolved = false,
  ): Promise<ImplementationBlocker[]> {
    const where: Prisma.ImplementationBlockerWhereInput = { projectId };

    if (!includeResolved) {
      where.status = { not: BlockerStatus.RESOLVED };
    }

    return this.prisma.implementationBlocker.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Mark a project as completed (go-live achieved).
   */
  async completeProject(
    projectId: string,
    userId: string,
  ): Promise<ImplementationProjectFull> {
    const project = await this.prisma.implementationProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.implementationProject.update({
        where: { id: projectId },
        data: {
          status: ProjectStatus.COMPLETED,
          actualGoLiveDate: new Date(),
        },
      }),
      this.prisma.implementationActivity.create({
        data: {
          projectId,
          type: ImplActivityType.PHASE_TRANSITION,
          subject: "Project completed",
          content: "Implementation completed successfully - client is live!",
          isAutoLogged: true,
          createdById: userId,
        },
      }),
    ]);

    this.eventEmitter.emit("implementation.project.completed", {
      projectId,
      completedBy: userId,
    });

    return this.getProject(projectId);
  }
}
