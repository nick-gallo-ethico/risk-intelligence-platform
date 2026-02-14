import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";
import {
  RiuStatusResponseDto,
  RiuMessagesResponseDto,
} from "./dto/access-code.dto";

/**
 * Custom alphabet for access code generation.
 * Excludes visually confusing characters: 0/O, 1/I/L
 * Results in 12-character codes like: "A2B3C4D5E6F7"
 */
const ACCESS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ACCESS_CODE_LENGTH = 12;
const generateCode = customAlphabet(ACCESS_CODE_ALPHABET, ACCESS_CODE_LENGTH);

/**
 * Service for managing anonymous access codes for RIUs.
 *
 * Anonymous reporters receive an access code upon submission that allows them to:
 * - Check the status of their report without authentication
 * - View relay messages between themselves and investigators
 * - Send new messages to investigators via the anonymous relay
 *
 * The access code acts as the authorization token - no user auth required.
 */
@Injectable()
export class RiuAccessService {
  private readonly logger = new Logger(RiuAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate a cryptographically secure access code.
   * Ensures uniqueness by checking against existing codes.
   *
   * @returns 12-character uppercase alphanumeric code
   * @throws Error if unable to generate unique code after max attempts
   */
  async generateAccessCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure uniqueness via retry loop
    do {
      code = generateCode();
      const existing = await this.prisma.riskIntelligenceUnit.findFirst({
        where: { anonymousAccessCode: code },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      this.logger.error(
        "Failed to generate unique access code after max attempts",
      );
      throw new Error("Failed to generate unique access code");
    }

    return code;
  }

  /**
   * Check status of RIU by access code.
   * PUBLIC endpoint - no authentication required.
   *
   * @param accessCode - The 12-character access code
   * @returns RIU status information including message counts
   * @throws NotFoundException if access code is invalid (generic message for security)
   */
  async checkStatus(accessCode: string): Promise<RiuStatusResponseDto> {
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: { anonymousAccessCode: accessCode },
      include: {
        caseAssociations: {
          include: {
            case: {
              select: {
                id: true,
                referenceNumber: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!riu) {
      // Generic error message - don't reveal whether code exists
      throw new NotFoundException("Invalid access code");
    }

    // Get unread message count (outbound = TO reporter)
    const linkedCaseId = riu.caseAssociations[0]?.caseId;
    let unreadMessageCount = 0;

    if (linkedCaseId) {
      unreadMessageCount = await this.prisma.caseMessage.count({
        where: {
          caseId: linkedCaseId,
          direction: "OUTBOUND", // Messages TO reporter
          isRead: false,
        },
      });
    }

    return {
      accessCode: riu.anonymousAccessCode!,
      status: riu.status,
      statusDescription: this.getStatusDescription(riu.status),
      submittedAt: riu.createdAt,
      lastUpdatedAt: riu.statusChangedAt || riu.createdAt,
      hasMessages: unreadMessageCount > 0,
      unreadMessageCount,
      caseLinked: riu.caseAssociations.length > 0,
      caseReferenceNumber: riu.caseAssociations[0]?.case?.referenceNumber,
    };
  }

  /**
   * Get messages for RIU by access code.
   * Marks outbound (TO reporter) messages as read upon retrieval.
   * PUBLIC endpoint - no authentication required.
   *
   * @param accessCode - The 12-character access code
   * @returns All messages for the linked case
   * @throws NotFoundException if access code is invalid
   */
  async getMessages(accessCode: string): Promise<RiuMessagesResponseDto> {
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: { anonymousAccessCode: accessCode },
      include: {
        caseAssociations: true,
      },
    });

    if (!riu) {
      throw new NotFoundException("Invalid access code");
    }

    const linkedCaseId = riu.caseAssociations[0]?.caseId;
    if (!linkedCaseId) {
      // No case linked yet - return empty messages
      return { messages: [], totalCount: 0 };
    }

    // Get all messages for the linked case
    const messages = await this.prisma.caseMessage.findMany({
      where: { caseId: linkedCaseId },
      orderBy: { createdAt: "asc" },
    });

    // Mark outbound messages (TO reporter) as read
    await this.prisma.caseMessage.updateMany({
      where: {
        caseId: linkedCaseId,
        direction: "OUTBOUND",
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      messages: messages.map((m) => ({
        id: m.id,
        direction: m.direction.toLowerCase() as "inbound" | "outbound",
        content: m.content,
        createdAt: m.createdAt,
        isRead: m.isRead,
      })),
      totalCount: messages.length,
    };
  }

  /**
   * Send message from anonymous reporter via access code.
   * Creates an INBOUND message (FROM reporter) on the linked case.
   * PUBLIC endpoint - no authentication required.
   *
   * @param accessCode - The 12-character access code
   * @param content - Message content (max 10,000 chars)
   * @throws NotFoundException if access code is invalid
   * @throws BadRequestException if no case is linked yet
   */
  async sendMessage(accessCode: string, content: string): Promise<void> {
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: { anonymousAccessCode: accessCode },
      include: {
        caseAssociations: true,
      },
    });

    if (!riu) {
      throw new NotFoundException("Invalid access code");
    }

    const linkedCaseId = riu.caseAssociations[0]?.caseId;
    if (!linkedCaseId) {
      throw new BadRequestException(
        "Your report has not been assigned to a case yet. Please check back later.",
      );
    }

    // Create inbound message (FROM reporter)
    const message = await this.prisma.caseMessage.create({
      data: {
        organizationId: riu.organizationId,
        caseId: linkedCaseId,
        direction: "INBOUND",
        senderType: "REPORTER",
        content,
        isRead: false,
        // No createdById - anonymous reporter
      },
    });

    // Emit event for notification system
    this.emitEvent("case.message.received", {
      organizationId: riu.organizationId,
      caseId: linkedCaseId,
      messageId: message.id,
      riuId: riu.id,
      isAnonymous: true,
    });

    this.logger.log(
      `Anonymous message sent via access code for case ${linkedCaseId}`,
    );
  }

  /**
   * Validate access code format without database lookup.
   * Useful for early validation before making DB queries.
   *
   * @param code - The access code to validate
   * @returns true if format is valid (12 uppercase alphanumeric chars)
   */
  isValidFormat(code: string): boolean {
    // Must be exactly 12 characters, uppercase letters and numbers only
    // Uses same alphabet as generation (excludes confusing chars)
    return /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{12}$/.test(code);
  }

  /**
   * Get human-readable status description for anonymous reporters.
   */
  private getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      PENDING_QA: "Your report is being reviewed by our team.",
      IN_QA: "Your report is currently under review.",
      QA_REJECTED:
        "We need additional information. Please check messages below.",
      RELEASED: "Your report has been received and is being processed.",
      LINKED: "Your report has been assigned to an investigator.",
      CLOSED: "Your report has been closed. Thank you for reporting.",
      RECEIVED: "Your report has been received.",
      COMPLETED: "Your submission has been completed.",
    };
    return descriptions[status] || "Status unknown";
  }

  /**
   * Safely emit event - failures logged but don't crash request.
   */
  private emitEvent(eventName: string, event: object): void {
    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
