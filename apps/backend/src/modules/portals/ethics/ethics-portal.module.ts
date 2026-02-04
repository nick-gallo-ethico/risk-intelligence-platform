/**
 * EthicsPortalModule - Public Ethics Portal API
 *
 * Provides the public-facing Ethics Portal functionality:
 * - Anonymous report submission
 * - Category and form retrieval
 * - Attachment handling
 * - Draft save/resume
 * - Access code status checking and messaging
 *
 * CRITICAL: All endpoints are PUBLIC (no authentication required).
 * The access code acts as authorization for status/messaging endpoints.
 *
 * Import this module in PortalsModule to enable Ethics Portal features.
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../../prisma/prisma.module';
import { RiusModule } from '../../rius/rius.module';
import { FormsModule } from '../../forms/forms.module';
import { BrandingModule } from '../../branding/branding.module';
import { MessagingModule } from '../../messaging/messaging.module';
import { EthicsPortalService } from './ethics-portal.service';
import {
  EthicsPortalController,
  EthicsAccessController,
} from './ethics-portal.controller';

@Module({
  imports: [
    PrismaModule,
    // Cache for tenant config and draft storage
    CacheModule.register({
      ttl: 5 * 60 * 1000, // 5 minutes default
    }),
    // Multer for file uploads
    MulterModule.register({
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max file size
        files: 10, // Max 10 files per request
      },
    }),
    // Import modules for dependencies
    RiusModule, // For RiusService, RiuAccessService
    FormsModule, // For FormSchemaService
    BrandingModule, // For BrandingService
    MessagingModule, // For MessageRelayService
  ],
  controllers: [
    // Public endpoints for report submission and configuration
    EthicsPortalController,
    // Public endpoints for access code operations
    EthicsAccessController,
  ],
  providers: [EthicsPortalService],
  exports: [EthicsPortalService],
})
export class EthicsPortalModule {}
