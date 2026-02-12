import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MilestoneService } from "./milestone.service";
import { ProjectService } from "./project.service";
import { ProjectTaskService } from "./project-task.service";
import { ProjectGroupService } from "./project-group.service";
import { ProjectTemplateService } from "./project-template.service";
import { ProjectStatsService } from "./services/project-stats.service";
import { MentionService } from "./services/mention.service";
import { ProjectEventListener } from "./listeners/project-event.listener";
import { ProjectsController } from "./projects.controller";
import { ProjectTemplateController } from "./project-template.controller";

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
 *
 * Controllers:
 * - ProjectsController: /api/v1/projects - Project, task, and group CRUD
 * - ProjectTemplateController: /api/v1/project-templates - Template CRUD and apply
 */
@Module({
  imports: [PrismaModule, AuditModule, forwardRef(() => NotificationsModule)],
  controllers: [ProjectsController, ProjectTemplateController],
  providers: [
    MilestoneService,
    ProjectService,
    ProjectTaskService,
    ProjectGroupService,
    ProjectTemplateService,
    ProjectStatsService,
    MentionService,
    ProjectEventListener,
  ],
  exports: [
    MilestoneService,
    ProjectService,
    ProjectTaskService,
    ProjectGroupService,
    ProjectTemplateService,
    ProjectStatsService,
    MentionService,
  ],
})
export class ProjectsModule {}
