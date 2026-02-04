/**
 * Employee Portal Types
 *
 * Frontend type definitions for the Employee Portal.
 * Includes team management, proxy reporting, and dashboard types.
 */

/**
 * Team member information returned from the team endpoint.
 * Represents an employee that reports to the current user.
 */
export interface TeamMember {
  /** Employee ID */
  id: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Full display name */
  displayName: string;
  /** Email address */
  email: string;
  /** Job title */
  jobTitle: string | null;
  /** Department name */
  department: string | null;
  /** Business unit */
  businessUnit: string | null;
  /** Work location */
  location: string | null;
  /** Avatar URL (optional) */
  avatarUrl: string | null;
  /** Reporting depth (1 = direct report, 2 = skip-level, etc.) */
  reportingDepth: number;
  /** Employment status */
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}

/**
 * Proxy reason enum - matches backend enum.
 */
export enum ProxyReason {
  REQUESTED_BY_EMPLOYEE = 'REQUESTED_BY_EMPLOYEE',
  LANGUAGE_BARRIER = 'LANGUAGE_BARRIER',
  TECHNICAL_DIFFICULTY = 'TECHNICAL_DIFFICULTY',
  OTHER = 'OTHER',
}

/**
 * Proxy reason display configuration.
 */
export interface ProxyReasonOption {
  value: ProxyReason;
  label: string;
  description: string;
  requiresCustomReason: boolean;
}

/**
 * Proxy reason options for the UI.
 */
export const PROXY_REASON_OPTIONS: ProxyReasonOption[] = [
  {
    value: ProxyReason.REQUESTED_BY_EMPLOYEE,
    label: 'Employee requested I submit on their behalf',
    description: 'The employee asked you to file this report for them.',
    requiresCustomReason: false,
  },
  {
    value: ProxyReason.LANGUAGE_BARRIER,
    label: 'Employee has language barriers',
    description: 'The employee has difficulty communicating in the available languages.',
    requiresCustomReason: false,
  },
  {
    value: ProxyReason.TECHNICAL_DIFFICULTY,
    label: 'Employee has technical difficulties',
    description: 'The employee is unable to access the reporting system.',
    requiresCustomReason: false,
  },
  {
    value: ProxyReason.OTHER,
    label: 'Other reason',
    description: 'Please provide a reason for submitting on behalf of this employee.',
    requiresCustomReason: true,
  },
];

/**
 * Proxy report submission request.
 */
export interface ProxyReportRequest {
  /** ID of the employee being reported for */
  employeeId: string;
  /** Proxy reason */
  proxyReason: ProxyReason;
  /** Custom reason text (required if reason is OTHER) */
  customReason?: string;
  /** Category ID */
  categoryId: string;
  /** Report description */
  description: string;
  /** Whether report is urgent */
  isUrgent: boolean;
  /** Category-specific fields */
  categoryFields?: Record<string, unknown>;
  /** Attachment IDs */
  attachmentIds?: string[];
}

/**
 * Proxy report submission result.
 */
export interface ProxySubmissionResult {
  /** Reference number like RPT-12345 */
  referenceNumber: string;
  /** Employee name the report was filed for */
  employeeName: string;
  /** Employee email where access code was sent */
  employeeEmail: string;
  /** Timestamp of submission */
  submittedAt: string;
}

/**
 * Current user info with manager status.
 */
export interface CurrentUserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  isManager: boolean;
  teamSize: number;
}
