import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  CaseMessage,
  MessageDirection,
  MessageSenderType,
  MessageDeliveryStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PiiDetectionService, PiiDetectionResult } from "./pii-detection.service";
import { EMAIL_QUEUE_NAME } from "../jobs/queues/email.queue";
import { EmailJobData } from "../jobs/types";

/**
 * DTO for sending a message to reporter
 */
export interface SendToReporterDto {
  /** Case ID */
  caseId: string;
  /** Message content */
  content: string;
  /** Optional subject line */
  subject?: string;
  /** Skip PII check (requires explicit acknowledgment) */
  skipPiiCheck?: boolean;
  /** Acknowledged PII warnings (required if PII detected and not skipping) */
  acknowledgedPiiWarnings?: string[];
}

/**
 * DTO for receiving a message from reporter
 */
export interface ReceiveFromReporterDto {
  /** Access code for anonymous access */
  accessCode: string;
  /** Message content */
  content: string;
}

/**
 * PII check result for pre-send validation
 */
export interface PiiCheckResult {
  /** Whether PII was detected */
  hasPii: boolean;
  /** Human-readable warnings */
  warnings: string[];
  /** Whether send should be blocked */
  blocked: boolean;
  /** Reason for blocking */
  blockReason?: string;
}

/**
 * Unread count result
 */
export interface UnreadCountResult {
  /** Unread messages from reporter (for investigator view) */
  inboundUnread: number;
  /** Unread messages to reporter (for reporter view) */
  outboundUnread: number;
  /** Total message count */
  totalMessages: number;
}

/**
 * Message with direction-appropriate view
 */
export interface MessageView {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  subject?: string | null;
  createdAt: Date;
  isRead: boolean;
  readAt?: Date | null;
  senderType: string;
}

/**
 * MessageRelayService
 *
 * Provides identity-protecting message relay between investigators and anonymous reporters.
 * Implements the "Chinese Wall" model where:
 * - Investigators never see reporter contact info (stored on RIU)
 * - Reporter notifications don't include message content
 * - Access code validates reporter identity for public endpoints
 *
 * Key behaviors:
 * - PII detection warns investigators before sending potentially identifying info
 * - Outbound messages marked as read when reporter retrieves them
 * - Inbound messages marked as read when investigator retrieves them
 * - Email notifications queued but don't expose message content
 */
@Injectable()
export class MessageRelayService {
  private readonly logger = new Logger(MessageRelayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly piiDetectionService: PiiDetectionService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
  ) {}

  /**
   * Send message from investigator to reporter.
   * Creates an OUTBOUND message and optionally notifies reporter.
   *
   * CRITICAL: Never expose reporter contact info to investigator.
   * Reporter email is retrieved from linked RIU only for notification purposes.
   *
   * @param dto - Send message DTO
   * @param userId - Investigator user ID
   * @param organizationId - Organization ID
   * @returns Created message
   * @throws NotFoundException if case not found
   * @throws BadRequestException if PII detected and not acknowledged
   */
  async sendToReporter(
    dto: SendToReporterDto,
    userId: string,
    organizationId: string,
  ): Promise<CaseMessage> {
    // Verify case exists and belongs to organization
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id: dto.caseId,
        organizationId,
      },
      include: {
        riuAssociations: {
          include: {
            riu: {
              select: {
                id: true,
                reporterEmail: true,
                reporterType: true,
                anonymousAccessCode: true,
              },
            },
          },
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case ${dto.caseId} not found`);
    }

    // Check for PII if not explicitly skipped
    if (!dto.skipPiiCheck) {
      const piiResult = this.piiDetectionService.detect(dto.content);
      if (piiResult.hasPii) {
        // If PII detected, require acknowledgment
        if (
          !dto.acknowledgedPiiWarnings ||
          dto.acknowledgedPiiWarnings.length === 0
        ) {
          throw new BadRequestException({
            message: "Message contains potentially identifying information",
            hasPii: true,
            warnings: piiResult.warnings,
            requiresAcknowledgment: true,
          });
        }
        // Log that investigator acknowledged PII warnings
        this.logger.log(
          `Investigator ${userId} acknowledged PII warnings for case ${dto.caseId}`,
        );
      }
    }

    // Create outbound message
    const message = await this.prisma.caseMessage.create({
      data: {
        organizationId,
        caseId: dto.caseId,
        direction: MessageDirection.OUTBOUND,
        senderType: MessageSenderType.INVESTIGATOR,
        content: dto.content,
        subject: dto.subject,
        isRead: false,
        deliveryStatus: MessageDeliveryStatus.PENDING,
        createdById: userId,
      },
    });

    // Find reporter email from linked RIU (for notification only)
    // CRITICAL: This email is NEVER exposed to the investigator
    const primaryRiu = caseRecord.riuAssociations[0]?.riu;
    if (primaryRiu?.reporterEmail) {
      // Queue notification email - content is NOT included
      await this.queueReporterNotification(
        organizationId,
        primaryRiu.reporterEmail,
        primaryRiu.anonymousAccessCode,
        caseRecord.referenceNumber,
      );

      // Update delivery status
      await this.prisma.caseMessage.update({
        where: { id: message.id },
        data: {
          deliveryStatus: MessageDeliveryStatus.SENT,
        },
      });
    }

    // Emit event for audit/notification
    this.emitEvent("case.message.sent", {
      organizationId,
      caseId: dto.caseId,
      messageId: message.id,
      actorUserId: userId,
      direction: "outbound",
    });

    return message;
  }

  /**
   * Receive message from reporter via access code.
   * Creates an INBOUND message on the linked case.
   *
   * @param dto - Receive message DTO
   * @returns Created message
   * @throws NotFoundException if access code invalid or no case linked
   */
  async receiveFromReporter(dto: ReceiveFromReporterDto): Promise<CaseMessage> {
    // Find RIU by access code
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: { anonymousAccessCode: dto.accessCode },
      include: {
        caseAssociations: {
          where: { associationType: "PRIMARY" },
          take: 1,
        },
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
        direction: MessageDirection.INBOUND,
        senderType: MessageSenderType.REPORTER,
        content: dto.content,
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

    return message;
  }

  /**
   * Get messages for investigator view.
   * Marks unread INBOUND messages as read.
   *
   * @param caseId - Case ID
   * @param userId - Investigator user ID
   * @param organizationId - Organization ID
   * @returns Messages in investigator view format
   */
  async getMessagesForInvestigator(
    caseId: string,
    userId: string,
    organizationId: string,
  ): Promise<MessageView[]> {
    // Verify case access
    const caseRecord = await this.prisma.case.findFirst({
      where: { id: caseId, organizationId },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    // Get all messages
    const messages = await this.prisma.caseMessage.findMany({
      where: { caseId, organizationId },
      orderBy: { createdAt: "asc" },
    });

    // Mark inbound (FROM reporter) messages as read
    const unreadInboundIds = messages
      .filter((m) => m.direction === MessageDirection.INBOUND && !m.isRead)
      .map((m) => m.id);

    if (unreadInboundIds.length > 0) {
      await this.prisma.caseMessage.updateMany({
        where: {
          id: { in: unreadInboundIds },
        },
        data: {
          isRead: true,
          readAt: new Date(),
          readById: userId,
        },
      });
    }

    return messages.map((m) => ({
      id: m.id,
      direction: m.direction.toLowerCase() as "inbound" | "outbound",
      content: m.content,
      subject: m.subject,
      createdAt: m.createdAt,
      isRead: m.isRead || unreadInboundIds.includes(m.id),
      readAt: m.readAt,
      senderType: m.senderType,
    }));
  }

  /**
   * Get messages for reporter view via access code.
   * Marks unread OUTBOUND messages as read.
   *
   * @param accessCode - Access code for authentication
   * @returns Messages in reporter view format
   */
  async getMessagesForReporter(accessCode: string): Promise<MessageView[]> {
    // Find RIU by access code
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: { anonymousAccessCode: accessCode },
      include: {
        caseAssociations: {
          where: { associationType: "PRIMARY" },
          take: 1,
        },
      },
    });

    if (!riu) {
      throw new NotFoundException("Invalid access code");
    }

    const linkedCaseId = riu.caseAssociations[0]?.caseId;
    if (!linkedCaseId) {
      // No case linked yet - return empty
      return [];
    }

    // Get all messages
    const messages = await this.prisma.caseMessage.findMany({
      where: { caseId: linkedCaseId },
      orderBy: { createdAt: "asc" },
    });

    // Mark outbound (TO reporter) messages as read
    const unreadOutboundIds = messages
      .filter((m) => m.direction === MessageDirection.OUTBOUND && !m.isRead)
      .map((m) => m.id);

    if (unreadOutboundIds.length > 0) {
      await this.prisma.caseMessage.updateMany({
        where: {
          id: { in: unreadOutboundIds },
        },
        data: {
          isRead: true,
          readAt: new Date(),
          // No readById - anonymous reporter
        },
      });
    }

    return messages.map((m) => ({
      id: m.id,
      direction: m.direction.toLowerCase() as "inbound" | "outbound",
      content: m.content,
      subject: m.subject,
      createdAt: m.createdAt,
      isRead: m.isRead || unreadOutboundIds.includes(m.id),
      readAt: m.readAt,
      senderType: m.senderType,
    }));
  }

  /**
   * Get unread message counts for a case.
   *
   * @param caseId - Case ID
   * @param organizationId - Organization ID
   * @returns Unread counts by direction
   */
  async getUnreadCount(
    caseId: string,
    organizationId: string,
  ): Promise<UnreadCountResult> {
    // Verify case access
    const caseRecord = await this.prisma.case.findFirst({
      where: { id: caseId, organizationId },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    const [inboundUnread, outboundUnread, totalMessages] = await Promise.all([
      this.prisma.caseMessage.count({
        where: {
          caseId,
          direction: MessageDirection.INBOUND,
          isRead: false,
        },
      }),
      this.prisma.caseMessage.count({
        where: {
          caseId,
          direction: MessageDirection.OUTBOUND,
          isRead: false,
        },
      }),
      this.prisma.caseMessage.count({
        where: { caseId },
      }),
    ]);

    return { inboundUnread, outboundUnread, totalMessages };
  }

  /**
   * Check content for PII before sending.
   * Use this for pre-send validation to show warnings to investigator.
   *
   * @param content - Message content to check
   * @returns PII check result with warnings
   */
  checkForPii(content: string): PiiCheckResult {
    const detection = this.piiDetectionService.detect(content);

    return {
      hasPii: detection.hasPii,
      warnings: detection.warnings,
      blocked: false, // We warn but don't block - investigator can acknowledge
      blockReason: detection.hasPii
        ? "Message contains potentially identifying information. Please acknowledge before sending."
        : undefined,
    };
  }

  /**
   * Queue notification email to reporter.
   * CRITICAL: Email content does NOT include message text - only notification.
   *
   * @param organizationId - Organization ID
   * @param reporterEmail - Reporter email (from RIU)
   * @param accessCode - Access code for status check
   * @param caseReference - Case reference number
   */
  private async queueReporterNotification(
    organizationId: string,
    reporterEmail: string,
    accessCode: string | null,
    caseReference: string,
  ): Promise<void> {
    const jobData: EmailJobData = {
      organizationId,
      templateId: "case-message-notification",
      to: reporterEmail,
      context: {
        // CRITICAL: Do NOT include message content
        caseReference,
        hasAccessCode: !!accessCode,
        // Access code allows reporter to view message securely
        statusCheckUrl: accessCode
          ? `/check-status?code=${accessCode}`
          : undefined,
      },
    };

    await this.emailQueue.add("send-notification", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    });

    this.logger.log(
      `Queued notification email for case ${caseReference} (email not logged for privacy)`,
    );
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
