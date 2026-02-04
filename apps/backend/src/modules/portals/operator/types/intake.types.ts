/**
 * Intake Types for Operator Console
 *
 * Types for hotline call intake workflow where operators create RIUs.
 */

import { RiuQaStatus, Severity } from "@prisma/client";

/**
 * RIU type from a hotline call.
 * Maps to specific RIU types but with operator-friendly names.
 */
export enum RiuTypeFromCall {
  /** A genuine ethics/compliance report that will create a Case */
  REPORT = "REPORT",
  /** Request for information - non-issue, caller has a question */
  REQUEST_FOR_INFO = "REQUEST_FOR_INFO",
  /** Wrong number - not intended for ethics hotline */
  WRONG_NUMBER = "WRONG_NUMBER",
}

/**
 * Result returned when creating an RIU from a hotline call.
 */
export interface IntakeResult {
  /** The created RIU ID */
  riuId: string;
  /** Generated reference number (e.g., RIU-2026-00001) */
  referenceNumber: string;
  /** Access code for anonymous reporters (null if identified) */
  accessCode: string | null;
  /** Whether this RIU requires QA review */
  requiresQa: boolean;
  /** Current QA status */
  qaStatus: RiuQaStatus;
}

/**
 * Summary of an RIU in the operator's queue.
 */
export interface IntakeSummary {
  /** RIU ID */
  riuId: string;
  /** Reference number */
  referenceNumber: string;
  /** Client organization name */
  clientName: string;
  /** Category name (null if not classified) */
  category: string | null;
  /** Severity level */
  severity: Severity | null;
  /** When created */
  createdAt: Date;
  /** Current QA status */
  qaStatus: RiuQaStatus;
  /** RIU type from call */
  riuType: RiuTypeFromCall;
}

/**
 * Context returned when looking up existing RIU by access code.
 * Used for follow-up calls (OPER-08).
 */
export interface FollowUpContext {
  /** RIU ID */
  riuId: string;
  /** Case ID if RIU is linked to a case */
  caseId: string | null;
  /** Case reference number if linked */
  caseReferenceNumber: string | null;
  /** RIU reference number */
  referenceNumber: string;
  /** Category name */
  category: string | null;
  /** Client organization name */
  clientName: string;
  /** Current RIU status */
  status: string;
  /** Number of messages in thread */
  messageCount: number;
  /** Last message timestamp */
  lastMessageAt: Date | null;
  /** Can add notes (only if case exists) */
  canAddNotes: boolean;
}

/**
 * Disposition of a follow-up call.
 */
export enum FollowUpDisposition {
  /** Scheduled a callback for later */
  CALLBACK_SCHEDULED = "CALLBACK_SCHEDULED",
  /** Provided information to caller */
  INFO_PROVIDED = "INFO_PROVIDED",
  /** Escalated to supervisor/QA */
  ESCALATED = "ESCALATED",
  /** Follow-up closed - no further action needed */
  CLOSED = "CLOSED",
}
