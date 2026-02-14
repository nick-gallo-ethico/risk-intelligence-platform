import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RiuQaStatus, RiuHotlineExtension, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * DTO for creating a hotline extension
 */
export interface CreateHotlineExtensionDto {
  callDuration?: number;
  interpreterUsed?: boolean;
  interpreterLanguage?: string;
  callerDemeanor?: string;
  transferredFrom?: string;
  recordingUrl?: string;
  callbackRequested?: boolean;
  callbackNumber?: string;
  operatorNotes?: string;
}

/**
 * DTO for updating QA status
 */
export interface UpdateQaStatusDto {
  status: RiuQaStatus;
  notes?: string;
  rejectionReason?: string;
}

/**
 * Service for managing hotline-specific RIU data.
 *
 * Hotline RIUs have additional fields for:
 * - Call metadata (duration, interpreter usage, demeanor)
 * - QA workflow (status, reviewer, notes)
 *
 * The QA workflow states:
 * - PENDING: Awaiting initial review
 * - IN_REVIEW: Currently being reviewed
 * - APPROVED: Passed QA, ready for release
 * - REJECTED: Failed QA, needs operator rework
 * - NEEDS_REVISION: Minor issues, needs adjustment
 */
@Injectable()
export class HotlineRiuService {
  private readonly logger = new Logger(HotlineRiuService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a hotline extension for an RIU.
   * Should be called when creating a HOTLINE_REPORT type RIU.
   */
  async createExtension(
    riuId: string,
    dto: CreateHotlineExtensionDto,
    organizationId: string,
  ): Promise<RiuHotlineExtension> {
    // Check if extension already exists
    const existing = await this.prisma.riuHotlineExtension.findUnique({
      where: { riuId },
    });

    if (existing) {
      throw new BadRequestException(
        `Hotline extension already exists for RIU ${riuId}`,
      );
    }

    const extension = await this.prisma.riuHotlineExtension.create({
      data: {
        riuId,
        organizationId,
        callDuration: dto.callDuration,
        interpreterUsed: dto.interpreterUsed ?? false,
        interpreterLanguage: dto.interpreterLanguage,
        callerDemeanor: dto.callerDemeanor,
        transferredFrom: dto.transferredFrom,
        recordingUrl: dto.recordingUrl,
        callbackRequested: dto.callbackRequested ?? false,
        callbackNumber: dto.callbackNumber,
        operatorNotes: dto.operatorNotes,
        qaStatus: RiuQaStatus.PENDING,
      },
    });

    this.logger.debug(
      `Created hotline extension for RIU ${riuId} in org ${organizationId}`,
    );

    return extension;
  }

  /**
   * Gets the hotline extension for an RIU.
   * Returns null if not found.
   */
  async getExtension(riuId: string): Promise<RiuHotlineExtension | null> {
    return this.prisma.riuHotlineExtension.findUnique({
      where: { riuId },
    });
  }

  /**
   * Gets the hotline extension or throws NotFoundException.
   */
  async getExtensionOrFail(riuId: string): Promise<RiuHotlineExtension> {
    const extension = await this.getExtension(riuId);

    if (!extension) {
      throw new NotFoundException(
        `Hotline extension not found for RIU ${riuId}`,
      );
    }

    return extension;
  }

  /**
   * Updates the QA status for a hotline RIU.
   * Emits an event for audit and notification integration.
   *
   * @param riuId - The RIU ID
   * @param dto - The status update details
   * @param reviewerId - The user performing the review
   */
  async updateQaStatus(
    riuId: string,
    dto: UpdateQaStatusDto,
    reviewerId: string,
  ): Promise<RiuHotlineExtension> {
    const extension = await this.getExtensionOrFail(riuId);

    const oldStatus = extension.qaStatus;
    const newStatus = dto.status;

    // Validate status transition
    this.validateStatusTransition(oldStatus, newStatus);

    const updateData: Prisma.RiuHotlineExtensionUpdateInput = {
      qaStatus: newStatus,
      qaReviewerId: reviewerId,
      qaReviewedAt: new Date(),
      qaNotes: dto.notes ?? extension.qaNotes,
    };

    // Only set rejection reason if rejecting
    if (
      newStatus === RiuQaStatus.REJECTED ||
      newStatus === RiuQaStatus.NEEDS_REVISION
    ) {
      updateData.qaRejectionReason = dto.rejectionReason;
    }

    const updated = await this.prisma.riuHotlineExtension.update({
      where: { riuId },
      data: updateData,
    });

    // Emit event for audit trail and notifications
    this.emitEvent("riu.hotline.qa.changed", {
      riuId,
      organizationId: extension.organizationId,
      oldStatus,
      newStatus,
      reviewerId,
      rejectionReason: dto.rejectionReason,
    });

    this.logger.log(
      `Updated hotline QA status for RIU ${riuId}: ${oldStatus} -> ${newStatus}`,
    );

    return updated;
  }

  /**
   * Approves a hotline RIU for release.
   * Convenience method for QA approval.
   */
  async approveForRelease(
    riuId: string,
    reviewerId: string,
    notes?: string,
  ): Promise<RiuHotlineExtension> {
    return this.updateQaStatus(
      riuId,
      {
        status: RiuQaStatus.APPROVED,
        notes,
      },
      reviewerId,
    );
  }

  /**
   * Rejects a hotline RIU.
   * Requires a rejection reason.
   */
  async reject(
    riuId: string,
    reviewerId: string,
    rejectionReason: string,
    notes?: string,
  ): Promise<RiuHotlineExtension> {
    if (!rejectionReason) {
      throw new BadRequestException("Rejection reason is required");
    }

    return this.updateQaStatus(
      riuId,
      {
        status: RiuQaStatus.REJECTED,
        notes,
        rejectionReason,
      },
      reviewerId,
    );
  }

  /**
   * Gets the pending QA queue for an organization.
   * Returns hotline RIUs that need QA review.
   */
  async getPendingQaQueue(
    organizationId: string,
    limit = 50,
  ): Promise<RiuHotlineExtension[]> {
    return this.prisma.riuHotlineExtension.findMany({
      where: {
        organizationId,
        qaStatus: {
          in: [
            RiuQaStatus.PENDING,
            RiuQaStatus.IN_REVIEW,
            RiuQaStatus.NEEDS_REVISION,
          ],
        },
      },
      include: {
        riu: {
          select: {
            id: true,
            referenceNumber: true,
            type: true,
            severity: true,
            createdAt: true,
            details: true,
            summary: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  /**
   * Gets QA statistics for an organization.
   */
  async getQaStats(organizationId: string): Promise<{
    pending: number;
    inReview: number;
    approved: number;
    rejected: number;
    needsRevision: number;
  }> {
    const stats = await this.prisma.riuHotlineExtension.groupBy({
      by: ["qaStatus"],
      where: { organizationId },
      _count: true,
    });

    const result = {
      pending: 0,
      inReview: 0,
      approved: 0,
      rejected: 0,
      needsRevision: 0,
    };

    for (const stat of stats) {
      switch (stat.qaStatus) {
        case RiuQaStatus.PENDING:
          result.pending = stat._count;
          break;
        case RiuQaStatus.IN_REVIEW:
          result.inReview = stat._count;
          break;
        case RiuQaStatus.APPROVED:
          result.approved = stat._count;
          break;
        case RiuQaStatus.REJECTED:
          result.rejected = stat._count;
          break;
        case RiuQaStatus.NEEDS_REVISION:
          result.needsRevision = stat._count;
          break;
      }
    }

    return result;
  }

  /**
   * Validates QA status transitions.
   * Not all transitions are allowed.
   */
  private validateStatusTransition(
    oldStatus: RiuQaStatus,
    newStatus: RiuQaStatus,
  ): void {
    // Define allowed transitions
    const allowedTransitions: Record<RiuQaStatus, RiuQaStatus[]> = {
      [RiuQaStatus.PENDING]: [RiuQaStatus.IN_REVIEW],
      [RiuQaStatus.IN_REVIEW]: [
        RiuQaStatus.APPROVED,
        RiuQaStatus.REJECTED,
        RiuQaStatus.NEEDS_REVISION,
      ],
      [RiuQaStatus.NEEDS_REVISION]: [RiuQaStatus.IN_REVIEW],
      [RiuQaStatus.REJECTED]: [RiuQaStatus.PENDING], // Can restart QA process
      [RiuQaStatus.APPROVED]: [], // Terminal state
    };

    const allowed = allowedTransitions[oldStatus];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid QA status transition: ${oldStatus} -> ${newStatus}`,
      );
    }
  }

  /**
   * Safely emits an event. Failures are logged but don't crash the request.
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
