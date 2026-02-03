/**
 * AI Processing Queue Configuration
 *
 * Handles AI-related jobs: summarization, translation, categorization, note cleanup.
 * Higher retry count (5) due to potential API rate limiting.
 * Exponential backoff: 2s, 4s, 8s, 16s, 32s
 */
export const AI_QUEUE_NAME = "ai-processing";

export const AI_QUEUE_OPTIONS = {
  defaultJobOptions: {
    attempts: 5, // AI calls get more retries (rate limiting, transient failures)
    backoff: {
      type: "exponential" as const,
      delay: 2000, // 2s, 4s, 8s, 16s, 32s
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 60 * 60, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 60 * 60, // 7 days for investigation
    },
  },
};
