import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import {
  CreateChatDto,
  StreamEvent,
  AiResponse,
  MessageRole,
} from "../dto/chat-message.dto";

/**
 * AiClientService - Core Claude API client wrapper with streaming support.
 *
 * This service provides the foundational AI capabilities for the platform:
 * - Non-streaming chat completion for simple requests
 * - Streaming chat completion for real-time responses
 * - Abort support for cancelling in-flight streams
 * - Token estimation for rate limiting
 *
 * All AI features (note cleanup, summaries, categorization, agent chat) build on this service.
 *
 * IMPORTANT: Tenant isolation is enforced by callers passing organizationId in CreateChatDto.
 * This service does not access the database directly - it's a pure API wrapper.
 */
@Injectable()
export class AiClientService implements OnModuleInit {
  private readonly logger = new Logger(AiClientService.name);
  private client: Anthropic | null = null;
  private readonly activeStreams = new Map<string, AbortController>();

  // Default model - claude-sonnet-4-5 for fast, reliable chat
  // Can be overridden via AI_DEFAULT_MODEL env var
  private readonly defaultModel: string;
  private readonly maxTokens: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultModel =
      this.configService.get<string>("AI_DEFAULT_MODEL") ||
      "claude-sonnet-4-5-20250929";
    this.maxTokens = this.configService.get<number>("AI_MAX_TOKENS") || 4096;
  }

  onModuleInit() {
    const apiKey = this.configService.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey) {
      this.logger.warn(
        "ANTHROPIC_API_KEY not set - AI features will be disabled",
      );
      return;
    }

    this.client = new Anthropic({ apiKey });
    this.logger.log("Anthropic client initialized");
  }

  /**
   * Check if the AI service is configured and ready to use.
   * Returns false if ANTHROPIC_API_KEY is not set.
   */
  isConfigured(): boolean {
    return !!this.client;
  }

  /**
   * Create a chat completion (non-streaming).
   * Use this for simple requests where you need the full response at once.
   *
   * @param params - Chat parameters including message, history, and optional system prompt
   * @returns AI response with content and token usage
   * @throws Error if AI service is not configured
   */
  async createChat(params: CreateChatDto): Promise<AiResponse> {
    this.ensureConfigured();

    const messages = this.buildMessages(params);

    this.logger.debug(
      `Creating chat completion for org=${params.organizationId}, entity=${params.entityType || "none"}/${params.entityId || "none"}`,
    );

    try {
      const response = await this.client!.messages.create({
        model: this.defaultModel,
        max_tokens: this.maxTokens,
        system: params.systemPrompt || this.getDefaultSystemPrompt(),
        messages,
      });

      const textContent = response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join("");

      this.logger.debug(
        `Chat completion successful: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output tokens`,
      );

      return {
        content: textContent,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        stopReason: response.stop_reason || "end_turn",
      };
    } catch (error) {
      this.logger.error(
        `Chat completion failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw this.wrapError(error);
    }
  }

  /**
   * Stream a chat completion.
   * Use this for real-time responses where you want to show text as it's generated.
   *
   * @param params - Chat parameters including message, history, and optional system prompt
   * @param streamId - Unique ID to track this stream for abort support
   * @yields StreamEvent objects with text deltas and completion signals
   *
   * @example
   * ```typescript
   * const streamId = `stream-${Date.now()}`;
   * for await (const event of aiClient.streamChat(params, streamId)) {
   *   if (event.type === 'text_delta') {
   *     process.stdout.write(event.text);
   *   }
   * }
   * ```
   */
  async *streamChat(
    params: CreateChatDto,
    streamId: string,
  ): AsyncGenerator<StreamEvent> {
    this.ensureConfigured();

    const messages = this.buildMessages(params);
    const abortController = new AbortController();
    this.activeStreams.set(streamId, abortController);

    this.logger.debug(
      `Starting stream ${streamId} for org=${params.organizationId}`,
    );

    try {
      const stream = this.client!.messages.stream(
        {
          model: this.defaultModel,
          max_tokens: this.maxTokens,
          system: params.systemPrompt || this.getDefaultSystemPrompt(),
          messages,
        },
        {
          signal: abortController.signal,
        },
      );

      for await (const event of stream) {
        if (event.type === "content_block_delta") {
          const delta = event.delta as { type: string; text?: string };
          if (delta.type === "text_delta" && delta.text) {
            yield { type: "text_delta", text: delta.text };
          }
        } else if (event.type === "message_stop") {
          yield { type: "message_complete" };
        }
      }

      this.logger.debug(`Stream ${streamId} completed successfully`);
    } catch (error) {
      const err = error as Error;
      if (err.name === "AbortError") {
        this.logger.debug(`Stream ${streamId} aborted by client`);
        return;
      }

      this.logger.error(`Stream ${streamId} error: ${err.message}`, err.stack);
      yield { type: "error", error: err.message };
    } finally {
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Abort an active stream.
   * Use this to cancel an in-flight streaming request (e.g., user navigates away).
   *
   * @param streamId - The stream ID passed to streamChat()
   * @returns true if stream was found and aborted, false if stream not found
   */
  abortStream(streamId: string): boolean {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
      this.logger.debug(`Stream ${streamId} abort requested`);
      return true;
    }
    return false;
  }

  /**
   * Get the number of currently active streams.
   * Useful for monitoring and rate limiting.
   */
  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Estimate token count for text.
   * This is a rough estimation (~4 chars per token) for quick calculations.
   * For accurate counts, use the actual API response.
   *
   * @param text - Text to estimate tokens for
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get the current model being used.
   */
  getModel(): string {
    return this.defaultModel;
  }

  /**
   * Get the max tokens setting.
   */
  getMaxTokens(): number {
    return this.maxTokens;
  }

  /**
   * Ensure the client is configured before making API calls.
   * @throws Error if ANTHROPIC_API_KEY is not set
   */
  private ensureConfigured(): void {
    if (!this.client) {
      throw new Error("AI service not configured - ANTHROPIC_API_KEY not set");
    }
  }

  /**
   * Build the messages array for the API call from CreateChatDto.
   */
  private buildMessages(
    params: CreateChatDto,
  ): Array<{ role: "user" | "assistant"; content: string }> {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Add history if provided
    if (params.history) {
      for (const msg of params.history) {
        messages.push({
          role: msg.role === MessageRole.USER ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    // Add current message
    messages.push({
      role: "user",
      content: params.message,
    });

    return messages;
  }

  /**
   * Get the default system prompt for compliance-focused AI assistance.
   */
  private getDefaultSystemPrompt(): string {
    return `You are an AI assistant for a compliance and risk management platform called Ethico. You help users with:

- Summarizing cases and investigations
- Cleaning up and formatting notes from hotline calls
- Categorizing reports by type and severity
- Answering questions about compliance matters
- Generating risk assessments and recommendations
- Translating policy documents

Guidelines:
- Be professional, accurate, and thorough
- Maintain confidentiality when dealing with sensitive information
- Follow best practices for compliance documentation
- Be concise but complete - compliance professionals need actionable information
- When uncertain, acknowledge limitations rather than speculating
- Format responses for easy reading (use bullet points, sections when appropriate)`;
  }

  /**
   * Wrap API errors in application-appropriate errors.
   */
  private wrapError(error: unknown): Error {
    const err = error as Error & { status?: number; code?: string };

    // Handle specific Anthropic API errors
    if (err.status === 401) {
      return new Error("AI service authentication failed - check API key");
    }
    if (err.status === 429) {
      return new Error(
        "AI service rate limit exceeded - please try again later",
      );
    }
    if (err.status === 500 || err.status === 503) {
      return new Error(
        "AI service temporarily unavailable - please try again later",
      );
    }
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return new Error("AI service connection failed - please try again later");
    }

    // Generic error
    return new Error(`AI service error: ${err.message}`);
  }
}
