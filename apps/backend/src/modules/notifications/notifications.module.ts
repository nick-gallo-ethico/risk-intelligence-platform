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
 * - NotificationService (07-04): Core notification dispatch
 *
 * Listeners:
 * - CaseEventListener (07-04): Handles case.assigned, case.status_changed events
 * - SlaEventListener (07-04): Handles sla.warning, sla.breached, sla.critical events
 * - WorkflowEventListener (07-04): Handles workflow step and approval events
 *
 * Remaining services to be added:
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
import { NotificationService } from './services/notification.service';

// Event listeners
import { CaseEventListener } from './listeners/case.listener';
import { SlaEventListener } from './listeners/sla.listener';
import { WorkflowEventListener } from './listeners/workflow.listener';

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

    // Core notification dispatch (07-04)
    NotificationService,

    // Event listeners (07-04)
    CaseEventListener,
    SlaEventListener,
    WorkflowEventListener,

    // Services to be added in subsequent plans:
    // - InAppNotificationService (07-05): Real-time in-app notifications via WebSocket
    // - DigestService (07-06): Daily digest compilation and scheduling
    // - DeliveryTrackerService (07-07): Email delivery status tracking
  ],
  controllers: [
    // Controllers will be added in subsequent plans:
    // - NotificationController (07-08)
    // - PreferenceController (07-08)
  ],
  exports: [
    // Template management
    EmailTemplateService,

    // Preference services
    PreferenceService,
    OrgNotificationSettingsService,

    // Core notification dispatch
    NotificationService,
  ],
})
export class NotificationsModule {}
