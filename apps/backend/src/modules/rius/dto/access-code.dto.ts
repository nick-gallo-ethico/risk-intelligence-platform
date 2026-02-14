import { IsString, Length, Matches } from "class-validator";

/**
 * DTO for validating access code parameter
 */
export class AccessCodeDto {
  @IsString()
  @Length(12, 20)
  @Matches(/^[A-Z0-9]+$/, {
    message: "Access code must contain only uppercase letters and numbers",
  })
  accessCode: string;
}

/**
 * Response DTO for RIU status check via access code
 */
export class RiuStatusResponseDto {
  accessCode: string;
  status: string;
  statusDescription: string;
  submittedAt: Date;
  lastUpdatedAt: Date;
  hasMessages: boolean;
  unreadMessageCount: number;
  caseLinked: boolean;
  caseReferenceNumber?: string;
}

/**
 * Response DTO for messages retrieved via access code
 */
export class RiuMessagesResponseDto {
  messages: {
    id: string;
    direction: "inbound" | "outbound";
    content: string;
    createdAt: Date;
    isRead: boolean;
  }[];
  totalCount: number;
}

/**
 * DTO for sending a message via access code
 */
export class SendMessageDto {
  @IsString()
  @Length(1, 10000)
  content: string;
}
