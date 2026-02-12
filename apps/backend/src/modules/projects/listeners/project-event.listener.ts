/**
 * ProjectEventListener - Event handlers for project notifications.
 *
 * Listens to project events and dispatches notifications:
 * 1. Task Assignment - notify assignee
 * 2. @Mention - notify mentioned users
 * 3. Comment/Update Added - notify task watchers
 * 4. Task Status Change - notify task watchers
 * 5. Task Completed - notify project owner, check project completion
 *
 * All handlers use NotificationService.notify() for preference-aware dispatch.
 */

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { NotificationService } from "../../notifications/services/notification.service";
import {
  NotificationCategory,
  NotificationType,
} from "../../notifications/entities/notification.types";
import { MentionService } from "../services/mention.service";
import {
  ProjectTaskCreatedEvent,
  ProjectTaskUpdatedEvent,
  ProjectTaskCompletedEvent,
} from "../events/project.events";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  ProjectTaskStatus,
} from "@prisma/client";

/**
 * Event payload for task assignment.
 */
export interface TaskAssignedEventPayload {
  taskId: string;
  projectId: string;
  assigneeId: string;
  assignedById: string;
  organizationId: string;
  taskTitle: string;
  projectName: string;
}

/**
 * Event payload for @mention notifications.
 */
export interface TaskMentionedEventPayload {
  taskId: string;
  projectId: string;
  updateId: string;
  mentionedUserIds: string[];
  mentionedById: string;
  organizationId: string;
  taskTitle: string;
  mentionerName: string;
}

/**
 * Event payload for task update/comment.
 */
export interface TaskUpdateCreatedEventPayload {
  taskId: string;
  projectId: string;
  updateId: string;
  authorId: string;
  authorName: string;
  organizationId: string;
  taskTitle: string;
  content?: string;
}

/**
 * Event payload for status change.
 */
export interface TaskStatusChangedEventPayload {
  taskId: string;
  projectId: string;
  oldStatus: string;
  newStatus: string;
  changedById: string;
  organizationId: string;
  taskTitle: string;
}

/**
 * Event payload for task completion.
 */
export interface TaskCompletedEventPayload {
  taskId: string;
  projectId: string;
  completedById: string;
  organizationId: string;
  taskTitle: string;
  projectName: string;
}

@Injectable()
export class ProjectEventListener {
  private readonly logger = new Logger(ProjectEventListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
    private readonly mentionService: MentionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Event 1: Task Assignment
   * Notifies the assignee when they are assigned to a task.
   * Also creates a task subscription for the assignee.
   */
  @OnEvent("project.task.assigned", { async: true })
  async handleTaskAssigned(payload: TaskAssignedEventPayload): Promise<void> {
    try {
      const {
        taskId,
        projectId,
        assigneeId,
        assignedById,
        organizationId,
        taskTitle,
        projectName,
      } = payload;

      // Skip self-assignment
      if (assigneeId === assignedById) {
        this.logger.debug(
          `Skipping self-assignment notification for task ${taskId}`,
        );
        return;
      }

      // Get assigner name for notification
      const assigner = await this.prisma.user.findUnique({
        where: { id: assignedById },
        select: { firstName: true, lastName: true },
      });
      const assignerName = assigner
        ? `${assigner.firstName} ${assigner.lastName}`
        : "Someone";

      // Send notification via NotificationService
      await this.notificationService.notify({
        organizationId,
        recipientUserId: assigneeId,
        category: "ASSIGNMENT" as NotificationCategory,
        type: NotificationType.ASSIGNMENT,
        templateId: "project/task-assigned",
        title: `You were assigned to "${taskTitle}" in ${projectName}`,
        body: `${assignerName} assigned you to this task.`,
        context: {
          taskId,
          projectId,
          taskTitle,
          projectName,
          assignerName,
          link: `/projects/${projectId}?task=${taskId}`,
        },
        entityType: "PROJECT_TASK",
        entityId: taskId,
      });

      // Log audit entry
      await this.auditService.log({
        organizationId,
        entityType: AuditEntityType.PROJECT_TASK,
        entityId: taskId,
        action: "notification_sent",
        actionCategory: AuditActionCategory.SYSTEM,
        actionDescription: `Assignment notification sent to user for task "${taskTitle}"`,
        actorUserId: assignedById,
        actorType: ActorType.USER,
        context: { notificationType: "assignment", assigneeId },
      });

      this.logger.debug(
        `Assignment notification sent for task ${taskId} to user ${assigneeId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle task assignment event: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Event 2: @Mention
   * Notifies users when they are mentioned in a task update.
   */
  @OnEvent("project.task.mentioned", { async: true })
  async handleTaskMentioned(payload: TaskMentionedEventPayload): Promise<void> {
    try {
      const {
        taskId,
        projectId,
        updateId,
        mentionedUserIds,
        mentionedById,
        organizationId,
        taskTitle,
        mentionerName,
      } = payload;

      if (!mentionedUserIds || mentionedUserIds.length === 0) {
        return;
      }

      // Validate mentioned users exist in organization
      const validUserIds = await this.mentionService.validateMentions(
        mentionedUserIds,
        organizationId,
      );

      // Send notifications to each mentioned user (except self-mention)
      const notificationPromises = validUserIds
        .filter((userId) => userId !== mentionedById)
        .map((userId) =>
          this.notificationService.notify({
            organizationId,
            recipientUserId: userId,
            category: "MENTION" as NotificationCategory,
            type: NotificationType.MENTION,
            templateId: "project/task-mentioned",
            title: `${mentionerName} mentioned you in "${taskTitle}"`,
            body: `You were mentioned in a task update.`,
            context: {
              taskId,
              projectId,
              updateId,
              taskTitle,
              mentionerName,
              link: `/projects/${projectId}?task=${taskId}&tab=updates`,
            },
            entityType: "PROJECT_TASK",
            entityId: taskId,
          }),
        );

      await Promise.all(notificationPromises);

      // Log audit entry
      await this.auditService.log({
        organizationId,
        entityType: AuditEntityType.PROJECT_TASK,
        entityId: taskId,
        action: "mentions_notified",
        actionCategory: AuditActionCategory.SYSTEM,
        actionDescription: `Mention notifications sent to ${validUserIds.length} user(s) for task "${taskTitle}"`,
        actorUserId: mentionedById,
        actorType: ActorType.USER,
        context: {
          notificationType: "mention",
          mentionedUserIds: validUserIds,
          updateId,
        },
      });

      this.logger.debug(
        `Mention notifications sent for task ${taskId} to ${validUserIds.length} user(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle task mention event: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Event 3: Comment/Update Added
   * Notifies task watchers (subscribers) when a new update is posted.
   */
  @OnEvent("project.task.update.created", { async: true })
  async handleUpdateCreated(
    payload: TaskUpdateCreatedEventPayload,
  ): Promise<void> {
    try {
      const {
        taskId,
        projectId,
        updateId,
        authorId,
        authorName,
        organizationId,
        taskTitle,
      } = payload;

      // Get task watchers: assignee + anyone who has commented on the task
      const task = await this.prisma.projectTask.findUnique({
        where: { id: taskId },
        select: { assigneeId: true, createdById: true },
      });

      if (!task) {
        this.logger.warn(`Task not found for update notification: ${taskId}`);
        return;
      }

      // Collect subscribers: assignee, creator, and previous commenters
      const subscriberIds = new Set<string>();

      if (task.assigneeId) {
        subscriberIds.add(task.assigneeId);
      }
      if (task.createdById) {
        subscriberIds.add(task.createdById);
      }

      // Remove the author (don't notify about their own update)
      subscriberIds.delete(authorId);

      if (subscriberIds.size === 0) {
        return;
      }

      // Send notifications to each subscriber
      const notificationPromises = Array.from(subscriberIds).map((userId) =>
        this.notificationService.notify({
          organizationId,
          recipientUserId: userId,
          category: "COMMENT" as NotificationCategory,
          type: NotificationType.COMMENT,
          templateId: "project/task-update",
          title: `${authorName} posted an update on "${taskTitle}"`,
          body: `A new update was posted on a task you're watching.`,
          context: {
            taskId,
            projectId,
            updateId,
            taskTitle,
            authorName,
            link: `/projects/${projectId}?task=${taskId}&tab=updates`,
          },
          entityType: "PROJECT_TASK",
          entityId: taskId,
        }),
      );

      await Promise.all(notificationPromises);

      this.logger.debug(
        `Update notifications sent for task ${taskId} to ${subscriberIds.size} subscriber(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle task update created event: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Event 4: Task Status Change
   * Notifies task watchers when the status changes.
   */
  @OnEvent("project.task.status.changed", { async: true })
  async handleStatusChanged(
    payload: TaskStatusChangedEventPayload,
  ): Promise<void> {
    try {
      const {
        taskId,
        projectId,
        oldStatus,
        newStatus,
        changedById,
        organizationId,
        taskTitle,
      } = payload;

      // Get task details including assignee and creator
      const task = await this.prisma.projectTask.findUnique({
        where: { id: taskId },
        select: {
          assigneeId: true,
          createdById: true,
          milestone: { select: { ownerId: true, name: true } },
        },
      });

      if (!task) {
        this.logger.warn(
          `Task not found for status change notification: ${taskId}`,
        );
        return;
      }

      // Get changer name for notification
      const changer = await this.prisma.user.findUnique({
        where: { id: changedById },
        select: { firstName: true, lastName: true },
      });
      const changerName = changer
        ? `${changer.firstName} ${changer.lastName}`
        : "Someone";

      // Collect subscribers: assignee, creator, project owner
      const subscriberIds = new Set<string>();

      if (task.assigneeId) {
        subscriberIds.add(task.assigneeId);
      }
      if (task.createdById) {
        subscriberIds.add(task.createdById);
      }
      if (task.milestone?.ownerId) {
        subscriberIds.add(task.milestone.ownerId);
      }

      // Remove the person who made the change
      subscriberIds.delete(changedById);

      if (subscriberIds.size === 0) {
        return;
      }

      // Format status for display
      const formattedStatus = newStatus.replace(/_/g, " ").toLowerCase();

      // Send notifications to each subscriber
      const notificationPromises = Array.from(subscriberIds).map((userId) =>
        this.notificationService.notify({
          organizationId,
          recipientUserId: userId,
          category: "STATUS_UPDATE" as NotificationCategory,
          type: NotificationType.STATUS_UPDATE,
          templateId: "project/task-status-changed",
          title: `"${taskTitle}" status changed to ${formattedStatus}`,
          body: `${changerName} changed the status from ${oldStatus.replace(/_/g, " ").toLowerCase()} to ${formattedStatus}.`,
          context: {
            taskId,
            projectId,
            taskTitle,
            oldStatus,
            newStatus,
            changerName,
            link: `/projects/${projectId}?task=${taskId}`,
          },
          entityType: "PROJECT_TASK",
          entityId: taskId,
        }),
      );

      await Promise.all(notificationPromises);

      this.logger.debug(
        `Status change notifications sent for task ${taskId} to ${subscriberIds.size} subscriber(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle task status changed event: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Event 5: Task Completed
   * Notifies project owner when a task is completed.
   * Also checks if all tasks are done and emits project.completed event.
   */
  @OnEvent("project.task.completed", { async: true })
  async handleTaskCompleted(payload: TaskCompletedEventPayload): Promise<void> {
    try {
      const {
        taskId,
        projectId,
        completedById,
        organizationId,
        taskTitle,
        projectName,
      } = payload;

      // Get project owner
      const project = await this.prisma.milestone.findUnique({
        where: { id: projectId },
        select: { ownerId: true, name: true },
      });

      if (!project) {
        this.logger.warn(
          `Project not found for completion notification: ${projectId}`,
        );
        return;
      }

      // Get completer name
      const completer = await this.prisma.user.findUnique({
        where: { id: completedById },
        select: { firstName: true, lastName: true },
      });
      const completerName = completer
        ? `${completer.firstName} ${completer.lastName}`
        : "Someone";

      // Notify project owner (if not the completer)
      if (project.ownerId && project.ownerId !== completedById) {
        await this.notificationService.notify({
          organizationId,
          recipientUserId: project.ownerId,
          category: "COMPLETION" as NotificationCategory,
          type: NotificationType.COMPLETION,
          templateId: "project/task-completed",
          title: `"${taskTitle}" was completed in ${projectName}`,
          body: `${completerName} marked this task as done.`,
          context: {
            taskId,
            projectId,
            taskTitle,
            projectName,
            completerName,
            link: `/projects/${projectId}?task=${taskId}`,
          },
          entityType: "PROJECT_TASK",
          entityId: taskId,
        });
      }

      // Check if all tasks in project are done
      await this.checkProjectCompletion(
        projectId,
        organizationId,
        completedById,
      );

      this.logger.debug(`Completion notification sent for task ${taskId}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle task completed event: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Check if all tasks in a project are completed.
   * If so, emit a project.completed event.
   */
  private async checkProjectCompletion(
    projectId: string,
    organizationId: string,
    completedById: string,
  ): Promise<void> {
    try {
      // Count incomplete tasks
      const incompleteTasks = await this.prisma.projectTask.count({
        where: {
          milestoneId: projectId,
          organizationId,
          status: { not: ProjectTaskStatus.DONE },
        },
      });

      if (incompleteTasks === 0) {
        // All tasks are done - emit project completed event
        this.eventEmitter.emit("project.completed", {
          projectId,
          organizationId,
          completedById,
        });

        this.logger.log(`All tasks completed for project ${projectId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to check project completion: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Listen for the existing ProjectTaskUpdatedEvent to detect assignment changes.
   * Emits project.task.assigned event when assigneeId changes.
   */
  @OnEvent(ProjectTaskUpdatedEvent.eventName, { async: true })
  async handleTaskUpdated(event: ProjectTaskUpdatedEvent): Promise<void> {
    try {
      // Check if assigneeId changed
      if (event.changes.assigneeId) {
        const newAssigneeId = event.changes.assigneeId.new as string | null;
        const oldAssigneeId = event.changes.assigneeId.old as string | null;

        if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
          // Get task and project details for notification
          const task = await this.prisma.projectTask.findUnique({
            where: { id: event.taskId },
            select: {
              title: true,
              milestone: { select: { name: true } },
            },
          });

          if (task) {
            this.eventEmitter.emit("project.task.assigned", {
              taskId: event.taskId,
              projectId: event.milestoneId,
              assigneeId: newAssigneeId,
              assignedById: event.actorUserId,
              organizationId: event.organizationId,
              taskTitle: task.title,
              projectName: task.milestone.name,
            } as TaskAssignedEventPayload);
          }
        }
      }

      // Check if status changed
      if (event.changes.status) {
        const newStatus = event.changes.status.new as string;
        const oldStatus = event.changes.status.old as string;

        // Get task details
        const task = await this.prisma.projectTask.findUnique({
          where: { id: event.taskId },
          select: { title: true },
        });

        if (task) {
          this.eventEmitter.emit("project.task.status.changed", {
            taskId: event.taskId,
            projectId: event.milestoneId,
            oldStatus,
            newStatus,
            changedById: event.actorUserId,
            organizationId: event.organizationId,
            taskTitle: task.title,
          } as TaskStatusChangedEventPayload);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle task updated event: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Listen for the existing ProjectTaskCompletedEvent to dispatch completion notifications.
   */
  @OnEvent(ProjectTaskCompletedEvent.eventName, { async: true })
  async handleExistingTaskCompleted(
    event: ProjectTaskCompletedEvent,
  ): Promise<void> {
    try {
      // Get project details
      const task = await this.prisma.projectTask.findUnique({
        where: { id: event.taskId },
        select: {
          milestone: { select: { name: true } },
        },
      });

      if (task) {
        this.eventEmitter.emit("project.task.completed", {
          taskId: event.taskId,
          projectId: event.milestoneId,
          completedById: event.actorUserId,
          organizationId: event.organizationId,
          taskTitle: event.title,
          projectName: task.milestone.name,
        } as TaskCompletedEventPayload);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle existing task completed event: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
