import { Test, TestingModule } from "@nestjs/testing";
import {
  AiOrchestrationService,
  UserContext,
  ChatInput,
} from "./ai-orchestration.service";
import { AgentRegistry } from "../agents/agent.registry";
import { BaseAgent, AgentContext } from "../agents/base.agent";
import { StreamEvent } from "../dto/chat-message.dto";

describe("AiOrchestrationService", () => {
  let service: AiOrchestrationService;
  let agentRegistry: jest.Mocked<AgentRegistry>;

  // Mock agent
  const mockAgent: Partial<BaseAgent> = {
    initialize: jest.fn().mockResolvedValue(undefined),
    chat: jest.fn(),
  };

  const mockAgentRegistry = {
    getAgent: jest.fn().mockReturnValue(mockAgent),
    getAgentTypeForEntity: jest.fn((entityType: string) => {
      if (entityType === "investigation") return "investigation";
      if (entityType === "case") return "case";
      return "compliance-manager";
    }),
    listAgentTypes: jest
      .fn()
      .mockReturnValue(["investigation", "case", "compliance-manager"]),
  };

  const mockUserContext: UserContext = {
    organizationId: "org-123",
    userId: "user-456",
    role: "INVESTIGATOR",
    permissions: ["ai:skills:note-cleanup", "ai:chat"],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chat mock to return successful response
    (mockAgent.chat as jest.Mock).mockImplementation(async function* () {
      yield { type: "text_delta", text: "Hello " } as StreamEvent;
      yield { type: "text_delta", text: "world" } as StreamEvent;
      yield { type: "message_complete" } as StreamEvent;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiOrchestrationService,
        { provide: AgentRegistry, useValue: mockAgentRegistry },
      ],
    }).compile();

    service = module.get<AiOrchestrationService>(AiOrchestrationService);
    agentRegistry = module.get(AgentRegistry);
  });

  describe("processChat", () => {
    it("should route request to appropriate skill", async () => {
      const input: ChatInput = {
        message: "Summarize this investigation",
        entityType: "investigation",
        entityId: "inv-123",
      };

      const result = await service.processChat(input, mockUserContext);

      expect(result.success).toBe(true);
      expect(result.response).toBe("Hello world");
      expect(result.agentType).toBe("investigation");
      expect(agentRegistry.getAgent).toHaveBeenCalledWith(
        "investigation",
        expect.objectContaining({
          organizationId: "org-123",
          userId: "user-456",
        }),
      );
    });

    it("should build context from context-loader", async () => {
      const input: ChatInput = {
        message: "Test message",
        entityType: "case",
        entityId: "case-123",
      };

      await service.processChat(input, mockUserContext);

      expect(agentRegistry.getAgent).toHaveBeenCalledWith(
        "case",
        expect.objectContaining({
          organizationId: "org-123",
          userId: "user-456",
          userRole: "INVESTIGATOR",
          permissions: ["ai:skills:note-cleanup", "ai:chat"],
          entityType: "case",
          entityId: "case-123",
        }),
      );
    });

    it("should initialize agent before chat", async () => {
      const input: ChatInput = {
        message: "Test",
      };

      await service.processChat(input, mockUserContext);

      expect(mockAgent.initialize).toHaveBeenCalled();
      expect(mockAgent.chat).toHaveBeenCalled();
    });

    it("should use explicit agentType when provided", async () => {
      const input: ChatInput = {
        message: "Test",
        agentType: "compliance-manager",
        entityType: "case", // Would normally map to 'case' agent
      };

      await service.processChat(input, mockUserContext);

      // Should use explicit type, not mapped type
      expect(agentRegistry.getAgent).toHaveBeenCalledWith(
        "compliance-manager",
        expect.any(Object),
      );
    });

    it("should handle skill not found error", async () => {
      mockAgentRegistry.getAgent.mockImplementationOnce(() => {
        throw new Error("Agent type not found: unknown-agent");
      });

      const input: ChatInput = {
        message: "Test",
        agentType: "unknown-agent",
      };

      const result = await service.processChat(input, mockUserContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Agent type not found");
    });

    it("should handle context building failure", async () => {
      (mockAgent.initialize as jest.Mock).mockRejectedValueOnce(
        new Error("Context loading failed"),
      );

      const input: ChatInput = {
        message: "Test",
      };

      const result = await service.processChat(input, mockUserContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Context loading failed");
    });

    it("should handle error events from agent", async () => {
      (mockAgent.chat as jest.Mock).mockImplementationOnce(async function* () {
        yield { type: "error", error: "AI processing failed" } as StreamEvent;
      });

      const input: ChatInput = {
        message: "Test",
      };

      const result = await service.processChat(input, mockUserContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe("AI processing failed");
    });

    it("should collect full response from stream", async () => {
      (mockAgent.chat as jest.Mock).mockImplementationOnce(async function* () {
        yield { type: "text_delta", text: "Part 1" } as StreamEvent;
        yield { type: "text_delta", text: " Part 2" } as StreamEvent;
        yield { type: "text_delta", text: " Part 3" } as StreamEvent;
        yield { type: "message_complete" } as StreamEvent;
      });

      const input: ChatInput = {
        message: "Test",
      };

      const result = await service.processChat(input, mockUserContext);

      expect(result.success).toBe(true);
      expect(result.response).toBe("Part 1 Part 2 Part 3");
    });

    it("should respect tenant isolation in context", async () => {
      const differentOrgContext: UserContext = {
        organizationId: "different-org",
        userId: "user-789",
        role: "EMPLOYEE",
        permissions: [],
      };

      const input: ChatInput = {
        message: "Test",
        entityType: "case",
        entityId: "case-123",
      };

      await service.processChat(input, differentOrgContext);

      expect(agentRegistry.getAgent).toHaveBeenCalledWith(
        "case",
        expect.objectContaining({
          organizationId: "different-org",
          userId: "user-789",
        }),
      );
    });
  });

  describe("buildAgentContext", () => {
    it("should build context with all fields", () => {
      const input = {
        entityType: "investigation",
        entityId: "inv-123",
      };

      const context = service.buildAgentContext(mockUserContext, input);

      expect(context).toEqual({
        organizationId: "org-123",
        userId: "user-456",
        userRole: "INVESTIGATOR",
        permissions: ["ai:skills:note-cleanup", "ai:chat"],
        entityType: "investigation",
        entityId: "inv-123",
      });
    });

    it("should handle missing entity info", () => {
      const context = service.buildAgentContext(mockUserContext);

      expect(context.entityType).toBeUndefined();
      expect(context.entityId).toBeUndefined();
    });

    it("should handle empty input", () => {
      const context = service.buildAgentContext(mockUserContext, {});

      expect(context.entityType).toBeUndefined();
      expect(context.entityId).toBeUndefined();
    });
  });

  describe("buildActionContext", () => {
    it("should build action context with required fields", () => {
      const input = {
        entityType: "case",
        entityId: "case-123",
      };

      const context = service.buildActionContext(mockUserContext, input);

      expect(context).toEqual({
        organizationId: "org-123",
        userId: "user-456",
        userRole: "INVESTIGATOR",
        permissions: ["ai:skills:note-cleanup", "ai:chat"],
        entityType: "case",
        entityId: "case-123",
      });
    });
  });

  describe("extractUserContext", () => {
    it("should extract context from request user", () => {
      const requestUser = {
        id: "user-123",
        organizationId: "org-456",
        role: "COMPLIANCE_OFFICER",
        permissions: ["admin"],
      };

      const context = service.extractUserContext(requestUser);

      expect(context).toEqual({
        organizationId: "org-456",
        userId: "user-123",
        role: "COMPLIANCE_OFFICER",
        permissions: ["admin"],
      });
    });

    it("should use demo fallbacks for null user", () => {
      const context = service.extractUserContext(null);

      expect(context).toEqual({
        organizationId: "demo",
        userId: "demo",
        role: "EMPLOYEE",
        permissions: [],
      });
    });

    it("should use demo fallbacks for undefined user", () => {
      const context = service.extractUserContext(undefined);

      expect(context.organizationId).toBe("demo");
      expect(context.userId).toBe("demo");
    });

    it("should handle partial user data", () => {
      const context = service.extractUserContext({
        id: "user-123",
      });

      expect(context.userId).toBe("user-123");
      expect(context.organizationId).toBe("demo");
      expect(context.role).toBe("EMPLOYEE");
      expect(context.permissions).toEqual([]);
    });
  });

  describe("resolveAgentType (private method tested via processChat)", () => {
    it("should default to compliance-manager when no type specified", async () => {
      const input: ChatInput = {
        message: "Test",
      };

      await service.processChat(input, mockUserContext);

      expect(agentRegistry.getAgent).toHaveBeenCalledWith(
        "compliance-manager",
        expect.any(Object),
      );
    });

    it("should map investigation entity to investigation agent", async () => {
      const input: ChatInput = {
        message: "Test",
        entityType: "investigation",
      };

      await service.processChat(input, mockUserContext);

      expect(agentRegistry.getAgent).toHaveBeenCalledWith(
        "investigation",
        expect.any(Object),
      );
    });

    it("should map case entity to case agent", async () => {
      const input: ChatInput = {
        message: "Test",
        entityType: "case",
      };

      await service.processChat(input, mockUserContext);

      expect(agentRegistry.getAgent).toHaveBeenCalledWith(
        "case",
        expect.any(Object),
      );
    });

    it("should use compliance-manager for unknown entity types", async () => {
      // The registry returns 'compliance-manager' for unknown types
      mockAgentRegistry.getAgentTypeForEntity.mockReturnValueOnce(
        "compliance-manager",
      );

      const input: ChatInput = {
        message: "Test",
        entityType: "unknown-entity",
      };

      await service.processChat(input, mockUserContext);

      expect(agentRegistry.getAgent).toHaveBeenCalledWith(
        "compliance-manager",
        expect.any(Object),
      );
    });
  });

  describe("integration scenarios", () => {
    it("should handle conversation flow with multiple messages", async () => {
      // First message
      let result = await service.processChat(
        { message: "Hello", conversationId: "conv-123" },
        mockUserContext,
      );
      expect(result.success).toBe(true);

      // Second message in same conversation
      result = await service.processChat(
        { message: "Follow up question", conversationId: "conv-123" },
        mockUserContext,
      );
      expect(result.success).toBe(true);
    });

    it("should handle entity-scoped conversations", async () => {
      const input: ChatInput = {
        message: "What is the status of this case?",
        entityType: "case",
        entityId: "case-789",
        conversationId: "conv-456",
      };

      const result = await service.processChat(input, mockUserContext);

      expect(result.success).toBe(true);
      expect(result.entityType).toBe("case");
      expect(result.entityId).toBe("case-789");
    });
  });
});
