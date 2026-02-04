/**
 * Employee history types for the "My History" views.
 * Provides summary interfaces for reports, disclosures, and attestations.
 */

/**
 * Summary of a report (RIU) submitted by an employee.
 * Excludes internal details like investigator notes.
 */
export interface ReportSummary {
  /** RIU ID */
  id: string;
  /** Reference number (RIU-YYYY-NNNNN) */
  referenceNumber: string;
  /** Category name */
  category: string | null;
  /** RIU status */
  status: string;
  /** When the report was submitted */
  submittedAt: Date;
  /** Linked case status (if case was created) */
  caseStatus?: string;
  /** Whether the reporter can communicate via access code */
  hasAccessCode: boolean;
}

/**
 * Summary of a disclosure assignment/submission.
 */
export interface DisclosureSummary {
  /** CampaignAssignment ID */
  id: string;
  /** Disclosure type (COI, GIFT, etc.) */
  type: string | null;
  /** Campaign name */
  campaignName: string;
  /** Assignment status */
  status: string;
  /** When the disclosure was submitted (if completed) */
  submittedAt: Date | null;
  /** Next review date (if applicable) */
  nextReviewDate?: Date;
  /** Due date for the assignment */
  dueDate: Date;
}

/**
 * Summary of an attestation assignment.
 */
export interface AttestationSummary {
  /** CampaignAssignment ID */
  id: string;
  /** Policy name (from campaign) */
  policyName: string;
  /** Campaign name */
  campaignName: string;
  /** Due date */
  dueDate: Date;
  /** When completed (null if pending) */
  completedAt: Date | null;
  /** Status */
  status: string;
}

/**
 * Compliance overview with counts and score.
 */
export interface ComplianceOverview {
  /** Report counts */
  reports: {
    total: number;
    pending: number;
  };
  /** Disclosure counts */
  disclosures: {
    total: number;
    upcomingReviews: number;
  };
  /** Attestation counts */
  attestations: {
    total: number;
    pending: number;
    overdue: number;
  };
  /** Overall compliance score (0-100) */
  complianceScore: number;
}

/**
 * Pagination options for history queries.
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Paginated result structure.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
