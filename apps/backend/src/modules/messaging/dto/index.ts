import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  MinLength,
  Length,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for sending a message to reporter (authenticated endpoint)
 */
export class SendMessageToReporterDto {
  @ApiProperty({
    description: "Message content (supports rich text)",
    maxLength: 10000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({ description: "Optional subject line" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({
    description: "Skip PII detection check",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipPiiCheck?: boolean;

  @ApiPropertyOptional({
    description: "Acknowledged PII warnings (required if PII detected)",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acknowledgedPiiWarnings?: string[];
}

/**
 * DTO for sending a message from reporter (public endpoint)
 */
export class SendMessageFromReporterDto {
  @ApiProperty({
    description: "Message content",
    maxLength: 10000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;
}

/**
 * DTO for checking PII in content
 */
export class CheckPiiDto {
  @ApiProperty({
    description: "Content to check for PII",
    maxLength: 10000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;
}

/**
 * DTO for access code parameter validation
 */
export class AccessCodeParamDto {
  @ApiProperty({
    description: "12-character access code",
    example: "A2B3C4D5E6F7",
  })
  @IsString()
  @Length(12, 20)
  @Matches(/^[A-Z0-9]+$/, {
    message: "Access code must contain only uppercase letters and numbers",
  })
  accessCode: string;
}

/**
 * Response DTO for message view
 */
export class MessageViewDto {
  @ApiProperty({ description: "Message ID" })
  id: string;

  @ApiProperty({
    description: "Message direction",
    enum: ["inbound", "outbound"],
  })
  direction: "inbound" | "outbound";

  @ApiProperty({ description: "Message content" })
  content: string;

  @ApiPropertyOptional({ description: "Optional subject line" })
  subject?: string | null;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Whether message has been read" })
  isRead: boolean;

  @ApiPropertyOptional({ description: "Read timestamp" })
  readAt?: Date | null;

  @ApiProperty({ description: "Sender type" })
  senderType: string;
}

/**
 * Response DTO for messages list
 */
export class MessagesListDto {
  @ApiProperty({ type: [MessageViewDto] })
  messages: MessageViewDto[];

  @ApiProperty({ description: "Total message count" })
  totalCount: number;
}

/**
 * Response DTO for unread counts
 */
export class UnreadCountDto {
  @ApiProperty({ description: "Unread messages from reporter" })
  inboundUnread: number;

  @ApiProperty({ description: "Unread messages to reporter" })
  outboundUnread: number;

  @ApiProperty({ description: "Total message count" })
  totalMessages: number;
}

/**
 * Response DTO for PII check
 */
export class PiiCheckResultDto {
  @ApiProperty({ description: "Whether PII was detected" })
  hasPii: boolean;

  @ApiProperty({ description: "Human-readable warnings", type: [String] })
  warnings: string[];

  @ApiProperty({ description: "Whether send should be blocked" })
  blocked: boolean;

  @ApiPropertyOptional({ description: "Reason for blocking" })
  blockReason?: string;
}
