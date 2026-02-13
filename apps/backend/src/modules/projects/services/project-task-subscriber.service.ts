import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ProjectTaskSubscriberService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all subscribers for a task
   */
  async getTaskSubscribers(organizationId: string, taskId: string) {
    const subscribers = await this.prisma.projectTaskSubscriber.findMany({
      where: { organizationId, taskId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { subscribedAt: "asc" },
    });

    return subscribers.map((s) => ({
      id: s.id,
      taskId: s.taskId,
      user: {
        id: s.user.id,
        name: `${s.user.firstName} ${s.user.lastName}`.trim(),
        email: s.user.email,
      },
      userId: s.userId,
      isAutoSubscribed: s.isAutoSubscribed,
      subscribedAt: s.subscribedAt,
    }));
  }

  /**
   * Subscribe a user to a task
   */
  async subscribe(
    organizationId: string,
    taskId: string,
    userId: string,
    isAutoSubscribed = false,
  ) {
    // Verify task exists
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException("Task not found");

    // Upsert to handle duplicate subscriptions gracefully
    const subscriber = await this.prisma.projectTaskSubscriber.upsert({
      where: {
        taskId_userId: { taskId, userId },
      },
      create: {
        organizationId,
        taskId,
        userId,
        isAutoSubscribed,
      },
      update: {}, // No-op if already subscribed
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return {
      id: subscriber.id,
      taskId: subscriber.taskId,
      user: {
        id: subscriber.user.id,
        name: `${subscriber.user.firstName} ${subscriber.user.lastName}`.trim(),
        email: subscriber.user.email,
      },
      userId: subscriber.userId,
      isAutoSubscribed: subscriber.isAutoSubscribed,
      subscribedAt: subscriber.subscribedAt,
    };
  }

  /**
   * Unsubscribe a user from a task
   */
  async unsubscribe(organizationId: string, subscriberId: string) {
    const existing = await this.prisma.projectTaskSubscriber.findFirst({
      where: { id: subscriberId, organizationId },
    });
    if (!existing) throw new NotFoundException("Subscriber not found");

    await this.prisma.projectTaskSubscriber.delete({
      where: { id: subscriberId },
    });
  }
}
