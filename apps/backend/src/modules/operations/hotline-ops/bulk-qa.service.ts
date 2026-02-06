/**
 * BulkQaService - Bulk QA Operations for Hotline RIUs
 *
 * Handles bulk quality assurance operations on hotline reports.
 * Operates across tenants for internal Ethico QA team.
 *
 * Key features:
 * - Global QA queue view across all tenants
 * - Bulk actions: APPROVE, REJECT, REASSIGN, CHANGE_PRIORITY
 * - Reviewer throughput metrics
 *
 * Per CONTEXT.md:
 * - "Bulk QA actions" - approve, reject, reassign, and change priority in bulk
 * - "Global queue view" - see all QA items across all clients in one view
 * - "QA reviewer throughput + accuracy" - items reviewed per day/week
 */

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BulkQaActionDto } from "./dto/hotline-ops.dto";
import { RiuQaStatus, Prisma } from "@prisma/client";

/** RIU with hotline extension for QA queue display */
export interface QaQueueItem {
  id: string;
  referenceNumber: string;
  organizationId: string;
  type: string;
  summary: string | null;
  severity: string;
  createdAt: Date;
  organization?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  hotlineExtension?: {
    id: string;
    qaStatus: RiuQaStatus;
    qaReviewerId: string | null;
    operatorNotes: string | null;
    callDuration: number | null;
  } | null;
}

/** Paginated QA queue result */
export interface QaQueueResult {
  items: QaQueueItem[];
  total: number;
}

/** Result of bulk QA action */
export interface BulkActionResult {
  processed: number;
  errors: string[];
}

/** Reviewer throughput metrics */
export interface ReviewerMetrics {
  reviewerId: string | null;
  itemsReviewed: number;
}

@Injectable()
export class BulkQaService {
  private readonly logger = new Logger(BulkQaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get global QA queue across all tenants.
   * Returns hotline RIUs pending QA, sorted by priority and age.
   *
   * Per CONTEXT.md: "Global queue view" - see all QA items across all clients
   *
   * @param filters - Query filters
   * @returns Paginated QA queue items
   */
  async getGlobalQaQueue(filters: {
    qaStatus?: string;
    limit?: number;
    offset?: number;
  }): Promise<QaQueueResult> {
    // Filter for hotline reports with pending QA
    const hotlineWhere: Prisma.RiuHotlineExtensionWhereInput = {
      qaStatus: (filters.qaStatus as RiuQaStatus) || "PENDING",
    };

    const [extensions, total] = await Promise.all([
      this.prisma.riuHotlineExtension.findMany({
        where: hotlineWhere,
        include: {
          riu: {
            include: {
              organization: { select: { id: true, name: true } },
              category: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [
          { createdAt: "asc" }, // Oldest first (FIFO)
        ],
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.riuHotlineExtension.count({ where: hotlineWhere }),
    ]);

    // Transform to QA queue format
    const items: QaQueueItem[] = extensions.map((ext) => ({
      id: ext.riuId,
      referenceNumber: ext.riu.referenceNumber,
      organizationId: ext.organizationId,
      type: ext.riu.type,
      summary: ext.riu.summary,
      severity: ext.riu.severity,
      createdAt: ext.createdAt,
      organization: ext.riu.organization,
      category: ext.riu.category,
      hotlineExtension: {
        id: ext.id,
        qaStatus: ext.qaStatus,
        qaReviewerId: ext.qaReviewerId,
        operatorNotes: ext.operatorNotes,
        callDuration: ext.callDuration,
      },
    }));

    return { items, total };
  }

  /**
   * Perform bulk QA action on multiple RIUs.
   *
   * Supported actions:
   * - APPROVE: Mark RIUs as QA approved
   * - REJECT: Mark RIUs as rejected (reason required)
   * - REASSIGN: Reassign to a different QA reviewer
   * - CHANGE_PRIORITY: Not applicable to current schema (returns error)
   *
   * @param dto - Bulk action request
   * @param performedById - Internal user ID performing the action
   * @returns Result with count and any errors
   */
  async performBulkAction(
    dto: BulkQaActionDto,
    performedById: string,
  ): Promise<BulkActionResult> {
    const errors: string[] = [];
    let processed = 0;

    // Get hotline extensions for the specified RIUs
    const extensions = await this.prisma.riuHotlineExtension.findMany({
      where: { riuId: { in: dto.riuIds } },
      include: {
        riu: { select: { referenceNumber: true } },
      },
    });

    // Check for missing RIUs
    if (extensions.length !== dto.riuIds.length) {
      const found = new Set(extensions.map((e) => e.riuId));
      const missing = dto.riuIds.filter((id) => !found.has(id));
      errors.push(
        `RIUs not found or not hotline reports: ${missing.join(", ")}`,
      );
    }

    // Validate state for approve/reject
    for (const ext of extensions) {
      if (dto.action === "APPROVE" || dto.action === "REJECT") {
        if (ext.qaStatus !== "PENDING" && ext.qaStatus !== "IN_REVIEW") {
          errors.push(
            `${ext.riu.referenceNumber}: Already processed (${ext.qaStatus})`,
          );
          continue;
        }
      }
    }

    // Process each RIU
    for (const ext of extensions) {
      // Skip already-errored items
      if (errors.some((e) => e.includes(ext.riu.referenceNumber))) {
        continue;
      }

      try {
        switch (dto.action) {
          case "APPROVE":
            await this.prisma.riuHotlineExtension.update({
              where: { id: ext.id },
              data: {
                qaStatus: "APPROVED",
                qaReviewedAt: new Date(),
                qaReviewerId: performedById,
              },
            });

            // Emit event for downstream processing (e.g., create case)
            this.eventEmitter.emit("riu.qa.approved", {
              riuId: ext.riuId,
              organizationId: ext.organizationId,
              reviewerId: performedById,
            });

            processed++;
            break;

          case "REJECT":
            if (!dto.reason) {
              errors.push(
                `${ext.riu.referenceNumber}: Rejection reason required`,
              );
              continue;
            }
            await this.prisma.riuHotlineExtension.update({
              where: { id: ext.id },
              data: {
                qaStatus: "REJECTED",
                qaReviewedAt: new Date(),
                qaReviewerId: performedById,
                qaRejectionReason: dto.reason,
              },
            });

            this.eventEmitter.emit("riu.qa.rejected", {
              riuId: ext.riuId,
              organizationId: ext.organizationId,
              reviewerId: performedById,
              reason: dto.reason,
            });

            processed++;
            break;

          case "REASSIGN":
            if (!dto.assignToUserId) {
              errors.push(
                `${ext.riu.referenceNumber}: Assign-to user required`,
              );
              continue;
            }
            await this.prisma.riuHotlineExtension.update({
              where: { id: ext.id },
              data: {
                qaReviewerId: dto.assignToUserId,
                qaStatus: "IN_REVIEW",
              },
            });
            processed++;
            break;

          case "CHANGE_PRIORITY":
            // Priority is not on RIU schema currently
            // Could be added as a future enhancement
            errors.push(
              `${ext.riu.referenceNumber}: Priority change not supported for hotline RIUs`,
            );
            break;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`${ext.riu.referenceNumber}: ${message}`);
      }
    }

    this.logger.log(
      `Bulk QA action ${dto.action}: ${processed}/${dto.riuIds.length} processed`,
    );

    return { processed, errors };
  }

  /**
   * Get QA reviewer throughput metrics.
   * Shows items reviewed per reviewer in a date range.
   *
   * Per CONTEXT.md: "QA reviewer throughput + accuracy"
   *
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns List of reviewer metrics
   */
  async getReviewerMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<ReviewerMetrics[]> {
    const metrics = await this.prisma.riuHotlineExtension.groupBy({
      by: ["qaReviewerId"],
      where: {
        qaReviewedAt: { gte: startDate, lte: endDate },
        qaReviewerId: { not: null },
      },
      _count: { id: true },
    });

    return metrics.map((m) => ({
      reviewerId: m.qaReviewerId,
      itemsReviewed: m._count.id,
    }));
  }

  /**
   * Get QA queue statistics.
   * Shows counts by status for dashboard display.
   *
   * @returns Counts by QA status
   */
  async getQueueStats(): Promise<Record<string, number>> {
    const stats = await this.prisma.riuHotlineExtension.groupBy({
      by: ["qaStatus"],
      _count: { id: true },
    });

    const result: Record<string, number> = {};
    for (const stat of stats) {
      result[stat.qaStatus] = stat._count.id;
    }

    return result;
  }

  /**
   * Assign RIU to QA reviewer for review.
   *
   * @param riuId - RIU ID to assign
   * @param reviewerId - User ID of reviewer
   * @returns Updated extension
   */
  async assignToReviewer(riuId: string, reviewerId: string) {
    const extension = await this.prisma.riuHotlineExtension.findUnique({
      where: { riuId },
    });

    if (!extension) {
      throw new BadRequestException("RIU not found or not a hotline report");
    }

    return this.prisma.riuHotlineExtension.update({
      where: { id: extension.id },
      data: {
        qaReviewerId: reviewerId,
        qaStatus: "IN_REVIEW",
      },
    });
  }
}
