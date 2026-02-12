import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ProjectGroup } from "@prisma/client";
import {
  CreateProjectGroupDto,
  UpdateProjectGroupDto,
} from "./dto/project-group.dto";
import {
  ProjectGroupCreatedEvent,
  ProjectGroupDeletedEvent,
} from "./events/project.events";

/**
 * ProjectGroupService manages project groups (sections) for Monday.com-style boards.
 *
 * Features:
 * - CRUD operations for groups
 * - Group reordering
 * - Handles task reassignment on delete
 */
@Injectable()
export class ProjectGroupService {
  private readonly logger = new Logger(ProjectGroupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new project group.
   */
  async create(
    orgId: string,
    projectId: string,
    userId: string,
    dto: CreateProjectGroupDto,
  ): Promise<ProjectGroup> {
    // Verify project exists and belongs to org
    const project = await this.prisma.milestone.findFirst({
      where: { id: projectId, organizationId: orgId },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    // Get max sort order
    const maxSortGroup = await this.prisma.projectGroup.findFirst({
      where: { milestoneId: projectId, organizationId: orgId },
      orderBy: { sortOrder: "desc" },
    });

    const sortOrder = dto.sortOrder ?? (maxSortGroup?.sortOrder ?? 0) + 1;

    const group = await this.prisma.projectGroup.create({
      data: {
        organizationId: orgId,
        milestoneId: projectId,
        name: dto.name,
        color: dto.color,
        sortOrder,
      },
    });

    // Emit event
    this.eventEmitter.emit(
      ProjectGroupCreatedEvent.eventName,
      new ProjectGroupCreatedEvent({
        organizationId: orgId,
        actorUserId: userId,
        actorType: "USER",
        groupId: group.id,
        milestoneId: projectId,
        name: dto.name,
      }),
    );

    this.logger.log(`Group created: ${group.id} - ${group.name}`);

    return group;
  }

  /**
   * Updates a project group.
   */
  async update(
    orgId: string,
    groupId: string,
    dto: UpdateProjectGroupDto,
  ): Promise<ProjectGroup> {
    const existing = await this.prisma.projectGroup.findFirst({
      where: { id: groupId, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException("Group not found");
    }

    const group = await this.prisma.projectGroup.update({
      where: { id: groupId },
      data: dto,
    });

    return group;
  }

  /**
   * Deletes a project group.
   * Tasks in the group will have their groupId set to null (ungrouped).
   */
  async delete(orgId: string, groupId: string, userId: string): Promise<void> {
    const existing = await this.prisma.projectGroup.findFirst({
      where: { id: groupId, organizationId: orgId },
      include: { milestone: true },
    });

    if (!existing) {
      throw new NotFoundException("Group not found");
    }

    // Move tasks to ungrouped (groupId = null)
    await this.prisma.projectTask.updateMany({
      where: { groupId, organizationId: orgId },
      data: { groupId: null },
    });

    // Delete the group
    await this.prisma.projectGroup.delete({
      where: { id: groupId },
    });

    // Emit event
    this.eventEmitter.emit(
      ProjectGroupDeletedEvent.eventName,
      new ProjectGroupDeletedEvent({
        organizationId: orgId,
        actorUserId: userId,
        actorType: "USER",
        groupId,
        milestoneId: existing.milestoneId,
        name: existing.name,
      }),
    );

    this.logger.log(`Group deleted: ${groupId}`);
  }

  /**
   * Reorders groups within a project.
   */
  async reorder(
    orgId: string,
    projectId: string,
    orderedIds: string[],
  ): Promise<void> {
    // Verify groups exist and belong to the project
    const groups = await this.prisma.projectGroup.findMany({
      where: {
        id: { in: orderedIds },
        organizationId: orgId,
        milestoneId: projectId,
      },
    });

    if (groups.length !== orderedIds.length) {
      throw new NotFoundException(
        "One or more groups not found in this project",
      );
    }

    // Update sort orders
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.projectGroup.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    this.logger.debug(
      `Reordered ${orderedIds.length} groups in project ${projectId}`,
    );
  }

  /**
   * Gets all groups for a project.
   */
  async list(orgId: string, projectId: string): Promise<ProjectGroup[]> {
    return this.prisma.projectGroup.findMany({
      where: {
        organizationId: orgId,
        milestoneId: projectId,
      },
      orderBy: { sortOrder: "asc" },
    });
  }
}
