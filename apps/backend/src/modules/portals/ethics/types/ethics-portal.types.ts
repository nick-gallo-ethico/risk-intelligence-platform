/**
 * Ethics Portal Types
 *
 * Type definitions for the Ethics Portal public API.
 * These types are used for anonymous report submission, status checking,
 * and two-way messaging between reporters and investigators.
 */

/**
 * Result returned after a report is successfully submitted.
 */
export interface SubmissionResult {
  /** 12-character access code for status checks and messaging */
  accessCode: string;

  /** UUID of the created RIU */
  reportId: string;

  /** Human-readable confirmation number (same as RIU reference) */
  confirmationNumber: string;

  /** RIU reference number (e.g., RIU-2026-00001) */
  referenceNumber: string;

  /** Timestamp when report was received */
  submittedAt: Date;

  /** Status message for the reporter */
  statusMessage: string;
}

/**
 * Category information for form selection in Ethics Portal.
 */
export interface CategoryInfo {
  /** Category UUID */
  id: string;

  /** Category display name */
  name: string;

  /** Category description/help text */
  description: string | null;

  /** Parent category ID for hierarchical structure */
  parentId: string | null;

  /** Form definition ID for category-specific forms */
  formSchemaId: string | null;

  /** Icon identifier for UI display */
  icon: string | null;

  /** Whether this category is enabled for Ethics Portal submissions */
  isActive: boolean;

  /** Child categories (for tree structure) */
  children?: CategoryInfo[];
}

/**
 * Tenant-specific Ethics Portal configuration.
 */
export interface TenantEthicsConfig {
  /** Organization slug for URL routing */
  tenantSlug: string;

  /** Organization display name */
  organizationName: string;

  /** Whether Ethics Portal is enabled */
  isEnabled: boolean;

  /** Categories available for selection */
  categories: CategoryInfo[];

  /** Welcome message displayed on portal landing page */
  welcomeMessage: string | null;

  /** Anonymity options available (depends on organization settings) */
  anonymityOptions: {
    /** Allow fully anonymous reports */
    allowAnonymous: boolean;
    /** Allow confidential reports (identity known to Ethico only) */
    allowConfidential: boolean;
    /** Allow open/identified reports */
    allowOpen: boolean;
  };

  /** Demographic fields configuration */
  demographicFields: {
    /** Field key */
    key: string;
    /** Field label */
    label: string;
    /** Whether field is required */
    required: boolean;
    /** Field type (text, select, etc.) */
    type: string;
    /** Options for select fields */
    options?: string[];
  }[];

  /** Custom branding configuration */
  branding?: {
    logoUrl: string | null;
    primaryColor: string | null;
    footerText: string | null;
  };
}

/**
 * Result from uploading an attachment.
 */
export interface AttachmentResult {
  /** Temporary reference ID for use in report submission */
  tempId: string;

  /** Original file name */
  fileName: string;

  /** File size in bytes */
  size: number;

  /** MIME type of the file */
  contentType: string;

  /** Whether file is marked as sensitive */
  isSensitive: boolean;
}

/**
 * Draft report stored server-side for cross-device resume.
 */
export interface DraftReport {
  /** Draft access code for resume */
  draftCode: string;

  /** Tenant slug */
  tenantSlug: string;

  /** Partial report data */
  data: {
    categoryId?: string;
    content?: string;
    anonymityTier?: string;
    demographics?: Record<string, unknown>;
    formResponses?: Record<string, unknown>;
    attachmentIds?: string[];
  };

  /** When draft was last updated */
  updatedAt: Date;

  /** When draft expires (24 hours from creation) */
  expiresAt: Date;
}

/**
 * Report status for anonymous reporter status check.
 */
export interface ReportStatus {
  /** RIU reference number */
  referenceNumber: string;

  /** Current status (RECEIVED, UNDER_REVIEW, ADDITIONAL_INFO_NEEDED, CLOSED) */
  status: string;

  /** Human-readable status label */
  statusLabel: string;

  /** Detailed status description */
  statusDescription: string;

  /** Whether reporter can send messages */
  canMessage: boolean;

  /** Whether there are unread messages from investigators */
  hasUnreadMessages: boolean;

  /** When status was last updated */
  lastUpdated: Date;
}

/**
 * Message in the anonymous communication thread.
 */
export interface Message {
  /** Message UUID */
  id: string;

  /** Message direction relative to reporter */
  direction: "inbound" | "outbound";

  /** Message content */
  content: string;

  /** When message was created */
  createdAt: Date;

  /** When message was read (if applicable) */
  readAt: Date | null;

  /** Attachment references */
  attachments?: {
    id: string;
    fileName: string;
    size: number;
  }[];
}

/**
 * Anonymity tier for report submission.
 */
export const AnonymityTier = {
  /** Fully anonymous - no contact info collected */
  ANONYMOUS: "ANONYMOUS",
  /** Confidential - identity known to Ethico only */
  CONFIDENTIAL: "CONFIDENTIAL",
  /** Open - identity shared with investigators */
  OPEN: "OPEN",
} as const;

export type AnonymityTier = (typeof AnonymityTier)[keyof typeof AnonymityTier];

/**
 * Maps RIU status to reporter-friendly status labels.
 */
export const STATUS_LABEL_MAP: Record<string, string> = {
  PENDING_QA: "Under Review",
  IN_QA: "Under Review",
  QA_REJECTED: "Additional Information Needed",
  RELEASED: "Received",
  LINKED: "Under Investigation",
  CLOSED: "Closed",
  RECEIVED: "Received",
  COMPLETED: "Completed",
};

/**
 * Maps RIU status to reporter-friendly descriptions.
 */
export const STATUS_DESCRIPTION_MAP: Record<string, string> = {
  PENDING_QA: "Your report is being reviewed by our team.",
  IN_QA: "Your report is currently under review.",
  QA_REJECTED: "We need additional information. Please check messages below.",
  RELEASED: "Your report has been received and is being processed.",
  LINKED: "Your report has been assigned to an investigator.",
  CLOSED: "Your report has been closed. Thank you for reporting.",
  RECEIVED: "Your report has been received.",
  COMPLETED: "Your submission has been completed.",
};
