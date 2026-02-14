/**
 * PreferenceService - User Notification Preferences Management
 *
 * Manages user notification preferences with caching and organization enforcement.
 * Handles OOO (out-of-office) backup delegation and quiet hours checking.
 *
 * Key features:
 * - 5-minute cache TTL for preferences (per RESEARCH.md recommendations)
 * - Organization-enforced categories override user preferences
 * - OOO backup delegation for urgent notifications
 * - Quiet hours checking with timezone awareness
 *
 * Cache keys:
 * - User preferences: `prefs:${organizationId}:${userId}`
 * - Org settings: `org-settings:${organizationId}`
 */

import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { PrismaService } from "../../prisma/prisma.service";
import {
  PreferenceSettings,
  DEFAULT_PREFERENCES,
  NotificationCategory,
  CategoryPreference,
} from "../entities/notification.types";
import { UpdatePreferencesDto } from "../dto/notification.dto";

/** Cache TTL in milliseconds (5 minutes) */
const PREFERENCE_CACHE_TTL = 5 * 60 * 1000;

/**
 * User preferences with OOO and quiet hours settings.
 */
export interface UserPreferences {
  /** Per-category notification settings */
  preferences: PreferenceSettings;
  /** Quiet hours start time (HH:MM format, 24-hour) */
  quietHoursStart: string | null;
  /** Quiet hours end time (HH:MM format, 24-hour) */
  quietHoursEnd: string | null;
  /** User's timezone (IANA format) */
  timezone: string;
  /** Backup user ID for OOO delegation */
  backupUserId: string | null;
  /** OOO status active until this date */
  oooUntil: Date | null;
}

/**
 * Effective preference for a specific notification category.
 * Includes enforcement status and OOO/quiet hours information.
 */
export interface EffectivePreference {
  /** Whether email should be sent for this category */
  email: boolean;
  /** Whether in-app notification should be shown */
  inApp: boolean;
  /** Whether user is currently out of office */
  isOOO: boolean;
  /** Backup user ID if OOO and category is urgent */
  backupUserId?: string;
  /** Whether current time is within quiet hours */
  isQuietHours: boolean;
  /** Whether this category is enforced by organization */
  isEnforcedByOrg: boolean;
}

@Injectable()
export class PreferenceService {
  private readonly logger = new Logger(PreferenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Get user preferences with caching.
   * Returns default preferences if user has no custom settings.
   *
   * @param userId - User ID
   * @param organizationId - Organization ID for tenant scoping
   * @returns User preferences including quiet hours and OOO settings
   */
  async getPreferences(
    userId: string,
    organizationId: string,
  ): Promise<UserPreferences> {
    const cacheKey = this.getCacheKey(organizationId, userId);

    // Check cache first
    const cached = await this.cacheManager.get<UserPreferences>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for preferences: ${cacheKey}`);
      return cached;
    }

    // Query database
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Build preferences object
    const userPreferences: UserPreferences = preference
      ? {
          preferences: this.mergeWithDefaults(
            preference.preferences as Partial<PreferenceSettings>,
          ),
          quietHoursStart: preference.quietHoursStart,
          quietHoursEnd: preference.quietHoursEnd,
          timezone: preference.timezone,
          backupUserId: preference.backupUserId,
          oooUntil: preference.oooUntil,
        }
      : {
          preferences: { ...DEFAULT_PREFERENCES },
          quietHoursStart: null,
          quietHoursEnd: null,
          timezone: "UTC",
          backupUserId: null,
          oooUntil: null,
        };

    // Cache result
    await this.cacheManager.set(
      cacheKey,
      userPreferences,
      PREFERENCE_CACHE_TTL,
    );
    this.logger.debug(`Cached preferences for: ${cacheKey}`);

    return userPreferences;
  }

  /**
   * Get effective preferences for a specific notification category.
   * Applies organization enforcement rules and checks OOO/quiet hours.
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param category - Notification category to check
   * @returns Effective preference with enforcement and OOO status
   */
  async getEffectivePreferences(
    userId: string,
    organizationId: string,
    category: NotificationCategory,
  ): Promise<EffectivePreference> {
    // Load user preferences and org settings in parallel
    const [userPrefs, isEnforced, orgSettings] = await Promise.all([
      this.getPreferences(userId, organizationId),
      this.isEnforcedCategory(organizationId, category),
      this.getOrgSettings(organizationId),
    ]);

    // Get category preference (with defaults applied)
    const categoryPref: CategoryPreference = userPrefs.preferences[
      category
    ] || {
      email: false,
      inApp: true,
    };

    // Check OOO status
    const isOOO = this.isUserOOO(userPrefs);

    // Check quiet hours
    const isQuietHours = this.checkQuietHours(userPrefs, orgSettings);

    // Determine effective email/inApp settings
    // If category is enforced by org, always enable
    const effectiveEmail = isEnforced ? true : categoryPref.email;
    const effectiveInApp = isEnforced ? true : categoryPref.inApp;

    return {
      email: effectiveEmail,
      inApp: effectiveInApp,
      isOOO,
      backupUserId: isOOO ? userPrefs.backupUserId || undefined : undefined,
      isQuietHours,
      isEnforcedByOrg: isEnforced,
    };
  }

  /**
   * Update user notification preferences.
   * Validates backup user exists if provided.
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param update - Preference updates
   */
  async updatePreferences(
    userId: string,
    organizationId: string,
    update: UpdatePreferencesDto,
  ): Promise<void> {
    // Validate backup user exists if provided
    if (update.backupUserId) {
      const backupUser = await this.prisma.user.findFirst({
        where: {
          id: update.backupUserId,
          organizationId,
          isActive: true,
        },
      });

      if (!backupUser) {
        throw new BadRequestException("Backup user not found or inactive");
      }

      // Prevent self-backup
      if (update.backupUserId === userId) {
        throw new BadRequestException("Cannot set yourself as backup user");
      }
    }

    // Build update data
    const data: Record<string, unknown> = {
      organizationId,
      userId,
    };

    if (update.preferences !== undefined) {
      // Merge with existing preferences to preserve unspecified categories
      const existing = await this.prisma.notificationPreference.findUnique({
        where: { userId },
        select: { preferences: true },
      });
      const existingPrefs =
        existing?.preferences && typeof existing.preferences === "object"
          ? (existing.preferences as Record<string, unknown>)
          : {};
      const merged = {
        ...DEFAULT_PREFERENCES,
        ...existingPrefs,
        ...update.preferences,
      };
      data.preferences = merged;
    }

    if (update.quietHoursStart !== undefined) {
      data.quietHoursStart = update.quietHoursStart || null;
    }

    if (update.quietHoursEnd !== undefined) {
      data.quietHoursEnd = update.quietHoursEnd || null;
    }

    if (update.timezone !== undefined) {
      data.timezone = update.timezone;
    }

    if (update.backupUserId !== undefined) {
      data.backupUserId = update.backupUserId || null;
    }

    if (update.oooUntil !== undefined) {
      data.oooUntil = update.oooUntil ? new Date(update.oooUntil) : null;
    }

    // Upsert preference record
    // Use any cast for Prisma JSON type compatibility
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        organizationId,
        userId,
        preferences: (data.preferences || DEFAULT_PREFERENCES) as object,
        quietHoursStart: (data.quietHoursStart as string) || null,
        quietHoursEnd: (data.quietHoursEnd as string) || null,
        timezone: (data.timezone as string) || "UTC",
        backupUserId: (data.backupUserId as string) || null,
        oooUntil: (data.oooUntil as Date) || null,
      },
      update: {
        ...(data.preferences !== undefined && {
          preferences: data.preferences as object,
        }),
        ...(data.quietHoursStart !== undefined && {
          quietHoursStart: data.quietHoursStart as string | null,
        }),
        ...(data.quietHoursEnd !== undefined && {
          quietHoursEnd: data.quietHoursEnd as string | null,
        }),
        ...(data.timezone !== undefined && {
          timezone: data.timezone as string,
        }),
        ...(data.backupUserId !== undefined && {
          backupUserId: data.backupUserId as string | null,
        }),
        ...(data.oooUntil !== undefined && {
          oooUntil: data.oooUntil as Date | null,
        }),
      },
    });

    // Invalidate cache
    await this.invalidateCache(organizationId, userId);

    this.logger.log(
      `Updated preferences for user ${userId} in org ${organizationId}`,
    );
  }

  /**
   * Set out-of-office status with backup user.
   *
   * @param userId - User ID going OOO
   * @param organizationId - Organization ID
   * @param backupUserId - User to receive urgent notifications
   * @param oooUntil - OOO end date
   */
  async setOOO(
    userId: string,
    organizationId: string,
    backupUserId: string,
    oooUntil: Date,
  ): Promise<void> {
    // Validate backup user
    const backupUser = await this.prisma.user.findFirst({
      where: {
        id: backupUserId,
        organizationId,
        isActive: true,
      },
    });

    if (!backupUser) {
      throw new BadRequestException("Backup user not found or inactive");
    }

    if (backupUserId === userId) {
      throw new BadRequestException("Cannot set yourself as backup user");
    }

    // Upsert with OOO settings
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        organizationId,
        userId,
        preferences: DEFAULT_PREFERENCES as object,
        backupUserId,
        oooUntil,
      },
      update: {
        backupUserId,
        oooUntil,
      },
    });

    // Invalidate cache
    await this.invalidateCache(organizationId, userId);

    this.logger.log(
      `Set OOO for user ${userId} until ${oooUntil.toISOString()}, backup: ${backupUserId}`,
    );
  }

  /**
   * Clear out-of-office status.
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   */
  async clearOOO(userId: string, organizationId: string): Promise<void> {
    await this.prisma.notificationPreference.updateMany({
      where: { userId, organizationId },
      data: {
        backupUserId: null,
        oooUntil: null,
      },
    });

    // Invalidate cache
    await this.invalidateCache(organizationId, userId);

    this.logger.log(`Cleared OOO for user ${userId}`);
  }

  /**
   * Check if current time is within user's quiet hours.
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns True if currently in quiet hours
   */
  async isQuietHours(userId: string, organizationId: string): Promise<boolean> {
    const [userPrefs, orgSettings] = await Promise.all([
      this.getPreferences(userId, organizationId),
      this.getOrgSettings(organizationId),
    ]);

    return this.checkQuietHours(userPrefs, orgSettings);
  }

  /**
   * Check if a category is enforced by the organization.
   *
   * @param organizationId - Organization ID
   * @param category - Notification category
   * @returns True if category is enforced
   */
  async isEnforcedCategory(
    organizationId: string,
    category: NotificationCategory,
  ): Promise<boolean> {
    const settings = await this.getOrgSettings(organizationId);
    return settings.enforcedCategories.includes(category);
  }

  /**
   * Get organization notification settings with caching.
   *
   * @param organizationId - Organization ID
   * @returns Organization notification settings
   */
  async getOrgSettings(
    organizationId: string,
  ): Promise<OrgNotificationSettings> {
    const cacheKey = `org-settings:${organizationId}`;

    // Check cache first
    const cached =
      await this.cacheManager.get<OrgNotificationSettings>(cacheKey);
    if (cached) {
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
      : DEFAULT_ORG_SETTINGS;

    // Cache result
    await this.cacheManager.set(cacheKey, orgSettings, PREFERENCE_CACHE_TTL);

    return orgSettings;
  }

  // ===== Private Helper Methods =====

  /**
   * Generate cache key for user preferences.
   */
  private getCacheKey(organizationId: string, userId: string): string {
    return `prefs:${organizationId}:${userId}`;
  }

  /**
   * Invalidate cached preferences for a user.
   */
  private async invalidateCache(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const cacheKey = this.getCacheKey(organizationId, userId);
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Invalidated cache: ${cacheKey}`);
  }

  /**
   * Merge user preferences with defaults to ensure all categories are present.
   */
  private mergeWithDefaults(
    userPrefs: Partial<PreferenceSettings>,
  ): PreferenceSettings {
    const merged: PreferenceSettings = { ...DEFAULT_PREFERENCES };

    for (const [category, pref] of Object.entries(userPrefs)) {
      if (pref && typeof pref === "object") {
        merged[category] = {
          email: pref.email ?? DEFAULT_PREFERENCES[category]?.email ?? false,
          inApp: pref.inApp ?? DEFAULT_PREFERENCES[category]?.inApp ?? true,
        };
      }
    }

    return merged;
  }

  /**
   * Check if user is currently out of office.
   */
  private isUserOOO(userPrefs: UserPreferences): boolean {
    if (!userPrefs.oooUntil) {
      return false;
    }
    return new Date() < userPrefs.oooUntil;
  }

  /**
   * Check if current time is within quiet hours.
   * Uses user's quiet hours if set, falls back to org defaults.
   */
  private checkQuietHours(
    userPrefs: UserPreferences,
    orgSettings: OrgNotificationSettings,
  ): boolean {
    // Determine which quiet hours to use
    const quietStart =
      userPrefs.quietHoursStart || orgSettings.defaultQuietHoursStart;
    const quietEnd =
      userPrefs.quietHoursEnd || orgSettings.defaultQuietHoursEnd;

    // If no quiet hours configured, not in quiet hours
    if (!quietStart || !quietEnd) {
      return false;
    }

    // Get current time in user's timezone
    const now = new Date();
    const timezone = userPrefs.timezone || "UTC";

    try {
      // Format current time in user's timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const hour = parts.find((p) => p.type === "hour")?.value || "00";
      const minute = parts.find((p) => p.type === "minute")?.value || "00";
      const currentTime = `${hour}:${minute}`;

      // Parse times for comparison
      const current = this.timeToMinutes(currentTime);
      const start = this.timeToMinutes(quietStart);
      const end = this.timeToMinutes(quietEnd);

      // Handle overnight quiet hours (e.g., 22:00 to 06:00)
      if (start > end) {
        // Quiet hours span midnight
        return current >= start || current < end;
      } else {
        // Normal quiet hours (e.g., 18:00 to 20:00)
        return current >= start && current < end;
      }
    } catch (error) {
      this.logger.warn(
        `Error checking quiet hours for timezone ${timezone}: ${error}`,
      );
      return false;
    }
  }

  /**
   * Convert HH:MM time string to minutes since midnight.
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }
}

/**
 * Organization-level notification settings.
 */
export interface OrgNotificationSettings {
  /** Categories that users cannot disable */
  enforcedCategories: NotificationCategory[];
  /** Default quiet hours start (HH:MM) */
  defaultQuietHoursStart: string | null;
  /** Default quiet hours end (HH:MM) */
  defaultQuietHoursEnd: string | null;
  /** Daily digest send time (HH:MM) */
  digestTime: string;
}

/**
 * Default organization settings.
 * Per CONTEXT.md: assignments, escalations, deadlines are critical.
 */
const DEFAULT_ORG_SETTINGS: OrgNotificationSettings = {
  enforcedCategories: ["ASSIGNMENT", "DEADLINE"] as NotificationCategory[],
  defaultQuietHoursStart: null,
  defaultQuietHoursEnd: null,
  digestTime: "17:00",
};
