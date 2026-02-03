import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { MessageRelayService } from "./relay.service";
import {
  SendMessageToReporterDto,
  SendMessageFromReporterDto,
  CheckPiiDto,
  AccessCodeParamDto,
  MessageViewDto,
  MessagesListDto,
  UnreadCountDto,
  PiiCheckResultDto,
} from "./dto";

/**
 * MessagingController - Authenticated endpoints for investigators
 *
 * Handles internal messaging operations for case investigators.
 * All endpoints require JWT authentication and tenant context.
 */
@ApiTags("Case Messaging")
@ApiBearerAuth()
@Controller("api/v1/case-messages")
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly relayService: MessageRelayService) {}

  /**
   * Send message to reporter
   */
  @Post(":caseId/send")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Send message to reporter",
    description:
      "Send a message to the reporter via the anonymous relay. " +
      "PII detection warns before sending potentially identifying information.",
  })
  @ApiResponse({ status: 201, description: "Message sent successfully" })
  @ApiResponse({ status: 400, description: "PII detected - requires acknowledgment" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async sendMessage(
    @Param("caseId") caseId: string,
    @Body() dto: SendMessageToReporterDto,
    @CurrentUser("id") userId: string,
    @TenantId() organizationId: string,
  ): Promise<MessageViewDto> {
    const message = await this.relayService.sendToReporter(
      {
        caseId,
        content: dto.content,
        subject: dto.subject,
        skipPiiCheck: dto.skipPiiCheck,
        acknowledgedPiiWarnings: dto.acknowledgedPiiWarnings,
      },
      userId,
      organizationId,
    );

    return {
      id: message.id,
      direction: message.direction.toLowerCase() as "inbound" | "outbound",
      content: message.content,
      subject: message.subject,
      createdAt: message.createdAt,
      isRead: message.isRead,
      readAt: message.readAt,
      senderType: message.senderType,
    };
  }

  /**
   * Get messages for a case
   */
  @Get(":caseId")
  @ApiOperation({
    summary: "Get messages for case",
    description:
      "Retrieve all messages for a case. " +
      "Automatically marks inbound (from reporter) messages as read.",
  })
  @ApiResponse({ status: 200, type: MessagesListDto })
  @ApiResponse({ status: 404, description: "Case not found" })
  async getMessages(
    @Param("caseId") caseId: string,
    @CurrentUser("id") userId: string,
    @TenantId() organizationId: string,
  ): Promise<MessagesListDto> {
    const messages = await this.relayService.getMessagesForInvestigator(
      caseId,
      userId,
      organizationId,
    );

    return {
      messages,
      totalCount: messages.length,
    };
  }

  /**
   * Get unread message counts
   */
  @Get(":caseId/unread-count")
  @ApiOperation({
    summary: "Get unread message counts",
    description: "Get counts of unread messages in each direction.",
  })
  @ApiResponse({ status: 200, type: UnreadCountDto })
  @ApiResponse({ status: 404, description: "Case not found" })
  async getUnreadCount(
    @Param("caseId") caseId: string,
    @TenantId() organizationId: string,
  ): Promise<UnreadCountDto> {
    return this.relayService.getUnreadCount(caseId, organizationId);
  }

  /**
   * Check content for PII
   */
  @Post("check-pii")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Check content for PII",
    description:
      "Pre-send validation to check if message contains personally identifying information.",
  })
  @ApiResponse({ status: 200, type: PiiCheckResultDto })
  async checkPii(@Body() dto: CheckPiiDto): Promise<PiiCheckResultDto> {
    return this.relayService.checkForPii(dto.content);
  }
}

/**
 * PublicMessagingController - Public endpoints for anonymous reporters
 *
 * Handles messaging operations for anonymous reporters via access code.
 * No authentication required - access code serves as authorization.
 * Rate limited to prevent abuse.
 */
@ApiTags("Public Messaging")
@Controller("api/v1/public/messages")
export class PublicMessagingController {
  constructor(private readonly relayService: MessageRelayService) {}

  /**
   * Get messages for reporter via access code
   */
  @Get(":caseId")
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20/min
  @ApiOperation({
    summary: "Get messages for reporter",
    description:
      "Retrieve messages via access code. " +
      "Automatically marks outbound (to reporter) messages as read.",
  })
  @ApiResponse({ status: 200, type: MessagesListDto })
  @ApiResponse({ status: 404, description: "Invalid access code" })
  async getMessages(
    @Param("caseId") caseId: string,
    @Query("accessCode") accessCode: string,
  ): Promise<MessagesListDto> {
    // Validate access code format
    if (!accessCode || !/^[A-Z0-9]{12,20}$/.test(accessCode)) {
      throw new Error("Invalid access code format");
    }

    const messages = await this.relayService.getMessagesForReporter(accessCode);

    return {
      messages,
      totalCount: messages.length,
    };
  }

  /**
   * Send message from reporter via access code
   */
  @Post(":caseId")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5/min
  @ApiOperation({
    summary: "Send message from reporter",
    description:
      "Send a message to investigators via access code. " +
      "No authentication required.",
  })
  @ApiResponse({ status: 201, description: "Message sent successfully" })
  @ApiResponse({ status: 400, description: "No case linked yet" })
  @ApiResponse({ status: 404, description: "Invalid access code" })
  async sendMessage(
    @Param("caseId") caseId: string,
    @Query("accessCode") accessCode: string,
    @Body() dto: SendMessageFromReporterDto,
  ): Promise<{ success: boolean; messageId: string }> {
    // Validate access code format
    if (!accessCode || !/^[A-Z0-9]{12,20}$/.test(accessCode)) {
      throw new Error("Invalid access code format");
    }

    const message = await this.relayService.receiveFromReporter({
      accessCode,
      content: dto.content,
    });

    return {
      success: true,
      messageId: message.id,
    };
  }
}
