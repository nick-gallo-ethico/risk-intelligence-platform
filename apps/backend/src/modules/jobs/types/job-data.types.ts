/**
 * Job Data Types
 *
 * Type definitions for job payloads across all queues.
 * All jobs require organizationId for tenant isolation.
 */

/**
 * Base interface for all job data.
 * Ensures tenant isolation via organizationId.
 */
export interface BaseJobData {
  /** Tenant identifier - REQUIRED for multi-tenancy */
  organizationId: string;
  /** Optional correlation ID for tracing across services */
  correlationId?: string;
}

/**
 * AI Processing job data
 */
export interface AiJobData extends BaseJobData {
  type: 'generate-summary' | 'translate' | 'categorize' | 'note-cleanup';
  entityType: string;
  entityId: string;
  content?: string;
  targetLanguage?: string;
}

/**
 * Email delivery job data
 */
export interface EmailJobData extends BaseJobData {
  templateId: string;
  to: string | string[];
  subject?: string;
  context: Record<string, unknown>;
}

/**
 * Search indexing job data
 */
export interface IndexingJobData extends BaseJobData {
  operation: 'create' | 'update' | 'delete' | 'reindex';
  entityType: string;
  entityId: string;
  data?: Record<string, unknown>;
}
