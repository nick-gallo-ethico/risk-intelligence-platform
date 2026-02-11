/**
 * AI Provider Interface
 *
 * This module defines the abstraction layer for AI providers, enabling
 * the platform to swap LLM providers without changing calling code.
 *
 * Key design decisions:
 * - Message format matches Anthropic's but is provider-agnostic
 * - All providers must implement streaming and non-streaming methods
 * - Capabilities flags allow runtime feature detection
 * - Token estimation is provider-specific for accuracy
 */

/**
 * Standard message format for AI provider communication.
 * Matches Anthropic's format but is provider-agnostic.
 */
export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Tool definition for AI function calling.
 * Tools enable AI to invoke specific functions with structured inputs.
 */
export interface AITool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Tool call made by the AI.
 * Represents the AI's request to invoke a specific tool.
 */
export interface AIToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Result of an action execution.
 * Emitted when an AI-triggered action completes.
 */
export interface AIActionResult {
  action: string;
  success: boolean;
  message?: string;
  result?: unknown;
}

/**
 * Stream event types emitted during streaming responses.
 * These events allow real-time processing of AI responses.
 */
export interface AIStreamEvent {
  type:
    | "text_delta"
    | "tool_use"
    | "message_complete"
    | "usage"
    | "error"
    | "action_executed";
  text?: string;
  toolCall?: AIToolCall;
  usage?: AIUsage;
  error?: string;
  actionResult?: AIActionResult;
}

/**
 * Token usage metrics for billing and rate limiting.
 * Tracks tokens consumed by each API call.
 */
export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

/**
 * Parameters for creating a message.
 * Provider-agnostic request format.
 */
export interface CreateMessageParams {
  model?: string;
  maxTokens?: number;
  system?: string;
  messages: AIMessage[];
  tools?: AITool[];
  temperature?: number;
}

/**
 * Response from a non-streaming message creation.
 * Contains the AI's response and metadata.
 */
export interface AIMessageResponse {
  content: string;
  toolCalls?: AIToolCall[];
  usage: AIUsage;
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
}

/**
 * Provider capability flags.
 * Used for runtime feature detection.
 */
export interface AIProviderCapabilities {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  promptCaching: boolean;
}

/**
 * Abstract interface for AI providers.
 * Implementations must handle provider-specific details while
 * exposing a consistent API for the application.
 *
 * This interface enables:
 * - Claude (primary provider)
 * - Azure OpenAI (for customers requiring Azure)
 * - Self-hosted LLMs (for customers who can't use cloud AI)
 */
export interface AIProvider {
  /** Provider identifier (e.g., 'claude', 'openai', 'local') */
  readonly name: string;

  /** Provider capabilities */
  readonly capabilities: AIProviderCapabilities;

  /** Available models for this provider */
  readonly availableModels: string[];

  /** Default model to use */
  readonly defaultModel: string;

  /**
   * Create a message (non-streaming).
   * Use for simple requests where you need the full response at once.
   */
  createMessage(params: CreateMessageParams): Promise<AIMessageResponse>;

  /**
   * Stream a message response.
   * Returns an async iterator of stream events.
   * Use for real-time responses where you want to show text as it's generated.
   */
  streamMessage(
    params: CreateMessageParams,
    abortSignal?: AbortSignal,
  ): AsyncIterable<AIStreamEvent>;

  /**
   * Estimate token count for text.
   * Provider-specific implementation for accuracy.
   * Note: This is an estimation; for accurate counts use API response.
   */
  estimateTokens(text: string): number;

  /**
   * Check if the provider is properly configured and ready.
   * Returns false if required configuration (e.g., API key) is missing.
   */
  isReady(): boolean;
}
