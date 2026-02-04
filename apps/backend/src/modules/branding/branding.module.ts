/**
 * BrandingModule - White-Label Branding Management
 *
 * Provides per-tenant branding configuration for Ethics Portal and other
 * customer-facing portals. Enables white-label customization including:
 *
 * - Logo and primary color (TEMPLATE mode)
 * - Full 12-token color palette and typography (FULL_WHITE_LABEL mode)
 * - Custom domain support
 * - CSS custom property generation
 *
 * Features:
 * - 1-hour cache TTL for branding configs
 * - Automatic cache invalidation on updates
 * - Public CSS endpoint for portal theming
 * - Event emission on branding changes
 *
 * @see BrandingService for caching and CSS generation
 * @see BrandingController for API endpoints
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../prisma/prisma.module';
import { BrandingService } from './branding.service';
import { BrandingController, PublicBrandingController } from './branding.controller';

@Module({
  imports: [
    PrismaModule,
    // Cache module for branding config caching (1-hour TTL)
    CacheModule.register({
      ttl: 60 * 60 * 1000, // 1 hour in milliseconds
    }),
  ],
  controllers: [
    // Public CSS endpoint (no auth)
    PublicBrandingController,
    // Admin endpoints (requires auth and role)
    BrandingController,
  ],
  providers: [BrandingService],
  exports: [
    // Export BrandingService for other modules (e.g., Ethics Portal routes)
    BrandingService,
  ],
})
export class BrandingModule {}
