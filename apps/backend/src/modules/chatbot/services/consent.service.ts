import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RecordConsentDto } from "../dto";
import { ChatbotConsentLog, ConsentType } from "../entities";

/**
 * Result from consent check operation.
 */
export interface ConsentCheckResult {
  /** Whether session has valid consent */
  hasConsent: boolean;
  /** ID of the consent record if found */
  consentId?: string;
  /** Timestamp when consent was given */
  consentAt?: Date;
}

/**
 * Default consent text shown to users.
 */
export interface ConsentText {
  /** Version identifier for audit trail */
  version: string;
  /** Full consent text to display */
  text: string;
  /** Type of consent this text covers */
  type: string;
}

/**
 * ConsentService handles GDPR-compliant consent tracking for chatbot interactions.
 *
 * CRITICAL DESIGN PRINCIPLES:
 * - APPEND-ONLY: Consent records are NEVER updated or deleted (audit requirement)
 * - SESSION-BASED: Consent tied to session ID for anonymous users
 * - VERSION-TRACKED: Stores exact consent text shown for audit trail
 * - TIME-LIMITED: Consent validity period configurable (default 24 hours)
 *
 * This follows the immutable audit log pattern required for GDPR compliance.
 */
@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  /**
   * Consent validity period in milliseconds (24 hours).
   * After this period, consent must be re-captured.
   */
  private readonly CONSENT_VALIDITY_MS = 24 * 60 * 60 * 1000;

  /**
   * Default consent version for tracking consent text changes.
   */
  private readonly DEFAULT_CONSENT_VERSION = "1.0";

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if session has valid consent.
   * Returns true if consent was given within validity period.
   *
   * @param sessionId Anonymous session identifier
   * @param organizationId Tenant ID
   * @param consentType Type of consent to check (default: AI_USE)
   * @returns Consent check result with status and metadata
   */
  async checkConsent(
    sessionId: string,
    organizationId: string,
    consentType: string = "AI_USE",
  ): Promise<ConsentCheckResult> {
    const validSince = new Date(Date.now() - this.CONSENT_VALIDITY_MS);

    const consent = await this.prisma.chatbotConsentLog.findFirst({
      where: {
        sessionId,
        organizationId,
        consentType,
        consentGiven: true,
        capturedAt: { gte: validSince },
      },
      orderBy: { capturedAt: "desc" },
    });

    if (!consent) {
      return { hasConsent: false };
    }

    return {
      hasConsent: true,
      consentId: consent.id,
      consentAt: consent.capturedAt,
    };
  }

  /**
   * Record consent response (accept or decline).
   *
   * APPEND-ONLY: Creates new record, NEVER updates existing.
   * This is required for GDPR audit compliance - we must be able to
   * prove exactly what consent text was shown and when.
   *
   * @param organizationId Tenant ID
   * @param dto Consent record data
   * @returns ID of the created consent record
   */
  async recordConsent(
    organizationId: string,
    dto: RecordConsentDto,
  ): Promise<string> {
    // APPEND-ONLY: Always create new record, never update
    const consent = await this.prisma.chatbotConsentLog.create({
      data: {
        organizationId,
        sessionId: dto.sessionId,
        consentType: dto.consentType,
        consentVersion: dto.consentVersion,
        consentTextShown: dto.consentTextShown,
        consentGiven: dto.consentGiven,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });

    this.logger.debug(
      `Consent recorded: session=${dto.sessionId}, type=${dto.consentType}, given=${dto.consentGiven}`,
    );

    return consent.id;
  }

  /**
   * Get consent history for a session (for audit purposes).
   * Returns ALL consent records for the session, not just valid ones.
   *
   * @param sessionId Anonymous session identifier
   * @param organizationId Tenant ID
   * @returns Array of all consent records for this session
   */
  async getConsentHistory(
    sessionId: string,
    organizationId: string,
  ): Promise<ChatbotConsentLog[]> {
    const logs = await this.prisma.chatbotConsentLog.findMany({
      where: { sessionId, organizationId },
      orderBy: { capturedAt: "desc" },
    });

    return logs.map((log) => ({
      id: log.id,
      organizationId: log.organizationId,
      sessionId: log.sessionId,
      consentType: log.consentType as ConsentType,
      consentVersion: log.consentVersion,
      consentTextShown: log.consentTextShown,
      consentGiven: log.consentGiven,
      ipAddress: log.ipAddress ?? undefined,
      userAgent: log.userAgent ?? undefined,
      capturedAt: log.capturedAt,
    }));
  }

  /**
   * Get active consent text configuration for a tenant.
   * Uses default text if no tenant-specific config exists.
   *
   * TODO: In future, load from Organization.settings.chatbot.consent
   *
   * @param organizationId Tenant ID (for future tenant-specific text)
   * @returns Current consent text and version
   */
  getConsentText(organizationId: string): ConsentText {
    // Log for debugging tenant-specific lookups (future feature)
    this.logger.debug(`Getting consent text for org: ${organizationId}`);

    // TODO: Load from tenant configuration in future
    // For now, return default consent text
    return {
      version: this.DEFAULT_CONSENT_VERSION,
      type: "AI_USE",
      text: `By using this assistant, you agree that:

1. Your questions and our responses may be processed by AI to provide answers.
2. Conversations may be stored for quality improvement and compliance purposes.
3. You will not share sensitive personal information in this chat.
4. This assistant provides general guidance and is not a substitute for professional advice.

Your data is protected in accordance with our Privacy Policy.`,
    };
  }

  /**
   * Check if any consent type is valid for a session.
   * Useful for checking if session has ANY consent without specifying type.
   *
   * @param sessionId Anonymous session identifier
   * @param organizationId Tenant ID
   * @returns True if session has any valid consent
   */
  async hasAnyValidConsent(
    sessionId: string,
    organizationId: string,
  ): Promise<boolean> {
    const validSince = new Date(Date.now() - this.CONSENT_VALIDITY_MS);

    const consent = await this.prisma.chatbotConsentLog.findFirst({
      where: {
        sessionId,
        organizationId,
        consentGiven: true,
        capturedAt: { gte: validSince },
      },
      select: { id: true },
    });

    return consent !== null;
  }
}
