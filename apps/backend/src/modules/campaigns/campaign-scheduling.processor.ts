import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignsService } from './campaigns.service';
import { CampaignSchedulingService, CAMPAIGN_QUEUE_NAME } from './campaign-scheduling.service';
import {
  CampaignStatus,
  CampaignWaveStatus,
  CampaignRolloutStrategy,
} from '@prisma/client';

/**
 * Job data for launching a campaign.
 */
interface LaunchCampaignJobData {
  campaignId: string;
  organizationId: string;
  userId?: string;
  waveNumber?: number;
}

/**
 * Job data for launching a specific wave.
 */
interface LaunchWaveJobData {
  campaignId: string;
  organizationId: string;
  waveNumber: number;
}

/**
 * CampaignSchedulingProcessor
 *
 * BullMQ processor for handling scheduled campaign launches and wave execution.
 * Processes jobs from the 'campaign' queue.
 *
 * Job types:
 * - 'launch-campaign': Launches a scheduled campaign (IMMEDIATE or first wave of STAGGERED)
 * - 'launch-wave': Launches a specific wave within a staggered campaign
 */
@Processor(CAMPAIGN_QUEUE_NAME, { concurrency: 3 })
export class CampaignSchedulingProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignSchedulingProcessor.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => CampaignsService))
    private campaignsService: CampaignsService,
    @Inject(forwardRef(() => CampaignSchedulingService))
    private schedulingService: CampaignSchedulingService,
    private eventEmitter: EventEmitter2,
    @InjectQueue(CAMPAIGN_QUEUE_NAME) private campaignQueue: Queue,
  ) {
    super();
  }

  /**
   * Process incoming jobs from the campaign queue.
   */
  async process(job: Job<LaunchCampaignJobData | LaunchWaveJobData>): Promise<unknown> {
    this.logger.log(
      `Processing job ${job.id}: ${job.name} for campaign ${job.data.campaignId}`,
    );

    switch (job.name) {
      case 'launch-campaign':
        return this.handleLaunch(job as Job<LaunchCampaignJobData>);
      case 'launch-wave':
        return this.handleWaveLaunch(job as Job<LaunchWaveJobData>);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        throw new Error(`Unknown campaign job type: ${job.name}`);
    }
  }

  /**
   * Handle campaign launch job.
   * For IMMEDIATE rollout: creates all assignments at once.
   * For STAGGERED/PILOT_FIRST: launches first wave only and queues subsequent waves.
   */
  private async handleLaunch(job: Job<LaunchCampaignJobData>): Promise<{
    status: string;
    assignmentCount?: number;
    wavesQueued?: number;
  }> {
    const { campaignId, organizationId, userId } = job.data;

    // Get campaign with waves
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        waves: {
          orderBy: { waveNumber: 'asc' },
        },
      },
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Verify campaign is in SCHEDULED status
    if (campaign.status !== CampaignStatus.SCHEDULED) {
      this.logger.warn(
        `Campaign ${campaignId} is not in SCHEDULED status (current: ${campaign.status})`,
      );
      return { status: 'skipped', assignmentCount: 0 };
    }

    // Check rollout strategy
    if (campaign.rolloutStrategy === CampaignRolloutStrategy.IMMEDIATE) {
      // IMMEDIATE: Launch directly via CampaignsService
      const updated = await this.campaignsService.launch(
        campaignId,
        {},
        userId || 'system',
        organizationId,
      );

      this.eventEmitter.emit('campaign.launched', {
        organizationId,
        campaignId,
        strategy: 'IMMEDIATE',
        totalAssignments: updated.totalAssignments,
      });

      this.logger.log(
        `Campaign ${campaignId} launched immediately with ${updated.totalAssignments} assignments`,
      );

      return {
        status: 'launched',
        assignmentCount: updated.totalAssignments,
      };
    }

    // STAGGERED or PILOT_FIRST: Launch first wave
    const waves = campaign.waves;
    if (waves.length === 0) {
      this.logger.warn(`Campaign ${campaignId} has no waves configured`);
      // Fall back to immediate launch
      const updated = await this.campaignsService.launch(
        campaignId,
        {},
        userId || 'system',
        organizationId,
      );
      return {
        status: 'launched',
        assignmentCount: updated.totalAssignments,
      };
    }

    // Update campaign to ACTIVE
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.ACTIVE,
        launchedAt: new Date(),
        launchedById: userId || null,
      },
    });

    // Launch first wave
    const firstWave = waves[0];
    await this.launchWave(campaignId, firstWave.waveNumber, organizationId);

    // Queue remaining waves
    let wavesQueued = 0;
    for (let i = 1; i < waves.length; i++) {
      const wave = waves[i];
      const delay = wave.scheduledAt.getTime() - Date.now();

      if (delay > 0) {
        await this.campaignQueue.add(
          'launch-wave',
          {
            campaignId,
            organizationId,
            waveNumber: wave.waveNumber,
          },
          {
            delay,
            jobId: `launch-wave-${campaignId}-${wave.waveNumber}`,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        wavesQueued++;
      } else {
        // Wave is past due, launch immediately
        await this.launchWave(campaignId, wave.waveNumber, organizationId);
      }
    }

    this.eventEmitter.emit('campaign.launched', {
      organizationId,
      campaignId,
      strategy: campaign.rolloutStrategy,
      wavesTotal: waves.length,
      wavesQueued,
    });

    this.logger.log(
      `Campaign ${campaignId} launched with staggered rollout. First wave launched, ${wavesQueued} waves queued.`,
    );

    return {
      status: 'launched',
      wavesQueued,
    };
  }

  /**
   * Handle wave launch job.
   * Creates assignments for employees in this wave.
   */
  private async handleWaveLaunch(job: Job<LaunchWaveJobData>): Promise<{
    status: string;
    assignmentCount: number;
  }> {
    const { campaignId, organizationId, waveNumber } = job.data;

    const result = await this.launchWave(campaignId, waveNumber, organizationId);

    return {
      status: 'launched',
      assignmentCount: result.assignmentCount,
    };
  }

  /**
   * Launch a specific wave by creating assignments for its employees.
   */
  private async launchWave(
    campaignId: string,
    waveNumber: number,
    organizationId: string,
  ): Promise<{ assignmentCount: number }> {
    // Get wave
    const wave = await this.prisma.campaignWave.findFirst({
      where: { campaignId, waveNumber, organizationId },
    });

    if (!wave) {
      throw new Error(`Wave ${waveNumber} not found for campaign ${campaignId}`);
    }

    if (wave.status !== CampaignWaveStatus.PENDING) {
      this.logger.warn(
        `Wave ${waveNumber} for campaign ${campaignId} is not PENDING (current: ${wave.status})`,
      );
      return { assignmentCount: 0 };
    }

    // Get campaign for due date
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Get employee IDs for this wave
    let employeeIds = wave.employeeIds;

    // If no explicit employee IDs, calculate based on percentage
    if (employeeIds.length === 0 && wave.audiencePercentage) {
      employeeIds = await this.calculateWaveEmployees(
        campaignId,
        waveNumber,
        wave.audiencePercentage,
        organizationId,
      );
    }

    if (employeeIds.length === 0) {
      this.logger.warn(
        `No employees to assign for wave ${waveNumber} of campaign ${campaignId}`,
      );

      // Mark wave as launched anyway
      await this.prisma.campaignWave.update({
        where: { id: wave.id },
        data: {
          status: CampaignWaveStatus.LAUNCHED,
          launchedAt: new Date(),
        },
      });

      return { assignmentCount: 0 };
    }

    // Get employee snapshots
    // Employee has denormalized fields: department, location, managerName as strings
    // Plus relations: manager (Employee), locationAssignment (Location), teamAssignment (Team)
    const employees = await this.prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        organizationId,
      },
      include: {
        manager: true, // Self-reference to manager Employee
      },
    });

    // Create assignments
    const assignments = await Promise.all(
      employees.map(async (employee) => {
        const snapshot = {
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          jobTitle: employee.jobTitle,
          department: employee.department, // Already a denormalized string
          businessUnit: employee.businessUnitId, // Store ID if needed
          location: employee.location, // Already a denormalized string
          manager: employee.manager
            ? `${employee.manager.firstName} ${employee.manager.lastName}`
            : employee.managerName, // Fallback to denormalized name
        };

        return this.prisma.campaignAssignment.create({
          data: {
            organizationId,
            campaignId,
            employeeId: employee.id,
            waveId: wave.id,
            dueDate: campaign.dueDate,
            employeeSnapshot: snapshot,
          },
        });
      }),
    );

    // Update wave status
    await this.prisma.campaignWave.update({
      where: { id: wave.id },
      data: {
        status: CampaignWaveStatus.LAUNCHED,
        launchedAt: new Date(),
        employeeIds, // Store for reference
      },
    });

    // Update campaign statistics
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        totalAssignments: {
          increment: assignments.length,
        },
      },
    });

    // Emit event
    this.eventEmitter.emit('campaign.wave.launched', {
      organizationId,
      campaignId,
      waveNumber,
      assignmentCount: assignments.length,
    });

    this.logger.log(
      `Wave ${waveNumber} of campaign ${campaignId} launched with ${assignments.length} assignments`,
    );

    return { assignmentCount: assignments.length };
  }

  /**
   * Calculate which employees belong to this wave based on percentage.
   * Excludes employees already assigned in previous waves.
   */
  private async calculateWaveEmployees(
    campaignId: string,
    waveNumber: number,
    percentage: number,
    organizationId: string,
  ): Promise<string[]> {
    // Get campaign to determine audience
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) return [];

    // Get all target employees based on audience mode
    let allEmployeeIds: string[] = [];

    switch (campaign.audienceMode) {
      case 'SEGMENT':
        // This would need segment evaluation - simplified for now
        const employees = await this.prisma.employee.findMany({
          where: { organizationId, employmentStatus: 'ACTIVE' },
          select: { id: true },
        });
        allEmployeeIds = employees.map((e) => e.id);
        break;

      case 'MANUAL':
        allEmployeeIds = campaign.manualIds;
        break;

      case 'ALL':
        const allActive = await this.prisma.employee.findMany({
          where: { organizationId, employmentStatus: 'ACTIVE' },
          select: { id: true },
        });
        allEmployeeIds = allActive.map((e) => e.id);
        break;
    }

    // Get employees already assigned in previous waves
    const existingAssignments = await this.prisma.campaignAssignment.findMany({
      where: { campaignId, organizationId },
      select: { employeeId: true },
    });
    const assignedIds = new Set(existingAssignments.map((a) => a.employeeId));

    // Filter out already assigned
    const availableIds = allEmployeeIds.filter((id) => !assignedIds.has(id));

    // Calculate count for this wave
    const count = Math.round((percentage / 100) * allEmployeeIds.length);

    // Shuffle and take count
    const shuffled = [...availableIds].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // ===========================================================================
  // Worker Events
  // ===========================================================================

  @OnWorkerEvent('completed')
  onCompleted(job: Job<LaunchCampaignJobData | LaunchWaveJobData>) {
    this.logger.log(
      `Campaign job ${job.id} (${job.name}) completed successfully`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(
    job: Job<LaunchCampaignJobData | LaunchWaveJobData>,
    error: Error,
  ) {
    this.logger.error(
      `Campaign job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`,
    );

    // Emit failure event for monitoring
    this.eventEmitter.emit('campaign.launch.failed', {
      jobId: job.id,
      jobName: job.name,
      campaignId: job.data.campaignId,
      organizationId: job.data.organizationId,
      error: error.message,
      attempts: job.attemptsMade,
    });
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Campaign job ${jobId} stalled`);
  }
}
