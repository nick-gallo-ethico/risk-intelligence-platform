/**
 * OrganizationService - Organization Settings Management
 *
 * Manages organization-level configuration including general settings,
 * branding, notifications, and security. Aggregates data from multiple
 * related tables (Organization, TenantBranding, OrgNotificationSettings,
 * TenantSsoConfig) into a unified settings object.
 *
 * Cache keys:
 * - Organization settings: `org-settings:${organizationId}`
 */

import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  OrganizationSettingsDto,
  OrganizationResponseDto,
  UpdateOrganizationDto,
  UpdateBrandingSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateSecuritySettingsDto,
  BrandingMode,
  SsoProvider,
  UserRole,
  PasswordPolicyDto,
} from "./dto";

/** Cache TTL in milliseconds (5 minutes) */
const SETTINGS_CACHE_TTL = 5 * 60 * 1000;

/** Default password policy */
const DEFAULT_PASSWORD_POLICY: PasswordPolicyDto = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/** Default notification settings */
const DEFAULT_NOTIFICATION_SETTINGS = {
  digestEnabled: true,
  defaultDigestTime: "08:00",
  enforcedNotificationCategories: ["security_alerts", "sla_warnings"],
  quietHoursEnabled: false,
  quietHoursStart: undefined,
  quietHoursEnd: undefined,
};

/** Default security settings */
const DEFAULT_SECURITY_SETTINGS = {
  mfaRequired: false,
  mfaRequiredRoles: [UserRole.SYSTEM_ADMIN, UserRole.CCO] as UserRole[],
  sessionTimeoutMinutes: 60,
  passwordPolicy: DEFAULT_PASSWORD_POLICY,
};

/**
 * Settings stored in the Organization.settings JSON field.
 * Index signature required for Prisma JSON type compatibility.
 */
interface OrganizationJsonSettings {
  [key: string]: unknown;
  timezone?: string;
  dateFormat?: string;
  brandingMode?: BrandingMode;
  secondaryColor?: string;
  accentColor?: string;
  customCss?: string;
  digestEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  mfaRequired?: boolean;
  mfaRequiredRoles?: UserRole[];
  sessionTimeoutMinutes?: number;
  passwordPolicy?: PasswordPolicyDto;
}

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Get the current organization entity.
   *
   * @param organizationId - Organization ID from tenant context
   * @returns Organization entity
   */
  async getOrganization(
    organizationId: string,
  ): Promise<OrganizationResponseDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        tenantBranding: true,
      },
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const settings = (org.settings as OrganizationJsonSettings) || {};

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      domain: org.tenantBranding?.customDomain || undefined,
      logoUrl: org.tenantBranding?.logoUrl || undefined,
      faviconUrl: undefined, // TenantBranding doesn't have favicon, could be in settings
      primaryColor: org.tenantBranding?.primaryColor || undefined,
      secondaryColor: settings.secondaryColor,
      timezone: settings.timezone || "America/New_York",
      dateFormat: settings.dateFormat || "MM/DD/YYYY",
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  /**
   * Get complete organization settings with caching.
   * Aggregates data from Organization, TenantBranding, OrgNotificationSettings,
   * and TenantSsoConfig tables.
   *
   * @param organizationId - Organization ID from tenant context
   * @returns Complete organization settings
   */
  async getSettings(organizationId: string): Promise<OrganizationSettingsDto> {
    const cacheKey = this.getCacheKey(organizationId);

    // Check cache first
    const cached =
      await this.cacheManager.get<OrganizationSettingsDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for org settings: ${cacheKey}`);
      return cached;
    }

    // Query all related data in parallel
    const [org, branding, notificationSettings, ssoConfig] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
      }),
      this.prisma.tenantBranding.findUnique({
        where: { organizationId },
      }),
      this.prisma.orgNotificationSettings.findUnique({
        where: { organizationId },
      }),
      this.prisma.tenantSsoConfig.findUnique({
        where: { organizationId },
      }),
    ]);

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Parse settings JSON
    const jsonSettings = (org.settings as OrganizationJsonSettings) || {};

    // Build complete settings object
    const settings: OrganizationSettingsDto = {
      // General
      name: org.name,
      timezone: jsonSettings.timezone || "America/New_York",
      dateFormat: jsonSettings.dateFormat || "MM/DD/YYYY",
      defaultLanguage: org.defaultLanguage || "en",

      // Branding
      logoUrl: branding?.logoUrl || undefined,
      faviconUrl: undefined, // Could be added to TenantBranding or settings
      brandingMode:
        this.mapBrandingMode(branding?.mode) ||
        jsonSettings.brandingMode ||
        BrandingMode.STANDARD,
      primaryColor: branding?.primaryColor || undefined,
      secondaryColor: jsonSettings.secondaryColor,
      accentColor: jsonSettings.accentColor,
      customCss: jsonSettings.customCss,

      // Notifications
      defaultDigestTime:
        notificationSettings?.digestTime ||
        DEFAULT_NOTIFICATION_SETTINGS.defaultDigestTime,
      digestEnabled:
        jsonSettings.digestEnabled ??
        DEFAULT_NOTIFICATION_SETTINGS.digestEnabled,
      enforcedNotificationCategories:
        (notificationSettings?.enforcedCategories as string[]) ||
        DEFAULT_NOTIFICATION_SETTINGS.enforcedNotificationCategories,
      quietHoursEnabled:
        jsonSettings.quietHoursEnabled ??
        DEFAULT_NOTIFICATION_SETTINGS.quietHoursEnabled,
      quietHoursStart:
        notificationSettings?.defaultQuietHoursStart ||
        jsonSettings.quietHoursStart,
      quietHoursEnd:
        notificationSettings?.defaultQuietHoursEnd ||
        jsonSettings.quietHoursEnd,

      // Security
      mfaRequired:
        jsonSettings.mfaRequired ?? DEFAULT_SECURITY_SETTINGS.mfaRequired,
      mfaRequiredRoles:
        jsonSettings.mfaRequiredRoles ||
        DEFAULT_SECURITY_SETTINGS.mfaRequiredRoles,
      sessionTimeoutMinutes:
        jsonSettings.sessionTimeoutMinutes ??
        DEFAULT_SECURITY_SETTINGS.sessionTimeoutMinutes,
      passwordPolicy:
        jsonSettings.passwordPolicy || DEFAULT_SECURITY_SETTINGS.passwordPolicy,

      // SSO - Map from TenantSsoConfig schema
      ssoEnabled: ssoConfig?.ssoEnabled ?? false,
      ssoProvider: this.mapSsoProvider(ssoConfig?.ssoProvider),
      ssoConfig: ssoConfig
        ? {
            clientId: undefined, // Not stored in current schema
            tenantId: ssoConfig.azureTenantId || undefined,
            metadataUrl: ssoConfig.samlIdpEntryPoint || undefined,
            enforceForAllUsers: !ssoConfig.jitProvisioningEnabled, // Inverse logic
          }
        : undefined,
    };

    // Cache result
    await this.cacheManager.set(cacheKey, settings, SETTINGS_CACHE_TTL);
    this.logger.debug(`Cached org settings for: ${cacheKey}`);

    return settings;
  }

  /**
   * Update general organization settings.
   *
   * @param organizationId - Organization ID
   * @param dto - Update data
   * @returns Updated organization
   */
  async updateOrganization(
    organizationId: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Build settings update
    const currentSettings = (org.settings as OrganizationJsonSettings) || {};
    const newSettings: OrganizationJsonSettings = { ...currentSettings };

    if (dto.timezone !== undefined) {
      newSettings.timezone = dto.timezone;
    }
    if (dto.dateFormat !== undefined) {
      newSettings.dateFormat = dto.dateFormat;
    }

    // Update organization
    const updateData: Prisma.OrganizationUpdateInput = {
      settings: newSettings as Prisma.InputJsonValue,
    };

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.defaultLanguage !== undefined) {
      updateData.defaultLanguage = dto.defaultLanguage;
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    // Invalidate cache
    await this.invalidateCache(organizationId);

    this.logger.log(`Updated organization settings for: ${organizationId}`);

    return this.getOrganization(organizationId);
  }

  /**
   * Update branding settings.
   *
   * @param organizationId - Organization ID
   * @param dto - Branding update data
   * @returns Updated organization settings
   */
  async updateBrandingSettings(
    organizationId: string,
    dto: UpdateBrandingSettingsDto,
  ): Promise<OrganizationSettingsDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Update organization settings JSON for branding-related fields
    const currentSettings = (org.settings as OrganizationJsonSettings) || {};
    const newSettings: OrganizationJsonSettings = { ...currentSettings };

    if (dto.brandingMode !== undefined) {
      newSettings.brandingMode = dto.brandingMode;
    }
    if (dto.secondaryColor !== undefined) {
      newSettings.secondaryColor = dto.secondaryColor;
    }
    if (dto.accentColor !== undefined) {
      newSettings.accentColor = dto.accentColor;
    }
    if (dto.customCss !== undefined) {
      newSettings.customCss = dto.customCss;
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: newSettings as Prisma.InputJsonValue },
    });

    // Update TenantBranding if primary color is provided
    if (dto.primaryColor !== undefined) {
      await this.prisma.tenantBranding.upsert({
        where: { organizationId },
        create: {
          organizationId,
          primaryColor: dto.primaryColor,
          mode:
            dto.brandingMode === BrandingMode.FULL_WHITE_LABEL
              ? "FULL_WHITE_LABEL"
              : "TEMPLATE",
        },
        update: {
          primaryColor: dto.primaryColor,
          ...(dto.brandingMode && {
            mode:
              dto.brandingMode === BrandingMode.FULL_WHITE_LABEL
                ? "FULL_WHITE_LABEL"
                : "TEMPLATE",
          }),
        },
      });
    }

    // Invalidate cache
    await this.invalidateCache(organizationId);

    this.logger.log(`Updated branding settings for: ${organizationId}`);

    return this.getSettings(organizationId);
  }

  /**
   * Update notification settings.
   *
   * @param organizationId - Organization ID
   * @param dto - Notification settings update data
   * @returns Updated organization settings
   */
  async updateNotificationSettings(
    organizationId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<OrganizationSettingsDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Update organization settings JSON
    const currentSettings = (org.settings as OrganizationJsonSettings) || {};
    const newSettings: OrganizationJsonSettings = { ...currentSettings };

    if (dto.digestEnabled !== undefined) {
      newSettings.digestEnabled = dto.digestEnabled;
    }
    if (dto.quietHoursEnabled !== undefined) {
      newSettings.quietHoursEnabled = dto.quietHoursEnabled;
    }
    if (dto.quietHoursStart !== undefined) {
      newSettings.quietHoursStart = dto.quietHoursStart;
    }
    if (dto.quietHoursEnd !== undefined) {
      newSettings.quietHoursEnd = dto.quietHoursEnd;
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: newSettings as Prisma.InputJsonValue },
    });

    // Update OrgNotificationSettings for enforced categories and digest time
    const notificationUpdateData: Record<string, unknown> = {};
    if (dto.enforcedNotificationCategories !== undefined) {
      notificationUpdateData.enforcedCategories =
        dto.enforcedNotificationCategories;
    }
    if (dto.defaultDigestTime !== undefined) {
      notificationUpdateData.digestTime = dto.defaultDigestTime;
    }
    if (dto.quietHoursStart !== undefined) {
      notificationUpdateData.defaultQuietHoursStart =
        dto.quietHoursStart || null;
    }
    if (dto.quietHoursEnd !== undefined) {
      notificationUpdateData.defaultQuietHoursEnd = dto.quietHoursEnd || null;
    }

    if (Object.keys(notificationUpdateData).length > 0) {
      await this.prisma.orgNotificationSettings.upsert({
        where: { organizationId },
        create: {
          organizationId,
          enforcedCategories:
            dto.enforcedNotificationCategories ||
            DEFAULT_NOTIFICATION_SETTINGS.enforcedNotificationCategories,
          digestTime:
            dto.defaultDigestTime ||
            DEFAULT_NOTIFICATION_SETTINGS.defaultDigestTime,
          defaultQuietHoursStart: dto.quietHoursStart || null,
          defaultQuietHoursEnd: dto.quietHoursEnd || null,
        },
        update: notificationUpdateData,
      });
    }

    // Invalidate cache
    await this.invalidateCache(organizationId);

    this.logger.log(`Updated notification settings for: ${organizationId}`);

    return this.getSettings(organizationId);
  }

  /**
   * Update security settings.
   *
   * @param organizationId - Organization ID
   * @param dto - Security settings update data
   * @returns Updated organization settings
   */
  async updateSecuritySettings(
    organizationId: string,
    dto: UpdateSecuritySettingsDto,
  ): Promise<OrganizationSettingsDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Update organization settings JSON
    const currentSettings = (org.settings as OrganizationJsonSettings) || {};
    const newSettings: OrganizationJsonSettings = { ...currentSettings };

    if (dto.mfaRequired !== undefined) {
      newSettings.mfaRequired = dto.mfaRequired;
    }
    if (dto.mfaRequiredRoles !== undefined) {
      newSettings.mfaRequiredRoles = dto.mfaRequiredRoles;
    }
    if (dto.sessionTimeoutMinutes !== undefined) {
      newSettings.sessionTimeoutMinutes = dto.sessionTimeoutMinutes;
    }
    if (dto.passwordPolicy !== undefined) {
      newSettings.passwordPolicy = dto.passwordPolicy;
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: newSettings as Prisma.InputJsonValue },
    });

    // Invalidate cache
    await this.invalidateCache(organizationId);

    this.logger.log(`Updated security settings for: ${organizationId}`);

    return this.getSettings(organizationId);
  }

  // ===== Private Helper Methods =====

  /**
   * Generate cache key for organization settings.
   */
  private getCacheKey(organizationId: string): string {
    return `org-settings:${organizationId}`;
  }

  /**
   * Invalidate cached settings for an organization.
   */
  private async invalidateCache(organizationId: string): Promise<void> {
    const cacheKey = this.getCacheKey(organizationId);
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Invalidated cache: ${cacheKey}`);
  }

  /**
   * Map Prisma branding mode to DTO enum.
   */
  private mapBrandingMode(
    mode: string | null | undefined,
  ): BrandingMode | undefined {
    if (!mode) return undefined;
    switch (mode) {
      case "TEMPLATE":
        return BrandingMode.STANDARD; // TEMPLATE maps to STANDARD
      case "FULL_WHITE_LABEL":
        return BrandingMode.FULL_WHITE_LABEL;
      default:
        return BrandingMode.STANDARD;
    }
  }

  /**
   * Map Prisma SSO provider to DTO enum.
   */
  private mapSsoProvider(
    provider: string | null | undefined,
  ): SsoProvider | undefined {
    if (!provider) return undefined;
    switch (provider) {
      case "AZURE_AD":
        return SsoProvider.AZURE_AD;
      case "GOOGLE":
        return SsoProvider.GOOGLE;
      case "SAML":
        return SsoProvider.SAML;
      default:
        return undefined;
    }
  }
}
