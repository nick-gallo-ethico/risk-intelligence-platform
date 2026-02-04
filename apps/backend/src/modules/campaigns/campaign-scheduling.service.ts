import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  Campaign,
  CampaignWave,
  CampaignWaveStatus,
  CampaignRolloutStrategy,
  CampaignStatus,
  OrgBlackoutDate,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  Prisma,
} from '@prisma/client';

/**
 * Rollout configuration for staggered campaigns.
 * Defines how assignments are distributed across waves.
 */
export interface RolloutConfig {
  /** Type of wave distribution */
  type: 'percentage' | 'daily_count';
  /** Values for each wave (percentages or employee counts per wave) */
  values: number[];
  /** Start date for the first wave (ISO string) */
  startDate?: string;
  /** Days between waves (default: 1) */
  waveDayGap?: number;
}

/**
 * Schedule details returned when a campaign is scheduled.
 */
export interface ScheduleDetails {
  campaignId: string;
  scheduledAt: Date;
  rolloutStrategy: CampaignRolloutStrategy;
  waveCount: number;
  waves: Array<{
    waveNumber: number;
    scheduledAt: Date;
    employeeCount: number;
  }>;
}

/**
 * Blackout date input for creating or updating blackout periods.
 */
export interface BlackoutDateInput {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  affectsLocations?: string[];
  isRecurring?: boolean;
  recurringPattern?: 'YEARLY' | 'QUARTERLY' | 'MONTHLY';
}

export const CAMPAIGN_QUEUE_NAME = 'campaign';

/**
 * CampaignSchedulingService
 *
 * Handles scheduled campaign launches, wave-based staggered rollout,
 * and blackout date enforcement per RS.53 and RS.54.
 *
 * Features:
 * - Schedule campaigns for future launch dates
 * - Create wave-based staggered rollout configurations
 * - Check and enforce organization blackout periods
 * - Automatically extend deadlines for blackout days
 * - CRUD operations for blackout dates
 */
@Injectable()
export class CampaignSchedulingService {
  private readonly logger = new Logger(CampaignSchedulingService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventEmitter: EventEmitter2,
    @InjectQueue(CAMPAIGN_QUEUE_NAME) private campaignQueue: Queue,
  ) {}

  // ===========================================================================
  // Campaign Scheduling
  // ===========================================================================

  /**
   * Schedule a campaign for future launch.
   * Validates against blackout periods and creates delayed BullMQ job.
   */
  async scheduleLaunch(
    campaignId: string,
    scheduledAt: Date,
    rolloutConfig: RolloutConfig | null,
    userId: string,
    organizationId: string,
  ): Promise<ScheduleDetails> {
    // Validate campaign exists and is in DRAFT status
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot schedule campaign in ${campaign.status} status`,
      );
    }

    // Check if scheduled date falls in a blackout period
    const inBlackout = await this.checkBlackouts(scheduledAt, organizationId);
    if (inBlackout) {
      const nextAvailable = await this.getNextAvailableDate(
        scheduledAt,
        organizationId,
      );
      throw new BadRequestException(
        `Scheduled date ${scheduledAt.toISOString()} falls within a blackout period. ` +
          `Next available date: ${nextAvailable.toISOString()}`,
      );
    }

    // Determine rollout strategy
    const rolloutStrategy = rolloutConfig
      ? rolloutConfig.type === 'percentage'
        ? CampaignRolloutStrategy.STAGGERED
        : CampaignRolloutStrategy.STAGGERED
      : CampaignRolloutStrategy.IMMEDIATE;

    // Update campaign with schedule
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SCHEDULED,
        launchAt: scheduledAt,
        rolloutStrategy,
        rolloutConfig: rolloutConfig as unknown as Prisma.InputJsonValue,
        updatedById: userId,
      },
    });

    // Create waves if staggered rollout
    let waves: CampaignWave[] = [];
    if (rolloutConfig && rolloutStrategy !== CampaignRolloutStrategy.IMMEDIATE) {
      waves = await this.createWavesFromConfig(
        campaignId,
        rolloutConfig,
        scheduledAt,
        organizationId,
      );
    }

    // Calculate delay until scheduled time
    const delay = scheduledAt.getTime() - Date.now();
    if (delay <= 0) {
      throw new BadRequestException(
        'Scheduled time must be in the future',
      );
    }

    // Create delayed BullMQ job
    await this.campaignQueue.add(
      'launch-campaign',
      {
        campaignId,
        organizationId,
        userId,
      },
      {
        delay,
        jobId: `launch-campaign-${campaignId}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    // Log audit
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: campaignId,
      action: 'scheduled',
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Scheduled campaign "${campaign.name}" for ${scheduledAt.toISOString()}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    // Emit event
    this.eventEmitter.emit('campaign.scheduled', {
      organizationId,
      campaignId,
      scheduledAt,
      rolloutStrategy,
      waveCount: waves.length || 1,
    });

    this.logger.log(
      `Campaign ${campaignId} scheduled for ${scheduledAt.toISOString()} with ${rolloutStrategy} rollout`,
    );

    return {
      campaignId,
      scheduledAt,
      rolloutStrategy,
      waveCount: waves.length || 1,
      waves: waves.map((w) => ({
        waveNumber: w.waveNumber,
        scheduledAt: w.scheduledAt,
        employeeCount: w.employeeIds.length,
      })),
    };
  }

  /**
   * Cancel a scheduled campaign launch.
   */
  async cancelScheduledLaunch(
    campaignId: string,
    userId: string,
    organizationId: string,
    reason?: string,
  ): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException(
        'Only scheduled campaigns can have their launch cancelled',
      );
    }

    // Remove the BullMQ job
    const job = await this.campaignQueue.getJob(`launch-campaign-${campaignId}`);
    if (job) {
      await job.remove();
    }

    // Cancel any pending waves
    await this.prisma.campaignWave.updateMany({
      where: {
        campaignId,
        status: CampaignWaveStatus.PENDING,
      },
      data: {
        status: CampaignWaveStatus.CANCELLED,
      },
    });

    // Update campaign back to DRAFT
    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.DRAFT,
        launchAt: null,
        statusNote: reason,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: campaignId,
      action: 'schedule_cancelled',
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Cancelled scheduled launch for campaign "${campaign.name}"${reason ? `: ${reason}` : ''}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return updated;
  }

  // ===========================================================================
  // Wave Management
  // ===========================================================================

  /**
   * Create waves based on rollout configuration.
   * Distributes employees across waves according to percentages.
   */
  private async createWavesFromConfig(
    campaignId: string,
    config: RolloutConfig,
    startDate: Date,
    organizationId: string,
  ): Promise<CampaignWave[]> {
    const waveDayGap = config.waveDayGap ?? 1;
    const waves: CampaignWave[] = [];

    for (let i = 0; i < config.values.length; i++) {
      const waveScheduledAt = new Date(startDate);
      waveScheduledAt.setDate(waveScheduledAt.getDate() + i * waveDayGap);

      // Skip blackout dates
      const adjustedDate = await this.getNextAvailableDate(
        waveScheduledAt,
        organizationId,
      );

      const wave = await this.prisma.campaignWave.create({
        data: {
          organizationId,
          campaignId,
          waveNumber: i + 1,
          scheduledAt: adjustedDate,
          audiencePercentage:
            config.type === 'percentage' ? config.values[i] : null,
          employeeIds: [], // Populated at launch time
          status: CampaignWaveStatus.PENDING,
        },
      });

      waves.push(wave);
    }

    this.logger.log(
      `Created ${waves.length} waves for campaign ${campaignId}`,
    );

    return waves;
  }

  /**
   * Create waves for a campaign with explicit employee assignments.
   * Used when you want to control exactly which employees are in each wave.
   */
  async createWaves(
    campaignId: string,
    config: RolloutConfig,
    employeeIds: string[],
    organizationId: string,
  ): Promise<CampaignWave[]> {
    // Verify campaign exists
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    const startDate = config.startDate
      ? new Date(config.startDate)
      : new Date();
    const waveDayGap = config.waveDayGap ?? 1;
    const waves: CampaignWave[] = [];

    // Distribute employees across waves
    const employeesPerWave = this.distributeEmployees(
      employeeIds,
      config.values,
      config.type,
    );

    for (let i = 0; i < config.values.length; i++) {
      const waveScheduledAt = new Date(startDate);
      waveScheduledAt.setDate(waveScheduledAt.getDate() + i * waveDayGap);

      // Adjust for blackouts
      const adjustedDate = await this.getNextAvailableDate(
        waveScheduledAt,
        organizationId,
      );

      const wave = await this.prisma.campaignWave.create({
        data: {
          organizationId,
          campaignId,
          waveNumber: i + 1,
          scheduledAt: adjustedDate,
          audiencePercentage:
            config.type === 'percentage' ? config.values[i] : null,
          employeeIds: employeesPerWave[i],
          status: CampaignWaveStatus.PENDING,
        },
      });

      waves.push(wave);

      // Emit event for each wave
      this.eventEmitter.emit('campaign.wave.scheduled', {
        organizationId,
        campaignId,
        waveNumber: i + 1,
        scheduledAt: adjustedDate,
        employeeCount: employeesPerWave[i].length,
      });
    }

    return waves;
  }

  /**
   * Distribute employees across waves based on configuration.
   */
  private distributeEmployees(
    employeeIds: string[],
    values: number[],
    type: 'percentage' | 'daily_count',
  ): string[][] {
    const result: string[][] = [];
    const shuffled = [...employeeIds].sort(() => Math.random() - 0.5);
    let remaining = [...shuffled];

    if (type === 'percentage') {
      // Distribute by percentage
      for (let i = 0; i < values.length; i++) {
        const percentage = values[i];
        const count = Math.round((percentage / 100) * employeeIds.length);

        if (i === values.length - 1) {
          // Last wave gets all remaining
          result.push(remaining);
        } else {
          result.push(remaining.slice(0, count));
          remaining = remaining.slice(count);
        }
      }
    } else {
      // Distribute by daily count
      for (let i = 0; i < values.length; i++) {
        const count = values[i];

        if (i === values.length - 1) {
          result.push(remaining);
        } else {
          result.push(remaining.slice(0, count));
          remaining = remaining.slice(count);
        }
      }
    }

    return result;
  }

  /**
   * Get waves for a campaign.
   */
  async getWaves(
    campaignId: string,
    organizationId: string,
  ): Promise<CampaignWave[]> {
    return this.prisma.campaignWave.findMany({
      where: { campaignId, organizationId },
      orderBy: { waveNumber: 'asc' },
    });
  }

  // ===========================================================================
  // Blackout Date Management
  // ===========================================================================

  /**
   * Check if a date falls within any active blackout period.
   */
  async checkBlackouts(
    date: Date,
    organizationId: string,
    locationId?: string,
  ): Promise<boolean> {
    const blackouts = await this.getActiveBlackouts(organizationId);

    for (const blackout of blackouts) {
      if (this.isDateInBlackout(date, blackout, locationId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the next available date that's not in a blackout period.
   */
  async getNextAvailableDate(
    fromDate: Date,
    organizationId: string,
    locationId?: string,
  ): Promise<Date> {
    const blackouts = await this.getActiveBlackouts(organizationId);
    let currentDate = new Date(fromDate);
    let attempts = 0;
    const maxAttempts = 365; // Prevent infinite loop

    while (attempts < maxAttempts) {
      let inBlackout = false;

      for (const blackout of blackouts) {
        if (this.isDateInBlackout(currentDate, blackout, locationId)) {
          inBlackout = true;
          // Move to day after blackout end
          currentDate = new Date(blackout.endDate);
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        }
      }

      if (!inBlackout) {
        return currentDate;
      }

      attempts++;
    }

    // If we exhausted attempts, just return the date as-is
    this.logger.warn(
      `Could not find available date after ${maxAttempts} attempts for org ${organizationId}`,
    );
    return fromDate;
  }

  /**
   * Check if a specific date falls within a blackout (handles recurring).
   */
  private isDateInBlackout(
    date: Date,
    blackout: OrgBlackoutDate,
    locationId?: string,
  ): boolean {
    // Check location scope
    if (
      blackout.affectsLocations.length > 0 &&
      locationId &&
      !blackout.affectsLocations.includes(locationId)
    ) {
      return false;
    }

    // For non-recurring blackouts, simple date range check
    if (!blackout.isRecurring) {
      return date >= blackout.startDate && date <= blackout.endDate;
    }

    // For recurring blackouts, check if the date falls within the recurring pattern
    const dateMonth = date.getMonth();
    const dateDay = date.getDate();
    const startMonth = blackout.startDate.getMonth();
    const startDay = blackout.startDate.getDate();
    const endMonth = blackout.endDate.getMonth();
    const endDay = blackout.endDate.getDate();

    switch (blackout.recurringPattern) {
      case 'YEARLY':
        // Check if month/day falls within the recurring annual range
        if (startMonth === endMonth) {
          return (
            dateMonth === startMonth && dateDay >= startDay && dateDay <= endDay
          );
        } else if (startMonth < endMonth) {
          // Same year range
          return (
            (dateMonth === startMonth && dateDay >= startDay) ||
            (dateMonth > startMonth && dateMonth < endMonth) ||
            (dateMonth === endMonth && dateDay <= endDay)
          );
        } else {
          // Crosses year boundary (e.g., Dec 15 - Jan 5)
          return (
            (dateMonth === startMonth && dateDay >= startDay) ||
            dateMonth > startMonth ||
            dateMonth < endMonth ||
            (dateMonth === endMonth && dateDay <= endDay)
          );
        }

      case 'QUARTERLY':
        // Check if within the same offset from any quarter start
        const quarterOffset = date.getMonth() % 3;
        const startOffset = blackout.startDate.getMonth() % 3;
        const endOffset = blackout.endDate.getMonth() % 3;

        if (quarterOffset === startOffset && dateDay >= startDay) return true;
        if (quarterOffset === endOffset && dateDay <= endDay) return true;
        if (quarterOffset > startOffset && quarterOffset < endOffset) return true;
        return false;

      case 'MONTHLY':
        // Check if day falls within the range each month
        return dateDay >= startDay && dateDay <= endDay;

      default:
        return false;
    }
  }

  /**
   * Extend campaign deadlines by the number of blackout days.
   */
  async extendDeadlines(
    campaignId: string,
    blackoutDays: number,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    const newDueDate = new Date(campaign.dueDate);
    newDueDate.setDate(newDueDate.getDate() + blackoutDays);

    const newExpiresAt = campaign.expiresAt
      ? new Date(campaign.expiresAt)
      : null;
    if (newExpiresAt) {
      newExpiresAt.setDate(newExpiresAt.getDate() + blackoutDays);
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        dueDate: newDueDate,
        expiresAt: newExpiresAt,
        updatedById: userId,
      },
    });

    // Also update assignment due dates
    await this.prisma.campaignAssignment.updateMany({
      where: { campaignId, organizationId },
      data: {
        dueDate: newDueDate,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: campaignId,
      action: 'deadline_extended',
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Extended deadlines for campaign "${campaign.name}" by ${blackoutDays} days due to blackout period`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return updated;
  }

  /**
   * Get all active blackouts for an organization.
   */
  private async getActiveBlackouts(
    organizationId: string,
  ): Promise<OrgBlackoutDate[]> {
    return this.prisma.orgBlackoutDate.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  // ===========================================================================
  // Blackout CRUD Operations
  // ===========================================================================

  /**
   * Create a new blackout date.
   */
  async createBlackout(
    input: BlackoutDateInput,
    userId: string,
    organizationId: string,
  ): Promise<OrgBlackoutDate> {
    if (input.startDate >= input.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const blackout = await this.prisma.orgBlackoutDate.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        affectsLocations: input.affectsLocations ?? [],
        isRecurring: input.isRecurring ?? false,
        recurringPattern: input.recurringPattern,
        createdById: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: 'ORGANIZATION' as AuditEntityType,
      entityId: organizationId,
      action: 'blackout_created',
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Created blackout period "${input.name}" from ${input.startDate.toISOString()} to ${input.endDate.toISOString()}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.logger.log(`Created blackout ${blackout.id} for org ${organizationId}`);

    return blackout;
  }

  /**
   * Update an existing blackout date.
   */
  async updateBlackout(
    blackoutId: string,
    input: Partial<BlackoutDateInput>,
    userId: string,
    organizationId: string,
  ): Promise<OrgBlackoutDate> {
    const existing = await this.prisma.orgBlackoutDate.findFirst({
      where: { id: blackoutId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Blackout with ID ${blackoutId} not found`);
    }

    if (input.startDate && input.endDate && input.startDate >= input.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const updated = await this.prisma.orgBlackoutDate.update({
      where: { id: blackoutId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.startDate !== undefined && { startDate: input.startDate }),
        ...(input.endDate !== undefined && { endDate: input.endDate }),
        ...(input.affectsLocations !== undefined && {
          affectsLocations: input.affectsLocations,
        }),
        ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring }),
        ...(input.recurringPattern !== undefined && {
          recurringPattern: input.recurringPattern,
        }),
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: 'ORGANIZATION' as AuditEntityType,
      entityId: organizationId,
      action: 'blackout_updated',
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Updated blackout period "${updated.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return updated;
  }

  /**
   * Delete (soft-delete) a blackout date.
   */
  async deleteBlackout(
    blackoutId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const existing = await this.prisma.orgBlackoutDate.findFirst({
      where: { id: blackoutId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Blackout with ID ${blackoutId} not found`);
    }

    await this.prisma.orgBlackoutDate.update({
      where: { id: blackoutId },
      data: { isActive: false },
    });

    await this.auditService.log({
      organizationId,
      entityType: 'ORGANIZATION' as AuditEntityType,
      entityId: organizationId,
      action: 'blackout_deleted',
      actionCategory: AuditActionCategory.DELETE,
      actionDescription: `Deleted blackout period "${existing.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.logger.log(
      `Soft-deleted blackout ${blackoutId} for org ${organizationId}`,
    );
  }

  /**
   * List all blackout dates for an organization.
   */
  async listBlackouts(
    organizationId: string,
    options?: { includeInactive?: boolean },
  ): Promise<OrgBlackoutDate[]> {
    return this.prisma.orgBlackoutDate.findMany({
      where: {
        organizationId,
        ...(options?.includeInactive ? {} : { isActive: true }),
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Get a single blackout by ID.
   */
  async getBlackout(
    blackoutId: string,
    organizationId: string,
  ): Promise<OrgBlackoutDate> {
    const blackout = await this.prisma.orgBlackoutDate.findFirst({
      where: { id: blackoutId, organizationId },
    });

    if (!blackout) {
      throw new NotFoundException(`Blackout with ID ${blackoutId} not found`);
    }

    return blackout;
  }
}
