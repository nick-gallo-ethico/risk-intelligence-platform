/**
 * Search Indexing Queue Configuration
 *
 * Handles Elasticsearch indexing operations: create, update, delete, reindex.
 * Lower priority (5) as these are bulk/background operations.
 * Fixed delay backoff for consistent retry timing.
 */
export const INDEXING_QUEUE_NAME = 'indexing';

export const INDEXING_QUEUE_OPTIONS = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed' as const,
      delay: 5000, // 5s fixed delay between retries
    },
    priority: 5, // Lower priority (bulk operations)
    removeOnComplete: {
      count: 2000,
      age: 6 * 60 * 60, // 6 hours
    },
    removeOnFail: {
      count: 5000,
      age: 24 * 60 * 60, // 24 hours
    },
  },
};
