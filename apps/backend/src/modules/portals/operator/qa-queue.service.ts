/**
 * QaQueueService - QA Review Workflow Management
 *
 * Manages the QA review queue for hotline RIUs:
 * - List pending items sorted by severity (high-risk first)
 * - Claim items for review
 * - Release or reject reviewed items
 * - Abandon claimed items
 *
 * Key behaviors:
 * - Queries RiuHotlineExtension with qaStatus PENDING
 * - Joins RIU for severity, category, client info
 * - Validates QA status transitions
 * - Emits events for downstream processing (Case creation on release)
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RiuQaStatus, Severity, AuditEntityType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivityService } from "../../../common/services/activity.service";
import {
  QaQueueFilters,
  QaQueueItem,
  QaItemDetail,
  QaEditsDto,
  PaginatedQaQueueResult,
  QaQueueFlag,
} from "./types/qa-queue.types";

@Injectable()
export class QaQueueService {
  private readonly logger = new Logger(QaQueueService.name);

  // Severity order for sorting (HIGH first)
  private readonly SEVERITY_ORDER: Record<Severity, number> = {
    [Severity.HIGH]: 0,
    [Severity.MEDIUM]: 1,
    [Severity.LOW]: 2,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get the QA queue with filters.
   * Returns RIUs with qaStatus = PENDING, sorted by severity DESC, createdAt ASC.
   *
   * @param filters - Query filters
   * @returns Paginated QA queue items
   */
  async getQaQueue(filters: QaQueueFilters): Promise<PaginatedQaQueueResult> {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // Bypass RLS - QA reviewers need cross-tenant access
    const result = await this.prisma.withBypassRLS(async () => {
      // Build where clause for hotline extension
      const where: any = {
        qaStatus: RiuQaStatus.PENDING,
      };

      // Build RIU where clause
      const riuWhere: any = {};

      if (filters.clientId) {
        riuWhere.organizationId = filters.clientId;
      }

      if (filters.operatorId) {
        riuWhere.createdById = filters.operatorId;
      }

      if (filters.severityMin) {
        const minOrder = this.SEVERITY_ORDER[filters.severityMin];
        // Include all severities with order <= minOrder (more severe or equal)
        const includeSeverities = Object.entries(this.SEVERITY_ORDER)
          .filter(([_, order]) => order <= minOrder)
          .map(([sev, _]) => sev as Severity);
        riuWhere.severity = { in: includeSeverities };
      }

      if (filters.dateFrom || filters.dateTo) {
        riuWhere.createdAt = {};
        if (filters.dateFrom) {
          riuWhere.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          riuWhere.createdAt.lte = filters.dateTo;
        }
      }

      // Query with joins
      const [extensions, total] = await Promise.all([
        this.prisma.riuHotlineExtension.findMany({
          where: {
            ...where,
            riu: riuWhere,
          },
          include: {
            riu: {
              include: {
                organization: {
                  select: { id: true, name: true },
                },
                category: {
                  select: { id: true, name: true, code: true },
                },
                createdBy: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
          orderBy: [
            // Can't directly order by RIU severity in Prisma,
            // we'll sort in memory after fetch
          ],
          skip: offset,
          take: limit * 2, // Fetch extra to account for sorting
        }),
        this.prisma.riuHotlineExtension.count({
          where: {
            ...where,
            riu: riuWhere,
          },
        }),
      ]);

      return { extensions, total };
    });

    // Map to QaQueueItem and sort by severity DESC, createdAt ASC
    const items: QaQueueItem[] = result.extensions
      .map((ext): QaQueueItem => {
        const riu = ext.riu;
        const flags = this.computeFlags(ext, riu);

        return {
          riuId: riu.id,
          referenceNumber: riu.referenceNumber,
          category: riu.category?.name || null,
          categoryCode: riu.category?.code || null,
          severityScore: riu.severity,
          clientName: riu.organization.name,
          clientId: riu.organizationId,
          operatorName: `${riu.createdBy.firstName} ${riu.createdBy.lastName}`,
          operatorId: riu.createdById,
          createdAt: riu.createdAt,
          qaStatus: ext.qaStatus,
          qaReviewerId: ext.qaReviewerId,
          qaClaimedAt: null, // Note: Schema doesn't have qaClaimedAt, using null
          flags,
        };
      })
      .sort((a, b) => {
        // Sort by severity (HIGH first)
        const sevA = a.severityScore ? this.SEVERITY_ORDER[a.severityScore] : 2;
        const sevB = b.severityScore ? this.SEVERITY_ORDER[b.severityScore] : 2;
        if (sevA !== sevB) return sevA - sevB;

        // Then by createdAt ASC (oldest first)
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, limit); // Apply actual limit after sorting

    return {
      data: items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Claim an RIU for QA review.
   *
   * @param reviewerId - The reviewer's user ID
   * @param riuId - The RIU ID to claim
   */
  async claimForReview(reviewerId: string, riuId: string): Promise<void> {
    const extension = await this.getExtensionOrFail(riuId);

    // Verify status is PENDING
    if (extension.qaStatus !== RiuQaStatus.PENDING) {
      throw new ConflictException(
        `Cannot claim RIU in ${extension.qaStatus} status`,
      );
    }

    // Update to IN_REVIEW
    await this.prisma.withBypassRLS(async () => {
      return this.prisma.riuHotlineExtension.update({
        where: { riuId },
        data: {
          qaStatus: RiuQaStatus.IN_REVIEW,
          qaReviewerId: reviewerId,
        },
      });
    });

    // Emit event
    this.emitEvent("qa.claimed", {
      riuId,
      organizationId: extension.organizationId,
      reviewerId,
    });

    this.logger.log(`QA reviewer ${reviewerId} claimed RIU ${riuId}`);
  }

  /**
   * Release an RIU from QA (approve it).
   * Optionally apply edits before release.
   *
   * @param reviewerId - The reviewer's user ID
   * @param riuId - The RIU ID to release
   * @param edits - Optional edits to apply
   */
  async releaseFromQa(
    reviewerId: string,
    riuId: string,
    edits?: QaEditsDto,
  ): Promise<void> {
    const extension = await this.getExtensionOrFail(riuId);

    // Verify status is IN_REVIEW and reviewer matches
    if (extension.qaStatus !== RiuQaStatus.IN_REVIEW) {
      throw new BadRequestException(
        `Cannot release RIU in ${extension.qaStatus} status`,
      );
    }

    if (extension.qaReviewerId !== reviewerId) {
      throw new BadRequestException(
        "Only the claiming reviewer can release this RIU",
      );
    }

    // Get the RIU for audit logging
    const riu = await this.prisma.withBypassRLS(async () => {
      return this.prisma.riskIntelligenceUnit.findUnique({
        where: { id: riuId },
      });
    });

    if (!riu) {
      throw new NotFoundException(`RIU not found: ${riuId}`);
    }

    // Apply edits if provided (these modify the RIU's mutable fields)
    // Note: summary, category, severity are editable during QA
    if (edits) {
      await this.prisma.withBypassRLS(async () => {
        const updateData: any = {};

        if (edits.summary !== undefined) {
          updateData.summary = edits.summary;
        }
        if (edits.categoryId !== undefined) {
          updateData.categoryId = edits.categoryId;
        }
        if (edits.severityScore !== undefined) {
          updateData.severity = edits.severityScore;
        }

        if (Object.keys(updateData).length > 0) {
          await this.prisma.riskIntelligenceUnit.update({
            where: { id: riuId },
            data: updateData,
          });
        }
      });
    }

    // Update extension to APPROVED
    await this.prisma.withBypassRLS(async () => {
      return this.prisma.riuHotlineExtension.update({
        where: { riuId },
        data: {
          qaStatus: RiuQaStatus.APPROVED,
          qaReviewedAt: new Date(),
          qaNotes: edits?.editNotes || null,
        },
      });
    });

    // Log audit
    await this.activityService.log({
      entityType: AuditEntityType.RIU,
      entityId: riuId,
      action: "qa_released",
      actionDescription: `QA reviewer released RIU ${riu.referenceNumber} for Case creation`,
      actorUserId: reviewerId,
      organizationId: riu.organizationId,
      metadata: edits ? { edits } : undefined,
    });

    // Emit event for downstream Case creation
    this.emitEvent("qa.released", {
      riuId,
      organizationId: riu.organizationId,
      reviewerId,
      referenceNumber: riu.referenceNumber,
    });

    this.logger.log(
      `QA reviewer ${reviewerId} released RIU ${riu.referenceNumber}`,
    );
  }

  /**
   * Reject an RIU back to the operator.
   *
   * @param reviewerId - The reviewer's user ID
   * @param riuId - The RIU ID to reject
   * @param reason - Rejection reason (required)
   */
  async rejectToOperator(
    reviewerId: string,
    riuId: string,
    reason: string,
  ): Promise<void> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException("Rejection reason is required");
    }

    const extension = await this.getExtensionOrFail(riuId);

    // Verify status is IN_REVIEW and reviewer matches
    if (extension.qaStatus !== RiuQaStatus.IN_REVIEW) {
      throw new BadRequestException(
        `Cannot reject RIU in ${extension.qaStatus} status`,
      );
    }

    if (extension.qaReviewerId !== reviewerId) {
      throw new BadRequestException(
        "Only the claiming reviewer can reject this RIU",
      );
    }

    // Get the RIU for audit logging
    const riu = await this.prisma.withBypassRLS(async () => {
      return this.prisma.riskIntelligenceUnit.findUnique({
        where: { id: riuId },
      });
    });

    if (!riu) {
      throw new NotFoundException(`RIU not found: ${riuId}`);
    }

    // Update extension to REJECTED
    await this.prisma.withBypassRLS(async () => {
      return this.prisma.riuHotlineExtension.update({
        where: { riuId },
        data: {
          qaStatus: RiuQaStatus.REJECTED,
          qaReviewedAt: new Date(),
          qaRejectionReason: reason,
        },
      });
    });

    // Log audit
    await this.activityService.log({
      entityType: AuditEntityType.RIU,
      entityId: riuId,
      action: "qa_rejected",
      actionDescription: `QA reviewer rejected RIU ${riu.referenceNumber}: ${reason}`,
      actorUserId: reviewerId,
      organizationId: riu.organizationId,
      metadata: { reason },
    });

    // Emit event to notify operator
    this.emitEvent("qa.rejected", {
      riuId,
      organizationId: riu.organizationId,
      reviewerId,
      operatorId: riu.createdById,
      reason,
      referenceNumber: riu.referenceNumber,
    });

    this.logger.log(
      `QA reviewer ${reviewerId} rejected RIU ${riu.referenceNumber}`,
    );
  }

  /**
   * Get full detail for a QA item.
   *
   * @param riuId - The RIU ID
   * @returns Full QA item detail
   */
  async getItemDetail(riuId: string): Promise<QaItemDetail> {
    // Fetch extension with RIU data
    const extension = await this.prisma.withBypassRLS(async () => {
      return this.prisma.riuHotlineExtension.findUnique({
        where: { riuId },
        include: {
          riu: {
            include: {
              organization: {
                select: { id: true, name: true, slug: true },
              },
              category: {
                select: { id: true, name: true, code: true },
              },
              createdBy: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });
    });

    if (!extension) {
      throw new NotFoundException(`QA item not found: ${riuId}`);
    }

    const riu = extension.riu;
    const flags = this.computeFlags(extension, riu);

    // Fetch QA reviewer if assigned
    let qaReviewer: { id: string; name: string } | null = null;
    if (extension.qaReviewerId) {
      const reviewer = await this.prisma.withBypassRLS(async () => {
        return this.prisma.user.findUnique({
          where: { id: extension.qaReviewerId! },
          select: { id: true, firstName: true, lastName: true },
        });
      });
      if (reviewer) {
        qaReviewer = {
          id: reviewer.id,
          name: `${reviewer.firstName} ${reviewer.lastName}`,
        };
      }
    }

    // Fetch attachments for RIU (entityType not supported for RIU yet, use entityId only)
    const attachments = await this.prisma.withBypassRLS(async () => {
      return this.prisma.attachment.findMany({
        where: { entityId: riuId },
        select: { id: true, fileName: true, mimeType: true, fileSize: true },
      });
    });

    return {
      riuId: riu.id,
      referenceNumber: riu.referenceNumber,
      client: {
        id: riu.organization.id,
        name: riu.organization.name,
        slug: riu.organization.slug,
      },
      category: riu.category
        ? {
            id: riu.category.id,
            name: riu.category.name,
            code: riu.category.code,
          }
        : null,
      severity: riu.severity,
      content: riu.details,
      summary: riu.summary,
      reporterType: riu.reporterType,
      operator: {
        id: riu.createdBy.id,
        name: `${riu.createdBy.firstName} ${riu.createdBy.lastName}`,
      },
      callMetadata: {
        duration: extension.callDuration,
        interpreterUsed: extension.interpreterUsed,
        interpreterLanguage: extension.interpreterLanguage,
        callerDemeanor: extension.callerDemeanor,
        callbackRequested: extension.callbackRequested,
        callbackNumber: extension.callbackNumber,
      },
      operatorNotes: extension.operatorNotes,
      qaStatus: extension.qaStatus,
      qaReviewer,
      qaClaimedAt: null, // Schema doesn't have qaClaimedAt
      qaNotes: extension.qaNotes,
      qaRejectionReason: extension.qaRejectionReason,
      createdAt: riu.createdAt,
      flags,
      attachments: attachments.map((a) => ({
        id: a.id,
        filename: a.fileName,
        mimeType: a.mimeType,
        size: a.fileSize,
      })),
    };
  }

  /**
   * Abandon a claimed QA item (return to queue).
   *
   * @param reviewerId - The reviewer's user ID
   * @param riuId - The RIU ID to abandon
   */
  async abandonClaim(reviewerId: string, riuId: string): Promise<void> {
    const extension = await this.getExtensionOrFail(riuId);

    // Verify status is IN_REVIEW
    if (extension.qaStatus !== RiuQaStatus.IN_REVIEW) {
      throw new BadRequestException(
        `Cannot abandon RIU in ${extension.qaStatus} status`,
      );
    }

    // Verify reviewer matches
    if (extension.qaReviewerId !== reviewerId) {
      throw new BadRequestException(
        "Only the claiming reviewer can abandon this RIU",
      );
    }

    // Reset to PENDING
    await this.prisma.withBypassRLS(async () => {
      return this.prisma.riuHotlineExtension.update({
        where: { riuId },
        data: {
          qaStatus: RiuQaStatus.PENDING,
          qaReviewerId: null,
        },
      });
    });

    // Emit event
    this.emitEvent("qa.abandoned", {
      riuId,
      organizationId: extension.organizationId,
      reviewerId,
    });

    this.logger.log(
      `QA reviewer ${reviewerId} abandoned claim on RIU ${riuId}`,
    );
  }

  /**
   * Get hotline extension or throw.
   */
  private async getExtensionOrFail(riuId: string) {
    const extension = await this.prisma.withBypassRLS(async () => {
      return this.prisma.riuHotlineExtension.findUnique({
        where: { riuId },
      });
    });

    if (!extension) {
      throw new NotFoundException(`QA item not found: ${riuId}`);
    }

    return extension;
  }

  /**
   * Compute priority flags for a QA item.
   */
  private computeFlags(extension: any, riu: any): QaQueueFlag[] {
    const flags: QaQueueFlag[] = [];

    // High severity
    if (riu.severity === Severity.HIGH) {
      flags.push(QaQueueFlag.HIGH_SEVERITY);
    }

    // Previously rejected (resubmission)
    if (extension.qaRejectionReason) {
      flags.push(QaQueueFlag.RESUBMISSION);
    }

    // TODO: Add KEYWORD_TRIGGER and HIGH_RISK_CATEGORY flags
    // These require checking against QA config which needs additional context

    return flags;
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
