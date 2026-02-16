import { Injectable, Logger } from "@nestjs/common";
import { Campaign, CampaignWave, OrgBlackoutDate } from "@prisma/client";
import {
  WaveSchedulerService,
  RolloutConfig,
  ScheduleDetails,
  CAMPAIGN_QUEUE_NAME,
} from "./services/wave-scheduler.service";
import {
  BlackoutManagerService,
  BlackoutDateInput,
} from "./services/blackout-manager.service";

// Re-export types and constants for backward compatibility
export { RolloutConfig, ScheduleDetails, CAMPAIGN_QUEUE_NAME } from "./services/wave-scheduler.service";
export { BlackoutDateInput } from "./services/blackout-manager.service";

/**
 * CampaignSchedulingService - Thin Coordinator
 *
 * Coordinates WaveSchedulerService and BlackoutManagerService.
 * Handles scheduled campaign launches, wave-based rollout, and blackout enforcement.
 */
@Injectable()
export class CampaignSchedulingService {
  private readonly logger = new Logger(CampaignSchedulingService.name);

  constructor(
    private readonly waveScheduler: WaveSchedulerService,
    private readonly blackoutManager: BlackoutManagerService,
  ) {}

  // Campaign Scheduling (delegated to WaveSchedulerService)

  async scheduleLaunch(
    campaignId: string,
    scheduledAt: Date,
    rolloutConfig: RolloutConfig | null,
    userId: string,
    organizationId: string,
  ): Promise<ScheduleDetails> {
    return this.waveScheduler.scheduleLaunch(campaignId, scheduledAt, rolloutConfig, userId, organizationId);
  }

  async cancelScheduledLaunch(
    campaignId: string,
    userId: string,
    organizationId: string,
    reason?: string,
  ): Promise<Campaign> {
    return this.waveScheduler.cancelScheduledLaunch(campaignId, userId, organizationId, reason);
  }

  // Wave Management (delegated to WaveSchedulerService)

  async createWaves(
    campaignId: string,
    config: RolloutConfig,
    employeeIds: string[],
    organizationId: string,
  ): Promise<CampaignWave[]> {
    return this.waveScheduler.createWaves(campaignId, config, employeeIds, organizationId);
  }

  async getWaves(campaignId: string, organizationId: string): Promise<CampaignWave[]> {
    return this.waveScheduler.getWaves(campaignId, organizationId);
  }

  async extendDeadlines(
    campaignId: string,
    blackoutDays: number,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    return this.waveScheduler.extendDeadlines(campaignId, blackoutDays, userId, organizationId);
  }

  // Blackout Management (delegated to BlackoutManagerService)

  async checkBlackouts(date: Date, organizationId: string, locationId?: string): Promise<boolean> {
    return this.blackoutManager.checkBlackouts(date, organizationId, locationId);
  }

  async getNextAvailableDate(fromDate: Date, organizationId: string, locationId?: string): Promise<Date> {
    return this.blackoutManager.getNextAvailableDate(fromDate, organizationId, locationId);
  }

  async createBlackout(
    input: BlackoutDateInput,
    userId: string,
    organizationId: string,
  ): Promise<OrgBlackoutDate> {
    return this.blackoutManager.createBlackout(input, userId, organizationId);
  }

  async updateBlackout(
    blackoutId: string,
    input: Partial<BlackoutDateInput>,
    userId: string,
    organizationId: string,
  ): Promise<OrgBlackoutDate> {
    return this.blackoutManager.updateBlackout(blackoutId, input, userId, organizationId);
  }

  async deleteBlackout(blackoutId: string, userId: string, organizationId: string): Promise<void> {
    return this.blackoutManager.deleteBlackout(blackoutId, userId, organizationId);
  }

  async listBlackouts(organizationId: string, options?: { includeInactive?: boolean }): Promise<OrgBlackoutDate[]> {
    return this.blackoutManager.listBlackouts(organizationId, options);
  }

  async getBlackout(blackoutId: string, organizationId: string): Promise<OrgBlackoutDate> {
    return this.blackoutManager.getBlackout(blackoutId, organizationId);
  }
}
