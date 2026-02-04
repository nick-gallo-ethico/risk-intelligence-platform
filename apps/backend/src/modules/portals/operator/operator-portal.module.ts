/**
 * OperatorPortalModule - Operator Console Backend Services
 *
 * Provides services for Ethico's internal hotline operators, including:
 * - Client profile lookup and phone number mapping
 * - Client-specific directive/script management
 * - QA configuration retrieval
 *
 * This module serves the Operator Console (Ethico Internal Product) which is
 * used by operators handling hotline calls across multiple client organizations.
 */

import { Module } from '@nestjs/common';
import { DirectivesService } from './directives.service';
import { DirectivesController } from './directives.controller';
import { ClientProfileService } from './client-profile.service';
import { ClientLookupController, ClientAdminController } from './client-profile.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    DirectivesController,
    ClientLookupController,
    ClientAdminController,
  ],
  providers: [
    DirectivesService,
    ClientProfileService,
  ],
  exports: [
    DirectivesService,
    ClientProfileService,
  ],
})
export class OperatorPortalModule {}
