/**
 * DeliveryTrackerService - Email Delivery Status Tracking
 *
 * Tracks email delivery status through the full lifecycle:
 * PENDING -> SENT -> DELIVERED/BOUNCED/FAILED
 *
 * Key responsibilities:
 * - Record send attempts and outcomes
 * - Process webhook events from email providers (SendGrid, SES, etc.)
 * - Track permanent failures for compliance audit
 * - Provide delivery status queries for reporting
 *
 * @see NotificationDelivery model in Prisma schema
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditEntityType, AuditActionCategory, ActorType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryStatus, NotificationStatus } from '../entities/notification.types';

/**
 * Webhook event types from email providers.
 */
export type WebhookEventType =
  | 'delivered'
  | 'bounce'
  | 'dropped'
  | 'deferred'
  | 'open'
  | 'click'
  | 'spam_report'
  | 'unsubscribe';

/**
 * Bounce classification for categorizing delivery failures.
 */
export type BounceType = 'hard' | 'soft' | 'blocked' | 'unknown';

/**
 * Webhook event payload structure.
 * Normalized from various email provider formats.
 */
export interface WebhookEvent {
  /** Event type */
  eventType: WebhookEventType;
  /** Provider's message ID */
  messageId: string;
  /** Recipient email address */
  email?: string;
  /** Event timestamp */
  timestamp: Date;
  /** Bounce reason (for bounce events) */
  reason?: string;
  /** Bounce classification */
  bounceType?: BounceType;
  /** Raw event payload for debugging */
  rawEvent?: Record<string, unknown>;
}

/**
 * Delivery record with full context for audit.
 */
export interface DeliveryRecord {
  id: string;
  notificationId: string;
  messageId: string | null;
  status: DeliveryStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  notification?: {
    id: string;
    userId: string;
    channel: string;
    type: string;
    title: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: Date;
  };
}

/**
 * Permanent failure record for compliance reporting.
 */
export interface PermanentFailureRecord {
  id: string;
  notificationId: string;
  userId: string;
  email: string;
  failureReason: string;
  attempts: number;
  failedAt: Date;
  notificationType: string;
  entityType: string | null;
  entityId: string | null;
}

@Injectable()
export class DeliveryTrackerService {
  private readonly logger = new Logger(DeliveryTrackerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Record that an email was sent to the provider.
   * Creates or updates NotificationDelivery record with SENT status.
   *
   * @param notificationId - Notification record ID
   * @param messageId - Provider's message ID for tracking
   */
  async recordSent(notificationId: string, messageId: string): Promise<void> {
    this.logger.debug(
      `Recording sent status for notification ${notificationId}, messageId: ${messageId}`,
    );

    // Fetch notification to get organizationId
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { organizationId: true },
    });

    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Create or update delivery record
      await tx.notificationDelivery.upsert({
        where: { notificationId },
        create: {
          organizationId: notification.organizationId,
          notificationId,
          messageId,
          status: DeliveryStatus.SENT,
          attempts: 1,
          lastAttemptAt: new Date(),
        },
        update: {
          messageId,
          status: DeliveryStatus.SENT,
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          errorMessage: null, // Clear any previous error
        },
      });

      // Update notification status
      await tx.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.SENT },
      });
    });

    this.logger.log(`Email sent for notification ${notificationId}`);
  }

  /**
   * Record that an email was delivered to recipient's mailbox.
   * Called via webhook from email provider.
   *
   * @param notificationId - Notification record ID
   * @param messageId - Provider's message ID
   */
  async recordDelivered(notificationId: string, messageId: string): Promise<void> {
    this.logger.debug(
      `Recording delivered status for notification ${notificationId}, messageId: ${messageId}`,
    );

    await this.prisma.$transaction(async (tx) => {
      // Update delivery record
      await tx.notificationDelivery.update({
        where: { notificationId },
        data: {
          status: DeliveryStatus.DELIVERED,
          errorMessage: null,
        },
      });

      // Update notification status
      await tx.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.DELIVERED },
      });
    });

    // Emit event for analytics/monitoring
    this.eventEmitter.emit('email.delivered', {
      notificationId,
      messageId,
      timestamp: new Date(),
    });

    this.logger.log(`Email delivered for notification ${notificationId}`);
  }

  /**
   * Record that an email bounced.
   * Distinguishes between hard bounces (permanent) and soft bounces (temporary).
   *
   * @param notificationId - Notification record ID
   * @param messageId - Provider's message ID
   * @param reason - Bounce reason from provider
   * @param bounceType - Bounce classification
   */
  async recordBounced(
    notificationId: string,
    messageId: string,
    reason?: string,
    bounceType?: BounceType,
  ): Promise<void> {
    const errorMessage = reason
      ? `${bounceType || 'unknown'} bounce: ${reason}`
      : `${bounceType || 'unknown'} bounce`;

    this.logger.warn(
      `Recording bounce for notification ${notificationId}: ${errorMessage}`,
    );

    await this.prisma.$transaction(async (tx) => {
      // Update delivery record
      await tx.notificationDelivery.update({
        where: { notificationId },
        data: {
          status: DeliveryStatus.BOUNCED,
          errorMessage,
        },
      });

      // Update notification status
      await tx.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.FAILED },
      });
    });

    // Emit event for bounce handling (could trigger user notification)
    this.eventEmitter.emit('email.bounced', {
      notificationId,
      messageId,
      bounceType,
      reason,
      timestamp: new Date(),
    });

    this.logger.log(`Email bounced for notification ${notificationId}: ${bounceType}`);
  }

  /**
   * Record that an email send failed during processing.
   * Called by EmailProcessor when send fails before reaching provider.
   *
   * @param notificationId - Notification record ID
   * @param reason - Failure reason
   */
  async recordFailed(notificationId: string, reason: string): Promise<void> {
    this.logger.warn(
      `Recording failure for notification ${notificationId}: ${reason}`,
    );

    // Fetch notification to get organizationId
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { organizationId: true },
    });

    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Update or create delivery record
      await tx.notificationDelivery.upsert({
        where: { notificationId },
        create: {
          organizationId: notification.organizationId,
          notificationId,
          status: DeliveryStatus.FAILED,
          attempts: 1,
          lastAttemptAt: new Date(),
          errorMessage: reason,
        },
        update: {
          status: DeliveryStatus.FAILED,
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          errorMessage: reason,
        },
      });

      // Note: Don't update notification status to FAILED yet - BullMQ may retry
      // Notification status updated to FAILED only on permanent failure
    });
  }

  /**
   * Record a permanent failure after all retries exhausted.
   * Called by EmailProcessor when job fails permanently.
   * Logs for compliance audit per CONTEXT.md requirements.
   *
   * @param notificationId - Notification record ID
   * @param reason - Final failure reason
   */
  async recordPermanentFailure(
    notificationId: string,
    reason: string,
  ): Promise<void> {
    this.logger.error(
      `Recording PERMANENT FAILURE for notification ${notificationId}: ${reason}`,
    );

    // Load notification with user details for audit
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!notification) {
      this.logger.error(`Notification ${notificationId} not found for permanent failure`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Update delivery record with final status
      await tx.notificationDelivery.update({
        where: { notificationId },
        data: {
          status: DeliveryStatus.FAILED,
          errorMessage: `PERMANENT: ${reason}`,
        },
      });

      // Update notification status to FAILED
      await tx.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.FAILED },
      });

      // Log to AuditLog for compliance (audit module handles tenant scoping)
      await tx.auditLog.create({
        data: {
          organizationId: notification.organizationId,
          actorUserId: null, // System action, no user actor
          actorType: ActorType.SYSTEM,
          actorName: 'Email Delivery System',
          action: 'email.permanent_failure',
          actionCategory: AuditActionCategory.SYSTEM,
          actionDescription: `Permanent email delivery failure for ${notification.user.email}: ${reason}`,
          entityType: AuditEntityType.NOTIFICATION,
          entityId: notificationId,
          changes: {
            notificationType: notification.type,
            recipientEmail: notification.user.email,
            failureReason: reason,
            entityType: notification.entityType,
            entityId: notification.entityId,
          } as object,
        },
      });
    });

    // Emit event for monitoring/alerting
    this.eventEmitter.emit('email.permanent_failure', {
      notificationId,
      organizationId: notification.organizationId,
      userId: notification.userId,
      email: notification.user.email,
      reason,
      timestamp: new Date(),
    });

    this.logger.error(
      `PERMANENT EMAIL FAILURE logged for ${notification.user.email} (notification: ${notificationId})`,
    );
  }

  /**
   * Process a webhook event from email provider.
   * Routes to appropriate handler based on event type.
   *
   * @param event - Normalized webhook event
   */
  async processWebhookEvent(event: WebhookEvent): Promise<void> {
    const { eventType, messageId, reason, bounceType } = event;

    this.logger.debug(
      `Processing webhook event: ${eventType} for messageId: ${messageId}`,
    );

    // Look up notification by messageId
    const delivery = await this.prisma.notificationDelivery.findFirst({
      where: { messageId },
      select: { notificationId: true },
    });

    if (!delivery) {
      this.logger.warn(`No delivery record found for messageId: ${messageId}`);
      return;
    }

    const { notificationId } = delivery;

    switch (eventType) {
      case 'delivered':
        await this.recordDelivered(notificationId, messageId);
        break;

      case 'bounce':
        await this.recordBounced(notificationId, messageId, reason, bounceType);
        break;

      case 'dropped':
        // Dropped events are permanent failures (spam, invalid address, etc.)
        await this.recordBounced(notificationId, messageId, reason, 'blocked');
        break;

      case 'deferred':
        // Temporary delay - update status but don't mark as failed
        await this.prisma.notificationDelivery.update({
          where: { notificationId },
          data: {
            status: DeliveryStatus.DEFERRED,
            errorMessage: reason || 'Email deferred by receiving server',
          },
        });
        break;

      case 'spam_report':
        // User reported as spam - log for compliance but don't fail
        this.logger.warn(`Spam report received for notification ${notificationId}`);
        this.eventEmitter.emit('email.spam_report', {
          notificationId,
          messageId,
          timestamp: new Date(),
        });
        break;

      case 'open':
      case 'click':
        // Engagement events - emit for analytics but no status change
        this.eventEmitter.emit(`email.${eventType}`, {
          notificationId,
          messageId,
          timestamp: event.timestamp,
        });
        break;

      default:
        this.logger.debug(`Unhandled webhook event type: ${eventType}`);
    }
  }

  /**
   * Get delivery status for a notification.
   *
   * @param notificationId - Notification record ID
   * @returns Delivery record or null if not found
   */
  async getDeliveryStatus(notificationId: string): Promise<DeliveryRecord | null> {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { notificationId },
      include: {
        notification: {
          select: {
            id: true,
            userId: true,
            channel: true,
            type: true,
            title: true,
            entityType: true,
            entityId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!delivery) {
      return null;
    }

    return {
      id: delivery.id,
      notificationId: delivery.notificationId,
      messageId: delivery.messageId,
      status: delivery.status as DeliveryStatus,
      attempts: delivery.attempts,
      lastAttemptAt: delivery.lastAttemptAt,
      errorMessage: delivery.errorMessage,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
      notification: delivery.notification,
    };
  }

  /**
   * Get failed deliveries for an organization within a time range.
   * Used for compliance reporting and monitoring dashboards.
   *
   * @param organizationId - Organization ID
   * @param since - Start date for query
   * @returns Array of failed delivery records with user details
   */
  async getFailedDeliveries(
    organizationId: string,
    since: Date,
  ): Promise<PermanentFailureRecord[]> {
    const failures = await this.prisma.notificationDelivery.findMany({
      where: {
        status: DeliveryStatus.FAILED,
        errorMessage: { startsWith: 'PERMANENT:' },
        updatedAt: { gte: since },
        notification: {
          organizationId,
        },
      },
      include: {
        notification: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return failures.map((f) => ({
      id: f.id,
      notificationId: f.notificationId,
      userId: f.notification.userId,
      email: f.notification.user.email,
      failureReason: f.errorMessage?.replace('PERMANENT: ', '') || 'Unknown',
      attempts: f.attempts,
      failedAt: f.updatedAt,
      notificationType: f.notification.type,
      entityType: f.notification.entityType,
      entityId: f.notification.entityId,
    }));
  }

  /**
   * Get delivery statistics for an organization.
   * Used for monitoring dashboards and SLA reporting.
   *
   * @param organizationId - Organization ID
   * @param since - Start date for stats
   * @returns Delivery statistics by status
   */
  async getDeliveryStats(
    organizationId: string,
    since: Date,
  ): Promise<{
    sent: number;
    delivered: number;
    bounced: number;
    failed: number;
    pending: number;
    deliveryRate: number;
  }> {
    const stats = await this.prisma.notificationDelivery.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: since },
        notification: {
          organizationId,
          channel: 'EMAIL',
        },
      },
      _count: { id: true },
    });

    const statusCounts = stats.reduce(
      (acc, s) => {
        acc[s.status] = s._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    const sent = statusCounts[DeliveryStatus.SENT] || 0;
    const delivered = statusCounts[DeliveryStatus.DELIVERED] || 0;
    const bounced = statusCounts[DeliveryStatus.BOUNCED] || 0;
    const failed = statusCounts[DeliveryStatus.FAILED] || 0;
    const pending = statusCounts[DeliveryStatus.PENDING] || 0;

    const total = sent + delivered + bounced + failed;
    const deliveryRate = total > 0 ? ((delivered / total) * 100) : 0;

    return {
      sent,
      delivered,
      bounced,
      failed,
      pending,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
    };
  }
}
