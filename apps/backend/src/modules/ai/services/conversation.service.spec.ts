import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ConversationService } from "./conversation.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ConversationStatus } from "../dto/conversation.dto";

describe("ConversationService", () => {
  let service: ConversationService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockOrganizationId = "org-123";
  const mockUserId = "user-456";
  const mockConversationId = "conv-789";

  const mockConversation = {
    id: mockConversationId,
    organizationId: mockOrganizationId,
    userId: mockUserId,
    title: "Test Conversation",
    status: "ACTIVE",
    entityType: "case",
    entityId: "case-123",
    agentType: "investigation",
    lastMessageAt: new Date(),
    pausedAt: null,
    archivedAt: null,
    totalInputTokens: 100,
    totalOutputTokens: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: "msg-123",
    organizationId: mockOrganizationId,
    conversationId: mockConversationId,
    role: "user",
    content: "Hello, Claude!",
    toolCalls: null,
    toolResults: null,
    inputTokens: 10,
    outputTokens: null,
    model: "claude-sonnet-4-5-20250929",
    createdAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrisma = {
      aiConversation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      aiMessage: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    prismaService = module.get(PrismaService);
  });

  describe("getOrCreate", () => {
    it("should create new conversation", async () => {
      prismaService.aiConversation.findFirst = jest
        .fn()
        .mockResolvedValue(null);
      prismaService.aiConversation.create = jest
        .fn()
        .mockResolvedValue(mockConversation);

      const result = await service.getOrCreate({
        organizationId: mockOrganizationId,
        userId: mockUserId,
        entityType: "case",
        entityId: "case-123",
        agentType: "investigation",
      });

      expect(result.id).toBe(mockConversationId);
      expect(prismaService.aiConversation.create).toHaveBeenCalled();
    });

    it("should return existing active conversation", async () => {
      prismaService.aiConversation.findFirst = jest
        .fn()
        .mockResolvedValue(mockConversation);

      const result = await service.getOrCreate({
        organizationId: mockOrganizationId,
        userId: mockUserId,
        entityType: "case",
        entityId: "case-123",
      });

      expect(result.id).toBe(mockConversationId);
      expect(prismaService.aiConversation.create).not.toHaveBeenCalled();
    });

    it("should filter conversations by tenant", async () => {
      prismaService.aiConversation.findFirst = jest
        .fn()
        .mockResolvedValue(null);
      prismaService.aiConversation.create = jest
        .fn()
        .mockResolvedValue(mockConversation);

      await service.getOrCreate({
        organizationId: "different-org",
        userId: mockUserId,
      });

      expect(prismaService.aiConversation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "different-org",
          }),
        }),
      );
    });

    it("should create conversation without entity context", async () => {
      prismaService.aiConversation.findFirst = jest
        .fn()
        .mockResolvedValue(null);
      prismaService.aiConversation.create = jest.fn().mockResolvedValue({
        ...mockConversation,
        entityType: null,
        entityId: null,
      });

      const result = await service.getOrCreate({
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(result).toBeDefined();
      expect(prismaService.aiConversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: undefined,
          entityId: undefined,
        }),
      });
    });
  });

  describe("get", () => {
    it("should retrieve conversation by ID", async () => {
      prismaService.aiConversation.findFirst = jest
        .fn()
        .mockResolvedValue(mockConversation);

      const result = await service.get(mockConversationId, mockOrganizationId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockConversationId);
      expect(prismaService.aiConversation.findFirst).toHaveBeenCalledWith({
        where: { id: mockConversationId, organizationId: mockOrganizationId },
      });
    });

    it("should return null when conversation not found", async () => {
      prismaService.aiConversation.findFirst = jest
        .fn()
        .mockResolvedValue(null);

      const result = await service.get("non-existent", mockOrganizationId);

      expect(result).toBeNull();
    });
  });

  describe("getWithMessages", () => {
    it("should retrieve conversation history", async () => {
      const conversationWithMessages = {
        ...mockConversation,
        messages: [mockMessage],
        _count: { messages: 1 },
      };

      prismaService.aiConversation.findFirst = jest
        .fn()
        .mockResolvedValue(conversationWithMessages);

      const result = await service.getWithMessages(
        mockConversationId,
        mockOrganizationId,
      );

      expect(result).toBeDefined();
      expect(result?.messageCount).toBe(1);
      expect(result?.messages).toHaveLength(1);
    });

    it("should return null when conversation not found", async () => {
      prismaService.aiConversation.findFirst = jest
        .fn()
        .mockResolvedValue(null);

      const result = await service.getWithMessages(
        "non-existent",
        mockOrganizationId,
      );

      expect(result).toBeNull();
    });

    it("should paginate messages with limit", async () => {
      prismaService.aiConversation.findFirst = jest.fn().mockResolvedValue({
        ...mockConversation,
        messages: [],
        _count: { messages: 0 },
      });

      await service.getWithMessages(mockConversationId, mockOrganizationId, 10);

      expect(prismaService.aiConversation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            messages: expect.objectContaining({
              take: 10,
            }),
          }),
        }),
      );
    });
  });

  describe("addMessage", () => {
    it("should add message to existing conversation", async () => {
      prismaService.aiConversation.findUnique = jest
        .fn()
        .mockResolvedValue({ organizationId: mockOrganizationId });
      prismaService.aiMessage.create = jest.fn().mockResolvedValue(mockMessage);
      prismaService.aiConversation.update = jest
        .fn()
        .mockResolvedValue(mockConversation);

      const result = await service.addMessage({
        conversationId: mockConversationId,
        role: "user",
        content: "Hello, Claude!",
        inputTokens: 10,
      });

      expect(result.id).toBe("msg-123");
      expect(prismaService.aiMessage.create).toHaveBeenCalled();
      expect(prismaService.aiConversation.update).toHaveBeenCalled();
    });

    it("should track token usage per conversation", async () => {
      prismaService.aiConversation.findUnique = jest
        .fn()
        .mockResolvedValue({ organizationId: mockOrganizationId });
      prismaService.aiMessage.create = jest.fn().mockResolvedValue(mockMessage);
      prismaService.aiConversation.update = jest
        .fn()
        .mockResolvedValue(mockConversation);

      await service.addMessage({
        conversationId: mockConversationId,
        role: "assistant",
        content: "Hello! How can I help?",
        inputTokens: 100,
        outputTokens: 50,
        model: "claude-sonnet-4-5-20250929",
      });

      expect(prismaService.aiConversation.update).toHaveBeenCalledWith({
        where: { id: mockConversationId },
        data: expect.objectContaining({
          totalInputTokens: { increment: 100 },
          totalOutputTokens: { increment: 50 },
        }),
      });
    });

    it("should throw NotFoundException when conversation not found", async () => {
      prismaService.aiConversation.findUnique = jest
        .fn()
        .mockResolvedValue(null);

      await expect(
        service.addMessage({
          conversationId: "non-existent",
          role: "user",
          content: "Test",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should associate conversation with entity (case, investigation)", async () => {
      prismaService.aiConversation.findUnique = jest
        .fn()
        .mockResolvedValue({ organizationId: mockOrganizationId });
      prismaService.aiMessage.create = jest.fn().mockResolvedValue(mockMessage);
      prismaService.aiConversation.update = jest
        .fn()
        .mockResolvedValue(mockConversation);

      await service.addMessage({
        conversationId: mockConversationId,
        role: "user",
        content: "Question about this case",
      });

      // The conversation already has entityType and entityId set
      // This test verifies we can add messages to entity-scoped conversations
      expect(prismaService.aiMessage.create).toHaveBeenCalled();
    });
  });

  describe("getMessages", () => {
    it("should get messages for conversation", async () => {
      prismaService.aiMessage.findMany = jest
        .fn()
        .mockResolvedValue([mockMessage]);

      const result = await service.getMessages(mockConversationId);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Hello, Claude!");
    });

    it("should respect limit parameter", async () => {
      prismaService.aiMessage.findMany = jest.fn().mockResolvedValue([]);

      await service.getMessages(mockConversationId, 25);

      expect(prismaService.aiMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        }),
      );
    });

    it("should filter by before date", async () => {
      const beforeDate = new Date("2024-01-01");
      prismaService.aiMessage.findMany = jest.fn().mockResolvedValue([]);

      await service.getMessages(mockConversationId, 50, beforeDate);

      expect(prismaService.aiMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lt: beforeDate },
          }),
        }),
      );
    });
  });

  describe("pause", () => {
    it("should pause a conversation (saves context for later resume)", async () => {
      prismaService.aiConversation.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      await service.pause(mockConversationId, mockOrganizationId);

      expect(prismaService.aiConversation.updateMany).toHaveBeenCalledWith({
        where: {
          id: mockConversationId,
          organizationId: mockOrganizationId,
          status: "ACTIVE",
        },
        data: {
          status: "PAUSED",
          pausedAt: expect.any(Date),
        },
      });
    });

    it("should throw NotFoundException for non-existent conversation", async () => {
      prismaService.aiConversation.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 0 });

      await expect(
        service.pause("non-existent", mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("resume", () => {
    it("should resume a paused conversation", async () => {
      prismaService.aiConversation.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      await service.resume(mockConversationId, mockOrganizationId);

      expect(prismaService.aiConversation.updateMany).toHaveBeenCalledWith({
        where: {
          id: mockConversationId,
          organizationId: mockOrganizationId,
          status: "PAUSED",
        },
        data: {
          status: "ACTIVE",
          pausedAt: null,
        },
      });
    });

    it("should throw NotFoundException for non-paused conversation", async () => {
      prismaService.aiConversation.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 0 });

      await expect(
        service.resume(mockConversationId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("archive", () => {
    it("should delete conversation (soft delete)", async () => {
      prismaService.aiConversation.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      await service.archive(mockConversationId, mockOrganizationId);

      expect(prismaService.aiConversation.updateMany).toHaveBeenCalledWith({
        where: { id: mockConversationId, organizationId: mockOrganizationId },
        data: {
          status: "ARCHIVED",
          archivedAt: expect.any(Date),
        },
      });
    });

    it("should throw NotFoundException for non-existent conversation", async () => {
      prismaService.aiConversation.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 0 });

      await expect(
        service.archive("non-existent", mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("list", () => {
    it("should paginate conversation list", async () => {
      prismaService.aiConversation.findMany = jest
        .fn()
        .mockResolvedValue([{ ...mockConversation, _count: { messages: 5 } }]);
      prismaService.aiConversation.count = jest.fn().mockResolvedValue(1);

      const result = await service.list({
        organizationId: mockOrganizationId,
        userId: mockUserId,
        limit: 10,
        offset: 0,
      });

      expect(result.conversations).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should filter by status", async () => {
      prismaService.aiConversation.findMany = jest.fn().mockResolvedValue([]);
      prismaService.aiConversation.count = jest.fn().mockResolvedValue(0);

      await service.list({
        organizationId: mockOrganizationId,
        userId: mockUserId,
        status: ConversationStatus.PAUSED,
      });

      expect(prismaService.aiConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "PAUSED",
          }),
        }),
      );
    });

    it("should filter by entity type and ID", async () => {
      prismaService.aiConversation.findMany = jest.fn().mockResolvedValue([]);
      prismaService.aiConversation.count = jest.fn().mockResolvedValue(0);

      await service.list({
        organizationId: mockOrganizationId,
        userId: mockUserId,
        entityType: "case",
        entityId: "case-123",
      });

      expect(prismaService.aiConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: "case",
            entityId: "case-123",
          }),
        }),
      );
    });
  });

  describe("search", () => {
    it("should search conversations by message content", async () => {
      prismaService.aiMessage.findMany = jest
        .fn()
        .mockResolvedValue([{ conversationId: mockConversationId }]);
      prismaService.aiConversation.findMany = jest
        .fn()
        .mockResolvedValue([{ ...mockConversation, _count: { messages: 5 } }]);

      const result = await service.search({
        organizationId: mockOrganizationId,
        userId: mockUserId,
        query: "test query",
      });

      expect(result).toHaveLength(1);
      expect(prismaService.aiMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: { contains: "test query", mode: "insensitive" },
          }),
        }),
      );
    });

    it("should return empty array when no matches", async () => {
      prismaService.aiMessage.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.search({
        organizationId: mockOrganizationId,
        userId: mockUserId,
        query: "no matches",
      });

      expect(result).toHaveLength(0);
    });

    it("should respect limit parameter", async () => {
      prismaService.aiMessage.findMany = jest.fn().mockResolvedValue([]);

      await service.search({
        organizationId: mockOrganizationId,
        userId: mockUserId,
        query: "test",
        limit: 5,
      });

      expect(prismaService.aiMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe("generateTitle", () => {
    it("should generate title from first user message", async () => {
      prismaService.aiMessage.findMany = jest.fn().mockResolvedValue([
        {
          role: "user",
          content: "How do I investigate a harassment complaint?",
        },
        { role: "assistant", content: "Here are the steps..." },
      ]);

      const title = await service.generateTitle(mockConversationId);

      expect(title).toContain("How do I investigate");
    });

    it("should truncate long messages", async () => {
      const longContent = "A".repeat(100);
      prismaService.aiMessage.findMany = jest
        .fn()
        .mockResolvedValue([{ role: "user", content: longContent }]);

      const title = await service.generateTitle(mockConversationId);

      expect(title.length).toBeLessThanOrEqual(63); // 60 chars + '...'
    });

    it("should return default title for empty conversation", async () => {
      prismaService.aiMessage.findMany = jest.fn().mockResolvedValue([]);

      const title = await service.generateTitle(mockConversationId);

      expect(title).toBe("New Conversation");
    });

    it("should return default title when no user messages", async () => {
      prismaService.aiMessage.findMany = jest
        .fn()
        .mockResolvedValue([{ role: "assistant", content: "Hello!" }]);

      const title = await service.generateTitle(mockConversationId);

      expect(title).toBe("New Conversation");
    });
  });

  describe("updateTitle", () => {
    it("should update conversation title", async () => {
      prismaService.aiConversation.updateMany = jest
        .fn()
        .mockResolvedValue({ count: 1 });

      await service.updateTitle(
        mockConversationId,
        mockOrganizationId,
        "New Title",
      );

      expect(prismaService.aiConversation.updateMany).toHaveBeenCalledWith({
        where: { id: mockConversationId, organizationId: mockOrganizationId },
        data: { title: "New Title" },
      });
    });
  });

  describe("getStats", () => {
    it("should return conversation statistics for a user", async () => {
      prismaService.aiConversation.groupBy = jest.fn().mockResolvedValue([
        { status: "ACTIVE", _count: 5 },
        { status: "ARCHIVED", _count: 10 },
      ]);
      prismaService.aiMessage.count = jest.fn().mockResolvedValue(100);
      prismaService.aiConversation.aggregate = jest.fn().mockResolvedValue({
        _sum: { totalInputTokens: 5000, totalOutputTokens: 3000 },
      });

      const stats = await service.getStats(mockOrganizationId, mockUserId);

      expect(stats.totalConversations).toBe(15);
      expect(stats.activeConversations).toBe(5);
      expect(stats.totalMessages).toBe(100);
      expect(stats.totalTokens).toBe(8000);
    });

    it("should handle zero conversations", async () => {
      prismaService.aiConversation.groupBy = jest.fn().mockResolvedValue([]);
      prismaService.aiMessage.count = jest.fn().mockResolvedValue(0);
      prismaService.aiConversation.aggregate = jest.fn().mockResolvedValue({
        _sum: { totalInputTokens: null, totalOutputTokens: null },
      });

      const stats = await service.getStats(mockOrganizationId, mockUserId);

      expect(stats.totalConversations).toBe(0);
      expect(stats.activeConversations).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.totalTokens).toBe(0);
    });
  });

  describe("tenant isolation", () => {
    it("should always include organizationId in conversation queries", async () => {
      prismaService.aiConversation.findFirst = jest
        .fn()
        .mockResolvedValue(mockConversation);

      await service.get(mockConversationId, "different-org");

      expect(prismaService.aiConversation.findFirst).toHaveBeenCalledWith({
        where: { id: mockConversationId, organizationId: "different-org" },
      });
    });

    it("should set organizationId from conversation when adding messages", async () => {
      prismaService.aiConversation.findUnique = jest.fn().mockResolvedValue({
        organizationId: "conversation-org",
      });
      prismaService.aiMessage.create = jest.fn().mockResolvedValue(mockMessage);
      prismaService.aiConversation.update = jest
        .fn()
        .mockResolvedValue(mockConversation);

      await service.addMessage({
        conversationId: mockConversationId,
        role: "user",
        content: "Test",
      });

      expect(prismaService.aiMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "conversation-org",
        }),
      });
    });

    it("should filter list by both organizationId and userId", async () => {
      prismaService.aiConversation.findMany = jest.fn().mockResolvedValue([]);
      prismaService.aiConversation.count = jest.fn().mockResolvedValue(0);

      await service.list({
        organizationId: "org-abc",
        userId: "user-xyz",
      });

      expect(prismaService.aiConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-abc",
            userId: "user-xyz",
          }),
        }),
      );
    });
  });
});
