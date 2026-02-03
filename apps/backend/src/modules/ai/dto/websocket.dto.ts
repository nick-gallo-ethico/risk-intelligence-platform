import { IsString, IsOptional, IsBoolean } from "class-validator";

/**
 * WebSocket DTOs for AI real-time streaming.
 *
 * These DTOs define the structure of messages between the client and
 * the AI WebSocket gateway for streaming chat responses.
 */

/**
 * Payload for initiating a chat message.
 */
export class ChatPayload {
  @IsString()
  message: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  agentType?: string;
}

/**
 * Payload for stopping an active stream.
 */
export class StopPayload {
  @IsString()
  conversationId: string;
}

/**
 * Payload for conversation lifecycle actions (pause/resume).
 */
export class ConversationActionPayload {
  @IsString()
  conversationId: string;
}

/**
 * Payload for executing a skill via WebSocket.
 */
export class SkillExecutePayload {
  @IsString()
  skillId: string;

  input: Record<string, unknown>;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;
}

/**
 * Payload for executing an action via WebSocket.
 */
export class ActionExecutePayload {
  @IsString()
  actionId: string;

  input: Record<string, unknown>;

  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsBoolean()
  @IsOptional()
  skipPreview?: boolean;
}

/**
 * Context extracted from WebSocket authentication handshake.
 */
export interface SocketContext {
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
}

// ============ Outbound Events ============

/**
 * Emitted when streaming text content from AI.
 */
export interface TextDeltaEvent {
  type: "text_delta";
  conversationId: string;
  text: string;
}

/**
 * Emitted when AI uses a tool (skill/action).
 */
export interface ToolUseEvent {
  type: "tool_use";
  conversationId: string;
  toolName: string;
  input: unknown;
}

/**
 * Emitted when assistant message starts.
 */
export interface MessageStartEvent {
  type: "message_start";
  conversationId: string;
}

/**
 * Emitted when assistant message completes.
 */
export interface MessageCompleteEvent {
  type: "message_complete";
  conversationId: string;
}

/**
 * Emitted on error during streaming.
 */
export interface ErrorEvent {
  type: "error";
  conversationId?: string;
  message: string;
}

/**
 * Emitted when stream is stopped by user.
 */
export interface StoppedEvent {
  type: "stopped";
  conversationId: string;
}

/**
 * Emitted after skill execution completes.
 */
export interface SkillResultEvent {
  type: "skill_result";
  skillId: string;
  result: unknown;
}

/**
 * Emitted after action execution completes.
 */
export interface ActionResultEvent {
  type: "action_result";
  actionId: string;
  result: unknown;
}

/**
 * Emitted when conversation is paused.
 */
export interface ConversationPausedEvent {
  type: "conversation_paused";
  conversationId: string;
}

/**
 * Emitted when conversation is resumed.
 */
export interface ConversationResumedEvent {
  type: "conversation_resumed";
  conversationId: string;
}

/**
 * Union of all outbound event types.
 */
export type AiWebSocketEvent =
  | TextDeltaEvent
  | ToolUseEvent
  | MessageStartEvent
  | MessageCompleteEvent
  | ErrorEvent
  | StoppedEvent
  | SkillResultEvent
  | ActionResultEvent
  | ConversationPausedEvent
  | ConversationResumedEvent;
