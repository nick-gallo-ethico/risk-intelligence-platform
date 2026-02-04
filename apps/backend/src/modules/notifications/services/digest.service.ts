/**
 * DigestService - Daily Digest Compilation Service
 *
 * Aggregates low-priority notifications (status changes, comments, completions)
 * into a single daily email to prevent inbox overload.
 *
 * Key features:
 * - Hourly scheduler checks each org's configured digest time
 * - Smart aggregation groups similar events (e.g., "3 comments on Case #X")
 * - Respects user preferences (only users with digest enabled receive it)
 * - Marks items as processed after digest is sent
 *
 * @see OrgNotificationSettingsService for digest time configuration
 * @see PreferenceService for user preference checking
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailTemplateService, EmailTemplateContext } from './email-template.service';
import { PreferenceService } from './preference.service';
import { OrgNotificationSettingsService } from './org-settings.service';
import { EMAIL_QUEUE_NAME } from '../../jobs/queues/email.queue';
import {
  NotificationStatus,
  NotificationChannel,
  NotificationType,
  DIGEST_CATEGORIES,
} from '../entities/notification.types';

/**
 * Parameters for queueing an item for daily digest.
 */
export interface QueueForDigestParams {
  /** Organization ID for tenant scoping */
  organizationId: string;
  /** User ID to receive digest */
  userId: string;
  /** Notification type (STATUS_UPDATE, COMMENT, COMPLETION) */
  type: string;
  /** Related entity type for grouping */
  entityType?: string;
  /** Related entity ID for grouping */
  entityId?: string;
  /** Additional metadata for template rendering */
  metadata?: Record<string, unknown>;
}

/**
 * Grouped digest item for aggregation.
 */
export interface GroupedDigestItem {
  /** Notification type */
  type: string;
  /** Entity type (Case, Investigation, etc.) */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Count of similar notifications */
  count: number;
  /** Display summary (e.g., "3 new comments on Case #0912") */
  summary: string;
  /** Entity reference number or name for display */
  entityReference?: string;
  /** Link to entity */
  entityUrl?: string;
  /** Individual items in this group */
  items: Array<{
    type: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }>;
}

/**
 * Compiled digest ready for email rendering.
 */
export interface CompiledDigest {
  /** User's display name */
  userName: string;
  /** Total notification count */
  totalCount: number;
  /** Grouped notifications */
  groups: GroupedDigestItem[];
  /** Digest date */
  date: string;
  /** Digest period description */
  periodDescription: string;
}

/**
 * Email job data structure for BullMQ.
 */
interface EmailJobData {
  organizationId: string;
  notificationId: string;
  templateId: string;
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: EmailTemplateService,
    private readonly preferenceService: PreferenceService,
    private readonly orgSettingsService: OrgNotificationSettingsService,
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
  ) {}

  /**
   * Queue an item for inclusion in daily digest.
   * Creates a DigestQueue record for batch processing.
   *
   * @param params - Queue parameters
   */
  async queueItem(params: QueueForDigestParams): Promise<void> {
    const { organizationId, userId, type, entityType, entityId, metadata } = params;

    // Store in DigestQueue table for batch processing
    await this.prisma.digestQueue.create({
      data: {
        organizationId,
        userId,
        type,
        entityType: entityType || null,
        entityId: entityId || null,
        metadata: metadata as object || {},
      },
    });

    this.logger.debug(
      `Queued ${type} for digest: user ${userId}, entity ${entityType}/${entityId}`,
    );
  }

  /**
   * Hourly scheduled task to process digests.
   * Checks each organization's digest time and processes when matched.
   *
   * Runs every hour on the hour.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processDigestsHourly(): Promise<void> {
    this.logger.log('Running hourly digest check');

    try {
      // Get all organizations with pending digest items
      const orgsWithPending = await this.prisma.digestQueue.groupBy({
        by: ['organizationId'],
        where: {
          processed: false,
        },
      });

      if (orgsWithPending.length === 0) {
        this.logger.debug('No pending digest items');
        return;
      }

      // Get current hour in HH:00 format
      const now = new Date();
      const currentHour = now.getUTCHours().toString().padStart(2, '0') + ':00';

      // Process each organization that has matching digest time
      for (const { organizationId } of orgsWithPending) {
        try {
          const settings = await this.orgSettingsService.getSettings(organizationId);
          const digestTime = settings.digestTime; // e.g., "17:00"

          // Extract hour from digest time for comparison
          const digestHour = digestTime.split(':')[0].padStart(2, '0') + ':00';

          if (digestHour === currentHour) {
            this.logger.log(`Processing digest for organization ${organizationId} at ${digestTime}`);
            await this.processOrgDigest(organizationId);
          }
        } catch (error) {
          this.logger.error(
            `Error checking digest time for org ${organizationId}: ${error}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error in hourly digest processing: ${error}`);
    }
  }

  /**
   * Process digest for a specific organization.
   * Gets all users with pending items and sends their digests.
   *
   * @param organizationId - Organization to process
   */
  async processOrgDigest(organizationId: string): Promise<void> {
    this.logger.log(`Processing digest for organization: ${organizationId}`);

    // Get all users in this org with unprocessed digest items
    const usersWithItems = await this.prisma.digestQueue.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        processed: false,
      },
    });

    if (usersWithItems.length === 0) {
      this.logger.debug(`No pending digest items for org ${organizationId}`);
      return;
    }

    let processedCount = 0;
    let skippedCount = 0;

    for (const { userId } of usersWithItems) {
      try {
        // Check if user has digest enabled (any category with email: true that's digestable)
        const hasDigestEnabled = await this.isDigestEnabledForUser(userId, organizationId);

        if (!hasDigestEnabled) {
          // Mark items as processed but don't send email
          await this.markUserItemsProcessed(userId, organizationId);
          skippedCount++;
          continue;
        }

        // Get user's pending items
        const items = await this.prisma.digestQueue.findMany({
          where: {
            organizationId,
            userId,
            processed: false,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (items.length === 0) {
          continue;
        }

        // Compile digest
        const digest = await this.compileDigest(userId, organizationId, items);

        // Send digest email
        await this.sendDigest(userId, organizationId, digest);

        // Mark items as processed
        await this.markUserItemsProcessed(userId, organizationId);

        processedCount++;
      } catch (error) {
        this.logger.error(`Error processing digest for user ${userId}: ${error}`);
      }
    }

    this.logger.log(
      `Digest processing complete for org ${organizationId}: ${processedCount} sent, ${skippedCount} skipped`,
    );
  }

  /**
   * Compile a digest from pending items.
   * Groups similar events for smart aggregation.
   *
   * @param userId - User receiving digest
   * @param organizationId - Organization ID
   * @param items - Pending digest items
   * @returns Compiled digest ready for rendering
   */
  async compileDigest(
    userId: string,
    organizationId: string,
    items: Array<{
      id: string;
      type: string;
      entityType: string | null;
      entityId: string | null;
      metadata: unknown;
      createdAt: Date;
    }>,
  ): Promise<CompiledDigest> {
    // Load user for name
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });

    const userName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : 'User';

    // Group items by type + entityType + entityId
    const groups = this.groupItems(items);

    // Enhance groups with entity references
    for (const group of groups) {
      group.summary = this.getDigestSummary(group);
      group.entityReference = await this.getEntityReference(
        group.entityType,
        group.entityId,
        organizationId,
      );
      group.entityUrl = this.getEntityUrl(group.entityType, group.entityId);
    }

    // Get date info for digest
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    return {
      userName,
      totalCount: items.length,
      groups,
      date: now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      periodDescription: `Activity from the past 24 hours`,
    };
  }

  /**
   * Send compiled digest email to user.
   *
   * @param userId - User receiving digest
   * @param organizationId - Organization ID
   * @param digest - Compiled digest
   */
  async sendDigest(
    userId: string,
    organizationId: string,
    digest: CompiledDigest,
  ): Promise<void> {
    // Load user and org for email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!user) {
      this.logger.warn(`User not found for digest: ${userId}`);
      return;
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, settings: true },
    });

    if (!org) {
      this.logger.warn(`Organization not found: ${organizationId}`);
      return;
    }

    // Build template context
    const orgSettings = org.settings as Record<string, unknown> | null;
    const context: EmailTemplateContext = {
      digest,
      org: {
        name: org.name,
        branding: orgSettings?.branding as EmailTemplateContext['org'] extends { branding?: infer B } ? B : undefined,
      },
      recipient: {
        name: digest.userName,
        email: user.email,
      },
      appUrl: process.env.APP_URL || 'https://app.ethico.com',
    };

    // Pre-render template
    const { subject, html } = await this.templateService.render(
      'digest/daily-digest',
      context,
      organizationId,
    );

    // Create notification record for tracking
    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        userId: user.id,
        channel: NotificationChannel.EMAIL,
        type: NotificationType.DIGEST,
        status: NotificationStatus.QUEUED,
        title: subject,
        body: `${digest.totalCount} notifications`,
        templateId: 'digest/daily-digest',
      },
    });

    // Queue email job
    const jobData: EmailJobData = {
      organizationId,
      notificationId: notification.id,
      templateId: 'digest/daily-digest',
      to: user.email,
      subject,
      html,
    };

    await this.emailQueue.add('send-email', jobData, {
      priority: 3, // Lower priority than urgent notifications
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    this.logger.log(
      `Queued digest email for ${user.email} with ${digest.totalCount} items`,
    );
  }

  // ===== Private Helper Methods =====

  /**
   * Check if user has digest email enabled for any digestable category.
   */
  private async isDigestEnabledForUser(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const prefs = await this.preferenceService.getPreferences(userId, organizationId);

    // Check if any digest category has email enabled
    for (const category of DIGEST_CATEGORIES) {
      const categoryPref = prefs.preferences[category];
      if (categoryPref?.email) {
        return true;
      }
    }

    return false;
  }

  /**
   * Mark all pending items for a user as processed.
   */
  private async markUserItemsProcessed(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const now = new Date();

    await this.prisma.digestQueue.updateMany({
      where: {
        organizationId,
        userId,
        processed: false,
      },
      data: {
        processed: true,
        processedAt: now,
      },
    });

    this.logger.debug(`Marked digest items processed for user ${userId}`);
  }

  /**
   * Group items by type and entity for smart aggregation.
   */
  private groupItems(
    items: Array<{
      id: string;
      type: string;
      entityType: string | null;
      entityId: string | null;
      metadata: unknown;
      createdAt: Date;
    }>,
  ): GroupedDigestItem[] {
    const groupMap = new Map<string, GroupedDigestItem>();

    for (const item of items) {
      const key = `${item.type}:${item.entityType || 'none'}:${item.entityId || 'none'}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          type: item.type,
          entityType: item.entityType || 'GENERAL',
          entityId: item.entityId || '',
          count: 0,
          summary: '',
          items: [],
        });
      }

      const group = groupMap.get(key)!;
      group.count++;
      group.items.push({
        type: item.type,
        metadata: (item.metadata as Record<string, unknown>) || {},
        createdAt: item.createdAt,
      });
    }

    // Sort groups by count (most activity first)
    return Array.from(groupMap.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Generate human-readable summary for a group.
   */
  private getDigestSummary(group: GroupedDigestItem): string {
    const { type, entityType, count, entityReference } = group;
    const entityDisplay = entityReference || entityType || 'item';

    switch (type) {
      case 'COMMENT':
        return count === 1
          ? `New comment on ${entityDisplay}`
          : `${count} new comments on ${entityDisplay}`;

      case 'STATUS_UPDATE':
        return count === 1
          ? `Status update on ${entityDisplay}`
          : `${count} status updates on ${entityDisplay}`;

      case 'COMPLETION':
        return count === 1
          ? `${entityDisplay} completed`
          : `${count} items completed`;

      default:
        return count === 1
          ? `Activity on ${entityDisplay}`
          : `${count} activities on ${entityDisplay}`;
    }
  }

  /**
   * Get entity reference number or name for display.
   */
  private async getEntityReference(
    entityType: string,
    entityId: string,
    organizationId: string,
  ): Promise<string | undefined> {
    if (!entityType || !entityId) {
      return undefined;
    }

    try {
      switch (entityType) {
        case 'CASE':
          const caseEntity = await this.prisma.case.findFirst({
            where: { id: entityId, organizationId },
            select: { referenceNumber: true },
          });
          return caseEntity?.referenceNumber || `Case #${entityId.slice(0, 8)}`;

        case 'INVESTIGATION':
          const investigation = await this.prisma.investigation.findFirst({
            where: { id: entityId, organizationId },
            select: { investigationNumber: true, caseId: true },
          });
          if (investigation) {
            // Get case reference for context
            const relatedCase = await this.prisma.case.findUnique({
              where: { id: investigation.caseId },
              select: { referenceNumber: true },
            });
            return relatedCase
              ? `${relatedCase.referenceNumber} Investigation #${investigation.investigationNumber}`
              : `Investigation #${investigation.investigationNumber}`;
          }
          return `Investigation #${entityId.slice(0, 8)}`;

        case 'RIU':
          const riu = await this.prisma.riskIntelligenceUnit.findFirst({
            where: { id: entityId, organizationId },
            select: { referenceNumber: true },
          });
          return riu?.referenceNumber || `RIU #${entityId.slice(0, 8)}`;

        case 'REMEDIATION_PLAN':
          return `Remediation Plan #${entityId.slice(0, 8)}`;

        default:
          return `${entityType} #${entityId.slice(0, 8)}`;
      }
    } catch (error) {
      this.logger.warn(`Error fetching entity reference: ${error}`);
      return `${entityType} #${entityId.slice(0, 8)}`;
    }
  }

  /**
   * Get URL for entity navigation.
   */
  private getEntityUrl(entityType: string, entityId: string): string {
    const baseUrl = process.env.APP_URL || 'https://app.ethico.com';

    switch (entityType) {
      case 'CASE':
        return `${baseUrl}/cases/${entityId}`;
      case 'INVESTIGATION':
        return `${baseUrl}/investigations/${entityId}`;
      case 'RIU':
        return `${baseUrl}/rius/${entityId}`;
      case 'REMEDIATION_PLAN':
        return `${baseUrl}/remediation/${entityId}`;
      default:
        return baseUrl;
    }
  }
}
