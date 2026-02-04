/**
 * Ethics Portal Types
 *
 * Frontend type definitions for the Ethics Portal status check and messaging.
 * These types represent the reporter-facing interface for anonymous report tracking.
 */

/**
 * Report status enum - what the reporter sees.
 * These are simplified statuses that hide internal process details.
 */
export enum ReportStatusEnum {
  /** Report has been received and is being processed */
  RECEIVED = 'RECEIVED',
  /** Report is under active review */
  UNDER_REVIEW = 'UNDER_REVIEW',
  /** Investigator needs additional information from reporter */
  ADDITIONAL_INFO_NEEDED = 'ADDITIONAL_INFO_NEEDED',
  /** Report has been closed */
  CLOSED = 'CLOSED',
}

/**
 * Report status response from the API.
 * Contains only what reporters should see - no internal details.
 */
export interface ReportStatus {
  /** Public reference number (e.g., RPT-12345) */
  referenceNumber: string;
  /** Current status enum value */
  status: ReportStatusEnum;
  /** Human-readable status label */
  statusLabel: string;
  /** Brief description of what the status means */
  statusDescription: string;
  /** Whether the reporter can send messages (false if case closed) */
  canMessage: boolean;
  /** Whether there are unread messages from the investigator */
  hasUnreadMessages: boolean;
  /** Unread message count */
  unreadCount: number;
  /** Last status update timestamp */
  lastUpdated: string;
}

/**
 * Message direction for the two-way communication thread.
 */
export type MessageDirection = 'inbound' | 'outbound';

/**
 * Message attachment (file sent with a message).
 */
export interface MessageAttachment {
  /** Attachment ID */
  id: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Download URL (time-limited signed URL) */
  downloadUrl?: string;
  /** Thumbnail URL for images */
  thumbnailUrl?: string;
}

/**
 * A single message in the two-way communication thread.
 */
export interface ReporterMessage {
  /** Message ID */
  id: string;
  /** Direction: 'inbound' from investigator, 'outbound' from reporter */
  direction: MessageDirection;
  /** Message content (may contain markdown) */
  content: string;
  /** When the message was sent */
  createdAt: string;
  /** When the message was read (for reporter messages) */
  readAt?: string;
  /** Optional attachments */
  attachments?: MessageAttachment[];
  /** Whether this is a structured question form */
  isStructuredQuestion?: boolean;
  /** Structured question fields (if isStructuredQuestion is true) */
  structuredFields?: StructuredQuestionField[];
}

/**
 * Structured question field for investigator-sent forms.
 */
export interface StructuredQuestionField {
  /** Field ID */
  id: string;
  /** Field label/question */
  label: string;
  /** Field type */
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'boolean';
  /** Whether the field is required */
  required: boolean;
  /** Options for select/multiselect fields */
  options?: string[];
  /** Current value (filled by reporter) */
  value?: string | string[] | boolean;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Access code validation response.
 */
export interface AccessCodeValidation {
  /** Whether the code is valid */
  isValid: boolean;
  /** If locked out, when the lockout expires */
  lockoutUntil?: string;
  /** Remaining attempts before lockout */
  attemptsRemaining?: number;
  /** Error message if invalid */
  errorMessage?: string;
}

/**
 * Request body for sending a message from the reporter.
 */
export interface SendMessageRequest {
  /** Message content */
  content: string;
  /** Optional attachment IDs (already uploaded) */
  attachmentIds?: string[];
  /** Structured field responses (if responding to structured question) */
  structuredResponses?: Record<string, string | string[] | boolean>;
}

/**
 * Status check API response.
 */
export interface StatusCheckResponse {
  /** Report status */
  status: ReportStatus;
  /** Message thread */
  messages: ReporterMessage[];
}

/**
 * Rate limit error response.
 */
export interface RateLimitError {
  /** HTTP status code (429) */
  statusCode: 429;
  /** Error message */
  message: string;
  /** When the rate limit resets */
  retryAfter: string;
  /** Seconds until retry is allowed */
  retryAfterSeconds: number;
}
