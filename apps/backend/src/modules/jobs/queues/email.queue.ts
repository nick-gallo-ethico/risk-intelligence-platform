/**
 * Email Queue Configuration
 *
 * Handles email delivery jobs: notifications, reports, attestation reminders.
 * Higher priority (2) since emails are often time-sensitive.
 * Exponential backoff: 1s, 2s, 4s
 */
export const EMAIL_QUEUE_NAME = "email";

export const EMAIL_QUEUE_OPTIONS = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 1000, // 1s, 2s, 4s
    },
    priority: 2, // Higher priority than general tasks
    removeOnComplete: {
      count: 500,
      age: 12 * 60 * 60, // 12 hours
    },
    removeOnFail: {
      count: 1000,
      age: 3 * 24 * 60 * 60, // 3 days
    },
  },
};
