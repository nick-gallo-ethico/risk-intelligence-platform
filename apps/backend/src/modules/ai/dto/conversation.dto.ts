import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
  IsInt,
  Min,
} from "class-validator";

export enum ConversationStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  ARCHIVED = "ARCHIVED",
}

export class GetOrCreateConversationDto {
  @IsString()
  organizationId: string;

  @IsString()
  userId: string;

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

export class AddMessageDto {
  @IsString()
  conversationId: string;

  @IsEnum(["user", "assistant"])
  role: "user" | "assistant";

  @IsString()
  @MaxLength(500000) // ~125K tokens
  content: string;

  @IsArray()
  @IsOptional()
  toolCalls?: Array<{ id: string; name: string; input: unknown }>;

  @IsArray()
  @IsOptional()
  toolResults?: Array<{ toolUseId: string; result: unknown }>;

  @IsInt()
  @Min(0)
  @IsOptional()
  inputTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  outputTokens?: number;

  @IsString()
  @IsOptional()
  model?: string;
}

export class ListConversationsDto {
  @IsString()
  organizationId: string;

  @IsString()
  userId: string;

  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;
}

export class SearchConversationsDto {
  @IsString()
  organizationId: string;

  @IsString()
  userId: string;

  @IsString()
  @MaxLength(500)
  query: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export interface ConversationWithMessages {
  id: string;
  title: string | null;
  status: ConversationStatus;
  entityType: string | null;
  entityId: string | null;
  agentType: string | null;
  createdAt: Date;
  lastMessageAt: Date | null;
  messageCount: number;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  status: ConversationStatus;
  entityType: string | null;
  entityId: string | null;
  agentType: string | null;
  lastMessageAt: Date | null;
  messageCount: number;
  totalTokens: number;
}
