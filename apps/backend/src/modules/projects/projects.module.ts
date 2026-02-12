import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MilestoneService } from "./milestone.service";
import { ProjectService } from "./project.service";
import { ProjectTaskService } from "./project-task.service";
import { ProjectGroupService } from "./project-group.service";
import { ProjectTemplateService } from "./project-template.service";

/**
 * ProjectsModule provides project management capabilities for compliance tracking.
 *
 * Features:
 * - Milestone management with weighted progress calculation
 * - Links to Cases, Investigations, Campaigns via MilestoneItem
 * - Auto-status updates based on progress and target date
 * - Gantt chart visualization support (frontend)
 * - Monday.com-style project boards with groups, tasks, and columns
 * - Reusable project templates for common compliance projects
 */
@Module({
  imports: [PrismaModule],
  providers: [
    MilestoneService,
    ProjectService,
    ProjectTaskService,
    ProjectGroupService,
    ProjectTemplateService,
  ],
  exports: [
    MilestoneService,
    ProjectService,
    ProjectTaskService,
    ProjectGroupService,
    ProjectTemplateService,
  ],
})
export class ProjectsModule {}
