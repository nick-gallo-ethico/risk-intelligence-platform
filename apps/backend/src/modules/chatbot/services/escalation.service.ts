import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { InquiryPriority, InquiryStatus, Prisma } from "@prisma/client";
import {
  ChatbotInquiry,
  ConversationMessage,
} from "../entities/chatbot-inquiry.entity";

/**
 * Input for creating an escalation inquiry.
 */
export interface CreateInquiryInput {
  organizationId: string;
  sessionId: string;
  conversationId?: string;
  userId?: string;
  userEmail?: string;
  question: string;
  category?: string;
  priority?: InquiryPriority;
  /** Pre-captured conversation history (avoids circular dep with ConversationService) */
  conversationHistory?: ConversationMessage[];
}

/**
 * Options for listing inquiries.
 */
export interface ListInquiriesOptions {
  limit?: number;
  offset?: number;
  status?: InquiryStatus[];
}

/**
 * EscalationService manages chatbot inquiries escalated to compliance team.
 *
 * Flow:
 * 1. User asks question chatbot can't confidently answer
 * 2. Chatbot offers escalation (via EscalateSkill)
 * 3. User accepts escalation
 * 4. Service creates ChatbotInquiry with conversation context
 * 5. Compliance team sees inquiry in their queue
 * 6. Compliance team responds (resolution stored)
 *
 * Design notes:
 * - ConversationHistory is passed in via input (not fetched) to avoid
 *   circular dependency with ConversationService in AiModule
 * - Category and priority auto-detected from question keywords
 * - Future: integrate with notification system for compliance team alerts
 */
@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an escalation inquiry from chatbot conversation.
   * Captures full conversation history for compliance team context.
   */
  async createInquiry(input: CreateInquiryInput): Promise<ChatbotInquiry> {
    // Detect category from question (simple keyword matching)
    const category = input.category || this.detectCategory(input.question);

    // Determine priority based on keywords
    const priority = input.priority || this.detectPriority(input.question);

    const inquiry = await this.prisma.chatbotInquiry.create({
      data: {
        organizationId: input.organizationId,
        sessionId: input.sessionId,
        conversationId: input.conversationId,
        userId: input.userId,
        userEmail: input.userEmail,
        question: input.question,
        conversationHistory: input.conversationHistory
          ? (input.conversationHistory as unknown as Prisma.InputJsonValue)
          : undefined,
        category,
        priority,
        status: InquiryStatus.PENDING,
      },
    });

    this.logger.log(
      `Inquiry created: ${inquiry.id} for org ${input.organizationId}`,
    );

    // TODO: Send notification to compliance team (Phase 7 integration)

    return this.mapToEntity(inquiry);
  }

  /**
   * Get pending inquiries for compliance team queue.
   */
  async getPendingInquiries(
    organizationId: string,
    options: ListInquiriesOptions = {},
  ): Promise<{ inquiries: ChatbotInquiry[]; total: number }> {
    const statusFilter = options.status || [
      InquiryStatus.PENDING,
      InquiryStatus.ASSIGNED,
    ];

    const where = {
      organizationId,
      status: { in: statusFilter },
    };

    const [inquiries, total] = await Promise.all([
      this.prisma.chatbotInquiry.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
        include: {
          assignedTo: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.chatbotInquiry.count({ where }),
    ]);

    return {
      inquiries: inquiries.map((i) =>
        this.mapToEntity({
          ...i,
          assignedTo: i.assignedTo
            ? {
                id: i.assignedTo.id,
                email: i.assignedTo.email,
                name: `${i.assignedTo.firstName} ${i.assignedTo.lastName}`.trim(),
              }
            : undefined,
        }),
      ),
      total,
    };
  }

  /**
   * Get a single inquiry by ID.
   */
  async getInquiry(
    inquiryId: string,
    organizationId: string,
  ): Promise<ChatbotInquiry | null> {
    const inquiry = await this.prisma.chatbotInquiry.findFirst({
      where: { id: inquiryId, organizationId },
      include: {
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!inquiry) return null;

    return this.mapToEntity({
      ...inquiry,
      assignedTo: inquiry.assignedTo
        ? {
            id: inquiry.assignedTo.id,
            email: inquiry.assignedTo.email,
            name: `${inquiry.assignedTo.firstName} ${inquiry.assignedTo.lastName}`.trim(),
          }
        : undefined,
    });
  }

  /**
   * Assign inquiry to compliance team member.
   */
  async assignInquiry(
    inquiryId: string,
    organizationId: string,
    assigneeId: string,
  ): Promise<ChatbotInquiry> {
    const inquiry = await this.prisma.chatbotInquiry.findFirst({
      where: { id: inquiryId, organizationId },
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${inquiryId} not found`);
    }

    const updated = await this.prisma.chatbotInquiry.update({
      where: { id: inquiryId },
      data: {
        assignedToId: assigneeId,
        assignedAt: new Date(),
        status: InquiryStatus.ASSIGNED,
      },
    });

    this.logger.log(`Inquiry ${inquiryId} assigned to ${assigneeId}`);

    return this.mapToEntity(updated);
  }

  /**
   * Start working on an inquiry (move to IN_PROGRESS).
   */
  async startInquiry(
    inquiryId: string,
    organizationId: string,
  ): Promise<ChatbotInquiry> {
    const inquiry = await this.prisma.chatbotInquiry.findFirst({
      where: { id: inquiryId, organizationId },
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${inquiryId} not found`);
    }

    const updated = await this.prisma.chatbotInquiry.update({
      where: { id: inquiryId },
      data: {
        status: InquiryStatus.IN_PROGRESS,
      },
    });

    this.logger.log(`Inquiry ${inquiryId} moved to IN_PROGRESS`);

    return this.mapToEntity(updated);
  }

  /**
   * Resolve inquiry with compliance team response.
   */
  async resolveInquiry(
    inquiryId: string,
    organizationId: string,
    resolution: string,
  ): Promise<ChatbotInquiry> {
    const inquiry = await this.prisma.chatbotInquiry.findFirst({
      where: { id: inquiryId, organizationId },
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${inquiryId} not found`);
    }

    const updated = await this.prisma.chatbotInquiry.update({
      where: { id: inquiryId },
      data: {
        resolution,
        resolvedAt: new Date(),
        status: InquiryStatus.RESOLVED,
      },
    });

    this.logger.log(`Inquiry ${inquiryId} resolved`);

    // TODO: Send notification to user if email provided

    return this.mapToEntity(updated);
  }

  /**
   * Archive an inquiry.
   */
  async archiveInquiry(
    inquiryId: string,
    organizationId: string,
  ): Promise<ChatbotInquiry> {
    const inquiry = await this.prisma.chatbotInquiry.findFirst({
      where: { id: inquiryId, organizationId },
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${inquiryId} not found`);
    }

    const updated = await this.prisma.chatbotInquiry.update({
      where: { id: inquiryId },
      data: {
        status: InquiryStatus.ARCHIVED,
      },
    });

    this.logger.log(`Inquiry ${inquiryId} archived`);

    return this.mapToEntity(updated);
  }

  /**
   * Detect category from question text.
   */
  private detectCategory(question: string): string | null {
    const lower = question.toLowerCase();

    if (lower.includes("gift") || lower.includes("present")) return "gifts";
    if (lower.includes("conflict") || lower.includes("interest"))
      return "conflict-of-interest";
    if (lower.includes("harassment") || lower.includes("discriminat"))
      return "harassment";
    if (lower.includes("disclose") || lower.includes("disclosure"))
      return "disclosure";
    if (lower.includes("policy") || lower.includes("policies"))
      return "policy-question";
    if (lower.includes("report") || lower.includes("ethics"))
      return "ethics-reporting";
    if (lower.includes("retaliation") || lower.includes("whistleblow"))
      return "retaliation";
    if (lower.includes("privacy") || lower.includes("confidential"))
      return "privacy";
    if (lower.includes("bribe") || lower.includes("corruption"))
      return "anti-corruption";

    return "general";
  }

  /**
   * Detect priority from question urgency signals.
   */
  private detectPriority(question: string): InquiryPriority {
    const lower = question.toLowerCase();

    // URGENT: Explicit urgency words
    if (
      lower.includes("urgent") ||
      lower.includes("immediate") ||
      lower.includes("emergency") ||
      lower.includes("asap")
    ) {
      return InquiryPriority.URGENT;
    }

    // HIGH: Serious compliance topics
    if (
      lower.includes("harassment") ||
      lower.includes("retaliation") ||
      lower.includes("threat") ||
      lower.includes("discriminat") ||
      lower.includes("whistleblow") ||
      lower.includes("danger") ||
      lower.includes("safety")
    ) {
      return InquiryPriority.HIGH;
    }

    // LOW: Simple questions
    if (
      lower.includes("just wondering") ||
      lower.includes("quick question") ||
      lower.includes("curious")
    ) {
      return InquiryPriority.LOW;
    }

    return InquiryPriority.NORMAL;
  }

  /**
   * Map Prisma result to entity type.
   */
  private mapToEntity(inquiry: Record<string, unknown>): ChatbotInquiry {
    return {
      id: inquiry.id as string,
      organizationId: inquiry.organizationId as string,
      sessionId: inquiry.sessionId as string,
      conversationId: inquiry.conversationId as string | null,
      userId: inquiry.userId as string | null,
      userEmail: inquiry.userEmail as string | null,
      question: inquiry.question as string,
      conversationHistory: inquiry.conversationHistory as
        | ConversationMessage[]
        | null,
      category: inquiry.category as string | null,
      priority: inquiry.priority as InquiryPriority,
      status: inquiry.status as InquiryStatus,
      assignedToId: inquiry.assignedToId as string | null,
      assignedAt: inquiry.assignedAt as Date | null,
      resolvedAt: inquiry.resolvedAt as Date | null,
      resolution: inquiry.resolution as string | null,
      createdAt: inquiry.createdAt as Date,
      updatedAt: inquiry.updatedAt as Date,
    };
  }
}
