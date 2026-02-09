import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RiuAccessService } from './riu-access.service';
import {
  AccessCodeDto,
  SendMessageDto,
  RiuStatusResponseDto,
  RiuMessagesResponseDto,
} from './dto/access-code.dto';

/**
 * Public controller for anonymous RIU access operations.
 *
 * NO authentication required - the access code IS the authorization.
 * All endpoints are rate-limited to prevent brute-force attacks.
 *
 * This controller enables anonymous reporters to:
 * - Check the status of their submitted report
 * - View relay messages from investigators
 * - Send messages to investigators via the anonymous relay
 *
 * Route: /api/v1/public/access
 */
@Controller('public/access')
export class RiuAccessController {
  constructor(private readonly accessService: RiuAccessService) {}

  /**
   * Check RIU status by access code.
   *
   * Returns:
   * - Current status with human-readable description
   * - Submission and last update timestamps
   * - Unread message count
   * - Whether case is linked
   *
   * Rate limit: 10 requests per minute per IP
   *
   * @example GET /api/v1/public/access/A2B3C4D5E6F7/status
   */
  @Get(':accessCode/status')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async checkStatus(
    @Param() params: AccessCodeDto,
  ): Promise<RiuStatusResponseDto> {
    return this.accessService.checkStatus(params.accessCode);
  }

  /**
   * Get messages for RIU by access code.
   *
   * Returns all messages in chronological order.
   * Marks outbound messages (TO reporter) as read.
   *
   * Rate limit: 20 requests per minute per IP
   *
   * @example GET /api/v1/public/access/A2B3C4D5E6F7/messages
   */
  @Get(':accessCode/messages')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getMessages(
    @Param() params: AccessCodeDto,
  ): Promise<RiuMessagesResponseDto> {
    return this.accessService.getMessages(params.accessCode);
  }

  /**
   * Send message as anonymous reporter.
   *
   * Creates an inbound message on the linked case.
   * Will fail if no case is linked yet.
   *
   * Rate limit: 5 messages per minute per IP
   *
   * @example POST /api/v1/public/access/A2B3C4D5E6F7/messages
   *          Body: { "content": "I have additional information..." }
   */
  @Post(':accessCode/messages')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async sendMessage(
    @Param() params: AccessCodeDto,
    @Body() dto: SendMessageDto,
  ): Promise<{ success: boolean }> {
    await this.accessService.sendMessage(params.accessCode, dto.content);
    return { success: true };
  }
}
