/**
 * NotificationService - Core Notification Dispatch Service
 *
 * Central service for notification dispatch across email and in-app channels.
 * Handles user preference checking, OOO delegation, quiet hours, and delivery.
 *
 * Key features:
 * - Checks user preferences before sending
 * - Handles OOO backup delegation for urgent notifications
 * - Respects quiet hours (urgent notifications bypass)
 * - Pre-renders email templates before queueing (per RESEARCH.md)
 * - Routes to appropriate channel based on preferences
 *
 * @see PreferenceService for preference management
 * @see EmailTemplateService for template rendering
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { PreferenceService, EffectivePreference } from './preference.service';
import { EmailTemplateService, EmailTemplateContext } from './email-template.service';
import { EMAIL_QUEUE_NAME } from '../../jobs/queues/email.queue';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  REAL_TIME_CATEGORIES,
  InAppNotification,
} from '../entities/notification.types';
import { NotificationQueryDto } from '../dto/notification.dto';

/**
 * Parameters for queueing an email notification.
 */
export interface QueueEmailParams {
  /** Organization ID for tenant scoping */
  organizationId: string;
  /** Recipient user ID */
  recipientUserId: string;
  /** Notification category for preference checking */
  category: NotificationCategory;
  /** Email template ID (e.g., 'assignment/case-assigned') */
  templateId: string;
  /** Template context data */
  context: EmailTemplateContext;
  /** Related entity type for navigation */
  entityType?: string;
  /** Related entity ID for navigation */
  entityId?: string;
  /** Whether this is an urgent notification (bypasses quiet hours) */
  isUrgent?: boolean;
}

/**
 * Parameters for sending an in-app notification.
 */
export interface SendInAppParams {
  /** Organization ID for tenant scoping */
  organizationId: string;
  /** Recipient user ID */
  recipientUserId: string;
  /** Notification category */
  category: NotificationCategory;
  /** Notification title */
  title: string;
  /** Notification body (optional) */
  body?: string;
  /** Related entity type for navigation */
  entityType?: string;
  /** Related entity ID for navigation */
  entityId?: string;
}

/**
 * Parameters for queueing a notification for daily digest.
 */
export interface QueueForDigestParams {
  /** Organization ID for tenant scoping */
  organizationId: string;
  /** Recipient user ID */
  userId: string;
  /** Notification type */
  type: NotificationCategory;
  /** Related entity type */
  entityType?: string;
  /** Related entity ID */
  entityId?: string;
  /** Additional metadata for the digest */
  metadata?: Record<string, unknown>;
}

/**
 * High-level notification dispatch parameters.
 */
export interface NotifyParams {
  /** Organization ID for tenant scoping */
  organizationId: string;
  /** Recipient user ID */
  recipientUserId: string;
  /** Notification category */
  category: NotificationCategory;
  /** Notification type (maps to category for most cases) */
  type: NotificationType;
  /** Email template ID */
  templateId: string;
  /** Template context for email rendering */
  context: EmailTemplateContext;
  /** Notification title */
  title: string;
  /** Notification body (optional) */
  body?: string;
  /** Related entity type */
  entityType?: string;
  /** Related entity ID */
  entityId?: string;
  /** Whether this notification is urgent (bypasses quiet hours) */
  isUrgent?: boolean;
}

/**
 * Paginated notification response.
 */
export interface PaginatedNotifications {
  /** List of notifications */
  notifications: Array<{
    id: string;
    channel: NotificationChannel;
    type: NotificationType;
    title: string;
    body?: string;
    entityType?: string;
    entityId?: string;
    isRead: boolean;
    readAt?: Date;
    createdAt: Date;
  }>;
  /** Total count (for pagination) */
  total: number;
  /** Unread count for this user */
  unreadCount: number;
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
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly preferenceService: PreferenceService,
    private readonly templateService: EmailTemplateService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
  ) {}

  /**
   * Queue an email notification for delivery.
   * Pre-renders the template before queueing (per RESEARCH.md - don't render in worker).
   *
   * @param params - Email queue parameters
   */
  async queueEmail(params: QueueEmailParams): Promise<void> {
    const {
      organizationId,
      recipientUserId,
      category,
      templateId,
      context,
      entityType,
      entityId,
      isUrgent = false,
    } = params;

    // Get effective preferences (handles OOO, quiet hours, enforcement)
    const prefs = await this.preferenceService.getEffectivePreferences(
      recipientUserId,
      organizationId,
      category,
    );

    // Determine actual recipient (may be backup user if OOO)
    let actualRecipientId = recipientUserId;
    if (prefs.isOOO && prefs.backupUserId && isUrgent) {
      actualRecipientId = prefs.backupUserId;
      this.logger.log(
        `Redirecting urgent notification to backup user ${actualRecipientId} (original: ${recipientUserId} is OOO)`,
      );
    }

    // Skip if email not wanted and not enforced
    if (!prefs.email && !prefs.isEnforcedByOrg) {
      this.logger.debug(
        `Skipping email for user ${actualRecipientId}: email preference disabled`,
      );
      return;
    }

    // Skip if quiet hours and not urgent (non-enforced categories)
    if (prefs.isQuietHours && !isUrgent && !prefs.isEnforcedByOrg) {
      this.logger.debug(
        `Skipping email for user ${actualRecipientId}: in quiet hours`,
      );
      return;
    }

    // Load recipient user for email address
    const user = await this.prisma.user.findUnique({
      where: { id: actualRecipientId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!user) {
      this.logger.warn(`User not found for email notification: ${actualRecipientId}`);
      return;
    }

    // Load organization for branding
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, settings: true },
    });

    if (!org) {
      this.logger.warn(`Organization not found: ${organizationId}`);
      return;
    }

    // Build context with org and recipient info
    const orgSettings = org.settings as Record<string, unknown> | null;
    const fullContext: EmailTemplateContext = {
      ...context,
      org: {
        name: org.name,
        branding: orgSettings?.branding as EmailTemplateContext['org'] extends { branding?: infer B } ? B : undefined,
      },
      recipient: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
      },
      appUrl: process.env.APP_URL || 'https://app.ethico.com',
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
        userId: actualRecipientId,
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
      to: user.email,
      subject,
      html,
    };

    // Priority: urgent = 1, normal = 2
    const priority = isUrgent ? 1 : 2;

    await this.emailQueue.add('send-email', jobData, {
      priority,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    this.logger.log(
      `Queued email notification ${notification.id} for ${user.email} (template: ${templateId})`,
    );
  }

  /**
   * Send an in-app notification.
   * Creates notification record and emits event for WebSocket delivery.
   *
   * @param params - In-app notification parameters
   * @returns Created notification or null if skipped
   */
  async sendInApp(params: SendInAppParams): Promise<InAppNotification | null> {
    const {
      organizationId,
      recipientUserId,
      category,
      title,
      body,
      entityType,
      entityId,
    } = params;

    // Get effective preferences
    const prefs = await this.preferenceService.getEffectivePreferences(
      recipientUserId,
      organizationId,
      category,
    );

    // Skip if in-app not wanted and not enforced
    if (!prefs.inApp && !prefs.isEnforcedByOrg) {
      this.logger.debug(
        `Skipping in-app notification for user ${recipientUserId}: preference disabled`,
      );
      return null;
    }

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
    this.eventEmitter.emit('notification.in_app.created', {
      organizationId,
      userId: recipientUserId,
      notification: inAppNotification,
    });

    this.logger.debug(
      `Sent in-app notification ${notification.id} to user ${recipientUserId}`,
    );

    return inAppNotification;
  }

  /**
   * Queue a notification for daily digest.
   * Creates a DigestQueue record for batch processing.
   *
   * @param params - Digest queue parameters
   */
  async queueForDigest(params: QueueForDigestParams): Promise<void> {
    const { organizationId, userId, type, entityType, entityId, metadata } = params;

    // Store in DigestQueue table for batch processing by DigestService (07-06)
    await this.prisma.digestQueue.create({
      data: {
        organizationId,
        userId,
        type: type as string,
        entityType,
        entityId,
        metadata: metadata as object || {},
      },
    });

    this.logger.debug(
      `Queued ${type} notification for digest: user ${userId}, entity ${entityType}/${entityId}`,
    );
  }

  /**
   * High-level notification dispatch method.
   * Checks preferences and routes to appropriate channel(s).
   *
   * @param params - Notification parameters
   */
  async notify(params: NotifyParams): Promise<void> {
    const {
      organizationId,
      recipientUserId,
      category,
      type,
      templateId,
      context,
      title,
      body,
      entityType,
      entityId,
      isUrgent = false,
    } = params;

    // Get effective preferences
    const prefs = await this.preferenceService.getEffectivePreferences(
      recipientUserId,
      organizationId,
      category,
    );

    // Determine if this should be batched for digest
    const shouldBatch = !isUrgent && !REAL_TIME_CATEGORIES.includes(category);

    if (shouldBatch && !prefs.isEnforcedByOrg) {
      // Queue for daily digest instead of immediate delivery
      await this.queueForDigest({
        organizationId,
        userId: recipientUserId,
        type: category,
        entityType,
        entityId,
        metadata: { title, body, ...context },
      });
      return;
    }

    // Send via requested channels based on preferences
    const promises: Promise<void | InAppNotification | null>[] = [];

    // Email channel
    if (prefs.email || prefs.isEnforcedByOrg) {
      promises.push(
        this.queueEmail({
          organizationId,
          recipientUserId,
          category,
          templateId,
          context,
          entityType,
          entityId,
          isUrgent,
        }),
      );
    }

    // In-app channel
    if (prefs.inApp || prefs.isEnforcedByOrg) {
      promises.push(
        this.sendInApp({
          organizationId,
          recipientUserId,
          category,
          title,
          body,
          entityType,
          entityId,
        }),
      );
    }

    await Promise.all(promises);
  }

  /**
   * Get notifications for a user with pagination.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @param query - Query parameters (channel, type, isRead, limit, offset)
   * @returns Paginated notifications with unread count
   */
  async getNotifications(
    organizationId: string,
    userId: string,
    query: NotificationQueryDto,
  ): Promise<PaginatedNotifications> {
    const { channel, type, isRead, limit = 20, offset = 0 } = query;

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId,
      userId,
    };

    if (channel) {
      where.channel = channel;
    }

    if (type) {
      where.type = type;
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    // Query notifications with pagination
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          channel: true,
          type: true,
          title: true,
          body: true,
          entityType: true,
          entityId: true,
          isRead: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          organizationId,
          userId,
          channel: NotificationChannel.IN_APP,
          isRead: false,
        },
      }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        channel: n.channel as NotificationChannel,
        type: n.type as NotificationType,
        title: n.title,
        body: n.body || undefined,
        entityType: n.entityType || undefined,
        entityId: n.entityId || undefined,
        isRead: n.isRead,
        readAt: n.readAt || undefined,
        createdAt: n.createdAt,
      })),
      total,
      unreadCount,
    };
  }

  /**
   * Mark notifications as read.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @param notificationIds - IDs of notifications to mark as read
   */
  async markAsRead(
    organizationId: string,
    userId: string,
    notificationIds: string[],
  ): Promise<void> {
    const now = new Date();

    await this.prisma.notification.updateMany({
      where: {
        organizationId,
        userId,
        id: { in: notificationIds },
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    // Emit event for real-time unread count update
    const unreadCount = await this.prisma.notification.count({
      where: {
        organizationId,
        userId,
        channel: NotificationChannel.IN_APP,
        isRead: false,
      },
    });

    this.eventEmitter.emit('notification.unread_count.updated', {
      organizationId,
      userId,
      unreadCount,
    });

    this.logger.debug(
      `Marked ${notificationIds.length} notifications as read for user ${userId}`,
    );
  }

  /**
   * Archive read notifications older than specified date.
   * Returns count of archived notifications.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @param olderThan - Archive notifications read before this date
   * @returns Number of archived notifications
   */
  async archiveRead(
    organizationId: string,
    userId: string,
    olderThan: Date,
  ): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        organizationId,
        userId,
        isRead: true,
        readAt: { lt: olderThan },
        status: { not: NotificationStatus.ARCHIVED },
      },
      data: {
        status: NotificationStatus.ARCHIVED,
      },
    });

    this.logger.log(
      `Archived ${result.count} read notifications for user ${userId}`,
    );

    return result.count;
  }

  /**
   * Get unread notification count for a user.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns Unread count
   */
  async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        organizationId,
        userId,
        channel: NotificationChannel.IN_APP,
        isRead: false,
      },
    });
  }

  /**
   * Get recent notifications for a user (poll fallback for WebSocket).
   * Used by NotificationGateway for background tab polling.
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @param limit - Maximum notifications to return (default 20)
   * @param since - Optional date filter for notifications created after this time
   * @returns Array of recent in-app notifications
   */
  async getRecentNotifications(
    organizationId: string,
    userId: string,
    limit = 20,
    since?: Date,
  ): Promise<InAppNotification[]> {
    const where: Record<string, unknown> = {
      organizationId,
      userId,
      channel: NotificationChannel.IN_APP,
    };

    if (since) {
      where.createdAt = { gt: since };
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        entityType: true,
        entityId: true,
        isRead: true,
        createdAt: true,
      },
    });

    return notifications.map((n) => ({
      id: n.id,
      type: n.type as NotificationCategory,
      title: n.title,
      body: n.body || undefined,
      entityType: n.entityType || undefined,
      entityId: n.entityId || undefined,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));
  }
}
