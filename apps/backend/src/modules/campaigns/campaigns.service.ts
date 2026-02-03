import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SegmentService } from "./targeting/segment.service";
import { CampaignAssignmentService } from "./assignments/campaign-assignment.service";
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  LaunchCampaignDto,
} from "./dto/create-campaign.dto";
import {
  Campaign,
  CampaignStatus,
  AudienceMode,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  Prisma,
} from "@prisma/client";

export interface CampaignWithCounts extends Campaign {
  _count?: {
    assignments: number;
  };
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private segmentService: SegmentService,
    private assignmentService: CampaignAssignmentService,
  ) {}

  /**
   * Create a new campaign in DRAFT status.
   */
  async create(
    dto: CreateCampaignDto,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    // Validate audience configuration
    this.validateAudienceConfig(dto);

    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        status: CampaignStatus.DRAFT,
        audienceMode: dto.audienceMode,
        segmentId: dto.segmentId,
        manualIds: dto.manualIds ?? [],
        dueDate: new Date(dto.dueDate),
        launchAt: dto.launchAt ? new Date(dto.launchAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        formDefinitionId: dto.formDefinitionId,
        reminderDays: dto.reminderDays ?? [7, 3, 1],
        escalationAfterDays: dto.escalationAfterDays,
        escalateToUserId: dto.escalateToUserId,
        autoCreateCase: dto.autoCreateCase ?? false,
        caseCreationThreshold: dto.caseCreationThreshold as Prisma.InputJsonValue,
        createdById: userId,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: campaign.id,
      action: "created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Created ${dto.type} campaign "${dto.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return campaign;
  }

  /**
   * Find all campaigns for an organization.
   */
  async findAll(
    organizationId: string,
    options?: {
      status?: CampaignStatus;
      type?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<{ campaigns: CampaignWithCounts[]; total: number }> {
    const where: Prisma.CampaignWhereInput = {
      organizationId,
      ...(options?.status && { status: options.status }),
      ...(options?.type && { type: options.type as Prisma.EnumCampaignTypeFilter }),
    };

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: {
          _count: {
            select: { assignments: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: options?.skip,
        take: options?.take,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { campaigns, total };
  }

  /**
   * Find a campaign by ID.
   */
  async findOne(id: string, organizationId: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        segment: true,
        _count: {
          select: { assignments: true },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  /**
   * Update a campaign.
   * Only DRAFT campaigns can have most fields updated.
   */
  async update(
    id: string,
    dto: UpdateCampaignDto,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    const existing = await this.findOne(id, organizationId);

    // Restrict updates based on status
    if (
      existing.status !== CampaignStatus.DRAFT &&
      existing.status !== CampaignStatus.SCHEDULED
    ) {
      // Only allow limited updates for active campaigns
      const allowedFields = ["statusNote", "reminderDays", "escalationAfterDays"];
      const attemptedFields = Object.keys(dto).filter(
        (k) => dto[k as keyof UpdateCampaignDto] !== undefined,
      );
      const disallowed = attemptedFields.filter((f) => !allowedFields.includes(f));

      if (disallowed.length > 0) {
        throw new BadRequestException(
          `Cannot update fields ${disallowed.join(", ")} on ${existing.status} campaign`,
        );
      }
    }

    const updateData: Prisma.CampaignUpdateInput = {
      updatedById: userId,
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.dueDate !== undefined) updateData.dueDate = new Date(dto.dueDate);
    if (dto.expiresAt !== undefined) {
      updateData.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    if (dto.reminderDays !== undefined) updateData.reminderDays = dto.reminderDays;
    if (dto.escalationAfterDays !== undefined) {
      updateData.escalationAfterDays = dto.escalationAfterDays;
    }
    if (dto.escalateToUserId !== undefined) {
      updateData.escalateToUserId = dto.escalateToUserId;
    }
    if (dto.statusNote !== undefined) updateData.statusNote = dto.statusNote;

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: id,
      action: "updated",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Updated campaign "${campaign.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return campaign;
  }

  /**
   * Launch a campaign.
   * Evaluates segment/audience and generates assignments.
   */
  async launch(
    id: string,
    dto: LaunchCampaignDto,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id, organizationId);

    if (
      campaign.status !== CampaignStatus.DRAFT &&
      campaign.status !== CampaignStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        `Cannot launch campaign in ${campaign.status} status`,
      );
    }

    // Get target employee IDs based on audience mode
    const employeeIds = await this.getTargetEmployeeIds(campaign, organizationId);

    if (employeeIds.length === 0) {
      throw new BadRequestException("Campaign has no target employees");
    }

    // Generate assignments
    await this.assignmentService.generateAssignments(
      campaign.id,
      employeeIds,
      campaign.dueDate,
      organizationId,
      userId,
    );

    // Update campaign status
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.ACTIVE,
        launchedAt: new Date(),
        launchedById: userId,
        totalAssignments: employeeIds.length,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: id,
      action: "launched",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Launched campaign "${campaign.name}" with ${employeeIds.length} assignments`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.logger.log(
      `Campaign ${id} launched with ${employeeIds.length} assignments`,
    );

    return updated;
  }

  /**
   * Pause an active campaign.
   */
  async pause(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id, organizationId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException("Only active campaigns can be paused");
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.PAUSED,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: id,
      action: "paused",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Paused campaign "${campaign.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return updated;
  }

  /**
   * Resume a paused campaign.
   */
  async resume(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id, organizationId);

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException("Only paused campaigns can be resumed");
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.ACTIVE,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: id,
      action: "resumed",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Resumed campaign "${campaign.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return updated;
  }

  /**
   * Cancel a campaign.
   */
  async cancel(
    id: string,
    userId: string,
    organizationId: string,
    reason?: string,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id, organizationId);

    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException("Completed campaigns cannot be cancelled");
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.CANCELLED,
        statusNote: reason,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: id,
      action: "cancelled",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Cancelled campaign "${campaign.name}"${reason ? `: ${reason}` : ""}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return updated;
  }

  /**
   * Complete a campaign (typically called by scheduler when all done).
   */
  async complete(
    id: string,
    organizationId: string,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id, organizationId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException("Only active campaigns can be completed");
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.COMPLETED,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: id,
      action: "completed",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Campaign "${campaign.name}" completed`,
      actorUserId: null,
      actorType: ActorType.SYSTEM,
    });

    return updated;
  }

  /**
   * Delete a draft campaign.
   */
  async remove(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const campaign = await this.findOne(id, organizationId);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException("Only draft campaigns can be deleted");
    }

    await this.prisma.campaign.delete({ where: { id } });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.CAMPAIGN,
      entityId: id,
      action: "deleted",
      actionCategory: AuditActionCategory.DELETE,
      actionDescription: `Deleted draft campaign "${campaign.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });
  }

  /**
   * Get campaign statistics.
   */
  async getStatistics(
    id: string,
    organizationId: string,
  ): Promise<{
    total: number;
    completed: number;
    overdue: number;
    pending: number;
    inProgress: number;
    completionPercentage: number;
  }> {
    const campaign = await this.findOne(id, organizationId);

    // Sync overdue status
    await this.assignmentService.syncOverdueStatus(id, organizationId);

    // Refresh campaign to get updated stats
    const refreshed = await this.prisma.campaign.findUnique({ where: { id } });

    return {
      total: refreshed?.totalAssignments ?? 0,
      completed: refreshed?.completedAssignments ?? 0,
      overdue: refreshed?.overdueAssignments ?? 0,
      pending: 0, // Calculate if needed
      inProgress: 0, // Calculate if needed
      completionPercentage: refreshed?.completionPercentage ?? 0,
    };
  }

  /**
   * Validate audience configuration.
   */
  private validateAudienceConfig(dto: CreateCampaignDto): void {
    if (dto.audienceMode === AudienceMode.SEGMENT && !dto.segmentId) {
      throw new BadRequestException(
        "segmentId is required when audienceMode is SEGMENT",
      );
    }

    if (
      dto.audienceMode === AudienceMode.MANUAL &&
      (!dto.manualIds || dto.manualIds.length === 0)
    ) {
      throw new BadRequestException(
        "manualIds is required when audienceMode is MANUAL",
      );
    }
  }

  /**
   * Get target employee IDs based on campaign audience configuration.
   */
  private async getTargetEmployeeIds(
    campaign: Campaign,
    organizationId: string,
  ): Promise<string[]> {
    switch (campaign.audienceMode) {
      case AudienceMode.SEGMENT:
        if (!campaign.segmentId) {
          throw new BadRequestException("Campaign has no segment configured");
        }
        return this.segmentService.evaluateSegment(
          campaign.segmentId,
          organizationId,
        );

      case AudienceMode.MANUAL:
        return campaign.manualIds;

      case AudienceMode.ALL:
        const employees = await this.prisma.employee.findMany({
          where: {
            organizationId,
            employmentStatus: "ACTIVE",
          },
          select: { id: true },
        });
        return employees.map((e) => e.id);

      default:
        throw new BadRequestException(
          `Unknown audience mode: ${campaign.audienceMode}`,
        );
    }
  }
}
