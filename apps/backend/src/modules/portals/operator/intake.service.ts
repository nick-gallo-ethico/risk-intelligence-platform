/**
 * IntakeService - Hotline Call Intake Management
 *
 * Manages the intake workflow for hotline operators:
 * - Create RIUs from phone calls (REPORT, REQUEST_FOR_INFO, WRONG_NUMBER)
 * - Update in-progress intakes before QA submission
 * - Submit completed intakes to QA queue
 * - Look up existing RIUs for follow-up calls (OPER-08)
 *
 * Key behaviors:
 * - Creates RIU with HotlineRiuExtension
 * - Checks ClientProfileService.requiresQaReview() to determine QA routing
 * - Generates access codes for anonymous reporters
 * - Emits events for audit and downstream processing
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  RiuType,
  RiuSourceChannel,
  RiuReporterType,
  RiuQaStatus,
  RiuStatus,
  Severity,
  AuditEntityType,
  InteractionType,
  InteractionChannel,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RiusService } from "../../rius/rius.service";
import { RiuAccessService } from "../../rius/riu-access.service";
import { HotlineRiuService } from "../../rius/extensions/hotline-riu.service";
import { ClientProfileService } from "./client-profile.service";
import { ActivityService } from "../../../common/services/activity.service";
import { CreateIntakeDto, UpdateIntakeDto, FollowUpNoteDto } from "./dto/intake.dto";
import {
  IntakeResult,
  IntakeSummary,
  FollowUpContext,
  RiuTypeFromCall,
} from "./types/intake.types";

@Injectable()
export class IntakeService {
  private readonly logger = new Logger(IntakeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riusService: RiusService,
    private readonly riuAccessService: RiuAccessService,
    private readonly hotlineRiuService: HotlineRiuService,
    private readonly clientProfileService: ClientProfileService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create an RIU from a hotline call.
   *
   * @param operatorId - The operator's user ID
   * @param dto - Intake data from the call
   * @returns IntakeResult with RIU ID, reference number, access code, and QA status
   */
  async createHotlineRiu(
    operatorId: string,
    dto: CreateIntakeDto,
  ): Promise<IntakeResult> {
    // Validate client exists and get profile
    const clientProfile = await this.clientProfileService.getClientProfile(dto.clientId);
    if (!clientProfile.isActive) {
      throw new BadRequestException(`Client ${dto.clientId} is not active`);
    }

    // Map RiuTypeFromCall to RiuType
    const riuType = this.mapCallTypeToRiuType(dto.riuType);

    // Generate access code for anonymous reporters
    let accessCode: string | null = null;
    if (dto.anonymityTier === RiuReporterType.ANONYMOUS) {
      accessCode = await this.riuAccessService.generateAccessCode();
    }

    // Determine if QA review is required
    const qaCheck = await this.clientProfileService.requiresQaReview(
      dto.clientId,
      dto.categoryId || "",
      dto.content,
    );

    // Create the RIU via RiusService (uses client org as organizationId)
    const riu = await this.riusService.create(
      {
        type: riuType,
        sourceChannel: RiuSourceChannel.PHONE,
        details: dto.content,
        reporterType: dto.anonymityTier,
        anonymousAccessCode: accessCode || undefined,
        categoryId: dto.categoryId,
        severity: dto.severity || Severity.MEDIUM,
        reporterName: dto.reporterName,
        reporterEmail: dto.reporterEmail,
        reporterPhone: dto.reporterPhone || dto.callerPhoneNumber,
      },
      operatorId,
      dto.clientId, // organizationId is the client org
    );

    // Create the HotlineRiuExtension with QA status
    const qaStatus = qaCheck.requiresQa ? RiuQaStatus.PENDING : RiuQaStatus.APPROVED;

    await this.hotlineRiuService.createExtension(
      riu.id,
      {
        callDuration: dto.callDuration,
        interpreterUsed: dto.interpreterUsed,
        interpreterLanguage: dto.interpreterLanguage,
        callerDemeanor: dto.callerDemeanor,
        callbackRequested: dto.callbackRequested,
        callbackNumber: dto.callerPhoneNumber,
        operatorNotes: dto.operatorNotes,
      },
      dto.clientId,
    );

    // Update extension with QA status if it's not PENDING (default)
    if (qaStatus === RiuQaStatus.APPROVED) {
      await this.prisma.riuHotlineExtension.update({
        where: { riuId: riu.id },
        data: {
          qaStatus: RiuQaStatus.APPROVED,
          qaReviewedAt: new Date(),
          qaNotes: "Auto-approved: QA not required per client configuration",
        },
      });
    }

    // Emit event for audit and downstream processing
    this.emitEvent("hotline.riu_created", {
      organizationId: dto.clientId,
      actorUserId: operatorId,
      riuId: riu.id,
      referenceNumber: riu.referenceNumber,
      riuType: dto.riuType,
      requiresQa: qaCheck.requiresQa,
      qaReason: qaCheck.reason,
    });

    this.logger.log(
      `Created hotline RIU ${riu.referenceNumber} for client ${clientProfile.name}, QA required: ${qaCheck.requiresQa}`,
    );

    return {
      riuId: riu.id,
      referenceNumber: riu.referenceNumber,
      accessCode,
      requiresQa: qaCheck.requiresQa,
      qaStatus,
    };
  }

  /**
   * Update an in-progress intake.
   * Only allowed while QA status is PENDING or IN_REVIEW by the same operator.
   *
   * @param operatorId - The operator's user ID
   * @param riuId - The RIU ID to update
   * @param dto - Updated intake data
   */
  async updateIntake(
    operatorId: string,
    riuId: string,
    dto: UpdateIntakeDto,
  ): Promise<void> {
    // Get RIU with extension
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: { id: riuId },
      include: {
        hotlineExtension: true,
      },
    });

    if (!riu) {
      throw new NotFoundException(`RIU not found: ${riuId}`);
    }

    if (!riu.hotlineExtension) {
      throw new BadRequestException(`RIU ${riuId} is not a hotline report`);
    }

    // Verify operator can update (must be PENDING or IN_REVIEW and same operator)
    if (
      riu.hotlineExtension.qaStatus !== RiuQaStatus.PENDING &&
      riu.hotlineExtension.qaStatus !== RiuQaStatus.IN_REVIEW
    ) {
      throw new ForbiddenException(
        `Cannot update RIU in ${riu.hotlineExtension.qaStatus} status`,
      );
    }

    // Verify same operator created the RIU
    if (riu.createdById !== operatorId) {
      throw new ForbiddenException(
        "Only the creating operator can update an in-progress intake",
      );
    }

    // Update hotline extension fields
    await this.prisma.riuHotlineExtension.update({
      where: { riuId },
      data: {
        ...(dto.callDuration !== undefined && { callDuration: dto.callDuration }),
        ...(dto.interpreterUsed !== undefined && { interpreterUsed: dto.interpreterUsed }),
        ...(dto.interpreterLanguage !== undefined && { interpreterLanguage: dto.interpreterLanguage }),
        ...(dto.callerDemeanor !== undefined && { callerDemeanor: dto.callerDemeanor }),
        ...(dto.callbackRequested !== undefined && { callbackRequested: dto.callbackRequested }),
        ...(dto.callerPhoneNumber !== undefined && { callbackNumber: dto.callerPhoneNumber }),
        ...(dto.operatorNotes !== undefined && { operatorNotes: dto.operatorNotes }),
      },
    });

    // Log audit
    await this.activityService.log({
      entityType: AuditEntityType.RIU,
      entityId: riuId,
      action: "updated",
      actionDescription: `Operator updated intake for RIU ${riu.referenceNumber}`,
      actorUserId: operatorId,
      organizationId: riu.organizationId,
    });

    this.logger.debug(`Updated intake for RIU ${riu.referenceNumber}`);
  }

  /**
   * Submit an intake to the QA queue.
   *
   * @param operatorId - The operator's user ID
   * @param riuId - The RIU ID to submit
   */
  async submitToQa(operatorId: string, riuId: string): Promise<void> {
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: { id: riuId },
      include: {
        hotlineExtension: true,
      },
    });

    if (!riu) {
      throw new NotFoundException(`RIU not found: ${riuId}`);
    }

    if (!riu.hotlineExtension) {
      throw new BadRequestException(`RIU ${riuId} is not a hotline report`);
    }

    // Verify operator created the RIU
    if (riu.createdById !== operatorId) {
      throw new ForbiddenException(
        "Only the creating operator can submit an intake to QA",
      );
    }

    // Only allow submission from PENDING or NEEDS_REVISION status
    if (
      riu.hotlineExtension.qaStatus !== RiuQaStatus.PENDING &&
      riu.hotlineExtension.qaStatus !== RiuQaStatus.NEEDS_REVISION
    ) {
      throw new BadRequestException(
        `Cannot submit RIU in ${riu.hotlineExtension.qaStatus} status to QA`,
      );
    }

    // Update QA status to PENDING (ready for review)
    await this.prisma.riuHotlineExtension.update({
      where: { riuId },
      data: {
        qaStatus: RiuQaStatus.PENDING,
      },
    });

    // Emit event for QA queue
    this.emitEvent("hotline.submitted_to_qa", {
      organizationId: riu.organizationId,
      actorUserId: operatorId,
      riuId,
      referenceNumber: riu.referenceNumber,
    });

    await this.activityService.log({
      entityType: AuditEntityType.RIU,
      entityId: riuId,
      action: "submitted_to_qa",
      actionDescription: `Operator submitted RIU ${riu.referenceNumber} to QA queue`,
      actorUserId: operatorId,
      organizationId: riu.organizationId,
    });

    this.logger.log(`RIU ${riu.referenceNumber} submitted to QA queue`);
  }

  /**
   * Get the operator's queue of in-progress intakes.
   *
   * @param operatorId - The operator's user ID
   * @returns List of RIUs created by this operator that are still in progress
   */
  async getOperatorQueue(operatorId: string): Promise<IntakeSummary[]> {
    // Bypass RLS - operators see their own RIUs across all clients
    const rius = await this.prisma.withBypassRLS(async () => {
      return this.prisma.riskIntelligenceUnit.findMany({
        where: {
          createdById: operatorId,
          type: {
            in: [RiuType.HOTLINE_REPORT],
          },
          hotlineExtension: {
            qaStatus: {
              in: [
                RiuQaStatus.PENDING,
                RiuQaStatus.IN_REVIEW,
                RiuQaStatus.NEEDS_REVISION,
              ],
            },
          },
        },
        include: {
          organization: {
            select: { name: true },
          },
          category: {
            select: { name: true },
          },
          hotlineExtension: {
            select: { qaStatus: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });

    return rius.map((riu) => ({
      riuId: riu.id,
      referenceNumber: riu.referenceNumber,
      clientName: riu.organization.name,
      category: riu.category?.name || null,
      severity: riu.severity,
      createdAt: riu.createdAt,
      qaStatus: riu.hotlineExtension?.qaStatus || RiuQaStatus.PENDING,
      riuType: this.mapRiuTypeToCallType(riu.type),
    }));
  }

  /**
   * Look up existing RIU by access code for follow-up calls.
   * OPER-08: Support operators handling follow-up calls from reporters.
   *
   * @param operatorId - The operator's user ID
   * @param accessCode - The reporter's access code
   * @returns Context for handling the follow-up call
   */
  async lookupByAccessCode(
    operatorId: string,
    accessCode: string,
  ): Promise<FollowUpContext> {
    // Validate access code format
    if (!this.riuAccessService.isValidFormat(accessCode)) {
      throw new BadRequestException("Invalid access code format");
    }

    // Bypass RLS - operators need cross-tenant access for follow-up lookup
    const riu = await this.prisma.withBypassRLS(async () => {
      return this.prisma.riskIntelligenceUnit.findFirst({
        where: { anonymousAccessCode: accessCode },
        include: {
          organization: {
            select: { name: true },
          },
          category: {
            select: { name: true },
          },
          caseAssociations: {
            include: {
              case: {
                select: {
                  id: true,
                  referenceNumber: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    });

    if (!riu) {
      throw new NotFoundException("No report found with that access code");
    }

    // Get message count for the linked case
    let messageCount = 0;
    let lastMessageAt: Date | null = null;
    const linkedCase = riu.caseAssociations[0]?.case;

    if (linkedCase) {
      const messageStats = await this.prisma.withBypassRLS(async () => {
        const messages = await this.prisma.caseMessage.findMany({
          where: { caseId: linkedCase.id },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        });

        const count = await this.prisma.caseMessage.count({
          where: { caseId: linkedCase.id },
        });

        return {
          count,
          lastMessage: messages[0],
        };
      });

      messageCount = messageStats.count;
      lastMessageAt = messageStats.lastMessage?.createdAt || null;
    }

    // Emit event for audit
    this.emitEvent("hotline.follow_up_accessed", {
      organizationId: riu.organizationId,
      actorUserId: operatorId,
      riuId: riu.id,
      referenceNumber: riu.referenceNumber,
      hasCase: !!linkedCase,
    });

    this.logger.debug(
      `Operator ${operatorId} accessed follow-up for RIU ${riu.referenceNumber}`,
    );

    return {
      riuId: riu.id,
      caseId: linkedCase?.id || null,
      caseReferenceNumber: linkedCase?.referenceNumber || null,
      referenceNumber: riu.referenceNumber,
      category: riu.category?.name || null,
      clientName: riu.organization.name,
      status: riu.status,
      messageCount,
      lastMessageAt,
      canAddNotes: !!linkedCase, // Can only add notes if case exists
    };
  }

  /**
   * Add a follow-up note during a callback.
   * OPER-08: Add operator note during follow-up call.
   *
   * @param operatorId - The operator's user ID
   * @param riuId - The RIU ID
   * @param dto - Follow-up note data
   */
  async addFollowUpNote(
    operatorId: string,
    riuId: string,
    dto: FollowUpNoteDto,
  ): Promise<void> {
    // Bypass RLS for cross-tenant access
    const riu = await this.prisma.withBypassRLS(async () => {
      return this.prisma.riskIntelligenceUnit.findFirst({
        where: { id: riuId },
        include: {
          caseAssociations: {
            include: {
              case: {
                select: { id: true, referenceNumber: true },
              },
            },
          },
        },
      });
    });

    if (!riu) {
      throw new NotFoundException(`RIU not found: ${riuId}`);
    }

    const linkedCase = riu.caseAssociations[0]?.case;
    if (!linkedCase) {
      throw new BadRequestException(
        "Cannot add follow-up note: RIU is not linked to a case yet",
      );
    }

    // Create Interaction record for follow-up call (internal note, not message to reporter)
    await this.prisma.withBypassRLS(async () => {
      return this.prisma.interaction.create({
        data: {
          organizationId: riu.organizationId,
          caseId: linkedCase.id,
          riuId: riu.id,
          interactionType: InteractionType.STATUS_CHECK,
          channel: InteractionChannel.PHONE,
          summary: `Follow-up call: ${dto.disposition}`,
          notes: dto.content,
          addendum: `Call duration: ${dto.callDuration}s`,
          conductedById: operatorId,
          conductedAt: new Date(),
        },
      });
    });

    // Log audit
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: linkedCase.id,
      action: "follow_up_note_added",
      actionDescription: `Operator added follow-up call note (${dto.disposition}) for case ${linkedCase.referenceNumber}`,
      actorUserId: operatorId,
      organizationId: riu.organizationId,
      metadata: {
        disposition: dto.disposition,
        callDuration: dto.callDuration,
      },
    });

    this.emitEvent("hotline.follow_up_note_added", {
      organizationId: riu.organizationId,
      actorUserId: operatorId,
      riuId,
      caseId: linkedCase.id,
      disposition: dto.disposition,
      callDuration: dto.callDuration,
    });

    this.logger.log(
      `Follow-up note added to case ${linkedCase.referenceNumber} by operator ${operatorId}`,
    );
  }

  /**
   * Map RiuTypeFromCall to Prisma RiuType.
   */
  private mapCallTypeToRiuType(callType: RiuTypeFromCall): RiuType {
    switch (callType) {
      case RiuTypeFromCall.REPORT:
        return RiuType.HOTLINE_REPORT;
      case RiuTypeFromCall.REQUEST_FOR_INFO:
        // Request for info still creates a hotline_report, but won't auto-create a case
        return RiuType.HOTLINE_REPORT;
      case RiuTypeFromCall.WRONG_NUMBER:
        // Wrong numbers still logged as hotline_report for tracking
        return RiuType.HOTLINE_REPORT;
      default:
        return RiuType.HOTLINE_REPORT;
    }
  }

  /**
   * Map Prisma RiuType to RiuTypeFromCall for display.
   */
  private mapRiuTypeToCallType(riuType: RiuType): RiuTypeFromCall {
    // All hotline reports default to REPORT type in the queue
    // The actual type (REQUEST_FOR_INFO, WRONG_NUMBER) would be stored separately
    // if we need to distinguish them in the future
    return RiuTypeFromCall.REPORT;
  }

  /**
   * Safely emit event - failures logged but don't crash request.
   */
  private emitEvent(eventName: string, event: object): void {
    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
