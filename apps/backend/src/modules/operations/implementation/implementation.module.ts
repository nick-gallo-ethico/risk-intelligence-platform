/**
 * ImplementationModule - Implementation Portal
 *
 * Manages client onboarding and implementation tracking:
 * - Go-live readiness (hybrid gates, score, sign-off)
 * - Project tracking and checklists
 * - Data migration
 * - Training and certification
 */

import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "../../prisma/prisma.module";
import { GoLiveService } from "./go-live.service";
import { GoLiveController } from "./go-live.controller";

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [GoLiveController],
  providers: [GoLiveService],
  exports: [GoLiveService],
})
export class ImplementationModule {}
