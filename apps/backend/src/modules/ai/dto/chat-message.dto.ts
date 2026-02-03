import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
} from "class-validator";

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
}

export class ChatMessageDto {
  @IsEnum(MessageRole)
  role: MessageRole;

  @IsString()
  @MaxLength(100000) // ~25K tokens worth of text
  content: string;
}

export class CreateChatDto {
  @IsString()
  organizationId: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @MaxLength(100000)
  message: string;

  @IsArray()
  @IsOptional()
  history?: ChatMessageDto[];

  @IsString()
  @IsOptional()
  systemPrompt?: string;
}

export interface StreamEvent {
  type:
    | "text_delta"
    | "tool_use_start"
    | "tool_input_delta"
    | "tool_result"
    | "message_complete"
    | "error";
  text?: string;
  toolId?: string;
  toolName?: string;
  input?: unknown;
  error?: string;
}

export interface AiResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
}
