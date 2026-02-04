/**
 * OrgNotificationSettingsService - Organization-level Notification Configuration
 *
 * Manages organization-wide notification settings including:
 * - Enforced categories that users cannot disable
 * - Default quiet hours for all users in the organization
 * - Daily digest send time configuration
 *
 * Per CONTEXT.md: Organizations can require critical notifications
 * (assignments, escalations, SLA warnings) that users cannot disable.
 *
 * Cache keys:
 * - Org settings: `org-notification-settings:${organizationId}`
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationCategory } from '../entities/notification.types';
import { UpdateOrgNotificationSettingsDto } from '../dto/notification.dto';

/** Cache TTL in milliseconds (5 minutes) */
const ORG_SETTINGS_CACHE_TTL = 5 * 60 * 1000;

/**
 * Organization-level notification settings.
 */
export interface OrgNotificationSettings {
  /** Categories that users cannot disable */
  enforcedCategories: NotificationCategory[];
  /** Default quiet hours start for organization (HH:MM format) */
  defaultQuietHoursStart: string | null;
  /** Default quiet hours end for organization (HH:MM format) */
  defaultQuietHoursEnd: string | null;
  /** Daily digest send time (HH:MM format) */
  digestTime: string;
}

/**
 * Default organization notification settings.
 * Per CONTEXT.md: assignments, deadlines, and escalations are critical.
 */
const DEFAULT_ORG_SETTINGS: OrgNotificationSettings = {
  enforcedCategories: ['ASSIGNMENT', 'DEADLINE'] as NotificationCategory[],
  defaultQuietHoursStart: null,
  defaultQuietHoursEnd: null,
  digestTime: '17:00',
};

@Injectable()
export class OrgNotificationSettingsService {
  private readonly logger = new Logger(OrgNotificationSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Get organization notification settings with caching.
   * Returns defaults if no custom settings exist.
   *
   * @param organizationId - Organization ID
   * @returns Organization notification settings
   */
  async getSettings(organizationId: string): Promise<OrgNotificationSettings> {
    const cacheKey = this.getCacheKey(organizationId);

    // Check cache first
    const cached =
      await this.cacheManager.get<OrgNotificationSettings>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for org settings: ${cacheKey}`);
      return cached;
    }

    // Query database
    const settings = await this.prisma.orgNotificationSettings.findUnique({
      where: { organizationId },
    });

    // Build settings object with defaults
    const orgSettings: OrgNotificationSettings = settings
      ? {
          enforcedCategories:
            settings.enforcedCategories as NotificationCategory[],
          defaultQuietHoursStart: settings.defaultQuietHoursStart,
          defaultQuietHoursEnd: settings.defaultQuietHoursEnd,
          digestTime: settings.digestTime,
        }
      : { ...DEFAULT_ORG_SETTINGS };

    // Cache result
    await this.cacheManager.set(cacheKey, orgSettings, ORG_SETTINGS_CACHE_TTL);
    this.logger.debug(`Cached org settings for: ${cacheKey}`);

    return orgSettings;
  }

  /**
   * Update organization notification settings.
   * Only SYSTEM_ADMIN should call this (enforced at controller level).
   *
   * @param organizationId - Organization ID
   * @param update - Settings update DTO
   */
  async updateSettings(
    organizationId: string,
    update: UpdateOrgNotificationSettingsDto,
  ): Promise<void> {
    // Build update data
    const data: Record<string, unknown> = {};

    if (update.enforcedCategories !== undefined) {
      data.enforcedCategories = update.enforcedCategories;
    }

    if (update.defaultQuietHoursStart !== undefined) {
      data.defaultQuietHoursStart = update.defaultQuietHoursStart || null;
    }

    if (update.defaultQuietHoursEnd !== undefined) {
      data.defaultQuietHoursEnd = update.defaultQuietHoursEnd || null;
    }

    if (update.digestTime !== undefined) {
      data.digestTime = update.digestTime;
    }

    // Upsert settings record
    await this.prisma.orgNotificationSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        enforcedCategories:
          update.enforcedCategories ||
          DEFAULT_ORG_SETTINGS.enforcedCategories,
        defaultQuietHoursStart:
          update.defaultQuietHoursStart ||
          DEFAULT_ORG_SETTINGS.defaultQuietHoursStart,
        defaultQuietHoursEnd:
          update.defaultQuietHoursEnd ||
          DEFAULT_ORG_SETTINGS.defaultQuietHoursEnd,
        digestTime: update.digestTime || DEFAULT_ORG_SETTINGS.digestTime,
      },
      update: data,
    });

    // Invalidate cache
    await this.invalidateCache(organizationId);

    this.logger.log(`Updated notification settings for org ${organizationId}`);
  }

  /**
   * Check if a category is enforced by the organization.
   * Enforced categories cannot be disabled by users.
   *
   * @param organizationId - Organization ID
   * @param category - Notification category to check
   * @returns True if the category is enforced
   */
  async isEnforcedCategory(
    organizationId: string,
    category: NotificationCategory,
  ): Promise<boolean> {
    const settings = await this.getSettings(organizationId);
    return settings.enforcedCategories.includes(category);
  }

  /**
   * Get the configured digest send time for the organization.
   * Defaults to 17:00 (5 PM) if not configured.
   *
   * @param organizationId - Organization ID
   * @returns Digest time in HH:MM format
   */
  async getDigestTime(organizationId: string): Promise<string> {
    const settings = await this.getSettings(organizationId);
    return settings.digestTime;
  }

  /**
   * Get default quiet hours for the organization.
   * Returns null values if not configured.
   *
   * @param organizationId - Organization ID
   * @returns Object with start and end times (or nulls)
   */
  async getDefaultQuietHours(
    organizationId: string,
  ): Promise<{ start: string | null; end: string | null }> {
    const settings = await this.getSettings(organizationId);
    return {
      start: settings.defaultQuietHoursStart,
      end: settings.defaultQuietHoursEnd,
    };
  }

  /**
   * Get list of enforced categories for the organization.
   *
   * @param organizationId - Organization ID
   * @returns Array of enforced notification categories
   */
  async getEnforcedCategories(
    organizationId: string,
  ): Promise<NotificationCategory[]> {
    const settings = await this.getSettings(organizationId);
    return settings.enforcedCategories;
  }

  // ===== Private Helper Methods =====

  /**
   * Generate cache key for organization settings.
   */
  private getCacheKey(organizationId: string): string {
    return `org-notification-settings:${organizationId}`;
  }

  /**
   * Invalidate cached settings for an organization.
   */
  private async invalidateCache(organizationId: string): Promise<void> {
    const cacheKey = this.getCacheKey(organizationId);
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Invalidated cache: ${cacheKey}`);
  }
}
