/**
 * Email Template Constants
 *
 * Provides type-safe template IDs for use throughout the notification system.
 * Templates are loaded from the filesystem (*.mjml.hbs files) and subjects
 * are defined in _subjects.json.
 *
 * @see EmailTemplateService for rendering logic
 */

// ============================================================================
// Assignment Templates
// ============================================================================

/** Case assignment notification template */
export const ASSIGNMENT_CASE_ASSIGNED_TEMPLATE = "assignment/case-assigned";

// ============================================================================
// Deadline Templates
// ============================================================================

/** SLA warning notification template */
export const DEADLINE_SLA_WARNING_TEMPLATE = "deadline/sla-warning";

/** SLA breach notification template */
export const DEADLINE_SLA_BREACH_TEMPLATE = "deadline/sla-breach";

// ============================================================================
// Digest Templates
// ============================================================================

/** Daily digest email template */
export const DIGEST_DAILY_TEMPLATE = "digest/daily-digest";

// ============================================================================
// Support Templates
// ============================================================================

/** Support ticket confirmation template */
export const SUPPORT_TICKET_CONFIRMATION_TEMPLATE =
  "support/ticket-confirmation";

// ============================================================================
// Reporter Templates (Anonymous Communication Relay)
// ============================================================================

/**
 * Access code delivery email template.
 *
 * Sent to reporters (with provided email) when RIU is created.
 * Contains: referenceNumber, accessCode, portalUrl
 * NOTE: Sent with random 1-6hr delay to prevent timing attacks.
 */
export const REPORTER_ACCESS_CODE_TEMPLATE = "reporter/access-code";

/**
 * New message notification email template.
 *
 * Sent to reporters when investigator sends a message.
 * IMPORTANT: Does NOT include message content for privacy/security.
 * Contains: referenceNumber, portalUrl, hasAccessCode
 * NOTE: Sent with random 1-6hr delay to prevent timing attacks.
 */
export const REPORTER_MESSAGE_NOTIFICATION_TEMPLATE =
  "reporter/message-notification";

// ============================================================================
// Template Registry
// ============================================================================

/**
 * Registry of all available email templates.
 * Use this object for type-safe template access and enumeration.
 */
export const EMAIL_TEMPLATES = {
  // Assignment
  CASE_ASSIGNED: ASSIGNMENT_CASE_ASSIGNED_TEMPLATE,

  // Deadline/SLA
  SLA_WARNING: DEADLINE_SLA_WARNING_TEMPLATE,
  SLA_BREACH: DEADLINE_SLA_BREACH_TEMPLATE,

  // Digest
  DAILY_DIGEST: DIGEST_DAILY_TEMPLATE,

  // Support
  TICKET_CONFIRMATION: SUPPORT_TICKET_CONFIRMATION_TEMPLATE,

  // Reporter (Anonymous Relay)
  REPORTER_ACCESS_CODE: REPORTER_ACCESS_CODE_TEMPLATE,
  REPORTER_MESSAGE_NOTIFICATION: REPORTER_MESSAGE_NOTIFICATION_TEMPLATE,
} as const;

/**
 * Type representing valid template IDs.
 */
export type EmailTemplateId =
  (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];
