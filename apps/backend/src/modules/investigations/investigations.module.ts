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
import { InvestigationTemplateController } from './templates/template.controller';

/**
 * Module for investigation management.
 *
 * Provides controllers:
 * - CaseInvestigationsController: Nested routes under /cases/:caseId/investigations
 * - InvestigationsController: Standalone routes at /investigations/:id
 * - InvestigationInterviewController: Routes at /investigation-interviews
 * - InvestigationTemplateController: Routes at /investigation-templates
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
  ],
  providers: [
    InvestigationsService,
    InvestigationInterviewService,
    InvestigationTemplateService,
  ],
  exports: [
    InvestigationsService,
    InvestigationInterviewService,
    InvestigationTemplateService,
  ],
})
export class InvestigationsModule {}
