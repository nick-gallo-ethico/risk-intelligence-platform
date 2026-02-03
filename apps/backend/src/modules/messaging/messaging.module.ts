import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "../prisma/prisma.module";
import { EMAIL_QUEUE_NAME } from "../jobs/queues/email.queue";
import { MessagingController, PublicMessagingController } from "./messaging.controller";
import { MessageRelayService } from "./relay.service";
import { PiiDetectionService } from "./pii-detection.service";

/**
 * MessagingModule
 *
 * Provides two-way anonymous communication between reporters and investigators.
 * Implements the "Chinese Wall" model where reporter identity is protected.
 *
 * Features:
 * - Identity-protecting message relay
 * - PII detection to prevent accidental identity disclosure
 * - Authenticated endpoints for investigators
 * - Public endpoints for anonymous reporters (access code auth)
 * - Email notification queue for reporter alerts
 *
 * Exports:
 * - MessageRelayService - For sending messages from other modules
 * - PiiDetectionService - For PII detection in other contexts
 */
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
    }),
  ],
  controllers: [MessagingController, PublicMessagingController],
  providers: [MessageRelayService, PiiDetectionService],
  exports: [MessageRelayService, PiiDetectionService],
})
export class MessagingModule {}
