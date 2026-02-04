/**
 * WebhookController - Email Provider Webhook Handler
 *
 * Placeholder for email delivery webhook endpoints.
 * Will be fully implemented in plan 07-07.
 *
 * Planned webhooks:
 * - POST /webhooks/sendgrid: SendGrid delivery events
 * - POST /webhooks/ses: AWS SES delivery events
 * - POST /webhooks/postmark: Postmark delivery events
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('webhooks')
export class WebhookController {
  /**
   * SendGrid webhook endpoint (placeholder).
   * Will be fully implemented in plan 07-07.
   */
  @Post('sendgrid')
  @HttpCode(HttpStatus.OK)
  async handleSendGrid(@Body() _payload: unknown): Promise<{ received: boolean }> {
    // Placeholder - full implementation in 07-07
    return { received: true };
  }

  /**
   * AWS SES webhook endpoint (placeholder).
   * Will be fully implemented in plan 07-07.
   */
  @Post('ses')
  @HttpCode(HttpStatus.OK)
  async handleSes(@Body() _payload: unknown): Promise<{ received: boolean }> {
    // Placeholder - full implementation in 07-07
    return { received: true };
  }
}
