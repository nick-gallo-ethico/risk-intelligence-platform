/**
 * Chatbot services barrel export.
 *
 * Services:
 * - FaqService: FAQ CRUD and full-text search matching
 * - ConsentService: GDPR-compliant consent tracking (append-only)
 * - CaseStatusService: Secure case status lookup via access code
 * - EscalationService: Chatbot inquiry escalation to compliance team
 */

export * from "./faq.service";
export * from "./consent.service";
export * from "./case-status.service";
export * from "./escalation.service";
