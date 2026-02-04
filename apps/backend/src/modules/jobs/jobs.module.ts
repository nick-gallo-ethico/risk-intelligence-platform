import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";

import { AI_QUEUE_NAME, AI_QUEUE_OPTIONS } from "./queues/ai.queue";
import { EMAIL_QUEUE_NAME, EMAIL_QUEUE_OPTIONS } from "./queues/email.queue";
import { EXPORT_QUEUE_NAME, EXPORT_QUEUE_OPTIONS } from "./queues/export.queue";
import {
  INDEXING_QUEUE_NAME,
  INDEXING_QUEUE_OPTIONS,
} from "./queues/indexing.queue";
import { AiProcessor } from "./processors/ai.processor";
import { EmailProcessor } from "./processors/email.processor";
import { ExportProcessor } from "./processors/export.processor";
import { IndexingProcessor } from "./processors/indexing.processor";
import { SearchModule } from "../search/search.module";
import { NotificationsModule } from "../notifications/notifications.module";

/**
 * Jobs Module
 *
 * Provides BullMQ job queue infrastructure with:
 * - Four queues: AI processing, Email delivery, Report export, Search indexing
 * - Each queue has different retry/backoff configurations
 * - Bull Board admin UI at /admin/queues
 *
 * Queue characteristics:
 * - ai-processing: 5 retries, exponential backoff (2s base), concurrency 5
 * - email: 3 retries, exponential backoff (1s base), priority 2, concurrency 10
 * - export: 2 retries, fixed delay (5s), concurrency 3
 * - indexing: 3 retries, fixed delay (5s), priority 5, concurrency 20
 */
@Module({
  imports: [
    // BullMQ root configuration with Redis connection
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("redis.host"),
          port: configService.get<number>("redis.port"),
          password: configService.get<string>("redis.password"),
        },
        prefix: "ethico", // Queue prefix for multi-app Redis
      }),
      inject: [ConfigService],
    }),

    // Register queues with their configurations
    BullModule.registerQueue({
      name: AI_QUEUE_NAME,
      ...AI_QUEUE_OPTIONS,
    }),
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
      ...EMAIL_QUEUE_OPTIONS,
    }),
    BullModule.registerQueue({
      name: EXPORT_QUEUE_NAME,
      ...EXPORT_QUEUE_OPTIONS,
    }),
    BullModule.registerQueue({
      name: INDEXING_QUEUE_NAME,
      ...INDEXING_QUEUE_OPTIONS,
    }),

    // Bull Board admin UI configuration
    BullBoardModule.forRoot({
      route: "/admin/queues",
      adapter: ExpressAdapter,
    }),

    // Register queues with Bull Board for monitoring
    BullBoardModule.forFeature({
      name: AI_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: EMAIL_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: EXPORT_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: INDEXING_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),

    // SearchModule provides IndexingService for IndexingProcessor
    forwardRef(() => SearchModule),

    // NotificationsModule provides DeliveryTrackerService and MailerModule for EmailProcessor
    forwardRef(() => NotificationsModule),
  ],
  providers: [AiProcessor, EmailProcessor, ExportProcessor, IndexingProcessor],
  exports: [BullModule],
})
export class JobsModule {}
