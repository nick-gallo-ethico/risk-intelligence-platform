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
  type: "generate-summary" | "translate" | "categorize" | "note-cleanup";
  entityType: string;
  entityId: string;
  content?: string;
  targetLanguage?: string;
}

/**
 * Email delivery job data
 */
export interface EmailJobData extends BaseJobData {
  /** Email template ID */
  templateId: string;
  /** Recipient email address(es) */
  to: string | string[];
  /** Email subject line */
  subject?: string;
  /** Template context data for variable substitution */
  context: Record<string, unknown>;
  /** Notification record ID (for delivery tracking) */
  notificationId?: string;
  /** Pre-rendered HTML content (optional, bypasses template rendering) */
  html?: string;
}

/**
 * Report export job data
 */
export interface ExportJobData extends BaseJobData {
  /** Report execution record ID */
  executionId: string;
  /** Report template ID */
  templateId: string;
  /** Filters to apply */
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  /** Export format */
  format: "excel" | "csv";
}

/**
 * Search indexing job data
 */
export interface IndexingJobData extends BaseJobData {
  operation: "create" | "update" | "delete" | "reindex";
  entityType: string;
  entityId: string;
  data?: Record<string, unknown>;
}
