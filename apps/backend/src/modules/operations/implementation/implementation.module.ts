/**
 * ImplementationModule - Implementation Portal
 *
 * Manages client onboarding and implementation tracking:
 * - Go-live readiness (hybrid gates, score, sign-off)
 * - Project tracking and checklists
 * - Task management and health score
 * - Blocker tracking and escalation
 * - Activity logging (email, meeting, decision)
 * - Auto-escalation processor for aging blockers
 */

import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "../../prisma/prisma.module";
import { GoLiveService } from "./go-live.service";
import { GoLiveController } from "./go-live.controller";
import { ImplementationController } from "./implementation.controller";
import { ImplementationService } from "./implementation.service";
import { ChecklistService } from "./checklist.service";
import { ActivityLogService } from "./activity-log.service";
import { EscalationProcessor, ESCALATION_QUEUE } from "./escalation.processor";

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
    BullModule.registerQueue({
      name: ESCALATION_QUEUE,
      // Queue will be configured with cron job for daily escalation checks
    }),
  ],
  controllers: [GoLiveController, ImplementationController],
  providers: [
    GoLiveService,
    ImplementationService,
    ChecklistService,
    ActivityLogService,
    EscalationProcessor,
  ],
  exports: [
    GoLiveService,
    ImplementationService,
    ChecklistService,
    ActivityLogService,
  ],
})
export class ImplementationModule {}
