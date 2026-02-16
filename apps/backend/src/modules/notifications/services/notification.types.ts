/**
 * Notification Service Types
 *
 * Interface definitions for the notification dispatch system.
 */

import { EmailTemplateContext } from "./email-template.service";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationType,
} from "../entities/notification.types";

/**
 * Parameters for queueing an email notification.
 */
export interface QueueEmailParams {
  organizationId: string;
  recipientUserId: string;
  category: NotificationCategory;
  templateId: string;
  context: EmailTemplateContext;
  entityType?: string;
  entityId?: string;
  isUrgent?: boolean;
}

/**
 * Parameters for sending an in-app notification.
 */
export interface SendInAppParams {
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
export interface QueueForDigestParams {
  organizationId: string;
  userId: string;
  type: NotificationCategory;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * High-level notification dispatch parameters.
 */
export interface NotifyParams {
  organizationId: string;
  recipientUserId: string;
  category: NotificationCategory;
  type: NotificationType;
  templateId: string;
  context: EmailTemplateContext;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  isUrgent?: boolean;
}

/**
 * Paginated notification response.
 */
export interface PaginatedNotifications {
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
  total: number;
  unreadCount: number;
}

/**
 * Single notification item.
 */
export interface NotificationItem {
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
}
