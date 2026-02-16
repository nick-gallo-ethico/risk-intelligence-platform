import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { AssignmentStatus, CampaignStatus, Prisma } from "@prisma/client";

/**
 * Reminder sequence configuration per RS.51.
 * Defines when to send reminders and when to CC managers.
 */
export interface ReminderStep {
  /** Days before/after due date (negative = before, positive = after) */
  daysFromDue: number;
  /** Whether to CC the employee's manager */
  ccManager: boolean;
  /** Whether to CC HR */
  ccHR?: boolean;
  /** Custom email template ID (optional) */
  templateId?: string;
}

/**
 * Default reminder sequence configuration.
 * Example: [
 *   { daysFromDue: -5, ccManager: false },  // 5 days before
 *   { daysFromDue: -2, ccManager: false },  // 2 days before
 *   { daysFromDue: 3, ccManager: true },    // 3 days after (overdue)
 *   { daysFromDue: 7, ccManager: true, ccHR: true }, // 7 days after
 * ]
 */
export const DEFAULT_REMINDER_SEQUENCE: ReminderStep[] = [
  { daysFromDue: -5, ccManager: false },
  { daysFromDue: -1, ccManager: false },
  { daysFromDue: 3, ccManager: true },
  { daysFromDue: 7, ccManager: true, ccHR: true },
];

/**
 * Employee compliance profile for tracking campaign response patterns.
 */
export interface ComplianceProfileStats {
  employeeId: string;
  organizationId: string;
  campaignsAssigned: number;
  campaignsCompleted: number;
  campaignsMissedDeadline: number;
  averageResponseDays: number | null;
  isRepeatNonResponder: boolean;
  lastCampaignCompletedAt: Date | null;
}

/**
 * Pending reminder for batch processing.
 */
export interface PendingReminder {
  assignmentId: string;
  employeeId: string;
  campaignId: string;
  campaignName: string;
  dueDate: Date;
  reminderStep: number;
  ccManager: boolean;
  ccHR: boolean;
  managerId: string | null;
  managerEmail: string | null;
}

/**
 * Service for managing campaign reminder sequences.
 *
 * Implements RS.51:
 * - Configurable reminder sequence per campaign
 * - Manager CC activation on configurable day
 * - Repeat non-responder flagging
 */
@Injectable()
export class CampaignReminderService {
  private readonly logger = new Logger(CampaignReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("campaign") private readonly campaignQueue: Queue,
  ) {}

  // Reminder Configuration

  /**
   * Gets the reminder sequence for a campaign.
   * Returns campaign-specific config or defaults.
   */
  async getReminderSequence(campaignId: string): Promise<ReminderStep[]> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { reminderConfig: true },
    });

    if (campaign?.reminderConfig) {
      return campaign.reminderConfig as unknown as ReminderStep[];
    }

    return DEFAULT_REMINDER_SEQUENCE;
  }

  /**
   * Updates the reminder sequence for a campaign.
   */
  async updateReminderSequence(
    campaignId: string,
    sequence: ReminderStep[],
    organizationId: string,
  ): Promise<void> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        reminderConfig: sequence as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Updated reminder sequence for campaign ${campaignId}`);
  }

  // Reminder Processing

  /**
   * Processes campaign reminders in batches using cursor-based pagination.
   * Handles 100K+ assignments without memory exhaustion.
   *
   * @param organizationId - Optional org filter (processes all orgs if not provided)
   * @returns Total number of assignments processed
   */
  async processRemindersInBatches(organizationId?: string): Promise<number> {
    const batchSize = 100;
    let cursor: string | undefined;
    let totalProcessed = 0;
    let totalRemindersQueued = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseWhere: Prisma.CampaignAssignmentWhereInput = {
      status: {
        in: [
          AssignmentStatus.PENDING,
          AssignmentStatus.NOTIFIED,
          AssignmentStatus.IN_PROGRESS,
        ],
      },
      campaign: {
        status: CampaignStatus.ACTIVE,
      },
    };

    if (organizationId) {
      baseWhere.organizationId = organizationId;
    }

    while (true) {
      const assignments = await this.prisma.campaignAssignment.findMany({
        where: baseWhere,
        take: batchSize,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: "asc" },
        select: {
          id: true,
          campaignId: true,
          employeeId: true,
          reminderCount: true,
          campaign: {
            select: {
              id: true,
              name: true,
              dueDate: true,
              reminderConfig: true,
            },
          },
          employee: {
            select: {
              id: true,
              managerId: true,
              manager: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (assignments.length === 0) break;

      // Filter assignments to find those needing reminders today
      const pendingReminders = this.filterAssignmentsNeedingReminders(
        assignments,
        today,
      );

      if (pendingReminders.length > 0) {
        await this.queueRemindersBulk(pendingReminders);
        totalRemindersQueued += pendingReminders.length;
      }

      totalProcessed += assignments.length;
      cursor = assignments[assignments.length - 1].id;
    }

    this.logger.log(
      `Batch processing complete: processed ${totalProcessed} assignments, queued ${totalRemindersQueued} reminders`,
    );

    return totalProcessed;
  }

  /**
   * Finds assignments needing reminders with optional pagination.
   * Called by the scheduler processor.
   *
   * @param organizationId - Optional org filter
   * @param options - Optional pagination parameters (limit, cursor)
   * @returns Pending reminders to be queued
   */
  async findAssignmentsNeedingReminders(
    organizationId?: string,
    options: { limit?: number; cursor?: string } = {},
  ): Promise<PendingReminder[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = options.limit ?? 100;

    const where: Prisma.CampaignAssignmentWhereInput = {
      status: {
        in: [
          AssignmentStatus.PENDING,
          AssignmentStatus.NOTIFIED,
          AssignmentStatus.IN_PROGRESS,
        ],
      },
      campaign: {
        status: CampaignStatus.ACTIVE,
      },
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const assignments = await this.prisma.campaignAssignment.findMany({
      where,
      take: limit,
      skip: options.cursor ? 1 : 0,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      orderBy: { id: "asc" },
      select: {
        id: true,
        campaignId: true,
        employeeId: true,
        reminderCount: true,
        campaign: {
          select: {
            id: true,
            name: true,
            dueDate: true,
            reminderConfig: true,
          },
        },
        employee: {
          select: {
            id: true,
            managerId: true,
            manager: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return this.filterAssignmentsNeedingReminders(assignments, today);
  }

  /**
   * Filters assignments to find those needing reminders for the given date.
   * Pure function that can be used by both batch and single-call processing.
   */
  private filterAssignmentsNeedingReminders(
    assignments: Array<{
      id: string;
      campaignId: string;
      employeeId: string;
      reminderCount: number;
      campaign: {
        id: string;
        name: string;
        dueDate: Date | null;
        reminderConfig: unknown;
      };
      employee: {
        id: string;
        managerId: string | null;
        manager: { id: string; email: string } | null;
      };
    }>,
    today: Date,
  ): PendingReminder[] {
    const pendingReminders: PendingReminder[] = [];

    for (const assignment of assignments) {
      const dueDate = assignment.campaign.dueDate;
      if (!dueDate) continue;

      const daysFromDue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const reminderSequence = assignment.campaign.reminderConfig
        ? (assignment.campaign.reminderConfig as unknown as ReminderStep[])
        : DEFAULT_REMINDER_SEQUENCE;

      // Find if there's a reminder for today
      const todaysReminder = reminderSequence.find(
        (step) => step.daysFromDue === daysFromDue,
      );

      if (todaysReminder) {
        // Check if this reminder was already sent
        const reminderIndex = reminderSequence.indexOf(todaysReminder);
        if (assignment.reminderCount >= reminderIndex + 1) {
          continue; // Already sent this reminder
        }

        pendingReminders.push({
          assignmentId: assignment.id,
          employeeId: assignment.employeeId,
          campaignId: assignment.campaignId,
          campaignName: assignment.campaign.name,
          dueDate,
          reminderStep: reminderIndex + 1,
          ccManager: todaysReminder.ccManager,
          ccHR: todaysReminder.ccHR ?? false,
          managerId: assignment.employee.managerId,
          managerEmail: assignment.employee.manager?.email ?? null,
        });
      }
    }

    return pendingReminders;
  }

  /**
   * Queues reminders for processing using BullMQ bulk operations.
   * Chunks reminders into batches of 100 for efficient queue insertion.
   *
   * @param reminders - Array of pending reminders to queue
   */
  async queueRemindersBulk(reminders: PendingReminder[]): Promise<void> {
    const chunkSize = 100;
    let batchCount = 0;

    for (let i = 0; i < reminders.length; i += chunkSize) {
      const chunk = reminders.slice(i, i + chunkSize);
      const jobs = chunk.map((reminder) => ({
        name: "send-reminder",
        data: reminder,
        opts: {
          attempts: 3,
          backoff: {
            type: "exponential" as const,
            delay: 5000,
          },
        },
      }));

      await this.campaignQueue.addBulk(jobs);
      batchCount++;
    }

    this.logger.log(
      `Queued ${reminders.length} reminders in ${batchCount} batches`,
    );
  }

  /**
   * Queues reminders for processing (legacy method for backward compatibility).
   * @deprecated Use queueRemindersBulk for better performance
   */
  async queueReminders(reminders: PendingReminder[]): Promise<void> {
    await this.queueRemindersBulk(reminders);
  }

  /**
   * Records that a reminder was sent.
   */
  async recordReminderSent(
    assignmentId: string,
    ccManager: boolean,
  ): Promise<void> {
    const data: Prisma.CampaignAssignmentUpdateInput = {
      reminderCount: { increment: 1 },
      lastReminderSentAt: new Date(),
    };

    if (ccManager) {
      data.managerNotifiedAt = new Date();
    }

    await this.prisma.campaignAssignment.update({
      where: { id: assignmentId },
      data,
    });
  }

  // Compliance Profile Management

  /**
   * Gets or creates a compliance profile for an employee.
   */
  async getOrCreateComplianceProfile(
    employeeId: string,
    organizationId: string,
  ): Promise<ComplianceProfileStats> {
    let profile = await this.prisma.employeeComplianceProfile.findUnique({
      where: { employeeId },
    });

    if (!profile) {
      profile = await this.prisma.employeeComplianceProfile.create({
        data: {
          organizationId,
          employeeId,
          campaignsAssigned: 0,
          campaignsCompleted: 0,
          campaignsMissedDeadline: 0,
          isRepeatNonResponder: false,
        },
      });
    }

    return {
      employeeId: profile.employeeId,
      organizationId: profile.organizationId,
      campaignsAssigned: profile.campaignsAssigned,
      campaignsCompleted: profile.campaignsCompleted,
      campaignsMissedDeadline: profile.campaignsMissedDeadline,
      averageResponseDays: profile.averageResponseDays,
      isRepeatNonResponder: profile.isRepeatNonResponder,
      lastCampaignCompletedAt: profile.lastCampaignCompletedAt,
    };
  }

  /**
   * Records a campaign assignment for compliance tracking.
   */
  async recordCampaignAssigned(
    employeeId: string,
    organizationId: string,
  ): Promise<void> {
    await this.prisma.employeeComplianceProfile.upsert({
      where: { employeeId },
      update: {
        campaignsAssigned: { increment: 1 },
      },
      create: {
        organizationId,
        employeeId,
        campaignsAssigned: 1,
        campaignsCompleted: 0,
        campaignsMissedDeadline: 0,
        isRepeatNonResponder: false,
      },
    });
  }

  /**
   * Records a campaign completion for compliance tracking.
   */
  async recordCampaignCompleted(
    employeeId: string,
    organizationId: string,
    assignedAt: Date,
    completedAt: Date,
    dueDate: Date,
  ): Promise<void> {
    const responseDays = Math.floor(
      (completedAt.getTime() - assignedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const missedDeadline = completedAt > dueDate;

    // Get current profile to calculate new average
    const profile = await this.getOrCreateComplianceProfile(
      employeeId,
      organizationId,
    );

    const newAverage =
      profile.campaignsCompleted > 0
        ? ((profile.averageResponseDays ?? 0) * profile.campaignsCompleted +
            responseDays) /
          (profile.campaignsCompleted + 1)
        : responseDays;

    await this.prisma.employeeComplianceProfile.update({
      where: { employeeId },
      data: {
        campaignsCompleted: { increment: 1 },
        campaignsMissedDeadline: missedDeadline ? { increment: 1 } : undefined,
        averageResponseDays: newAverage,
        lastCampaignCompletedAt: completedAt,
      },
    });

    // Update repeat non-responder flag
    await this.updateNonResponderFlag(employeeId);
  }

  /**
   * Records a missed deadline for compliance tracking.
   */
  async recordMissedDeadline(
    employeeId: string,
    organizationId: string,
  ): Promise<void> {
    await this.prisma.employeeComplianceProfile.upsert({
      where: { employeeId },
      update: {
        campaignsMissedDeadline: { increment: 1 },
      },
      create: {
        organizationId,
        employeeId,
        campaignsAssigned: 0,
        campaignsCompleted: 0,
        campaignsMissedDeadline: 1,
        isRepeatNonResponder: false,
      },
    });

    // Update repeat non-responder flag
    await this.updateNonResponderFlag(employeeId);
  }

  /**
   * Updates the repeat non-responder flag based on history.
   * RS.51: Flag employees who miss multiple deadlines.
   */
  private async updateNonResponderFlag(employeeId: string): Promise<void> {
    const profile = await this.prisma.employeeComplianceProfile.findUnique({
      where: { employeeId },
    });

    if (!profile) return;

    // Flag as repeat non-responder if:
    // - Missed 3+ deadlines, OR
    // - Missed >25% of assigned campaigns (with min 4 campaigns)
    const isRepeat =
      profile.campaignsMissedDeadline >= 3 ||
      (profile.campaignsAssigned >= 4 &&
        profile.campaignsMissedDeadline / profile.campaignsAssigned > 0.25);

    if (isRepeat !== profile.isRepeatNonResponder) {
      await this.prisma.employeeComplianceProfile.update({
        where: { employeeId },
        data: { isRepeatNonResponder: isRepeat },
      });

      this.logger.log(
        `Updated non-responder flag for employee ${employeeId}: ${isRepeat}`,
      );
    }
  }

  // Query Methods

  /**
   * Gets repeat non-responders for reporting with pagination.
   *
   * @param organizationId - Organization to query
   * @param options - Optional pagination parameters
   * @returns Paginated list of repeat non-responders
   */
  async getRepeatNonResponders(
    organizationId: string,
    options: { limit?: number; cursor?: string } = {},
  ): Promise<{
    profiles: ComplianceProfileStats[];
    nextCursor: string | null;
  }> {
    const limit = options.limit ?? 100;

    const profiles = await this.prisma.employeeComplianceProfile.findMany({
      where: {
        organizationId,
        isRepeatNonResponder: true,
      },
      take: limit,
      skip: options.cursor ? 1 : 0,
      cursor: options.cursor ? { employeeId: options.cursor } : undefined,
      orderBy: { campaignsMissedDeadline: "desc" },
    });

    const mappedProfiles = profiles.map((p) => ({
      employeeId: p.employeeId,
      organizationId: p.organizationId,
      campaignsAssigned: p.campaignsAssigned,
      campaignsCompleted: p.campaignsCompleted,
      campaignsMissedDeadline: p.campaignsMissedDeadline,
      averageResponseDays: p.averageResponseDays,
      isRepeatNonResponder: p.isRepeatNonResponder,
      lastCampaignCompletedAt: p.lastCampaignCompletedAt,
    }));

    return {
      profiles: mappedProfiles,
      nextCursor:
        profiles.length === limit
          ? profiles[profiles.length - 1].employeeId
          : null,
    };
  }

  /**
   * Gets compliance statistics summary using database aggregation.
   * Uses database-level aggregation to avoid loading all profiles into memory.
   */
  async getComplianceStatistics(organizationId: string): Promise<{
    totalEmployees: number;
    repeatNonResponders: number;
    averageResponseDays: number;
    averageCompletionRate: number;
  }> {
    const [aggregates, repeatNonResponderCount, completionRateResult] =
      await Promise.all([
        // Database-level aggregation for count and average response days
        this.prisma.employeeComplianceProfile.aggregate({
          where: { organizationId },
          _count: { _all: true },
          _avg: { averageResponseDays: true },
        }),
        // Separate count for filtered data (repeat non-responders)
        this.prisma.employeeComplianceProfile.count({
          where: { organizationId, isRepeatNonResponder: true },
        }),
        // Use raw SQL for completion rate calculation (division not supported in aggregate)
        this.prisma.$queryRaw<[{ rate: number | null }]>`
          SELECT AVG(
            CASE WHEN "campaignsAssigned" > 0
            THEN "campaignsCompleted"::float / "campaignsAssigned"
            ELSE 0 END
          ) as rate
          FROM "EmployeeComplianceProfile"
          WHERE "organizationId" = ${organizationId}
        `,
      ]);

    return {
      totalEmployees: aggregates._count._all,
      repeatNonResponders: repeatNonResponderCount,
      averageResponseDays: aggregates._avg.averageResponseDays ?? 0,
      averageCompletionRate: completionRateResult[0]?.rate ?? 0,
    };
  }
}
