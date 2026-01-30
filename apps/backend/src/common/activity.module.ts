// =============================================================================
// ACTIVITY MODULE - Global module for activity/audit logging
// =============================================================================
//
// This module provides audit logging capabilities across the entire platform.
// Marked as @Global() so other modules can inject ActivityService without
// explicitly importing this module.
//
// EXPORTS:
// - ActivityService: Core logging service for creating audit entries
// - ActivityDescriptionGenerator: Generates natural language descriptions
// =============================================================================

import { Module, Global } from "@nestjs/common";
import { ActivityService } from "./services/activity.service";
import { ActivityDescriptionGenerator } from "./services/activity-description.service";
import { ActivityController } from "./controllers/activity.controller";
import { PrismaModule } from "../modules/prisma/prisma.module";

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [ActivityController],
  providers: [ActivityService, ActivityDescriptionGenerator],
  exports: [ActivityService, ActivityDescriptionGenerator],
})
export class ActivityModule {}
