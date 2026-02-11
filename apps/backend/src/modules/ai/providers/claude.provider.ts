import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import {
  AIProvider,
  AIProviderCapabilities,
  CreateMessageParams,
  AIMessageResponse,
  AIStreamEvent,
  AIMessage,
  AITool,
} from "../interfaces/ai-provider.interface";

/**
 * ClaudeProvider - Anthropic Claude implementation of AIProvider.
 *
 * This provider wraps the @anthropic-ai/sdk to implement the standard
 * AIProvider interface, enabling the platform to use Claude while
 * maintaining the ability to swap providers.
 *
 * Features:
 * - Non-streaming and streaming message creation
 * - Tool/function calling support
 * - Prompt caching support
 * - Vision support (via multimodal messages)
 * - Graceful degradation when API key not configured
 */
@Injectable()
export class ClaudeProvider implements AIProvider, OnModuleInit {
  private readonly logger = new Logger(ClaudeProvider.name);
  private client: Anthropic | null = null;

  readonly name = "claude";

  readonly capabilities: AIProviderCapabilities = {
    streaming: true,
    tools: true,
    vision: true,
    promptCaching: true,
  };

  readonly availableModels = [
    "claude-opus-4-6",
    "claude-sonnet-4-5",
    "claude-3-5-haiku-latest",
  ];

  readonly defaultModel = "claude-sonnet-4-5-20250929";

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey) {
      this.logger.warn("ANTHROPIC_API_KEY not set - Claude provider disabled");
      return;
    }

    this.client = new Anthropic({ apiKey });
    this.logger.log("Claude provider initialized");
  }

  isReady(): boolean {
    return this.client !== null;
  }

  async createMessage(params: CreateMessageParams): Promise<AIMessageResponse> {
    this.ensureReady();

    const { system, userMessages } = this.separateSystemMessage(
      params.messages,
    );
    const claudeTools = params.tools
      ? this.convertTools(params.tools)
      : undefined;

    const response = await this.client!.messages.create({
      model: params.model || this.defaultModel,
      max_tokens: params.maxTokens || 4096,
      system: params.system || system || undefined,
      messages: userMessages,
      tools: claudeTools,
      temperature: params.temperature,
    });

    return this.convertResponse(response);
  }

  async *streamMessage(
    params: CreateMessageParams,
    abortSignal?: AbortSignal,
  ): AsyncIterable<AIStreamEvent> {
    this.ensureReady();

    const { system, userMessages } = this.separateSystemMessage(
      params.messages,
    );
    const claudeTools = params.tools
      ? this.convertTools(params.tools)
      : undefined;

    const stream = this.client!.messages.stream(
      {
        model: params.model || this.defaultModel,
        max_tokens: params.maxTokens || 4096,
        system: params.system || system || undefined,
        messages: userMessages,
        tools: claudeTools,
        temperature: params.temperature,
      },
      { signal: abortSignal },
    );

    let currentToolId: string | undefined;
    let currentToolName: string | undefined;
    let toolInputJson = "";

    try {
      for await (const event of stream) {
        if (event.type === "content_block_start") {
          const block = event.content_block as {
            type: string;
            id?: string;
            name?: string;
          };
          if (block.type === "tool_use") {
            currentToolId = block.id;
            currentToolName = block.name;
            toolInputJson = "";
          }
        } else if (event.type === "content_block_delta") {
          const delta = event.delta as {
            type: string;
            text?: string;
            partial_json?: string;
          };

          if (delta.type === "text_delta" && delta.text) {
            yield { type: "text_delta", text: delta.text };
          } else if (delta.type === "input_json_delta" && delta.partial_json) {
            toolInputJson += delta.partial_json;
          }
        } else if (event.type === "content_block_stop") {
          if (currentToolId && currentToolName) {
            try {
              const input = JSON.parse(toolInputJson);
              yield {
                type: "tool_use",
                toolCall: {
                  id: currentToolId,
                  name: currentToolName,
                  input,
                },
              };
            } catch {
              this.logger.warn("Failed to parse tool input JSON");
            }
            currentToolId = undefined;
            currentToolName = undefined;
            toolInputJson = "";
          }
        } else if (event.type === "message_delta") {
          const usage = (
            event as { usage?: { input_tokens: number; output_tokens: number } }
          ).usage;
          if (usage) {
            yield {
              type: "usage",
              usage: {
                inputTokens: usage.input_tokens,
                outputTokens: usage.output_tokens,
              },
            };
          }
        } else if (event.type === "message_stop") {
          yield { type: "message_complete" };
        }
      }
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err.name === "AbortError") {
        return;
      }
      yield { type: "error", error: err.message || "Unknown error" };
    }
  }

  estimateTokens(text: string): number {
    // Claude uses ~4 characters per token on average for English
    // This is a rough estimate; for accurate counts use the tokenizer
    return Math.ceil(text.length / 4);
  }

  private ensureReady(): void {
    if (!this.client) {
      throw new Error(
        "Claude provider not initialized - ANTHROPIC_API_KEY not set",
      );
    }
  }

  private separateSystemMessage(messages: AIMessage[]): {
    system: string | undefined;
    userMessages: Array<{ role: "user" | "assistant"; content: string }>;
  } {
    const systemMessages = messages.filter((m) => m.role === "system");
    const userMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    return {
      system: systemMessages.map((m) => m.content).join("\n\n") || undefined,
      userMessages,
    };
  }

  private convertTools(tools: AITool[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    }));
  }

  private convertResponse(response: Anthropic.Message): AIMessageResponse {
    const textContent = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as Anthropic.TextBlock).text)
      .join("");

    const toolCalls = response.content
      .filter((block) => block.type === "tool_use")
      .map((block) => {
        const toolBlock = block as Anthropic.ToolUseBlock;
        return {
          id: toolBlock.id,
          name: toolBlock.name,
          input: toolBlock.input as Record<string, unknown>,
        };
      });

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: response.stop_reason as AIMessageResponse["stopReason"],
    };
  }
}
