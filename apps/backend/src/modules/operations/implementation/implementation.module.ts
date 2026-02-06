/**
 * ImplementationModule - Implementation Portal
 *
 * Manages client onboarding and implementation tracking:
 * - Go-live readiness (hybrid gates, score, sign-off)
 * - Project tracking and checklists
 * - Task management and health score
 * - Blocker tracking and escalation
 * - Activity logging
 */

import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "../../prisma/prisma.module";
import { GoLiveService } from "./go-live.service";
import { GoLiveController } from "./go-live.controller";
import { ImplementationController } from "./implementation.controller";
import { ImplementationService } from "./implementation.service";
import { ChecklistService } from "./checklist.service";

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [GoLiveController, ImplementationController],
  providers: [GoLiveService, ImplementationService, ChecklistService],
  exports: [GoLiveService, ImplementationService, ChecklistService],
})
export class ImplementationModule {}
