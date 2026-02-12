/**
 * Notification Preferences Types
 *
 * TypeScript types for notification preference management.
 * Matches backend DTOs from PreferencesController and notification.types.ts.
 */

/**
 * Notification categories for user preference settings.
 * Maps to NotificationType but grouped by user-facing category.
 */
export type NotificationCategory =
  | "ASSIGNMENT" // Task/case assigned
  | "DEADLINE" // SLA warnings, due dates
  | "APPROVAL" // Approval requests
  | "MENTION" // @mentioned in comments
  | "INTERVIEW" // Interview scheduling
  | "STATUS_UPDATE" // Entity status changes
  | "COMMENT" // New comments
  | "COMPLETION" // Task/investigation complete
  | "ESCALATION"; // SLA breach escalation

/**
 * Notification channels available for delivery.
 */
export type NotificationChannel = "EMAIL" | "IN_APP";

/**
 * User preference for a specific notification category.
 */
export interface CategoryPreference {
  /** Whether to send email notifications for this category */
  email: boolean;
  /** Whether to show in-app notifications for this category */
  inApp: boolean;
}

/**
 * Map of notification category to user preferences.
 */
export interface PreferenceSettings {
  [category: string]: CategoryPreference;
}

/**
 * Full notification preferences response from GET /notifications/preferences.
 */
export interface NotificationPreferences {
  /** Per-category notification settings */
  preferences: PreferenceSettings;
  /** Quiet hours start time (HH:MM format, 24-hour) */
  quietHoursStart?: string;
  /** Quiet hours end time (HH:MM format, 24-hour) */
  quietHoursEnd?: string;
  /** User's timezone (IANA format) */
  timezone: string;
  /** Backup user ID for OOO delegation */
  backupUserId?: string;
  /** OOO status active until this date */
  oooUntil?: Date | string;
  /** Effective quiet hours (merged with org defaults) */
  effectiveQuietHours?: {
    start: string;
    end: string;
  };
  /** Categories enforced by organization (cannot be disabled) */
  enforcedCategories: string[];
}

/**
 * DTO for updating user notification preferences.
 * All fields optional - only provided fields are updated.
 */
export interface UpdatePreferencesDto {
  /** Per-category notification settings */
  preferences?: PreferenceSettings;
  /** Quiet hours start time (HH:MM format, 24-hour) */
  quietHoursStart?: string;
  /** Quiet hours end time (HH:MM format, 24-hour) */
  quietHoursEnd?: string;
  /** User's timezone (IANA format) */
  timezone?: string;
  /** Backup user ID for OOO delegation */
  backupUserId?: string;
  /** OOO status active until this date (ISO format) */
  oooUntil?: string;
}

/**
 * DTO for setting out-of-office status.
 */
export interface SetOOODto {
  /** User ID to receive delegated urgent notifications */
  backupUserId: string;
  /** Date/time when OOO ends (ISO format) */
  oooUntil: string;
}

/**
 * Response from OOO operations.
 */
export interface OOOResponse {
  success: boolean;
  oooUntil?: Date | string;
  backupUserId?: string;
}

/**
 * Organization-level notification settings.
 */
export interface OrgNotificationSettings {
  /** Categories that users cannot disable */
  enforcedCategories: string[];
  /** Default quiet hours start (HH:MM) */
  defaultQuietHoursStart: string | null;
  /** Default quiet hours end (HH:MM) */
  defaultQuietHoursEnd: string | null;
  /** Daily digest send time (HH:MM) */
  digestTime: string;
}

/**
 * Notification categories grouped by urgency for UI display.
 */
export const NOTIFICATION_CATEGORY_GROUPS = {
  urgent: [
    "ASSIGNMENT",
    "DEADLINE",
    "ESCALATION",
    "APPROVAL",
  ] as NotificationCategory[],
  activity: [
    "STATUS_UPDATE",
    "COMMENT",
    "COMPLETION",
  ] as NotificationCategory[],
  collaboration: ["MENTION", "INTERVIEW"] as NotificationCategory[],
} as const;

/**
 * Human-readable labels for notification categories.
 */
export const NOTIFICATION_CATEGORY_LABELS: Record<
  NotificationCategory,
  string
> = {
  ASSIGNMENT: "Assignments",
  DEADLINE: "Deadlines & Due Dates",
  ESCALATION: "SLA Escalations",
  APPROVAL: "Approval Requests",
  STATUS_UPDATE: "Status Changes",
  COMMENT: "Comments",
  COMPLETION: "Task Completions",
  MENTION: "@Mentions",
  INTERVIEW: "Interview Scheduling",
};

/**
 * Descriptions for notification categories.
 */
export const NOTIFICATION_CATEGORY_DESCRIPTIONS: Record<
  NotificationCategory,
  string
> = {
  ASSIGNMENT: "When a case, investigation, or task is assigned to you",
  DEADLINE: "Reminders for approaching due dates and SLA warnings",
  ESCALATION: "Critical alerts when SLAs are breached or cases escalate",
  APPROVAL: "Requests for your review and approval",
  STATUS_UPDATE: "When items you follow change status",
  COMMENT: "New comments on cases and investigations",
  COMPLETION: "When tasks or investigations you follow are completed",
  MENTION: "When someone mentions you in a comment",
  INTERVIEW: "Interview requests and scheduling updates",
};
