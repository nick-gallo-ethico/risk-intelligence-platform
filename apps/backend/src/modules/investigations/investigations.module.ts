import { Module } from "@nestjs/common";
import {
  InvestigationsController,
  CaseInvestigationsController,
} from "./investigations.controller";
import { InvestigationsService } from "./investigations.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CasesModule } from "../cases/cases.module";

/**
 * Module for investigation management.
 *
 * Provides two controllers:
 * - CaseInvestigationsController: Nested routes under /cases/:caseId/investigations
 * - InvestigationsController: Standalone routes at /investigations/:id
 */
@Module({
  imports: [
    PrismaModule,
    CasesModule, // For case lookup when creating investigations
  ],
  controllers: [CaseInvestigationsController, InvestigationsController],
  providers: [InvestigationsService],
  exports: [InvestigationsService],
})
export class InvestigationsModule {}
