/**
 * DeliveryDispatcherService - Notification Delivery Dispatch
 *
 * Handles actual delivery of notifications:
 * - Email queueing with pre-rendered templates
 * - In-app notification creation and WebSocket event emission
 * - Digest queue insertion for batch delivery
 *
 * Works with NotificationRouterService for routing decisions.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import {
  EmailTemplateService,
  EmailTemplateContext,
} from "./email-template.service";
import { EMAIL_QUEUE_NAME } from "../../jobs/queues/email.queue";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  InAppNotification,
} from "../entities/notification.types";
import { RecipientInfo, OrgInfo } from "./notification-router.service";

/**
 * Parameters for dispatching an email notification.
 */
export interface DispatchEmailParams {
  organizationId: string;
  recipientInfo: RecipientInfo;
  orgInfo: OrgInfo;
  category: NotificationCategory;
  templateId: string;
  context: EmailTemplateContext;
  entityType?: string;
  entityId?: string;
  isUrgent: boolean;
}

/**
 * Parameters for dispatching an in-app notification.
 */
export interface DispatchInAppParams {
  organizationId: string;
  recipientUserId: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Parameters for queueing a notification for daily digest.
 */
export interface DispatchDigestParams {
  organizationId: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Email job data structure for BullMQ.
 */
interface EmailJobData {
  organizationId: string;
  notificationId: string;
  templateId: string;
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class DeliveryDispatcherService {
  private readonly logger = new Logger(DeliveryDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: EmailTemplateService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
  ) {}

  /**
   * Dispatches an email notification.
   * Pre-renders the template and queues for delivery.
   *
   * @param params - Email dispatch parameters
   * @returns Created notification ID or null if skipped
   */
  async dispatchEmail(params: DispatchEmailParams): Promise<string | null> {
    const {
      organizationId,
      recipientInfo,
      orgInfo,
      category,
      templateId,
      context,
      entityType,
      entityId,
      isUrgent,
    } = params;

    // Build context with org and recipient info
    const fullContext: EmailTemplateContext = {
      ...context,
      org: {
        name: orgInfo.name,
        branding: orgInfo.branding as EmailTemplateContext["org"] extends {
          branding?: infer B;
        }
          ? B
          : undefined,
      },
      recipient: {
        name: recipientInfo.displayName,
        email: recipientInfo.email,
      },
      appUrl: process.env.APP_URL || "https://app.ethico.com",
    };

    // Pre-render template (per RESEARCH.md - don't render in queue worker)
    const { subject, html } = await this.templateService.render(
      templateId,
      fullContext,
      organizationId,
    );

    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        userId: recipientInfo.userId,
        channel: NotificationChannel.EMAIL,
        type: category as NotificationType,
        status: NotificationStatus.QUEUED,
        title: subject,
        entityType,
        entityId,
        templateId,
      },
    });

    // Queue email job with pre-rendered HTML
    const jobData: EmailJobData = {
      organizationId,
      notificationId: notification.id,
      templateId,
      to: recipientInfo.email,
      subject,
      html,
    };

    // Priority: urgent = 1, normal = 2
    const priority = isUrgent ? 1 : 2;

    await this.emailQueue.add("send-email", jobData, {
      priority,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    });

    this.logger.log(
      `Queued email notification ${notification.id} for ${recipientInfo.email} (template: ${templateId})`,
    );

    return notification.id;
  }

  /**
   * Dispatches an in-app notification.
   * Creates notification record and emits WebSocket event.
   *
   * @param params - In-app dispatch parameters
   * @returns Created notification or null
   */
  async dispatchInApp(
    params: DispatchInAppParams,
  ): Promise<InAppNotification | null> {
    const {
      organizationId,
      recipientUserId,
      category,
      title,
      body,
      entityType,
      entityId,
    } = params;

    // Create notification record with DELIVERED status (in-app is immediate)
    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        userId: recipientUserId,
        channel: NotificationChannel.IN_APP,
        type: category as NotificationType,
        status: NotificationStatus.DELIVERED,
        title,
        body,
        entityType,
        entityId,
        isRead: false,
      },
    });

    const inAppNotification: InAppNotification = {
      id: notification.id,
      type: category,
      title: notification.title,
      body: notification.body || undefined,
      entityType: notification.entityType || undefined,
      entityId: notification.entityId || undefined,
      isRead: false,
      createdAt: notification.createdAt,
    };

    // Emit event for WebSocket delivery (gateway will subscribe to this)
    this.eventEmitter.emit("notification.in_app.created", {
      organizationId,
      userId: recipientUserId,
      notification: inAppNotification,
    });

    this.logger.debug(
      `Dispatched in-app notification ${notification.id} to user ${recipientUserId}`,
    );

    return inAppNotification;
  }

  /**
   * Queues a notification for daily digest.
   * Creates a DigestQueue record for batch processing.
   *
   * @param params - Digest dispatch parameters
   */
  async dispatchToDigest(params: DispatchDigestParams): Promise<void> {
    const {
      organizationId,
      userId,
      category,
      title,
      body,
      entityType,
      entityId,
      metadata,
    } = params;

    // Store in DigestQueue table for batch processing by DigestService
    await this.prisma.digestQueue.create({
      data: {
        organizationId,
        userId,
        type: category as string,
        entityType,
        entityId,
        metadata: { title, body, ...(metadata || {}) } as object,
      },
    });

    this.logger.debug(
      `Queued ${category} notification for digest: user ${userId}, entity ${entityType}/${entityId}`,
    );
  }

  /**
   * Emits an event for unread count update.
   * Used after marking notifications as read.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @param unreadCount - New unread count
   */
  emitUnreadCountUpdate(
    organizationId: string,
    userId: string,
    unreadCount: number,
  ): void {
    this.eventEmitter.emit("notification.unread_count.updated", {
      organizationId,
      userId,
      unreadCount,
    });
  }

  /**
   * Gets unread notification count for a user.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns Unread count
   */
  async getUnreadCount(
    organizationId: string,
    userId: string,
  ): Promise<number> {
    return this.prisma.notification.count({
      where: {
        organizationId,
        userId,
        channel: NotificationChannel.IN_APP,
        isRead: false,
      },
    });
  }
}
