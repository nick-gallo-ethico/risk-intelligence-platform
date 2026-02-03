import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RemediationService } from './remediation.service';
import { RemediationStepService } from './remediation-step.service';
import { RemediationNotificationService } from './remediation-notification.service';
import { RemediationEventHandler } from './handlers/remediation-event.handler';
import { RemediationController } from './remediation.controller';
import { EMAIL_QUEUE_NAME } from '../jobs/queues/email.queue';

/**
 * Remediation Module
 *
 * Provides remediation plan management for case investigations:
 * - Plan creation and lifecycle management
 * - Step assignment (internal users and external contacts)
 * - Step completion and approval workflow
 * - Notification scheduling and sending
 * - Event-driven audit logging
 *
 * Integrates with:
 * - Email queue for notification delivery
 * - Audit module for activity logging
 * - Events module for event-driven notifications
 */
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    BullModule.registerQueue({ name: EMAIL_QUEUE_NAME }),
  ],
  controllers: [RemediationController],
  providers: [
    RemediationService,
    RemediationStepService,
    RemediationNotificationService,
    RemediationEventHandler,
  ],
  exports: [
    RemediationService,
    RemediationStepService,
    RemediationNotificationService,
  ],
})
export class RemediationModule {}
