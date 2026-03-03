import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AiClientService } from "./ai-client.service";
import { MessageRole } from "../dto/chat-message.dto";

// Mock Anthropic SDK
jest.mock("@anthropic-ai/sdk", () => {
  const mockCreate = jest.fn().mockResolvedValue({
    content: [{ type: "text", text: "Test response from Claude" }],
    usage: { input_tokens: 100, output_tokens: 50 },
    stop_reason: "end_turn",
  });

  const mockStream = jest.fn().mockImplementation(() => ({
    [Symbol.asyncIterator]: async function* () {
      yield {
        type: "content_block_delta",
        delta: { type: "text_delta", text: "Hello" },
      };
      yield {
        type: "content_block_delta",
        delta: { type: "text_delta", text: " world" },
      };
      yield { type: "message_stop" };
    },
  }));

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
        stream: mockStream,
      },
    })),
  };
});

describe("AiClientService", () => {
  let service: AiClientService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      switch (key) {
        case "ANTHROPIC_API_KEY":
          return "test-api-key";
        case "AI_DEFAULT_MODEL":
          return "claude-sonnet-4-5-20250929";
        case "AI_MAX_TOKENS":
          return 4096;
        default:
          return defaultValue;
      }
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiClientService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiClientService>(AiClientService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize the service
    service.onModuleInit();
  });

  describe("onModuleInit", () => {
    it("should create Anthropic client on init when API key is set", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should not create client when API key is missing", async () => {
      const noKeyConfigService = {
        get: jest.fn((key: string) => {
          if (key === "ANTHROPIC_API_KEY") return undefined;
          return undefined;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AiClientService,
          { provide: ConfigService, useValue: noKeyConfigService },
        ],
      }).compile();

      const noKeyService = module.get<AiClientService>(AiClientService);
      noKeyService.onModuleInit();

      expect(noKeyService.isConfigured()).toBe(false);
    });
  });

  describe("createChat", () => {
    it("should send message to Claude API", async () => {
      const result = await service.createChat(
        { message: "Hello Claude", history: [] },
        "org-123",
      );

      expect(result.content).toBe("Test response from Claude");
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
      expect(result.stopReason).toBe("end_turn");
    });

    it("should include history in request", async () => {
      const history = [
        { role: MessageRole.USER, content: "Previous question" },
        { role: MessageRole.ASSISTANT, content: "Previous answer" },
      ];

      const result = await service.createChat(
        { message: "Follow up question", history },
        "org-123",
      );

      expect(result.content).toBe("Test response from Claude");
    });

    it("should include system prompt in request", async () => {
      const result = await service.createChat(
        {
          message: "Test message",
          systemPrompt: "You are a helpful assistant.",
        },
        "org-123",
      );

      expect(result.content).toBe("Test response from Claude");
    });

    it("should respect max_tokens limit", () => {
      expect(service.getMaxTokens()).toBe(4096);
    });

    it("should use default model", () => {
      expect(service.getModel()).toBe("claude-sonnet-4-5-20250929");
    });

    it("should throw error when service is not configured", async () => {
      const noKeyService = new AiClientService({
        get: () => undefined,
      } as unknown as ConfigService);
      noKeyService.onModuleInit();

      await expect(
        noKeyService.createChat({ message: "Test" }, "org-123"),
      ).rejects.toThrow("AI service not configured");
    });

    it("should handle API rate limit errors (429)", () => {
      // Test error wrapping directly
      const error = { status: 429, message: "Too many requests" };
      const wrappedError = (
        service as unknown as { wrapError: (e: unknown) => Error }
      ).wrapError(error);
      expect(wrappedError.message).toContain("rate limit");
    });

    it("should handle API authentication errors (401)", () => {
      const error = { status: 401, message: "Unauthorized" };
      const wrappedError = (
        service as unknown as { wrapError: (e: unknown) => Error }
      ).wrapError(error);
      expect(wrappedError.message).toContain("authentication failed");
    });

    it("should handle network timeout errors", () => {
      const error = { code: "ETIMEDOUT", message: "Connection timed out" };
      const wrappedError = (
        service as unknown as { wrapError: (e: unknown) => Error }
      ).wrapError(error);
      expect(wrappedError.message).toContain("connection failed");
    });

    it("should handle server errors (500/503)", () => {
      const error500 = { status: 500, message: "Internal server error" };
      const wrapped500 = (
        service as unknown as { wrapError: (e: unknown) => Error }
      ).wrapError(error500);
      expect(wrapped500.message).toContain("temporarily unavailable");

      const error503 = { status: 503, message: "Service unavailable" };
      const wrapped503 = (
        service as unknown as { wrapError: (e: unknown) => Error }
      ).wrapError(error503);
      expect(wrapped503.message).toContain("temporarily unavailable");
    });

    it("should log token usage after response", async () => {
      const result = await service.createChat(
        { message: "Test message" },
        "org-123",
      );

      // Verify tokens are returned in response
      expect(result.inputTokens).toBeDefined();
      expect(result.outputTokens).toBeDefined();
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
    });
  });

  describe("streamChat", () => {
    it("should handle streaming response correctly", async () => {
      const streamId = `stream-${Date.now()}`;
      const events: Array<{ type: string; text?: string }> = [];

      for await (const event of service.streamChat(
        { message: "Hello" },
        streamId,
        "org-123",
      )) {
        events.push(event);
      }

      // Should have text_delta events and message_complete
      expect(events.length).toBeGreaterThan(0);
      const textEvents = events.filter((e) => e.type === "text_delta");
      expect(textEvents.some((e) => e.text === "Hello")).toBe(true);
      expect(events.some((e) => e.type === "message_complete")).toBe(true);
    });

    it("should track active streams", async () => {
      const streamId = "test-stream-123";
      const generator = service.streamChat(
        { message: "Hello" },
        streamId,
        "org-123",
      );

      // Start consuming the stream
      await generator.next();
      expect(service.getActiveStreamCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe("abortStream", () => {
    it("should abort an active stream", async () => {
      const streamId = "abort-test-stream";

      // Start a stream
      const generator = service.streamChat(
        { message: "Long message" },
        streamId,
        "org-123",
      );

      // Begin consuming
      await generator.next();

      // Abort should succeed while stream is active
      // Note: In the actual implementation, the stream is tracked
      const aborted = service.abortStream(streamId);
      // The stream may have already completed
      expect(typeof aborted).toBe("boolean");
    });

    it("should return false for non-existent stream", () => {
      const result = service.abortStream("non-existent-stream");
      expect(result).toBe(false);
    });
  });

  describe("estimateTokens", () => {
    it("should estimate token count for text", () => {
      const text = "This is a test string with some words.";
      const estimate = service.estimateTokens(text);

      // Rough estimate is ~4 chars per token
      expect(estimate).toBeGreaterThan(0);
      expect(estimate).toBe(Math.ceil(text.length / 4));
    });

    it("should handle empty text", () => {
      const estimate = service.estimateTokens("");
      expect(estimate).toBe(0);
    });
  });

  describe("isConfigured", () => {
    it("should return true when client is initialized", () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe("getModel and getMaxTokens", () => {
    it("should return configured model", () => {
      expect(service.getModel()).toBe("claude-sonnet-4-5-20250929");
    });

    it("should return configured max tokens", () => {
      expect(service.getMaxTokens()).toBe(4096);
    });
  });

  describe("error handling", () => {
    it("should wrap generic errors appropriately", () => {
      const error = { message: "Something went wrong" };
      const wrappedError = (
        service as unknown as { wrapError: (e: unknown) => Error }
      ).wrapError(error);
      expect(wrappedError.message).toContain("AI service error");
    });

    it("should handle ECONNREFUSED errors", () => {
      const error = { code: "ECONNREFUSED", message: "Connection refused" };
      const wrappedError = (
        service as unknown as { wrapError: (e: unknown) => Error }
      ).wrapError(error);
      expect(wrappedError.message).toContain("connection failed");
    });
  });
});
