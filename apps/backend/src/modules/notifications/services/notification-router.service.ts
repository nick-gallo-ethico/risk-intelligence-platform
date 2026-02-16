/**
 * NotificationRouterService - Notification Routing Logic
 *
 * Handles notification routing decisions:
 * - User preference checking (email/in-app preferences)
 * - OOO (Out-of-Office) backup delegation
 * - Quiet hours handling
 * - Channel selection (email, in-app, digest)
 * - Batch vs immediate delivery decisions
 *
 * Works with PreferenceService for preference data and
 * DeliveryDispatcherService for actual delivery.
 */

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PreferenceService, EffectivePreference } from "./preference.service";
import {
  NotificationCategory,
  REAL_TIME_CATEGORIES,
} from "../entities/notification.types";

/**
 * Routing decision result for a notification.
 */
export interface RoutingDecision {
  /** Whether to send via email channel */
  shouldSendEmail: boolean;
  /** Whether to send via in-app channel */
  shouldSendInApp: boolean;
  /** Whether to batch for daily digest instead of immediate delivery */
  shouldBatchForDigest: boolean;
  /** Actual recipient user ID (may be backup user if OOO) */
  actualRecipientId: string;
  /** Whether original recipient is OOO */
  isOOO: boolean;
  /** Backup user ID if OOO delegation */
  backupUserId?: string;
  /** Whether notification is enforced by org policy */
  isEnforcedByOrg: boolean;
  /** Whether recipient is in quiet hours */
  isQuietHours: boolean;
}

/**
 * Recipient info with email and name for delivery.
 */
export interface RecipientInfo {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
}

/**
 * Organization info for notification branding.
 */
export interface OrgInfo {
  id: string;
  name: string;
  branding?: Record<string, unknown>;
}

/**
 * Parameters for routing decision.
 */
export interface RoutingParams {
  organizationId: string;
  recipientUserId: string;
  category: NotificationCategory;
  isUrgent: boolean;
}

@Injectable()
export class NotificationRouterService {
  private readonly logger = new Logger(NotificationRouterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly preferenceService: PreferenceService,
  ) {}

  /**
   * Determines routing for a notification based on preferences and context.
   *
   * @param params - Routing parameters
   * @returns Routing decision with channel selections
   */
  async determineRouting(params: RoutingParams): Promise<RoutingDecision> {
    const { organizationId, recipientUserId, category, isUrgent } = params;

    // Get effective preferences (handles OOO, quiet hours, enforcement)
    const prefs = await this.preferenceService.getEffectivePreferences(
      recipientUserId,
      organizationId,
      category,
    );

    // Determine actual recipient (may be backup user if OOO)
    let actualRecipientId = recipientUserId;
    if (prefs.isOOO && prefs.backupUserId && isUrgent) {
      actualRecipientId = prefs.backupUserId;
      this.logger.log(
        `Routing urgent notification to backup user ${actualRecipientId} (original: ${recipientUserId} is OOO)`,
      );
    }

    // Determine if this should be batched for digest
    const shouldBatch = !isUrgent && !REAL_TIME_CATEGORIES.includes(category);

    // If batching and not enforced, don't send immediately
    if (shouldBatch && !prefs.isEnforcedByOrg) {
      return {
        shouldSendEmail: false,
        shouldSendInApp: false,
        shouldBatchForDigest: true,
        actualRecipientId: recipientUserId,
        isOOO: prefs.isOOO,
        backupUserId: prefs.backupUserId,
        isEnforcedByOrg: prefs.isEnforcedByOrg,
        isQuietHours: prefs.isQuietHours,
      };
    }

    // Determine email routing
    let shouldSendEmail = prefs.email || prefs.isEnforcedByOrg;
    if (shouldSendEmail && prefs.isQuietHours && !isUrgent && !prefs.isEnforcedByOrg) {
      shouldSendEmail = false;
      this.logger.debug(
        `Skipping email for user ${actualRecipientId}: in quiet hours`,
      );
    }

    // Determine in-app routing
    const shouldSendInApp = prefs.inApp || prefs.isEnforcedByOrg;

    return {
      shouldSendEmail,
      shouldSendInApp,
      shouldBatchForDigest: false,
      actualRecipientId,
      isOOO: prefs.isOOO,
      backupUserId: prefs.backupUserId,
      isEnforcedByOrg: prefs.isEnforcedByOrg,
      isQuietHours: prefs.isQuietHours,
    };
  }

  /**
   * Checks if email should be sent based on preferences.
   *
   * @param prefs - Effective preferences
   * @param isUrgent - Whether notification is urgent
   * @returns Whether to send email
   */
  shouldSendEmail(prefs: EffectivePreference, isUrgent: boolean): boolean {
    // Skip if email not wanted and not enforced
    if (!prefs.email && !prefs.isEnforcedByOrg) {
      return false;
    }

    // Skip if quiet hours and not urgent (non-enforced categories)
    if (prefs.isQuietHours && !isUrgent && !prefs.isEnforcedByOrg) {
      return false;
    }

    return true;
  }

  /**
   * Checks if in-app notification should be sent based on preferences.
   *
   * @param prefs - Effective preferences
   * @returns Whether to send in-app notification
   */
  shouldSendInApp(prefs: EffectivePreference): boolean {
    return prefs.inApp || prefs.isEnforcedByOrg;
  }

  /**
   * Checks if notification should be batched for digest.
   *
   * @param category - Notification category
   * @param isUrgent - Whether notification is urgent
   * @param prefs - Effective preferences
   * @returns Whether to batch for digest
   */
  shouldBatchForDigest(
    category: NotificationCategory,
    isUrgent: boolean,
    prefs: EffectivePreference,
  ): boolean {
    if (isUrgent) return false;
    if (prefs.isEnforcedByOrg) return false;
    return !REAL_TIME_CATEGORIES.includes(category);
  }

  /**
   * Gets recipient info (user details) for notification delivery.
   *
   * @param userId - User ID
   * @returns Recipient info or null if not found
   */
  async getRecipientInfo(userId: string): Promise<RecipientInfo | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!user) {
      this.logger.warn(`User not found for notification: ${userId}`);
      return null;
    }

    const displayName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      displayName,
    };
  }

  /**
   * Gets organization info for notification branding.
   *
   * @param organizationId - Organization ID
   * @returns Organization info or null if not found
   */
  async getOrgInfo(organizationId: string): Promise<OrgInfo | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, settings: true },
    });

    if (!org) {
      this.logger.warn(`Organization not found: ${organizationId}`);
      return null;
    }

    const settings = org.settings as Record<string, unknown> | null;

    return {
      id: org.id,
      name: org.name,
      branding: settings?.branding as Record<string, unknown> | undefined,
    };
  }

  /**
   * Resolves the actual recipient for a notification,
   * handling OOO delegation for urgent notifications.
   *
   * @param recipientUserId - Original recipient user ID
   * @param prefs - Effective preferences
   * @param isUrgent - Whether notification is urgent
   * @returns Actual recipient user ID
   */
  resolveActualRecipient(
    recipientUserId: string,
    prefs: EffectivePreference,
    isUrgent: boolean,
  ): string {
    if (prefs.isOOO && prefs.backupUserId && isUrgent) {
      this.logger.log(
        `Delegating urgent notification to backup: ${prefs.backupUserId}`,
      );
      return prefs.backupUserId;
    }
    return recipientUserId;
  }

  /**
   * Gets effective preferences for a notification recipient.
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param category - Notification category
   * @returns Effective preferences
   */
  async getEffectivePreferences(
    userId: string,
    organizationId: string,
    category: NotificationCategory,
  ): Promise<EffectivePreference> {
    return this.preferenceService.getEffectivePreferences(
      userId,
      organizationId,
      category,
    );
  }
}
