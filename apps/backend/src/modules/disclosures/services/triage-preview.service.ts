import { Injectable, Logger, Inject } from "@nestjs/common";
import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../prisma/prisma.service";
import { ConflictQueryDto } from "../dto/conflict.dto";
import { DisclosureQueryDto } from "../dto/disclosure-submission.dto";
import { RiuStatus } from "@prisma/client";
import {
  TriageInterpretation,
  TriageEntityType,
} from "./triage-interpreter.service";

/**
 * Preview of triage action results before execution.
 */
export interface TriagePreview {
  /** Unique preview ID for execution reference */
  id: string;
  /** Original interpretation */
  interpretation: TriageInterpretation;
  /** Total count of matching items */
  count: number;
  /** Sample items for review (max 100) */
  items: TriagePreviewItem[];
  /** Estimated impact summary */
  impact: {
    /** Approximate processing time */
    estimatedDurationMs: number;
    /** Total value affected (for disclosures with values) */
    totalValueAffected?: number;
    /** Distribution by status */
    statusBreakdown: Record<string, number>;
  };
  /** When preview was created */
  createdAt: Date;
  /** Preview expiration time */
  expiresAt: Date;
}

/**
 * Single item in triage preview.
 */
export interface TriagePreviewItem {
  id: string;
  referenceNumber?: string;
  status: string;
  type?: string;
  value?: number;
  matchedEntity?: string;
  severity?: string;
  createdAt: Date;
  summary?: string;
}

/**
 * TriagePreviewService generates previews of triage actions before execution.
 *
 * Responsibilities:
 * - Query disclosures/conflicts matching filters
 * - Build preview with sample items and impact assessment
 * - Cache previews for execution reference
 * - Provide preview expiration management
 */
@Injectable()
export class TriagePreviewService {
  private readonly logger = new Logger(TriagePreviewService.name);

  /** Preview cache TTL: 5 minutes */
  private readonly PREVIEW_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Generate a preview of the triage action.
   * NO ACTION IS TAKEN - read only operation.
   *
   * @param interpretation - Parsed interpretation from interpretQuery
   * @param organizationId - Organization context
   * @returns Preview with matching items and impact assessment
   */
  async generatePreview(
    interpretation: TriageInterpretation,
    organizationId: string,
  ): Promise<TriagePreview> {
    this.logger.log(
      `Generating preview for ${interpretation.action} on ${interpretation.entityType}`,
    );

    const previewId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.PREVIEW_TTL_MS);

    let items: TriagePreviewItem[] = [];
    let count = 0;
    let statusBreakdown: Record<string, number> = {};
    let totalValueAffected: number | undefined;

    if (interpretation.entityType === "disclosure") {
      const result = await this.queryDisclosures(
        interpretation.filters as DisclosureQueryDto,
        organizationId,
      );
      items = result.items;
      count = result.count;
      statusBreakdown = result.statusBreakdown;
      totalValueAffected = result.totalValue;
    } else if (interpretation.entityType === "conflict") {
      const result = await this.queryConflicts(
        interpretation.filters as ConflictQueryDto,
        organizationId,
      );
      items = result.items;
      count = result.count;
      statusBreakdown = result.statusBreakdown;
    }

    const preview: TriagePreview = {
      id: previewId,
      interpretation,
      count,
      items: items.slice(0, 100), // Limit to 100 for preview
      impact: {
        estimatedDurationMs: count * 50, // Rough estimate: 50ms per item
        totalValueAffected,
        statusBreakdown,
      },
      createdAt: now,
      expiresAt,
    };

    // Cache preview for execution
    await this.cacheManager.set(
      this.getPreviewCacheKey(previewId),
      preview,
      this.PREVIEW_TTL_MS,
    );

    this.logger.log(`Preview generated: ${previewId} with ${count} items`);

    return preview;
  }

  /**
   * Retrieve a cached preview by ID.
   */
  async getPreview(previewId: string): Promise<TriagePreview | null> {
    const preview = await this.cacheManager.get<TriagePreview>(
      this.getPreviewCacheKey(previewId),
    );
    return preview ?? null;
  }

  /**
   * Cancel a preview and clear from cache.
   */
  async cancelPreview(previewId: string): Promise<void> {
    await this.cacheManager.del(this.getPreviewCacheKey(previewId));
    this.logger.log(`Preview cancelled: ${previewId}`);
  }

  /**
   * Clear a preview from cache after execution.
   */
  async clearPreview(previewId: string): Promise<void> {
    await this.cacheManager.del(this.getPreviewCacheKey(previewId));
  }

  /**
   * Get cache key for a preview.
   */
  getPreviewCacheKey(previewId: string): string {
    return `triage:preview:${previewId}`;
  }

  /**
   * Query disclosures matching the filter criteria.
   */
  private async queryDisclosures(
    filters: DisclosureQueryDto,
    organizationId: string,
  ): Promise<{
    items: TriagePreviewItem[];
    count: number;
    statusBreakdown: Record<string, number>;
    totalValue: number | undefined;
  }> {
    // Build Prisma where clause from filters
    // Query disclosures via RIU with disclosure extension
    const riuWhere: Record<string, unknown> = {
      organizationId,
      type: "DISCLOSURE_RESPONSE",
      disclosureExtension: { isNot: null },
    };

    // Map DisclosureStatus to RiuStatus
    if (filters.status) {
      const riuStatusMap: Record<string, RiuStatus> = {
        DRAFT: RiuStatus.PENDING_QA,
        SUBMITTED: RiuStatus.PENDING_QA,
        UNDER_REVIEW: RiuStatus.PENDING_QA,
        APPROVED: RiuStatus.RELEASED,
        REJECTED: RiuStatus.RELEASED,
      };
      const mapped = riuStatusMap[filters.status];
      if (mapped) {
        riuWhere.status = mapped;
      }
    }

    // Extension filters
    const extensionWhere: Record<string, unknown> = {};
    if (filters.disclosureType) {
      extensionWhere.disclosureType = filters.disclosureType;
    }
    if (filters.thresholdTriggered !== undefined) {
      extensionWhere.thresholdTriggered = filters.thresholdTriggered;
    }
    if (filters.conflictDetected !== undefined) {
      extensionWhere.conflictDetected = filters.conflictDetected;
    }

    if (Object.keys(extensionWhere).length > 0) {
      riuWhere.disclosureExtension = extensionWhere;
    }

    if (filters.startDate || filters.endDate) {
      riuWhere.createdAt = {};
      if (filters.startDate) {
        (riuWhere.createdAt as Record<string, unknown>).gte = new Date(
          filters.startDate,
        );
      }
      if (filters.endDate) {
        (riuWhere.createdAt as Record<string, unknown>).lte = new Date(
          filters.endDate,
        );
      }
    }

    // Query RIUs with disclosure extensions
    const [rius, count] = await Promise.all([
      this.prisma.riskIntelligenceUnit.findMany({
        where: riuWhere as any,
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          disclosureExtension: true,
        },
      }),
      this.prisma.riskIntelligenceUnit.count({ where: riuWhere as any }),
    ]);

    const items: TriagePreviewItem[] = rius
      .filter((r) => r.disclosureExtension)
      .map((r) => ({
        id: r.id,
        referenceNumber: r.referenceNumber,
        status: r.status,
        type: r.disclosureExtension!.disclosureType,
        value: r.disclosureExtension!.disclosureValue
          ? Number(r.disclosureExtension!.disclosureValue)
          : undefined,
        createdAt: r.createdAt,
        summary:
          r.disclosureExtension!.relatedCompany ||
          r.disclosureExtension!.relatedPersonName ||
          undefined,
      }));

    // Build status breakdown from RIU status
    const statusBreakdown: Record<string, number> = {};
    for (const riu of rius) {
      statusBreakdown[riu.status] = (statusBreakdown[riu.status] || 0) + 1;
    }

    // Calculate total value
    const extensions = await this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        ...(extensionWhere as any),
      },
      select: { disclosureValue: true },
    });
    let totalValue: number | undefined;
    const sum = extensions.reduce((acc, e) => {
      return acc + (e.disclosureValue ? Number(e.disclosureValue) : 0);
    }, 0);
    if (sum > 0) {
      totalValue = sum;
    }

    return { items, count, statusBreakdown, totalValue };
  }

  /**
   * Query conflicts matching the filter criteria.
   */
  private async queryConflicts(
    filters: ConflictQueryDto,
    organizationId: string,
  ): Promise<{
    items: TriagePreviewItem[];
    count: number;
    statusBreakdown: Record<string, number>;
  }> {
    // Build Prisma where clause
    const where: Record<string, unknown> = { organizationId };

    if (filters.status) {
      where.status = { in: filters.status };
    }
    if (filters.conflictType) {
      where.conflictType = { in: filters.conflictType };
    }
    if (filters.severity) {
      where.severity = { in: filters.severity };
    }
    if (filters.minConfidence !== undefined) {
      where.matchConfidence = { gte: filters.minConfidence };
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(
          filters.startDate,
        );
      }
      if (filters.endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(
          filters.endDate,
        );
      }
    }

    const [conflicts, count, aggregates] = await Promise.all([
      this.prisma.conflictAlert.findMany({
        where: where as any,
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.conflictAlert.count({ where: where as any }),
      this.prisma.conflictAlert.groupBy({
        by: ["status"],
        where: where as any,
        _count: true,
      }),
    ]);

    const items: TriagePreviewItem[] = conflicts.map((c) => ({
      id: c.id,
      status: c.status,
      type: c.conflictType,
      matchedEntity: c.matchedEntity,
      severity: c.severity,
      createdAt: c.createdAt,
      summary: c.summary,
    }));

    const statusBreakdown: Record<string, number> = {};
    for (const agg of aggregates) {
      statusBreakdown[agg.status] = agg._count;
    }

    return { items, count, statusBreakdown };
  }
}
