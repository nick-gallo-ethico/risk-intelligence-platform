/**
 * Notification Type Definitions
 *
 * Type definitions for the notification system including enums,
 * interfaces for service parameters, and default preference settings.
 */

/**
 * Notification channel enum values.
 * Mirrors Prisma NotificationChannel enum.
 */
export const NotificationChannel = {
  EMAIL: 'EMAIL',
  IN_APP: 'IN_APP',
} as const;

export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

/**
 * Notification type enum values.
 * Mirrors Prisma NotificationType enum.
 */
export const NotificationType = {
  ASSIGNMENT: 'ASSIGNMENT',
  DEADLINE: 'DEADLINE',
  APPROVAL: 'APPROVAL',
  MENTION: 'MENTION',
  INTERVIEW: 'INTERVIEW',
  STATUS_UPDATE: 'STATUS_UPDATE',
  COMMENT: 'COMMENT',
  COMPLETION: 'COMPLETION',
  ESCALATION: 'ESCALATION',
  DIGEST: 'DIGEST',
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

/**
 * Notification status enum values.
 * Mirrors Prisma NotificationStatus enum.
 */
export const NotificationStatus = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  READ: 'READ',
  ARCHIVED: 'ARCHIVED',
} as const;

export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

/**
 * Delivery status enum values.
 * Mirrors Prisma DeliveryStatus enum.
 */
export const DeliveryStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  BOUNCED: 'BOUNCED',
  FAILED: 'FAILED',
  DEFERRED: 'DEFERRED',
} as const;

export type DeliveryStatus =
  (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

/**
 * Notification categories for user preference settings.
 * Maps to NotificationType but grouped by user-facing category.
 */
export type NotificationCategory =
  | 'ASSIGNMENT' // Task/case assigned
  | 'DEADLINE' // SLA warnings, due dates
  | 'APPROVAL' // Approval requests
  | 'MENTION' // @mentioned in comments
  | 'INTERVIEW' // Interview scheduling
  | 'STATUS_UPDATE' // Entity status changes
  | 'COMMENT' // New comments
  | 'COMPLETION'; // Task/investigation complete

/**
 * User preference settings for each notification category.
 */
export interface CategoryPreference {
  /** Whether to send email notifications for this category */
  email: boolean;
  /** Whether to show in-app notifications for this category */
  inApp: boolean;
}

/**
 * Complete preference settings structure stored in NotificationPreference.preferences JSON.
 */
export interface PreferenceSettings {
  [category: string]: CategoryPreference;
}

/**
 * Default preference settings per CONTEXT.md:
 * - Urgent events (assignments, deadlines, mentions, approvals, interviews): email=true, inApp=true
 * - FYI events (status updates, comments, completions): email=false, inApp=true
 */
export const DEFAULT_PREFERENCES: PreferenceSettings = {
  ASSIGNMENT: { email: true, inApp: true },
  DEADLINE: { email: true, inApp: true },
  APPROVAL: { email: true, inApp: true },
  MENTION: { email: true, inApp: true },
  INTERVIEW: { email: true, inApp: true },
  STATUS_UPDATE: { email: false, inApp: true },
  COMMENT: { email: false, inApp: true },
  COMPLETION: { email: false, inApp: true },
};

/**
 * Categories that receive real-time delivery (never batched).
 * Per CONTEXT.md: assignments, SLA warnings, mentions, approvals, escalations
 */
export const REAL_TIME_CATEGORIES: NotificationCategory[] = [
  'ASSIGNMENT',
  'DEADLINE',
  'APPROVAL',
  'MENTION',
  'INTERVIEW',
];

/**
 * Categories that can be batched into daily digest.
 */
export const DIGEST_CATEGORIES: NotificationCategory[] = [
  'STATUS_UPDATE',
  'COMMENT',
  'COMPLETION',
];

/**
 * Parameters for queueing an email notification.
 */
export interface QueueEmailParams {
  /** Target organization ID */
  organizationId: string;
  /** Target user ID */
  userId: string;
  /** User's email address */
  email: string;
  /** Notification type */
  type: NotificationCategory;
  /** Email subject line */
  subject: string;
  /** Email template ID */
  templateId: string;
  /** Template context data */
  context: Record<string, unknown>;
  /** Related entity type (for navigation) */
  entityType?: string;
  /** Related entity ID (for navigation) */
  entityId?: string;
  /** Optional correlation ID for tracing */
  correlationId?: string;
}

/**
 * Parameters for sending an in-app notification.
 */
export interface SendInAppParams {
  /** Target organization ID */
  organizationId: string;
  /** Target user ID */
  userId: string;
  /** Notification type */
  type: NotificationCategory;
  /** Notification title */
  title: string;
  /** Notification body (optional) */
  body?: string;
  /** Related entity type (for navigation) */
  entityType?: string;
  /** Related entity ID (for navigation) */
  entityId?: string;
}

/**
 * In-app notification payload for WebSocket delivery.
 */
export interface InAppNotification {
  /** Notification ID */
  id: string;
  /** Notification type */
  type: NotificationCategory;
  /** Notification title */
  title: string;
  /** Notification body (optional) */
  body?: string;
  /** Related entity type (for navigation) */
  entityType?: string;
  /** Related entity ID (for navigation) */
  entityId?: string;
  /** Whether notification has been read */
  isRead: boolean;
  /** Timestamp of creation */
  createdAt: Date;
}

/**
 * Result of checking user preferences for a notification.
 */
export interface PreferenceCheckResult {
  /** Whether email notifications are enabled */
  shouldSendEmail: boolean;
  /** Whether in-app notifications are enabled */
  shouldSendInApp: boolean;
  /** Whether this category is enforced by org (cannot be disabled) */
  isEnforced: boolean;
  /** Backup user ID if primary user is OOO */
  backupUserId?: string;
  /** Whether user is currently in quiet hours */
  inQuietHours: boolean;
}

/**
 * Notification trigger event data passed from event handlers.
 */
export interface NotificationTriggerEvent {
  /** Organization ID */
  organizationId: string;
  /** User ID to notify */
  userId: string;
  /** Notification category */
  category: NotificationCategory;
  /** Notification title */
  title: string;
  /** Notification body */
  body?: string;
  /** Entity type for navigation */
  entityType?: string;
  /** Entity ID for navigation */
  entityId?: string;
  /** Additional context for email template */
  context?: Record<string, unknown>;
  /** Force immediate delivery (ignore batching) */
  immediate?: boolean;
}
