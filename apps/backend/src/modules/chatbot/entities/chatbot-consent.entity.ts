/**
 * Chatbot consent log entity interfaces matching Prisma ChatbotConsentLog model.
 * CRITICAL: This is append-only for GDPR compliance - records are NEVER updated or deleted.
 */

/**
 * Type of consent being captured.
 */
export enum ConsentType {
  /** Initial data processing consent */
  DATA_PROCESSING = "DATA_PROCESSING",
  /** Consent to store conversation history */
  CONVERSATION_STORAGE = "CONVERSATION_STORAGE",
  /** Consent for AI-assisted responses */
  AI_ASSISTANCE = "AI_ASSISTANCE",
  /** Consent to escalate to human agent */
  ESCALATION = "ESCALATION",
  /** GDPR-specific right to be forgotten acknowledgment */
  RIGHT_TO_ERASURE = "RIGHT_TO_ERASURE",
}

/**
 * Chatbot consent log record for GDPR compliance.
 * APPEND-ONLY: Records in this table are NEVER updated or deleted.
 */
export interface ChatbotConsentLog {
  id: string;
  organizationId: string;
  /** Anonymous session identifier */
  sessionId: string;
  /** Type of consent being captured */
  consentType: string;
  /** Version of the consent text (for tracking changes) */
  consentVersion: string;
  /** Full text that was shown to the user */
  consentTextShown: string;
  /** Whether user accepted or declined */
  consentGiven: boolean;
  /** IP address for audit purposes */
  ipAddress?: string;
  /** User agent for audit purposes */
  userAgent?: string;
  /** Timestamp when consent was captured */
  capturedAt: Date;
}

/**
 * Consent configuration for a tenant.
 * Stored in Organization.settings.chatbot.consent
 */
export interface ConsentConfig {
  /** Current version of consent text */
  version: string;
  /** Consent text by type */
  texts: Record<string, string>;
  /** Whether consent is required before chat */
  requiredBeforeChat: boolean;
  /** Types of consent required */
  requiredTypes: ConsentType[];
}

/**
 * Session consent status for runtime checks.
 */
export interface SessionConsentStatus {
  sessionId: string;
  /** Consents that have been given */
  givenConsents: ConsentType[];
  /** Whether all required consents have been given */
  allRequiredConsentsGiven: boolean;
  /** Last consent capture timestamp */
  lastConsentAt?: Date;
}
