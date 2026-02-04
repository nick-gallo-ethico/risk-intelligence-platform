/**
 * Notifications Module
 *
 * Provides notification infrastructure for email and in-app notifications.
 * Handles user preferences, delivery tracking, and digest scheduling.
 *
 * Services:
 * - EmailTemplateService (07-02): Email template management and rendering
 * - PreferenceService (07-03): User notification preferences with caching
 * - OrgNotificationSettingsService (07-03): Org-level notification config
 *
 * Remaining services to be added:
 * - NotificationService (07-04)
 * - InAppNotificationService (07-05)
 * - DigestService (07-06)
 * - DeliveryTrackerService (07-07)
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { EMAIL_QUEUE_NAME } from '../jobs/queues/email.queue';

// Services
import { EmailTemplateService } from './services/email-template.service';
import { PreferenceService } from './services/preference.service';
import { OrgNotificationSettingsService } from './services/org-settings.service';

@Module({
  imports: [
    PrismaModule,
    // Cache module for preference caching (5-minute TTL default)
    CacheModule.register({
      ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
    }),
    // Register email queue for notification delivery
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
    }),
  ],
  providers: [
    // Template management (07-02)
    EmailTemplateService,

    // Preference services (07-03)
    PreferenceService,
    OrgNotificationSettingsService,

    // Services to be added in subsequent plans:
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
    // Template management
    EmailTemplateService,

    // Preference services
    PreferenceService,
    OrgNotificationSettingsService,
  ],
})
export class NotificationsModule {}
