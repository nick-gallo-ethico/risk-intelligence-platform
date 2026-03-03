import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { FaqStatus as PrismaFaqStatus, Prisma } from "@prisma/client";
import { CreateFaqDto, UpdateFaqDto } from "../dto";
import { FaqEntry, FaqStatus, RelatedPolicy } from "../entities";

/**
 * Result from FAQ matching operation.
 */
export interface FaqMatchResult {
  /** Whether a match was found above threshold */
  matched: boolean;
  /** The best matching FAQ entry */
  entry?: FaqEntry;
  /** Confidence score between 0 and 1 */
  confidence: number;
  /** Other potential matches below the primary */
  alternates?: FaqEntry[];
}

/**
 * FaqService provides FAQ management and full-text search matching.
 *
 * FAQ entries are checked FIRST before falling back to RAG search,
 * allowing curated answers to take priority over AI-generated responses.
 *
 * Search uses PostgreSQL full-text search with priority boost:
 * - to_tsvector/plainto_tsquery for text matching
 * - ts_rank for relevance scoring
 * - Priority field adds 0.1 per priority level to score
 */
@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find FAQ match using PostgreSQL full-text search.
   * Returns highest priority match above confidence threshold.
   *
   * Search strategy:
   * 1. Sanitize query for tsquery
   * 2. Match against question field using full-text search
   * 3. Rank by ts_rank + priority boost (priority * 0.1)
   * 4. Return top match if above threshold
   *
   * @param query User's question to match
   * @param organizationId Tenant ID
   * @param threshold Minimum confidence score (0-1), defaults to 0.3
   * @returns Match result with confidence and alternates
   */
  async findMatch(
    query: string,
    organizationId: string,
    threshold = 0.3,
  ): Promise<FaqMatchResult> {
    // Sanitize query - just use plainto_tsquery which handles this automatically
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      return { matched: false, confidence: 0 };
    }

    try {
      // Use raw query for full-text search with ranking
      // Note: Using snake_case for raw SQL column names
      const results = await this.prisma.$queryRaw<
        Array<{
          id: string;
          organization_id: string;
          question: string;
          answer: string;
          related_policies: unknown;
          category: string | null;
          tags: string[];
          priority: number;
          status: string;
          view_count: number;
          helpful_count: number;
          created_by_id: string;
          updated_by_id: string | null;
          created_at: Date;
          updated_at: Date;
          rank: number;
        }>
      >`
        SELECT
          fe.id,
          fe.organization_id,
          fe.question,
          fe.answer,
          fe.related_policies,
          fe.category,
          fe.tags,
          fe.priority,
          fe.status,
          fe.view_count,
          fe.helpful_count,
          fe.created_by_id,
          fe.updated_by_id,
          fe.created_at,
          fe.updated_at,
          ts_rank(
            to_tsvector('english', fe.question),
            plainto_tsquery('english', ${cleanQuery})
          ) + (fe.priority * 0.1) as rank
        FROM faq_entries fe
        WHERE fe.organization_id = ${organizationId}
          AND fe.status = 'ACTIVE'
          AND to_tsvector('english', fe.question) @@ plainto_tsquery('english', ${cleanQuery})
        ORDER BY rank DESC, fe.priority DESC
        LIMIT 5
      `;

      if (results.length === 0) {
        return { matched: false, confidence: 0 };
      }

      const topMatch = results[0];
      // Clamp confidence to 0-1 range
      const confidence = Math.min(Math.max(topMatch.rank, 0), 1);

      // Increment view count for top match (fire and forget)
      this.prisma.faqEntry
        .update({
          where: { id: topMatch.id },
          data: { viewCount: { increment: 1 } },
        })
        .catch((err) =>
          this.logger.warn(`Failed to increment view count: ${err.message}`),
        );

      return {
        matched: confidence >= threshold,
        entry: this.mapRawToEntity(topMatch),
        confidence,
        alternates: results.slice(1).map((r) => this.mapRawToEntity(r)),
      };
    } catch (error) {
      this.logger.error(`FAQ search failed: ${(error as Error).message}`);
      return { matched: false, confidence: 0 };
    }
  }

  /**
   * Create a new FAQ entry.
   *
   * @param organizationId Tenant ID
   * @param userId User creating the FAQ
   * @param dto FAQ data
   * @returns Created FAQ entry
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreateFaqDto,
  ): Promise<FaqEntry> {
    const entry = await this.prisma.faqEntry.create({
      data: {
        organizationId,
        question: dto.question,
        answer: dto.answer,
        relatedPolicies:
          (dto.relatedPolicies as unknown as Prisma.InputJsonValue) ??
          undefined,
        category: dto.category,
        tags: dto.tags || [],
        priority: dto.priority ?? 0,
        status: dto.status ?? PrismaFaqStatus.ACTIVE,
        createdById: userId,
      },
    });

    return this.mapToEntity(entry);
  }

  /**
   * Update an existing FAQ entry.
   *
   * @param id FAQ entry ID
   * @param organizationId Tenant ID
   * @param userId User updating the FAQ
   * @param dto Update data
   * @returns Updated FAQ entry
   * @throws NotFoundException if FAQ not found
   */
  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateFaqDto,
  ): Promise<FaqEntry> {
    const entry = await this.prisma.faqEntry.findFirst({
      where: { id, organizationId },
    });

    if (!entry) {
      throw new NotFoundException(`FAQ entry ${id} not found`);
    }

    const updated = await this.prisma.faqEntry.update({
      where: { id },
      data: {
        question: dto.question,
        answer: dto.answer,
        relatedPolicies:
          dto.relatedPolicies !== undefined
            ? (dto.relatedPolicies as unknown as Prisma.InputJsonValue)
            : undefined,
        category: dto.category,
        tags: dto.tags,
        priority: dto.priority,
        status: dto.status,
        updatedById: userId,
      },
    });

    return this.mapToEntity(updated);
  }

  /**
   * Find FAQ by ID.
   *
   * @param id FAQ entry ID
   * @param organizationId Tenant ID
   * @returns FAQ entry or null if not found
   */
  async findById(id: string, organizationId: string): Promise<FaqEntry | null> {
    const entry = await this.prisma.faqEntry.findFirst({
      where: { id, organizationId },
    });

    return entry ? this.mapToEntity(entry) : null;
  }

  /**
   * List FAQ entries with filtering and pagination.
   *
   * @param organizationId Tenant ID
   * @param options Filtering and pagination options
   * @returns Paginated FAQ entries with total count
   */
  async findAll(
    organizationId: string,
    options: {
      status?: FaqStatus;
      category?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ entries: FaqEntry[]; total: number }> {
    const where: Prisma.FaqEntryWhereInput = {
      organizationId,
      status: options.status,
      category: options.category,
    };

    const [entries, total] = await Promise.all([
      this.prisma.faqEntry.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      }),
      this.prisma.faqEntry.count({ where }),
    ]);

    return {
      entries: entries.map((e) => this.mapToEntity(e)),
      total,
    };
  }

  /**
   * Mark FAQ as helpful (for feedback tracking).
   * Increments the helpfulCount counter.
   *
   * @param id FAQ entry ID
   * @param organizationId Tenant ID
   */
  async markHelpful(id: string, organizationId: string): Promise<void> {
    await this.prisma.faqEntry.updateMany({
      where: { id, organizationId },
      data: { helpfulCount: { increment: 1 } },
    });
  }

  /**
   * Archive FAQ entry (soft delete).
   * Sets status to ARCHIVED rather than deleting.
   *
   * @param id FAQ entry ID
   * @param organizationId Tenant ID
   */
  async archive(id: string, organizationId: string): Promise<void> {
    await this.prisma.faqEntry.updateMany({
      where: { id, organizationId },
      data: { status: PrismaFaqStatus.ARCHIVED },
    });
  }

  /**
   * Map Prisma model to entity type.
   */
  private mapToEntity(
    entry: Prisma.FaqEntryGetPayload<NonNullable<unknown>>,
  ): FaqEntry {
    return {
      id: entry.id,
      organizationId: entry.organizationId,
      question: entry.question,
      answer: entry.answer,
      relatedPolicies: entry.relatedPolicies as unknown as
        | RelatedPolicy[]
        | undefined,
      category: entry.category ?? undefined,
      tags: entry.tags,
      priority: entry.priority,
      status: entry.status as unknown as FaqStatus,
      viewCount: entry.viewCount,
      helpfulCount: entry.helpfulCount,
      createdById: entry.createdById,
      updatedById: entry.updatedById ?? undefined,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  /**
   * Map raw SQL result to entity type.
   * Raw queries return snake_case column names.
   */
  private mapRawToEntity(entry: {
    id: string;
    organization_id: string;
    question: string;
    answer: string;
    related_policies: unknown;
    category: string | null;
    tags: string[];
    priority: number;
    status: string;
    view_count: number;
    helpful_count: number;
    created_by_id: string;
    updated_by_id: string | null;
    created_at: Date;
    updated_at: Date;
  }): FaqEntry {
    return {
      id: entry.id,
      organizationId: entry.organization_id,
      question: entry.question,
      answer: entry.answer,
      relatedPolicies: entry.related_policies as RelatedPolicy[] | undefined,
      category: entry.category ?? undefined,
      tags: entry.tags,
      priority: entry.priority,
      status: entry.status as FaqStatus,
      viewCount: entry.view_count,
      helpfulCount: entry.helpful_count,
      createdById: entry.created_by_id,
      updatedById: entry.updated_by_id ?? undefined,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    };
  }
}
