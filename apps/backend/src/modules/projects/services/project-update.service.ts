import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MentionService } from "./mention.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class ProjectUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mentionService: MentionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get all updates for a task (top-level with nested replies and reactions)
   */
  async getTaskUpdates(organizationId: string, taskId: string) {
    const updates = await this.prisma.projectUpdate.findMany({
      where: {
        organizationId,
        taskId,
        parentUpdateId: null, // Only top-level updates
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reactions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            reactions: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return updates.map((u) => this.formatUpdate(u));
  }

  /**
   * Create a new update or reply
   */
  async createUpdate(
    organizationId: string,
    taskId: string,
    authorId: string,
    dto: {
      content: string;
      mentionedUserIds?: string[];
      parentUpdateId?: string;
    },
  ) {
    // Verify task exists
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException("Task not found");

    // Verify parent update exists if provided
    if (dto.parentUpdateId) {
      const parent = await this.prisma.projectUpdate.findFirst({
        where: { id: dto.parentUpdateId, organizationId, taskId },
      });
      if (!parent) throw new NotFoundException("Parent update not found");
    }

    // Extract mentions from content
    const mentionedUserIds =
      dto.mentionedUserIds || this.mentionService.extractMentions(dto.content);

    const update = await this.prisma.projectUpdate.create({
      data: {
        organizationId,
        taskId,
        content: dto.content,
        mentionedUserIds,
        parentUpdateId: dto.parentUpdateId || null,
        authorId,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reactions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            reactions: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    // Emit event for notification dispatch
    this.eventEmitter.emit("project.update.created", {
      organizationId,
      taskId,
      updateId: update.id,
      authorId,
      mentionedUserIds,
      milestoneId: task.milestoneId,
    });

    return this.formatUpdate(update);
  }

  /**
   * Edit an existing update (author only)
   */
  async editUpdate(
    organizationId: string,
    updateId: string,
    authorId: string,
    dto: { content: string; mentionedUserIds?: string[] },
  ) {
    const existing = await this.prisma.projectUpdate.findFirst({
      where: { id: updateId, organizationId },
    });
    if (!existing) throw new NotFoundException("Update not found");
    if (existing.authorId !== authorId) {
      throw new ForbiddenException("Only the author can edit this update");
    }

    const mentionedUserIds =
      dto.mentionedUserIds || this.mentionService.extractMentions(dto.content);

    const update = await this.prisma.projectUpdate.update({
      where: { id: updateId },
      data: {
        content: dto.content,
        mentionedUserIds,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reactions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            reactions: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    return this.formatUpdate(update);
  }

  /**
   * Delete an update (author only)
   */
  async deleteUpdate(organizationId: string, updateId: string, userId: string) {
    const existing = await this.prisma.projectUpdate.findFirst({
      where: { id: updateId, organizationId },
    });
    if (!existing) throw new NotFoundException("Update not found");
    if (existing.authorId !== userId) {
      throw new ForbiddenException("Only the author can delete this update");
    }

    await this.prisma.projectUpdate.delete({
      where: { id: updateId },
    });
  }

  /**
   * Add a reaction to an update
   */
  async addReaction(
    organizationId: string,
    updateId: string,
    userId: string,
    emoji: string,
  ) {
    const update = await this.prisma.projectUpdate.findFirst({
      where: { id: updateId, organizationId },
    });
    if (!update) throw new NotFoundException("Update not found");

    // Upsert - unique constraint prevents duplicates
    await this.prisma.projectUpdateReaction.upsert({
      where: {
        updateId_userId_emoji: { updateId, userId, emoji },
      },
      create: {
        organizationId,
        updateId,
        userId,
        emoji,
      },
      update: {}, // No-op if already exists
    });
  }

  /**
   * Remove a reaction from an update
   */
  async removeReaction(
    organizationId: string,
    updateId: string,
    userId: string,
    emoji: string,
  ) {
    await this.prisma.projectUpdateReaction.deleteMany({
      where: { organizationId, updateId, userId, emoji },
    });
  }

  private formatUpdate(update: any) {
    const author = update.author
      ? {
          id: update.author.id,
          name: `${update.author.firstName} ${update.author.lastName}`.trim(),
          email: update.author.email,
        }
      : null;

    return {
      id: update.id,
      taskId: update.taskId,
      content: update.content,
      mentionedUserIds: update.mentionedUserIds,
      parentUpdateId: update.parentUpdateId,
      isPinned: update.isPinned,
      author,
      authorId: update.authorId,
      reactions: (update.reactions || []).map((r: any) => ({
        id: r.id,
        emoji: r.emoji,
        userId: r.userId,
        userName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : "",
      })),
      replies: (update.replies || []).map((r: any) => this.formatUpdate(r)),
      createdAt: update.createdAt,
      updatedAt: update.updatedAt,
    };
  }
}
