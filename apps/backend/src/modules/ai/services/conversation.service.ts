import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiConversation, AiMessage, Prisma } from "@prisma/client";
import {
  GetOrCreateConversationDto,
  AddMessageDto,
  ConversationWithMessages,
  ConversationSummary,
  ConversationStatus,
} from "../dto/conversation.dto";

/**
 * ConversationService manages AI conversation persistence.
 *
 * Conversations are scoped to organization + user + optional entity context.
 * Messages track both user and assistant interactions with optional tool use.
 *
 * Key features:
 * - Get or create active conversation for context
 * - Add messages with token tracking
 * - Pause/resume/archive conversation lifecycle
 * - Search across conversation history
 * - Title generation from initial messages
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create an active conversation for the given context.
   * Returns existing active conversation if one exists.
   */
  async getOrCreate(
    params: GetOrCreateConversationDto
  ): Promise<AiConversation> {
    // Find existing active conversation
    const existing = await this.prisma.aiConversation.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        status: "ACTIVE",
      },
      orderBy: { lastMessageAt: "desc" },
    });

    if (existing) {
      this.logger.debug(
        `Found existing conversation ${existing.id} for user ${params.userId}`
      );
      return existing;
    }

    // Create new conversation
    const conversation = await this.prisma.aiConversation.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
        agentType: params.agentType,
        status: "ACTIVE",
      },
    });

    this.logger.debug(
      `Created new conversation ${conversation.id} for user ${params.userId}`
    );
    return conversation;
  }

  /**
   * Get a conversation by ID.
   */
  async get(
    id: string,
    organizationId: string
  ): Promise<AiConversation | null> {
    return this.prisma.aiConversation.findFirst({
      where: { id, organizationId },
    });
  }

  /**
   * Get conversation with messages.
   */
  async getWithMessages(
    id: string,
    organizationId: string,
    messageLimit = 50
  ): Promise<ConversationWithMessages | null> {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id, organizationId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: messageLimit,
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!conversation) return null;

    return {
      id: conversation.id,
      title: conversation.title,
      status: conversation.status as ConversationStatus,
      entityType: conversation.entityType,
      entityId: conversation.entityId,
      agentType: conversation.agentType,
      createdAt: conversation.createdAt,
      lastMessageAt: conversation.lastMessageAt,
      messageCount: conversation._count.messages,
      messages: conversation.messages.reverse().map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Add a message to a conversation.
   */
  async addMessage(params: AddMessageDto): Promise<AiMessage> {
    // First fetch the conversation to get its organizationId
    const conversation = await this.prisma.aiConversation.findUnique({
      where: { id: params.conversationId },
      select: { organizationId: true },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation ${params.conversationId} not found`
      );
    }

    const message = await this.prisma.aiMessage.create({
      data: {
        organizationId: conversation.organizationId,
        conversationId: params.conversationId,
        role: params.role,
        content: params.content,
        toolCalls: params.toolCalls as Prisma.JsonArray | undefined,
        toolResults: params.toolResults as Prisma.JsonArray | undefined,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        model: params.model,
      },
    });

    // Update conversation metadata
    const updateData: Prisma.AiConversationUpdateInput = {
      lastMessageAt: new Date(),
    };

    if (params.inputTokens) {
      updateData.totalInputTokens = { increment: params.inputTokens };
    }
    if (params.outputTokens) {
      updateData.totalOutputTokens = { increment: params.outputTokens };
    }

    await this.prisma.aiConversation.update({
      where: { id: params.conversationId },
      data: updateData,
    });

    this.logger.debug(
      `Added ${params.role} message to conversation ${params.conversationId}`
    );
    return message;
  }

  /**
   * Get messages for a conversation.
   */
  async getMessages(
    conversationId: string,
    limit = 50,
    before?: Date
  ): Promise<AiMessage[]> {
    const messages = await this.prisma.aiMessage.findMany({
      where: {
        conversationId,
        ...(before && { createdAt: { lt: before } }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Return in chronological order
    return messages.reverse();
  }

  /**
   * Pause a conversation (saves context for later resume).
   */
  async pause(id: string, organizationId: string): Promise<void> {
    const result = await this.prisma.aiConversation.updateMany({
      where: { id, organizationId, status: "ACTIVE" },
      data: {
        status: "PAUSED",
        pausedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Conversation not found or not active");
    }

    this.logger.debug(`Paused conversation ${id}`);
  }

  /**
   * Resume a paused conversation.
   */
  async resume(id: string, organizationId: string): Promise<void> {
    const result = await this.prisma.aiConversation.updateMany({
      where: { id, organizationId, status: "PAUSED" },
      data: {
        status: "ACTIVE",
        pausedAt: null,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Conversation not found or not paused");
    }

    this.logger.debug(`Resumed conversation ${id}`);
  }

  /**
   * Archive a conversation (soft delete).
   */
  async archive(id: string, organizationId: string): Promise<void> {
    const result = await this.prisma.aiConversation.updateMany({
      where: { id, organizationId },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Conversation not found");
    }

    this.logger.debug(`Archived conversation ${id}`);
  }

  /**
   * List conversations for a user.
   */
  async list(params: {
    organizationId: string;
    userId: string;
    status?: ConversationStatus;
    entityType?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ conversations: ConversationSummary[]; total: number }> {
    const where: Prisma.AiConversationWhereInput = {
      organizationId: params.organizationId,
      userId: params.userId,
      ...(params.status && { status: params.status }),
      ...(params.entityType && { entityType: params.entityType }),
      ...(params.entityId && { entityId: params.entityId }),
    };

    const [conversations, total] = await Promise.all([
      this.prisma.aiConversation.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        take: params.limit || 20,
        skip: params.offset || 0,
        include: {
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.aiConversation.count({ where }),
    ]);

    return {
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status as ConversationStatus,
        entityType: c.entityType,
        entityId: c.entityId,
        agentType: c.agentType,
        lastMessageAt: c.lastMessageAt,
        messageCount: c._count.messages,
        totalTokens: c.totalInputTokens + c.totalOutputTokens,
      })),
      total,
    };
  }

  /**
   * Search conversations by message content.
   */
  async search(params: {
    organizationId: string;
    userId: string;
    query: string;
    limit?: number;
  }): Promise<ConversationSummary[]> {
    // Search in messages
    const matchingMessages = await this.prisma.aiMessage.findMany({
      where: {
        content: { contains: params.query, mode: "insensitive" },
        conversation: {
          organizationId: params.organizationId,
          userId: params.userId,
        },
      },
      select: { conversationId: true },
      distinct: ["conversationId"],
      take: params.limit || 20,
    });

    const conversationIds = matchingMessages.map((m) => m.conversationId);

    if (conversationIds.length === 0) {
      return [];
    }

    const conversations = await this.prisma.aiConversation.findMany({
      where: { id: { in: conversationIds } },
      include: { _count: { select: { messages: true } } },
    });

    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status as ConversationStatus,
      entityType: c.entityType,
      entityId: c.entityId,
      agentType: c.agentType,
      lastMessageAt: c.lastMessageAt,
      messageCount: c._count.messages,
      totalTokens: c.totalInputTokens + c.totalOutputTokens,
    }));
  }

  /**
   * Generate a title for a conversation based on its messages.
   * Called after first few messages to provide meaningful title.
   */
  async generateTitle(conversationId: string): Promise<string> {
    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 3,
      select: { content: true, role: true },
    });

    if (messages.length === 0) {
      return "New Conversation";
    }

    // Use first user message as basis for title
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      // Truncate and clean up
      const title = firstUserMessage.content
        .slice(0, 60)
        .replace(/\n/g, " ")
        .trim();
      return title.length < firstUserMessage.content.length
        ? `${title}...`
        : title;
    }

    return "New Conversation";
  }

  /**
   * Update conversation title.
   */
  async updateTitle(
    id: string,
    organizationId: string,
    title: string
  ): Promise<void> {
    await this.prisma.aiConversation.updateMany({
      where: { id, organizationId },
      data: { title },
    });

    this.logger.debug(`Updated title for conversation ${id}`);
  }

  /**
   * Get conversation statistics for a user.
   */
  async getStats(
    organizationId: string,
    userId: string
  ): Promise<{
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    totalTokens: number;
  }> {
    const [conversations, messageCount, tokenStats] = await Promise.all([
      this.prisma.aiConversation.groupBy({
        by: ["status"],
        where: { organizationId, userId },
        _count: true,
      }),
      this.prisma.aiMessage.count({
        where: {
          conversation: { organizationId, userId },
        },
      }),
      this.prisma.aiConversation.aggregate({
        where: { organizationId, userId },
        _sum: {
          totalInputTokens: true,
          totalOutputTokens: true,
        },
      }),
    ]);

    const totalConversations = conversations.reduce(
      (sum, c) => sum + c._count,
      0
    );
    const activeConversations =
      conversations.find((c) => c.status === "ACTIVE")?._count || 0;

    return {
      totalConversations,
      activeConversations,
      totalMessages: messageCount,
      totalTokens:
        (tokenStats._sum.totalInputTokens || 0) +
        (tokenStats._sum.totalOutputTokens || 0),
    };
  }
}
