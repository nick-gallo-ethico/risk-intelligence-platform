import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MilestoneService } from "./milestone.service";

/**
 * ProjectsModule provides project management capabilities for compliance tracking.
 *
 * Features:
 * - Milestone management with weighted progress calculation
 * - Links to Cases, Investigations, Campaigns via MilestoneItem
 * - Auto-status updates based on progress and target date
 * - Gantt chart visualization support (frontend)
 */
@Module({
  imports: [PrismaModule],
  providers: [MilestoneService],
  exports: [MilestoneService],
})
export class ProjectsModule {}
