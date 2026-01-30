// =============================================================================
// INVESTIGATION NOTES MODULE
// =============================================================================
//
// NestJS module for investigation notes feature.
// Provides CRUD operations for notes attached to investigations.
//
// DEPENDENCIES:
// - PrismaModule: Database access
// - ActivityModule: Audit logging (imported globally, no explicit import needed)
//
// EXPORTS:
// - InvestigationNotesService: For use by other modules if needed
// =============================================================================

import { Module } from "@nestjs/common";
import { InvestigationNotesController } from "./investigation-notes.controller";
import { InvestigationNotesService } from "./investigation-notes.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [InvestigationNotesController],
  providers: [InvestigationNotesService],
  exports: [InvestigationNotesService],
})
export class InvestigationNotesModule {}
