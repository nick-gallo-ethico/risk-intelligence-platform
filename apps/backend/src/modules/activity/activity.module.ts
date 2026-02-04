// =============================================================================
// ACTIVITY MODULE - Activity timeline aggregation module
// =============================================================================
//
// This module provides activity timeline services for unified entity timelines.
// It aggregates audit events from AuditLog into coherent timelines with
// related entity inclusion.
//
// NOTE: This is separate from the common ActivityModule which handles
// activity logging. This module handles timeline retrieval and aggregation.
//
// EXPORTS:
// - ActivityTimelineService: Timeline aggregation and retrieval
// =============================================================================

import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ActivityTimelineService } from "./activity-timeline.service";
import { ActivityTimelineController } from "./activity-timeline.controller";

@Module({
  imports: [PrismaModule],
  controllers: [ActivityTimelineController],
  providers: [ActivityTimelineService],
  exports: [ActivityTimelineService],
})
export class ActivityTimelineModule {}
