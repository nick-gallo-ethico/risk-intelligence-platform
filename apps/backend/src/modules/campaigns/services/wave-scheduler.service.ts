import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import {
  Campaign,
  CampaignWave,
  CampaignWaveStatus,
  CampaignRolloutStrategy,
  CampaignStatus,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  Prisma,
} from "@prisma/client";
import { BlackoutManagerService } from "./blackout-manager.service";

export const CAMPAIGN_QUEUE_NAME = "campaign";

/**
 * Rollout configuration for staggered campaigns.
 */
export interface RolloutConfig {
  type: "percentage" | "daily_count";
  values: number[];
  startDate?: string;
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
 * WaveSchedulerService
 *
 * Handles campaign wave scheduling and distribution:
 * - Schedule campaigns for future launch
 * - Create wave-based staggered rollouts
 * - Distribute employees across waves
 * - Manage wave lifecycle
 */
@Injectable()
export class WaveSchedulerService {
  private readonly logger = new Logger(WaveSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly blackoutManager: BlackoutManagerService,
    @InjectQueue(CAMPAIGN_QUEUE_NAME) private readonly campaignQueue: Queue,
  ) {}

  /**
   * Schedule a campaign for future launch.
   */
  async scheduleLaunch(
    campaignId: string,
    scheduledAt: Date,
    rolloutConfig: RolloutConfig | null,
    userId: string,
    organizationId: string,
  ): Promise<ScheduleDetails> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(`Cannot schedule campaign in ${campaign.status} status`);
    }

    // Check blackouts
    const inBlackout = await this.blackoutManager.checkBlackouts(scheduledAt, organizationId);
    if (inBlackout) {
      const nextAvailable = await this.blackoutManager.getNextAvailableDate(scheduledAt, organizationId);
      throw new BadRequestException(
        `Scheduled date ${scheduledAt.toISOString()} falls within a blackout period. Next available: ${nextAvailable.toISOString()}`,
      );
    }

    const rolloutStrategy = rolloutConfig ? CampaignRolloutStrategy.STAGGERED : CampaignRolloutStrategy.IMMEDIATE;

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

    let waves: CampaignWave[] = [];
    if (rolloutConfig && rolloutStrategy !== CampaignRolloutStrategy.IMMEDIATE) {
      waves = await this.createWavesFromConfig(campaignId, rolloutConfig, scheduledAt, organizationId);
    }

    const delay = scheduledAt.getTime() - Date.now();
    if (delay <= 0) {
      throw new BadRequestException("Scheduled time must be in the future");
    }

    await this.campaignQueue.add(
      "launch-campaign",
      { campaignId, organizationId, userId },
      { delay, jobId: `launch-campaign-${campaignId}`, removeOnComplete: true, removeOnFail: false },
    );

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: campaignId,
      action: "scheduled",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Scheduled campaign "${campaign.name}" for ${scheduledAt.toISOString()}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.eventEmitter.emit("campaign.scheduled", {
      organizationId, campaignId, scheduledAt, rolloutStrategy, waveCount: waves.length || 1,
    });

    this.logger.log(`Campaign ${campaignId} scheduled for ${scheduledAt.toISOString()} with ${rolloutStrategy} rollout`);

    return {
      campaignId, scheduledAt, rolloutStrategy, waveCount: waves.length || 1,
      waves: waves.map((w) => ({ waveNumber: w.waveNumber, scheduledAt: w.scheduledAt, employeeCount: w.employeeIds.length })),
    };
  }

  /**
   * Cancel a scheduled campaign launch.
   */
  async cancelScheduledLaunch(campaignId: string, userId: string, organizationId: string, reason?: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({ where: { id: campaignId, organizationId } });
    if (!campaign) throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    if (campaign.status !== CampaignStatus.SCHEDULED) throw new BadRequestException("Only scheduled campaigns can have their launch cancelled");

    const job = await this.campaignQueue.getJob(`launch-campaign-${campaignId}`);
    if (job) await job.remove();

    await this.prisma.campaignWave.updateMany({
      where: { campaignId, status: CampaignWaveStatus.PENDING },
      data: { status: CampaignWaveStatus.CANCELLED },
    });

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.DRAFT, launchAt: null, statusNote: reason, updatedById: userId },
    });

    await this.auditService.log({
      organizationId, entityType: AuditEntityType.CAMPAIGN, entityId: campaignId,
      action: "schedule_cancelled", actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Cancelled scheduled launch for campaign "${campaign.name}"${reason ? `: ${reason}` : ""}`,
      actorUserId: userId, actorType: ActorType.USER,
    });

    return updated;
  }

  /**
   * Create waves from config (internal use during scheduling).
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

      const adjustedDate = await this.blackoutManager.getNextAvailableDate(waveScheduledAt, organizationId);

      const wave = await this.prisma.campaignWave.create({
        data: {
          organizationId, campaignId, waveNumber: i + 1, scheduledAt: adjustedDate,
          audiencePercentage: config.type === "percentage" ? config.values[i] : null,
          employeeIds: [], status: CampaignWaveStatus.PENDING,
        },
      });

      waves.push(wave);
    }

    this.logger.log(`Created ${waves.length} waves for campaign ${campaignId}`);
    return waves;
  }

  /**
   * Create waves with explicit employee assignments.
   */
  async createWaves(campaignId: string, config: RolloutConfig, employeeIds: string[], organizationId: string): Promise<CampaignWave[]> {
    const campaign = await this.prisma.campaign.findFirst({ where: { id: campaignId, organizationId } });
    if (!campaign) throw new NotFoundException(`Campaign with ID ${campaignId} not found`);

    const startDate = config.startDate ? new Date(config.startDate) : new Date();
    const waveDayGap = config.waveDayGap ?? 1;
    const waves: CampaignWave[] = [];
    const employeesPerWave = this.distributeEmployees(employeeIds, config.values, config.type);

    for (let i = 0; i < config.values.length; i++) {
      const waveScheduledAt = new Date(startDate);
      waveScheduledAt.setDate(waveScheduledAt.getDate() + i * waveDayGap);
      const adjustedDate = await this.blackoutManager.getNextAvailableDate(waveScheduledAt, organizationId);

      const wave = await this.prisma.campaignWave.create({
        data: {
          organizationId, campaignId, waveNumber: i + 1, scheduledAt: adjustedDate,
          audiencePercentage: config.type === "percentage" ? config.values[i] : null,
          employeeIds: employeesPerWave[i], status: CampaignWaveStatus.PENDING,
        },
      });

      waves.push(wave);
      this.eventEmitter.emit("campaign.wave.scheduled", {
        organizationId, campaignId, waveNumber: i + 1, scheduledAt: adjustedDate, employeeCount: employeesPerWave[i].length,
      });
    }

    return waves;
  }

  /**
   * Distribute employees across waves.
   */
  private distributeEmployees(employeeIds: string[], values: number[], type: "percentage" | "daily_count"): string[][] {
    const result: string[][] = [];
    const shuffled = [...employeeIds].sort(() => Math.random() - 0.5);
    let remaining = [...shuffled];

    if (type === "percentage") {
      for (let i = 0; i < values.length; i++) {
        const percentage = values[i];
        const count = Math.round((percentage / 100) * employeeIds.length);
        if (i === values.length - 1) {
          result.push(remaining);
        } else {
          result.push(remaining.slice(0, count));
          remaining = remaining.slice(count);
        }
      }
    } else {
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
  async getWaves(campaignId: string, organizationId: string): Promise<CampaignWave[]> {
    return this.prisma.campaignWave.findMany({
      where: { campaignId, organizationId },
      orderBy: { waveNumber: "asc" },
    });
  }

  /**
   * Extend campaign deadlines by blackout days.
   */
  async extendDeadlines(campaignId: string, blackoutDays: number, userId: string, organizationId: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({ where: { id: campaignId, organizationId } });
    if (!campaign) throw new NotFoundException(`Campaign with ID ${campaignId} not found`);

    const newDueDate = new Date(campaign.dueDate);
    newDueDate.setDate(newDueDate.getDate() + blackoutDays);

    const newExpiresAt = campaign.expiresAt ? new Date(campaign.expiresAt) : null;
    if (newExpiresAt) newExpiresAt.setDate(newExpiresAt.getDate() + blackoutDays);

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { dueDate: newDueDate, expiresAt: newExpiresAt, updatedById: userId },
    });

    await this.prisma.campaignAssignment.updateMany({
      where: { campaignId, organizationId },
      data: { dueDate: newDueDate },
    });

    await this.auditService.log({
      organizationId, entityType: AuditEntityType.CAMPAIGN, entityId: campaignId,
      action: "deadline_extended", actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Extended deadlines for campaign "${campaign.name}" by ${blackoutDays} days due to blackout period`,
      actorUserId: userId, actorType: ActorType.USER,
    });

    return updated;
  }
}
