/**
 * OperatorPortalModule - Operator Console Backend Services
 *
 * Provides services for Ethico's internal hotline operators, including:
 * - Client profile lookup and phone number mapping
 * - Client-specific directive/script management
 * - QA configuration retrieval
 * - Hotline intake and RIU creation
 * - QA review queue management
 *
 * This module serves the Operator Console (Ethico Internal Product) which is
 * used by operators handling hotline calls across multiple client organizations.
 */

import { Module } from '@nestjs/common';
import { DirectivesService } from './directives.service';
import { DirectivesController } from './directives.controller';
import { ClientProfileService } from './client-profile.service';
import { ClientLookupController, ClientAdminController } from './client-profile.controller';
import { IntakeService } from './intake.service';
import { IntakeController } from './intake.controller';
import { QaQueueService } from './qa-queue.service';
import { QaQueueController } from './qa-queue.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RiusModule } from '../../rius/rius.module';

@Module({
  imports: [PrismaModule, RiusModule],
  controllers: [
    DirectivesController,
    ClientLookupController,
    ClientAdminController,
    IntakeController,
    QaQueueController,
  ],
  providers: [
    DirectivesService,
    ClientProfileService,
    IntakeService,
    QaQueueService,
  ],
  exports: [
    DirectivesService,
    ClientProfileService,
    IntakeService,
    QaQueueService,
  ],
})
export class OperatorPortalModule {}
