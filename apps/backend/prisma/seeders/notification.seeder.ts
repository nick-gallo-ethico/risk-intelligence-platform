/**
 * Notification Seeder
 *
 * Creates realistic notification records for demo users so the Notifications page
 * displays meaningful activity rather than being blank.
 *
 * Generates 50-100 notifications per demo user with:
 * - Mix of notification types (ASSIGNMENT, STATUS_UPDATE, COMMENT, etc.)
 * - Mix of channels (IN_APP, EMAIL)
 * - Mix of read/unread status (70% read, 30% unread)
 * - Timestamps spread over last 30 days
 * - Links to real case entities when applicable
 *
 * Uses deterministic seeding for reproducibility.
 */

import {
  PrismaClient,
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from "@prisma/client";
import { faker } from "@faker-js/faker";

// Seed offset for reproducibility (masterSeed + 700 for notifications)
const SEED_OFFSET = 700;

// Master seed from research config
const SEED_CONFIG = {
  masterSeed: 20260202,
};

/**
 * Notification type distribution (percentages)
 */
const NOTIFICATION_TYPE_DISTRIBUTION: {
  type: NotificationType;
  weight: number;
}[] = [
  { type: NotificationType.ASSIGNMENT, weight: 30 },
  { type: NotificationType.STATUS_UPDATE, weight: 20 },
  { type: NotificationType.COMMENT, weight: 15 },
  { type: NotificationType.ESCALATION, weight: 10 },
  { type: NotificationType.DEADLINE, weight: 10 },
  { type: NotificationType.APPROVAL, weight: 10 },
  { type: NotificationType.COMPLETION, weight: 5 },
];

/**
 * Notification title templates by type
 */
const NOTIFICATION_TITLES: Record<NotificationType, string[]> = {
  [NotificationType.ASSIGNMENT]: [
    "New case assigned to you",
    "Case reassigned to you",
    "Investigation assigned",
    "You have been assigned a new task",
    "Case transfer - now assigned to you",
  ],
  [NotificationType.STATUS_UPDATE]: [
    "Case status changed",
    "Investigation status updated",
    "Case moved to new stage",
    "Status changed to In Progress",
    "Case escalated",
  ],
  [NotificationType.COMMENT]: [
    "New comment on your case",
    "Someone mentioned you in a comment",
    "Reply to your comment",
    "New note added to case",
    "Comment requires your attention",
  ],
  [NotificationType.ESCALATION]: [
    "Case escalated - requires attention",
    "SLA breach imminent",
    "High priority case needs review",
    "Escalation: Case overdue",
    "Urgent: Immediate action required",
  ],
  [NotificationType.DEADLINE]: [
    "Deadline approaching",
    "Task due tomorrow",
    "Investigation deadline in 3 days",
    "Reminder: Case due soon",
    "Deadline reminder",
  ],
  [NotificationType.APPROVAL]: [
    "Approval requested",
    "Policy awaiting your approval",
    "Review and approve case closure",
    "Approval needed for investigation",
    "Pending approval",
  ],
  [NotificationType.COMPLETION]: [
    "Investigation completed",
    "Case closed successfully",
    "Task marked as complete",
    "Workflow step completed",
    "Case resolved",
  ],
  [NotificationType.INTERVIEW]: [
    "Interview scheduled",
    "Interview reminder",
    "Interview rescheduled",
  ],
  [NotificationType.MENTION]: [
    "You were mentioned",
    "Someone mentioned you in a case",
  ],
  [NotificationType.DIGEST]: ["Daily digest", "Weekly summary"],
};

/**
 * Notification body templates by type
 */
const NOTIFICATION_BODIES: Record<NotificationType, string[]> = {
  [NotificationType.ASSIGNMENT]: [
    "A case has been assigned to you for investigation. Please review the details and begin work.",
    "You have been assigned to handle this case. Review the intake information and proceed.",
    "This case requires your attention. Please acknowledge assignment and update status.",
    "A new case matching your expertise has been assigned. Review and prioritize accordingly.",
    "Case transferred from another investigator. Review notes and continue investigation.",
  ],
  [NotificationType.STATUS_UPDATE]: [
    "The case status has been updated. Review the changes and any new information.",
    "This case has moved to the next stage in the workflow.",
    "Status change notification - please review the updated case details.",
    "The investigation status has been updated by the assigned team member.",
    "Case progression update - new stage requires different actions.",
  ],
  [NotificationType.COMMENT]: [
    "A new comment has been added that may require your input or acknowledgment.",
    "You have been mentioned in a comment. Please review and respond if necessary.",
    "Someone has replied to your comment on this case.",
    "New information has been added via comment. Please review.",
    "A colleague has left a note requesting your input.",
  ],
  [NotificationType.ESCALATION]: [
    "This case has been escalated due to complexity or timeline concerns.",
    "SLA deadline is approaching. Please prioritize this case.",
    "This high-priority case requires immediate attention from senior staff.",
    "The case has exceeded expected timeline and requires escalation review.",
    "Urgent action required - case has been flagged for immediate attention.",
  ],
  [NotificationType.DEADLINE]: [
    "This task is due soon. Please ensure completion before the deadline.",
    "Reminder: The deadline for this case is approaching.",
    "Please prioritize completion of this item before the due date.",
    "Deadline notification - action required within the next few days.",
    "Time-sensitive: This case requires attention before the deadline.",
  ],
  [NotificationType.APPROVAL]: [
    "A case or policy requires your approval before proceeding.",
    "Please review and approve the pending request.",
    "Your approval is needed to close this investigation.",
    "An item awaits your review and approval.",
    "Please review the attached and provide your approval decision.",
  ],
  [NotificationType.COMPLETION]: [
    "This case has been successfully resolved and closed.",
    "The investigation has concluded with findings documented.",
    "All required tasks have been completed for this case.",
    "Case closed - final report available for review.",
    "Workflow completed successfully.",
  ],
  [NotificationType.INTERVIEW]: [
    "An interview has been scheduled. Please confirm your availability.",
    "Reminder: Interview scheduled for tomorrow.",
    "The interview time has been changed. Please note the new schedule.",
  ],
  [NotificationType.MENTION]: [
    "You have been mentioned in a case discussion.",
    "A colleague has mentioned you and may need your input.",
  ],
  [NotificationType.DIGEST]: [
    "Here is your daily summary of notifications and activities.",
    "Your weekly digest is ready for review.",
  ],
};

/**
 * Get weighted random notification type
 */
function getRandomNotificationType(): NotificationType {
  const totalWeight = NOTIFICATION_TYPE_DISTRIBUTION.reduce(
    (sum, item) => sum + item.weight,
    0,
  );
  let random = faker.number.int({ min: 0, max: totalWeight - 1 });

  for (const item of NOTIFICATION_TYPE_DISTRIBUTION) {
    if (random < item.weight) {
      return item.type;
    }
    random -= item.weight;
  }

  return NotificationType.ASSIGNMENT;
}

/**
 * Get random notification channel (80% IN_APP, 20% EMAIL)
 */
function getRandomChannel(): NotificationChannel {
  return faker.number.int({ min: 1, max: 100 }) <= 80
    ? NotificationChannel.IN_APP
    : NotificationChannel.EMAIL;
}

/**
 * Get random read status (70% read, 30% unread)
 */
function getRandomReadStatus(): { isRead: boolean; readAt: Date | null } {
  const isRead = faker.number.int({ min: 1, max: 100 }) <= 70;
  return {
    isRead,
    readAt: isRead ? faker.date.recent({ days: 7 }) : null,
  };
}

/**
 * Generate a random date within the last 30 days
 */
function getRandomDate(): Date {
  return faker.date.recent({ days: 30 });
}

/**
 * Seed notifications for demo users
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID to seed notifications for
 * @param userIds - Array of user IDs to create notifications for
 * @param caseIds - Array of case IDs to link notifications to
 * @returns Number of notifications created
 */
export async function seedNotifications(
  prisma: PrismaClient,
  organizationId: string,
  userIds: string[],
  caseIds: string[],
): Promise<number> {
  // Set deterministic seed for reproducibility
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  // Clear existing notifications for this organization (idempotent re-runs)
  await prisma.notification.deleteMany({
    where: { organizationId },
  });

  const notifications: Array<{
    organizationId: string;
    userId: string;
    channel: NotificationChannel;
    type: NotificationType;
    status: NotificationStatus;
    title: string;
    body: string | null;
    entityType: string | null;
    entityId: string | null;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  // Generate 50-100 notifications per user
  for (const userId of userIds) {
    const notificationCount = faker.number.int({ min: 50, max: 100 });

    for (let i = 0; i < notificationCount; i++) {
      const type = getRandomNotificationType();
      const channel = getRandomChannel();
      const { isRead, readAt } = getRandomReadStatus();
      const createdAt = getRandomDate();

      // Select random title and body for this type
      const titles = NOTIFICATION_TITLES[type];
      const bodies = NOTIFICATION_BODIES[type];
      const title =
        titles[faker.number.int({ min: 0, max: titles.length - 1 })];
      const body = bodies[faker.number.int({ min: 0, max: bodies.length - 1 })];

      // Link to a case for case-related notification types (70% of the time)
      let entityType: string | null = null;
      let entityId: string | null = null;

      const caseRelatedTypes = [
        NotificationType.ASSIGNMENT,
        NotificationType.STATUS_UPDATE,
        NotificationType.COMMENT,
        NotificationType.ESCALATION,
        NotificationType.DEADLINE,
        NotificationType.COMPLETION,
      ];

      if (
        caseRelatedTypes.includes(type) &&
        caseIds.length > 0 &&
        faker.number.int({ min: 1, max: 100 }) <= 70
      ) {
        entityType = "CASE";
        entityId =
          caseIds[faker.number.int({ min: 0, max: caseIds.length - 1 })];
      }

      // Determine status based on channel and read state
      let status: NotificationStatus;
      if (channel === NotificationChannel.EMAIL) {
        status = faker.helpers.arrayElement([
          NotificationStatus.SENT,
          NotificationStatus.DELIVERED,
        ]);
      } else {
        status = isRead
          ? NotificationStatus.READ
          : NotificationStatus.DELIVERED;
      }

      notifications.push({
        organizationId,
        userId,
        channel,
        type,
        status,
        title,
        body,
        entityType,
        entityId,
        isRead,
        readAt,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  // Batch insert notifications
  const BATCH_SIZE = 500;
  let totalCreated = 0;

  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    await prisma.notification.createMany({
      data: batch,
    });
    totalCreated += batch.length;
  }

  console.log(
    `  Created ${totalCreated} notifications for ${userIds.length} users`,
  );

  return totalCreated;
}
