/**
 * OrganizationModule - Organization Settings Management
 *
 * Provides organization-level settings management including general
 * configuration, branding, notifications, and security settings.
 *
 * Dependencies:
 * - PrismaModule: Database access
 * - CacheModule: Settings caching
 */

import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { PrismaModule } from "../prisma/prisma.module";
import { OrganizationController } from "./organization.controller";
import { OrganizationService } from "./organization.service";

@Module({
  imports: [PrismaModule, CacheModule.register()],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
