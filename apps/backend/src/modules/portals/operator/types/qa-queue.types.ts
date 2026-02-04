/**
 * QA Queue Types for Operator Console
 *
 * Types for the QA review workflow where reviewers process hotline RIUs.
 */

import { RiuQaStatus, Severity } from "@prisma/client";

/**
 * Filters for querying the QA queue.
 */
export interface QaQueueFilters {
  /** Filter by client organization ID */
  clientId?: string;
  /** Minimum severity to include */
  severityMin?: Severity;
  /** Filter by creating operator */
  operatorId?: string;
  /** Filter from date */
  dateFrom?: Date;
  /** Filter to date */
  dateTo?: Date;
  /** Page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
}

/**
 * Item in the QA queue list view.
 */
export interface QaQueueItem {
  /** RIU ID */
  riuId: string;
  /** Reference number (e.g., RIU-2026-00001) */
  referenceNumber: string;
  /** Category name */
  category: string | null;
  /** Category code */
  categoryCode: string | null;
  /** Severity score */
  severityScore: Severity | null;
  /** Client organization name */
  clientName: string;
  /** Client organization ID */
  clientId: string;
  /** Creating operator name */
  operatorName: string;
  /** Creating operator ID */
  operatorId: string;
  /** When created */
  createdAt: Date;
  /** Current QA status */
  qaStatus: RiuQaStatus;
  /** Reviewer ID if claimed */
  qaReviewerId: string | null;
  /** When claimed for review */
  qaClaimedAt: Date | null;
  /** Priority flags */
  flags: QaQueueFlag[];
}

/**
 * Flags that can be applied to QA queue items.
 */
export enum QaQueueFlag {
  /** High severity (CRITICAL or HIGH) */
  HIGH_SEVERITY = "HIGH_SEVERITY",
  /** Contains QA trigger keyword */
  KEYWORD_TRIGGER = "KEYWORD_TRIGGER",
  /** In high-risk category */
  HIGH_RISK_CATEGORY = "HIGH_RISK_CATEGORY",
  /** Urgent flag set by operator */
  URGENT = "URGENT",
  /** Previously rejected, needs re-review */
  RESUBMISSION = "RESUBMISSION",
}

/**
 * Full detail for a QA item being reviewed.
 */
export interface QaItemDetail {
  /** RIU ID */
  riuId: string;
  /** Reference number */
  referenceNumber: string;
  /** Client organization */
  client: {
    id: string;
    name: string;
    slug: string;
  };
  /** Category */
  category: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  /** Severity */
  severity: Severity | null;
  /** Report content */
  content: string;
  /** Summary (if provided) */
  summary: string | null;
  /** Reporter type */
  reporterType: string;
  /** Creating operator */
  operator: {
    id: string;
    name: string;
  };
  /** Call metadata */
  callMetadata: {
    duration: number | null;
    interpreterUsed: boolean;
    interpreterLanguage: string | null;
    callerDemeanor: string | null;
    callbackRequested: boolean;
    callbackNumber: string | null;
  };
  /** Operator notes */
  operatorNotes: string | null;
  /** QA status */
  qaStatus: RiuQaStatus;
  /** QA reviewer (if claimed) */
  qaReviewer: {
    id: string;
    name: string;
  } | null;
  /** When claimed */
  qaClaimedAt: Date | null;
  /** Previous QA notes (if re-review) */
  qaNotes: string | null;
  /** Previous rejection reason (if re-review) */
  qaRejectionReason: string | null;
  /** When created */
  createdAt: Date;
  /** Priority flags */
  flags: QaQueueFlag[];
  /** Attachments */
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }>;
}

/**
 * DTO for QA edits when releasing an RIU.
 */
export interface QaEditsDto {
  /** Updated summary */
  summary?: string;
  /** Updated category ID */
  categoryId?: string;
  /** Updated severity score */
  severityScore?: Severity;
  /** QA reviewer notes */
  editNotes?: string;
}

/**
 * Paginated result for QA queue.
 */
export interface PaginatedQaQueueResult {
  data: QaQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
