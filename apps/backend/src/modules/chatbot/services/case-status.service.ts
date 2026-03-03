import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MessageDirection } from "@prisma/client";

/**
 * Result of a case status lookup.
 */
export interface CaseStatusResult {
  success: boolean;
  case?: {
    referenceNumber: string;
    status: string;
    statusLabel: string;
    lastUpdated: Date;
    hasNewMessages: boolean;
  };
  error?: string;
  locked?: boolean;
  attemptsRemaining?: number;
}

/**
 * Rate limit state for an IP address.
 */
interface RateLimitState {
  count: number;
  resetAt: Date;
}

/**
 * CaseStatusService provides secure case status lookup via access codes.
 *
 * Security measures:
 * - Rate limiting: 5 attempts per IP per 15 minutes
 * - Access code normalization (case-insensitive, dash-tolerant)
 * - Minimal data exposure (no sensitive details)
 * - Failed attempt logging for security monitoring
 * - IP masking in logs for privacy
 *
 * Access code format: XXX-XXXX-XXXX (12 alphanumeric characters)
 *
 * Used by:
 * - CaseStatusSkill for chatbot anonymous status lookup
 * - Ethics Portal status check page
 */
@Injectable()
export class CaseStatusService {
  private readonly logger = new Logger(CaseStatusService.name);

  // In-memory rate limiter (use Redis in production for multi-instance)
  private readonly rateLimiter = new Map<string, RateLimitState>();

  // Rate limit configuration
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Look up case status by anonymous access code.
   *
   * @param accessCode - The access code (XXX-XXXX-XXXX format)
   * @param ipAddress - Client IP for rate limiting
   * @returns Case status or error with rate limit info
   */
  async lookupByAccessCode(
    accessCode: string,
    ipAddress: string,
  ): Promise<CaseStatusResult> {
    // Check rate limit first
    const rateLimitCheck = this.checkRateLimit(ipAddress);
    if (!rateLimitCheck.allowed) {
      this.logger.warn(
        `Rate limit exceeded for IP ${this.maskIp(ipAddress)} on access code lookup`,
      );
      return {
        success: false,
        error: "Too many attempts. Please try again in 15 minutes.",
        locked: true,
        attemptsRemaining: 0,
      };
    }

    // Normalize access code (uppercase, remove dashes/spaces)
    const normalizedCode = this.normalizeAccessCode(accessCode);

    if (!this.isValidAccessCodeFormat(normalizedCode)) {
      this.recordAttempt(ipAddress, false);
      return {
        success: false,
        error: "Invalid access code format.",
        attemptsRemaining: this.getAttemptsRemaining(ipAddress),
      };
    }

    try {
      // Look up case by anonymous access code
      const caseEntity = await this.prisma.case.findFirst({
        where: {
          anonymousAccessCode: normalizedCode,
        },
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          updatedAt: true,
          organizationId: true,
          // Explicitly exclude sensitive fields
        },
      });

      if (!caseEntity) {
        // Record failed attempt
        this.recordAttempt(ipAddress, false);

        this.logger.debug(
          `Failed access code lookup from IP ${this.maskIp(ipAddress)}`,
        );

        return {
          success: false,
          error: "No case found with that access code.",
          attemptsRemaining: this.getAttemptsRemaining(ipAddress),
        };
      }

      // Successful lookup - clear rate limit state
      this.recordAttempt(ipAddress, true);

      // Check for unread messages sent to reporter (OUTBOUND direction, unread)
      const hasNewMessages = await this.checkForNewMessages(caseEntity.id);

      return {
        success: true,
        case: {
          referenceNumber: caseEntity.referenceNumber,
          status: caseEntity.status,
          statusLabel: this.getStatusLabel(caseEntity.status),
          lastUpdated: caseEntity.updatedAt,
          hasNewMessages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Case status lookup error: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: "Unable to look up case status. Please try again later.",
      };
    }
  }

  /**
   * Normalize access code for comparison.
   * Removes dashes, spaces, and converts to uppercase.
   */
  private normalizeAccessCode(code: string): string {
    return code.toUpperCase().replace(/[-\s]/g, "");
  }

  /**
   * Validate access code format (12 alphanumeric characters).
   */
  private isValidAccessCodeFormat(code: string): boolean {
    return /^[A-Z0-9]{12}$/.test(code);
  }

  /**
   * Get human-readable status label.
   * Provides user-friendly status descriptions.
   */
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      NEW: "Your report has been received",
      OPEN: "Your report is being reviewed",
      IN_PROGRESS: "Investigation in progress",
      PENDING_REVIEW: "Pending final review",
      CLOSED: "Investigation complete",
      ARCHIVED: "Case closed",
    };
    return labels[status] || "Status unknown";
  }

  /**
   * Check if IP is within rate limit.
   */
  private checkRateLimit(ipAddress: string): { allowed: boolean } {
    const key = `access:${ipAddress}`;
    const state = this.rateLimiter.get(key);

    if (!state) {
      return { allowed: true };
    }

    // Reset if window has passed
    if (state.resetAt < new Date()) {
      this.rateLimiter.delete(key);
      return { allowed: true };
    }

    return { allowed: state.count < this.MAX_ATTEMPTS };
  }

  /**
   * Record an attempt (success clears state, failure increments).
   */
  private recordAttempt(ipAddress: string, success: boolean): void {
    const key = `access:${ipAddress}`;

    if (success) {
      // Clear rate limit on success
      this.rateLimiter.delete(key);
      return;
    }

    const existing = this.rateLimiter.get(key);

    if (existing && existing.resetAt > new Date()) {
      existing.count++;
    } else {
      this.rateLimiter.set(key, {
        count: 1,
        resetAt: new Date(Date.now() + this.WINDOW_MS),
      });
    }
  }

  /**
   * Get remaining attempts for an IP.
   */
  private getAttemptsRemaining(ipAddress: string): number {
    const key = `access:${ipAddress}`;
    const state = this.rateLimiter.get(key);

    if (!state || state.resetAt < new Date()) {
      return this.MAX_ATTEMPTS;
    }

    return Math.max(0, this.MAX_ATTEMPTS - state.count);
  }

  /**
   * Mask IP address for logging (privacy).
   * IPv4: masks last octet. IPv6: masks last segment.
   */
  private maskIp(ip: string): string {
    if (ip.includes(".")) {
      // IPv4: mask last octet
      const parts = ip.split(".");
      parts[3] = "xxx";
      return parts.join(".");
    }
    // IPv6: mask last segment
    return ip.replace(/:[\da-f]+$/i, ":xxxx");
  }

  /**
   * Check for unread messages sent to the reporter.
   * Uses OUTBOUND direction (investigator to reporter) that are unread.
   */
  private async checkForNewMessages(caseId: string): Promise<boolean> {
    const unreadCount = await this.prisma.caseMessage.count({
      where: {
        caseId,
        direction: MessageDirection.OUTBOUND,
        isRead: false,
      },
    });
    return unreadCount > 0;
  }
}
