import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { CampaignsService } from "../campaigns.service";
import {
  Campaign,
  CampaignType,
  CampaignStatus,
  AttestationType,
  AudienceMode,
  PolicyStatus,
  Prisma,
} from "@prisma/client";
import { CreateAttestationCampaignDto } from "./dto/attestation.dto";

/**
 * Event emitted when an attestation campaign is created from a policy.
 */
export class PolicyAttestationCampaignCreatedEvent {
  constructor(
    public readonly campaignId: string,
    public readonly policyId: string,
    public readonly policyVersionId: string,
    public readonly organizationId: string,
  ) {}
}

/**
 * Campaign with completion statistics.
 */
export interface AttestationCampaignWithStats extends Campaign {
  _count?: {
    assignments: number;
  };
  completionRate?: number;
}

/**
 * Service for creating and managing attestation campaigns from policies.
 *
 * Key behaviors:
 * - Links campaigns to specific PolicyVersion (not just Policy)
 * - Supports three attestation types: CHECKBOX, SIGNATURE, QUIZ
 * - Integrates with existing CampaignsService for campaign lifecycle
 */
@Injectable()
export class AttestationCampaignService {
  private readonly logger = new Logger(AttestationCampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignsService: CampaignsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create an attestation campaign from a published policy version.
   */
  async createFromPolicy(
    dto: CreateAttestationCampaignDto,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    // Verify policy version exists and is published
    const policyVersion = await this.prisma.policyVersion.findFirst({
      where: {
        id: dto.policyVersionId,
        organizationId,
      },
      include: {
        policy: true,
      },
    });

    if (!policyVersion) {
      throw new NotFoundException(
        `Policy version ${dto.policyVersionId} not found`,
      );
    }

    if (policyVersion.policy.status !== PolicyStatus.PUBLISHED) {
      throw new BadRequestException(
        "Cannot create attestation campaign for unpublished policy",
      );
    }

    // Validate quiz config if attestation type is QUIZ
    const attestationType = dto.attestationType ?? AttestationType.CHECKBOX;
    if (attestationType === AttestationType.QUIZ && !dto.quizConfig) {
      throw new BadRequestException(
        "Quiz configuration is required for QUIZ attestation type",
      );
    }

    // Generate campaign name from policy title if not provided
    const campaignName =
      dto.name ?? `${policyVersion.policy.title} - Attestation`;

    // Determine audience configuration
    const audienceMode = dto.audienceMode ?? AudienceMode.ALL;

    // Build quiz config JSON
    const quizConfig = dto.quizConfig
      ? (dto.quizConfig as unknown as Prisma.InputJsonValue)
      : undefined;

    // Create campaign with attestation-specific fields
    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId,
        name: campaignName,
        description:
          dto.description ??
          `Attestation request for policy: ${policyVersion.policy.title}`,
        type: CampaignType.ATTESTATION,
        status: CampaignStatus.DRAFT,

        // Audience targeting
        audienceMode,
        segmentId:
          audienceMode === AudienceMode.SEGMENT ? dto.segmentId : null,
        manualIds:
          audienceMode === AudienceMode.MANUAL ? (dto.employeeIds ?? []) : [],

        // Scheduling
        dueDate: dto.dueDate,
        launchAt: dto.launchAt,
        reminderDays: dto.reminderDays ?? [7, 3, 1],

        // Policy linkage
        policyId: policyVersion.policyId,
        policyVersionId: policyVersion.id,

        // Attestation configuration
        attestationType,
        quizConfig,
        forceScroll: dto.forceScroll ?? false,
        autoCreateCaseOnRefusal: dto.autoCreateCaseOnRefusal ?? true,

        // Audit
        createdById: userId,
        updatedById: userId,
      },
    });

    this.logger.log(
      `Created attestation campaign ${campaign.id} for policy version ${dto.policyVersionId}`,
    );

    // Emit event for other modules to react
    this.eventEmitter.emit(
      "policy.attestation.campaign.created",
      new PolicyAttestationCampaignCreatedEvent(
        campaign.id,
        policyVersion.policyId,
        policyVersion.id,
        organizationId,
      ),
    );

    return campaign;
  }

  /**
   * Convenience method for creating attestation campaign during policy publish flow.
   * Returns null if no attestation is requested.
   */
  async createFromPublish(
    policyVersionId: string,
    dto: Partial<CreateAttestationCampaignDto> | null,
    userId: string,
    organizationId: string,
  ): Promise<Campaign | null> {
    // If no configuration provided, skip attestation campaign creation
    if (!dto || Object.keys(dto).length === 0) {
      this.logger.debug(
        `Skipping attestation campaign - no configuration for policy version ${policyVersionId}`,
      );
      return null;
    }

    // Ensure policyVersionId is set
    const fullDto: CreateAttestationCampaignDto = {
      policyVersionId,
      dueDate: dto.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      ...dto,
    };

    return this.createFromPolicy(fullDto, userId, organizationId);
  }

  /**
   * Get all attestation campaigns for a policy.
   */
  async getPolicyCampaigns(
    policyId: string,
    organizationId: string,
  ): Promise<AttestationCampaignWithStats[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        organizationId,
        policyId,
        type: CampaignType.ATTESTATION,
      },
      include: {
        _count: {
          select: { assignments: true },
        },
        policyVersion: {
          select: {
            id: true,
            version: true,
            versionLabel: true,
            publishedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return campaigns.map((campaign) => ({
      ...campaign,
      completionRate:
        campaign.totalAssignments > 0
          ? Math.round(
              (campaign.completedAssignments / campaign.totalAssignments) * 100,
            )
          : 0,
    }));
  }

  /**
   * Get attestation campaign details by ID.
   */
  async getCampaignById(
    campaignId: string,
    organizationId: string,
  ): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId,
        type: CampaignType.ATTESTATION,
      },
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            slug: true,
            policyType: true,
          },
        },
        policyVersion: {
          select: {
            id: true,
            version: true,
            versionLabel: true,
            content: true,
            publishedAt: true,
          },
        },
        _count: {
          select: { assignments: true },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Attestation campaign ${campaignId} not found`);
    }

    return campaign;
  }

  /**
   * Launch an attestation campaign (creates assignments for target employees).
   * Delegates to CampaignsService for the actual launch.
   */
  async launchCampaign(
    campaignId: string,
    userId: string,
    organizationId: string,
  ): Promise<Campaign> {
    // Verify this is an attestation campaign
    const campaign = await this.getCampaignById(campaignId, organizationId);

    if (campaign.type !== CampaignType.ATTESTATION) {
      throw new BadRequestException("Campaign is not an attestation campaign");
    }

    // Delegate to CampaignsService for standard launch logic
    return this.campaignsService.launch(campaignId, {}, userId, organizationId);
  }

  /**
   * Get statistics for an attestation campaign.
   */
  async getCampaignStatistics(
    campaignId: string,
    organizationId: string,
  ): Promise<{
    total: number;
    completed: number;
    refused: number;
    overdue: number;
    pending: number;
    completionPercentage: number;
    refusalRate: number;
  }> {
    const campaign = await this.getCampaignById(campaignId, organizationId);

    // Get detailed counts
    const [total, completed, refused, overdue] = await Promise.all([
      this.prisma.campaignAssignment.count({
        where: { campaignId, organizationId },
      }),
      this.prisma.campaignAssignment.count({
        where: {
          campaignId,
          organizationId,
          attestedAt: { not: null },
        },
      }),
      this.prisma.campaignAssignment.count({
        where: {
          campaignId,
          organizationId,
          refusedAt: { not: null },
        },
      }),
      this.prisma.campaignAssignment.count({
        where: {
          campaignId,
          organizationId,
          status: "OVERDUE",
        },
      }),
    ]);

    const pending = total - completed - refused;

    return {
      total,
      completed,
      refused,
      overdue,
      pending,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      refusalRate: total > 0 ? Math.round((refused / total) * 100) : 0,
    };
  }
}
