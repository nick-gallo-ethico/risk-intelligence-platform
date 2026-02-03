/**
 * Export Queue Configuration
 *
 * Handles async report export jobs for large datasets.
 * Exports run in background to avoid blocking API requests.
 * Uses fixed delay retry for predictable behavior.
 */
export const EXPORT_QUEUE_NAME = "export";

export const EXPORT_QUEUE_OPTIONS = {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "fixed" as const,
      delay: 5000, // 5s between retries
    },
    removeOnComplete: {
      count: 100,
      age: 60 * 60, // 1 hour
    },
    removeOnFail: {
      count: 500,
      age: 24 * 60 * 60, // 1 day
    },
  },
};
