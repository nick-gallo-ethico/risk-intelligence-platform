/**
 * Notifications Module
 *
 * Provides notification infrastructure for email and in-app notifications.
 * Handles user preferences, delivery tracking, and digest scheduling.
 *
 * Services to be added:
 * - EmailTemplateService (07-02)
 * - PreferenceService (07-03)
 * - NotificationService (07-04)
 * - InAppNotificationService (07-05)
 * - DigestService (07-06)
 * - DeliveryTrackerService (07-07)
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { EMAIL_QUEUE_NAME } from '../jobs/queues/email.queue';

@Module({
  imports: [
    PrismaModule,
    // Register email queue for notification delivery
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
    }),
  ],
  providers: [
    // Services will be added in subsequent plans:
    // - EmailTemplateService (07-02): Email template management and rendering
    // - PreferenceService (07-03): User notification preferences
    // - NotificationService (07-04): Core notification creation and dispatch
    // - InAppNotificationService (07-05): Real-time in-app notifications
    // - DigestService (07-06): Daily digest compilation and scheduling
    // - DeliveryTrackerService (07-07): Email delivery status tracking
  ],
  controllers: [
    // Controllers will be added in subsequent plans:
    // - NotificationController (07-04)
    // - PreferenceController (07-03)
    // - EmailTemplateController (07-02)
  ],
  exports: [
    // Services will be exported as they are added:
    // - NotificationService
    // - PreferenceService
    // - EmailTemplateService
  ],
})
export class NotificationsModule {}
