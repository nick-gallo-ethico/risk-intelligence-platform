/**
 * NotificationService - Thin Coordinator for Notification Dispatch
 *
 * Coordinates NotificationRouterService and DeliveryDispatcherService.
 * Preserves public API for 13+ importing files.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationRouterService } from "./notification-router.service";
import { DeliveryDispatcherService } from "./delivery-dispatcher.service";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  InAppNotification,
} from "../entities/notification.types";
import { NotificationQueryDto } from "../dto/notification.dto";
import {
  QueueEmailParams,
  SendInAppParams,
  QueueForDigestParams,
  NotifyParams,
  PaginatedNotifications,
  NotificationItem,
} from "./notification.types";

// Re-export types for backward compatibility
export * from "./notification.types";
export { DispatchEmailParams, DispatchInAppParams } from "./delivery-dispatcher.service";
export { RoutingDecision, RecipientInfo, OrgInfo, RoutingParams } from "./notification-router.service";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly routerService: NotificationRouterService,
    private readonly dispatcherService: DeliveryDispatcherService,
  ) {}

  async queueEmail(params: QueueEmailParams): Promise<void> {
    const { organizationId, recipientUserId, category, templateId, context, entityType, entityId, isUrgent = false } = params;

    const prefs = await this.routerService.getEffectivePreferences(recipientUserId, organizationId, category);
    if (!this.routerService.shouldSendEmail(prefs, isUrgent)) {
      this.logger.debug(`Skipping email for user ${recipientUserId}: preference or quiet hours`);
      return;
    }

    const actualRecipientId = this.routerService.resolveActualRecipient(recipientUserId, prefs, isUrgent);
    const [recipientInfo, orgInfo] = await Promise.all([
      this.routerService.getRecipientInfo(actualRecipientId),
      this.routerService.getOrgInfo(organizationId),
    ]);

    if (!recipientInfo || !orgInfo) return;

    await this.dispatcherService.dispatchEmail({
      organizationId, recipientInfo, orgInfo, category, templateId, context, entityType, entityId, isUrgent,
    });
  }

  async sendInApp(params: SendInAppParams): Promise<InAppNotification | null> {
    const { organizationId, recipientUserId, category, title, body, entityType, entityId } = params;

    const prefs = await this.routerService.getEffectivePreferences(recipientUserId, organizationId, category);
    if (!this.routerService.shouldSendInApp(prefs)) {
      this.logger.debug(`Skipping in-app notification for user ${recipientUserId}: preference disabled`);
      return null;
    }

    return this.dispatcherService.dispatchInApp({ organizationId, recipientUserId, category, title, body, entityType, entityId });
  }

  async queueForDigest(params: QueueForDigestParams): Promise<void> {
    const { organizationId, userId, type, entityType, entityId, metadata } = params;
    await this.dispatcherService.dispatchToDigest({
      organizationId, userId, category: type,
      title: (metadata?.title as string) || "",
      body: metadata?.body as string | undefined,
      entityType, entityId, metadata,
    });
  }

  async notify(params: NotifyParams): Promise<void> {
    const { organizationId, recipientUserId, category, templateId, context, title, body, entityType, entityId, isUrgent = false } = params;

    const routing = await this.routerService.determineRouting({ organizationId, recipientUserId, category, isUrgent });

    if (routing.shouldBatchForDigest) {
      await this.queueForDigest({ organizationId, userId: recipientUserId, type: category, entityType, entityId, metadata: { title, body, ...context } });
      return;
    }

    const promises: Promise<void | InAppNotification | null>[] = [];
    if (routing.shouldSendEmail) {
      promises.push(this.queueEmail({ organizationId, recipientUserId, category, templateId, context, entityType, entityId, isUrgent }));
    }
    if (routing.shouldSendInApp) {
      promises.push(this.sendInApp({ organizationId, recipientUserId, category, title, body, entityType, entityId }));
    }
    await Promise.all(promises);
  }

  async getNotifications(organizationId: string, userId: string, query: NotificationQueryDto): Promise<PaginatedNotifications> {
    const { channel, type, isRead, limit = 20, offset = 0 } = query;
    const where: Record<string, unknown> = { organizationId, userId };
    if (channel) where.channel = channel;
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where, orderBy: { createdAt: "desc" }, take: limit, skip: offset,
        select: { id: true, channel: true, type: true, title: true, body: true, entityType: true, entityId: true, isRead: true, readAt: true, createdAt: true },
      }),
      this.prisma.notification.count({ where }),
      this.dispatcherService.getUnreadCount(organizationId, userId),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id, channel: n.channel as NotificationChannel, type: n.type as NotificationType, title: n.title,
        body: n.body || undefined, entityType: n.entityType || undefined, entityId: n.entityId || undefined,
        isRead: n.isRead, readAt: n.readAt || undefined, createdAt: n.createdAt,
      })),
      total, unreadCount,
    };
  }

  async markAsRead(organizationId: string, userId: string, notificationIds: string[]): Promise<void> {
    await this.prisma.notification.updateMany({ where: { organizationId, userId, id: { in: notificationIds } }, data: { isRead: true, readAt: new Date() } });
    const unreadCount = await this.dispatcherService.getUnreadCount(organizationId, userId);
    this.dispatcherService.emitUnreadCountUpdate(organizationId, userId, unreadCount);
    this.logger.debug(`Marked ${notificationIds.length} notifications as read for user ${userId}`);
  }

  async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    return this.dispatcherService.getUnreadCount(organizationId, userId);
  }

  async getRecentNotifications(organizationId: string, userId: string, limit = 20, since?: Date): Promise<InAppNotification[]> {
    const where: Record<string, unknown> = { organizationId, userId, channel: NotificationChannel.IN_APP };
    if (since) where.createdAt = { gt: since };

    const notifications = await this.prisma.notification.findMany({
      where, orderBy: { createdAt: "desc" }, take: limit,
      select: { id: true, type: true, title: true, body: true, entityType: true, entityId: true, isRead: true, createdAt: true },
    });

    return notifications.map((n) => ({
      id: n.id, type: n.type as NotificationCategory, title: n.title, body: n.body || undefined,
      entityType: n.entityType || undefined, entityId: n.entityId || undefined, isRead: n.isRead, createdAt: n.createdAt,
    }));
  }

  async markAllAsRead(organizationId: string, userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { organizationId, userId, channel: NotificationChannel.IN_APP, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    this.dispatcherService.emitUnreadCountUpdate(organizationId, userId, 0);
    this.logger.log(`Marked all (${result.count}) notifications as read for user ${userId}`);
    return result.count;
  }

  async archiveRead(organizationId: string, userId: string, olderThan: Date): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { organizationId, userId, isRead: true, readAt: { lt: olderThan }, status: { not: NotificationStatus.ARCHIVED } },
      data: { status: NotificationStatus.ARCHIVED },
    });
    this.logger.log(`Archived ${result.count} read notifications for user ${userId}`);
    return result.count;
  }

  async archiveNotification(organizationId: string, userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({ where: { id: notificationId, organizationId, userId } });
    if (!notification) throw new NotFoundException("Notification not found");
    await this.prisma.notification.update({ where: { id: notificationId }, data: { status: NotificationStatus.ARCHIVED } });
    this.logger.debug(`Archived notification ${notificationId} for user ${userId}`);
  }

  async getNotification(organizationId: string, userId: string, notificationId: string): Promise<NotificationItem | null> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, organizationId, userId },
      select: { id: true, channel: true, type: true, title: true, body: true, entityType: true, entityId: true, isRead: true, readAt: true, createdAt: true },
    });
    if (!notification) return null;
    return {
      id: notification.id, channel: notification.channel as NotificationChannel, type: notification.type as NotificationType,
      title: notification.title, body: notification.body || undefined, entityType: notification.entityType || undefined,
      entityId: notification.entityId || undefined, isRead: notification.isRead, readAt: notification.readAt || undefined, createdAt: notification.createdAt,
    };
  }
}
