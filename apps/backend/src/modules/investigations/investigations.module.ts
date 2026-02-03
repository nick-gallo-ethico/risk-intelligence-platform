import { Module } from '@nestjs/common';
import {
  InvestigationsController,
  CaseInvestigationsController,
} from './investigations.controller';
import { InvestigationsService } from './investigations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { InvestigationInterviewService } from './interviews/interview.service';
import { InvestigationInterviewController } from './interviews/interview.controller';
import { InvestigationTemplateService } from './templates/template.service';
import { TemplateAssignmentService } from './templates/template-assignment.service';
import { InvestigationTemplateController } from './templates/template.controller';
import { InvestigationChecklistService } from './checklists/checklist.service';
import { InvestigationChecklistController } from './checklists/checklist.controller';

/**
 * Module for investigation management.
 *
 * Provides controllers:
 * - CaseInvestigationsController: Nested routes under /cases/:caseId/investigations
 * - InvestigationsController: Standalone routes at /investigations/:id
 * - InvestigationInterviewController: Routes at /investigation-interviews
 * - InvestigationTemplateController: Routes at /investigation-templates
 * - InvestigationChecklistController: Routes at /investigation-checklists
 */
@Module({
  imports: [
    PrismaModule,
    CasesModule, // For case lookup when creating investigations
  ],
  controllers: [
    CaseInvestigationsController,
    InvestigationsController,
    InvestigationInterviewController,
    InvestigationTemplateController,
    InvestigationChecklistController,
  ],
  providers: [
    InvestigationsService,
    InvestigationInterviewService,
    InvestigationTemplateService,
    TemplateAssignmentService,
    InvestigationChecklistService,
  ],
  exports: [
    InvestigationsService,
    InvestigationInterviewService,
    InvestigationTemplateService,
    TemplateAssignmentService,
    InvestigationChecklistService,
  ],
})
export class InvestigationsModule {}
