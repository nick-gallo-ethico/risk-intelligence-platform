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
 * - NotificationGateway (07-05): WebSocket gateway for real-time in-app notifications
 * - DigestService (07-06): Daily digest compilation and scheduling
 * - DeliveryTrackerService (07-07): Email delivery status tracking
 *
 * Listeners:
 * - CaseEventListener (07-04): Handles case.assigned, case.status_changed events
 * - SlaEventListener (07-04): Handles sla.warning, sla.breached, sla.critical events
 * - WorkflowEventListener (07-04): Handles workflow step and approval events
 *
 */

import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { BullModule } from "@nestjs/bullmq";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MailerModule } from "@nestjs-modules/mailer";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { EMAIL_QUEUE_NAME } from "../jobs/queues/email.queue";
import { mailerConfig } from "./mailer.config";

// Services
import { EmailTemplateService } from "./services/email-template.service";
import { PreferenceService } from "./services/preference.service";
import { OrgNotificationSettingsService } from "./services/org-settings.service";
import { NotificationService } from "./services/notification.service";
import { DigestService } from "./services/digest.service";
import { DeliveryTrackerService } from "./services/delivery-tracker.service";

// Gateway (07-05)
import { NotificationGateway } from "./gateways/notification.gateway";

// Controllers
import { WebhookController } from "./controllers/webhook.controller";
import { NotificationsController } from "./controllers/notifications.controller";
import { PreferencesController } from "./controllers/preferences.controller";

// Event listeners
import { CaseEventListener } from "./listeners/case.listener";
import { SlaEventListener } from "./listeners/sla.listener";
import { WorkflowEventListener } from "./listeners/workflow.listener";

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    // AuthModule for JwtService (WebSocket authentication)
    AuthModule,
    // ScheduleModule for digest cron scheduling (07-06)
    ScheduleModule.forRoot(),
    // Cache module for preference caching (5-minute TTL default)
    CacheModule.register({
      ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
    }),
    // Register email queue for notification delivery
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
    }),
    // MailerModule for SMTP email delivery (07-07)
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: mailerConfig,
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

    // WebSocket gateway for real-time in-app notifications (07-05)
    NotificationGateway,

    // Daily digest compilation and scheduling (07-06)
    DigestService,

    // Delivery tracking (07-07)
    DeliveryTrackerService,

    // Event listeners (07-04)
    CaseEventListener,
    SlaEventListener,
    WorkflowEventListener,
  ],
  controllers: [
    // Webhook controller for email provider callbacks (07-07)
    WebhookController,
    // Notification CRUD controller (07-08)
    NotificationsController,
    // Preference management controller (07-08)
    PreferencesController,
  ],
  exports: [
    // Template management
    EmailTemplateService,

    // Preference services
    PreferenceService,
    OrgNotificationSettingsService,

    // Core notification dispatch
    NotificationService,

    // WebSocket gateway (for other modules to check connection status)
    NotificationGateway,

    // Daily digest
    DigestService,

    // Delivery tracking
    DeliveryTrackerService,

    // MailerModule for EmailProcessor in JobsModule
    MailerModule,
  ],
})
export class NotificationsModule {}
