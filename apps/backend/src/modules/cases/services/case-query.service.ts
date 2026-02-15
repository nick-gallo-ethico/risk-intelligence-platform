/**
 * CaseQueryService - Query and retrieval operations for Cases
 *
 * Handles all read operations including:
 * - Finding cases by ID, reference number
 * - Paginated list queries with filtering
 * - Full-text search using PostgreSQL tsvector
 * - HubSpot-style advanced filter conditions
 *
 * Extracted from CasesService for maintainability.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, Case } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CaseQueryDto } from "../dto";

@Injectable()
export class CaseQueryService {
  private readonly logger = new Logger(CaseQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns paginated list of cases for the current organization.
   * Supports full-text search using PostgreSQL tsvector when search query is provided.
   */
  async findAll(
    query: CaseQueryDto,
    organizationId: string,
  ): Promise<{ data: Case[]; total: number; limit: number; offset: number }> {
    const {
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    // If search query provided, use full-text search with raw SQL
    if (query.search && query.search.trim().length > 0) {
      return this.findAllWithFullTextSearch(query, organizationId);
    }

    const where = this.buildWhereClause(query, organizationId);
    const orderBy = this.buildOrderByClause(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          primaryCategory: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.case.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Returns a single case by ID.
   * Throws NotFoundException if not found or belongs to different org (RLS handles this).
   */
  async findOne(id: string, organizationId: string): Promise<Case> {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        updatedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        intakeOperator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }

    return caseRecord;
  }

  /**
   * Finds a case by reference number.
   */
  async findByReferenceNumber(
    referenceNumber: string,
    organizationId: string,
  ): Promise<Case> {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        referenceNumber,
        organizationId,
      },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case ${referenceNumber} not found`);
    }

    return caseRecord;
  }

  /**
   * Performs full-text search on cases using PostgreSQL tsvector.
   * Uses plainto_tsquery for natural language search and ts_rank for relevance scoring.
   * Supports partial word matching with :* suffix.
   * CRITICAL: Tenant isolation (organizationId filter) always applies.
   */
  async findAllWithFullTextSearch(
    query: CaseQueryDto,
    organizationId: string,
  ): Promise<{ data: Case[]; total: number; limit: number; offset: number }> {
    const { limit = 20, offset = 0 } = query;
    const searchTerm = query.search!.trim();

    // Build the search query with partial matching support
    // Convert "word1 word2" to "word1:* & word2:*" for prefix matching
    const searchWords = searchTerm
      .split(/\s+/)
      .filter((word) => word.length > 0)
      .map((word) => word.replace(/[^\w]/g, "")) // Remove special characters
      .filter((word) => word.length > 0);

    if (searchWords.length === 0) {
      // If no valid search words, return empty result
      return { data: [], total: 0, limit, offset };
    }

    const tsQuery = searchWords.map((word) => `${word}:*`).join(" & ");

    // Build additional WHERE conditions for filters (AND logic)
    const conditions: string[] = ["c.organization_id = $1"];
    const params: (string | number)[] = [organizationId];
    let paramIndex = 2;

    // Enum filters
    if (query.status) {
      conditions.push(`c.status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    if (query.severity) {
      conditions.push(`c.severity = $${paramIndex}`);
      params.push(query.severity);
      paramIndex++;
    }

    if (query.sourceChannel) {
      conditions.push(`c.source_channel = $${paramIndex}`);
      params.push(query.sourceChannel);
      paramIndex++;
    }

    if (query.caseType) {
      conditions.push(`c.case_type = $${paramIndex}`);
      params.push(query.caseType);
      paramIndex++;
    }

    // User filters
    if (query.createdById) {
      conditions.push(`c.created_by_id = $${paramIndex}`);
      params.push(query.createdById);
      paramIndex++;
    }

    if (query.intakeOperatorId) {
      conditions.push(`c.intake_operator_id = $${paramIndex}`);
      params.push(query.intakeOperatorId);
      paramIndex++;
    }

    // Date range filters
    if (query.createdAfter) {
      conditions.push(`c.created_at >= $${paramIndex}`);
      params.push(query.createdAfter);
      paramIndex++;
    }

    if (query.createdBefore) {
      conditions.push(`c.created_at <= $${paramIndex}`);
      params.push(query.createdBefore);
      paramIndex++;
    }

    // Add full-text search condition
    conditions.push(`c.search_vector @@ to_tsquery('english', $${paramIndex})`);
    params.push(tsQuery);
    const tsQueryParamIndex = paramIndex;
    paramIndex++;

    const whereClause = conditions.join(" AND ");

    // Query for data with relevance ranking
    const dataQuery = `
      SELECT c.*,
             ts_rank(c.search_vector, to_tsquery('english', $${tsQueryParamIndex})) as search_rank
      FROM cases c
      WHERE ${whereClause}
      ORDER BY search_rank DESC, c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    // Query for total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM cases c
      WHERE ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<Case[]>(dataQuery, ...params),
      this.prisma.$queryRawUnsafe<{ total: bigint }[]>(
        countQuery,
        ...params.slice(0, -2),
      ),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    return { data: dataResult, total, limit, offset };
  }

  /**
   * Builds Prisma where clause from query parameters.
   * Note: Full-text search is handled separately in findAllWithFullTextSearch().
   * All filters are combined with AND logic.
   */
  buildWhereClause(
    query: CaseQueryDto,
    organizationId: string,
  ): Prisma.CaseWhereInput {
    const where: Prisma.CaseWhereInput = {
      organizationId,
    };

    // Process advanced filters from saved views (HubSpot-style)
    if (query.filters) {
      try {
        const conditions = JSON.parse(query.filters);
        if (Array.isArray(conditions)) {
          for (const condition of conditions) {
            this.applyFilterCondition(where, condition);
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to parse filters: ${query.filters}`);
      }
    }

    // Simple enum filters (for backwards compatibility)
    if (query.status) {
      where.status = query.status;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.sourceChannel) {
      where.sourceChannel = query.sourceChannel;
    }

    if (query.caseType) {
      where.caseType = query.caseType;
    }

    // User filters
    if (query.createdById) {
      where.createdById = query.createdById;
    }

    if (query.intakeOperatorId) {
      where.intakeOperatorId = query.intakeOperatorId;
    }

    // Date range filters (combined into single createdAt filter)
    if (query.createdAfter || query.createdBefore) {
      const dateFilter: Prisma.DateTimeFilter = {};

      if (query.createdAfter) {
        dateFilter.gte = new Date(query.createdAfter);
      }

      if (query.createdBefore) {
        dateFilter.lte = new Date(query.createdBefore);
      }

      where.createdAt = dateFilter;
    }

    return where;
  }

  /**
   * Applies a single filter condition to the where clause.
   * Supports HubSpot-style operators: is, is_not, is_any_of, is_none_of, contains, etc.
   */
  applyFilterCondition(
    where: Prisma.CaseWhereInput,
    condition: { propertyId: string; operator: string; value: unknown },
  ): void {
    const { propertyId, operator, value } = condition;

    // Map frontend property IDs to Prisma field names
    const fieldMap: Record<string, string> = {
      status: "status",
      severity: "severity",
      sourceChannel: "sourceChannel",
      caseType: "caseType",
      createdBy: "createdById",
      primaryCategory: "primaryCategoryId",
    };

    const field = fieldMap[propertyId] || propertyId;

    switch (operator) {
      case "is":
        (where as Record<string, unknown>)[field] = value;
        break;

      case "is_not":
        (where as Record<string, unknown>)[field] = { not: value };
        break;

      case "is_any_of":
        if (Array.isArray(value)) {
          (where as Record<string, unknown>)[field] = { in: value };
        }
        break;

      case "is_none_of":
        if (Array.isArray(value)) {
          (where as Record<string, unknown>)[field] = { notIn: value };
        }
        break;

      case "contains":
        (where as Record<string, unknown>)[field] = {
          contains: value,
          mode: "insensitive",
        };
        break;

      case "does_not_contain":
        (where as Record<string, unknown>)[field] = {
          not: { contains: value, mode: "insensitive" },
        };
        break;

      case "is_empty":
        (where as Record<string, unknown>)[field] = null;
        break;

      case "is_not_empty":
        (where as Record<string, unknown>)[field] = { not: null };
        break;

      default:
        this.logger.warn(`Unknown filter operator: ${operator}`);
    }
  }

  /**
   * Builds Prisma orderBy clause, handling relation fields.
   */
  buildOrderByClause(
    sortBy: string,
    sortOrder: string,
  ): Record<string, unknown> {
    // Map frontend column IDs to Prisma orderBy format
    const relationSortMap: Record<string, Record<string, unknown>> = {
      primaryCategory: { primaryCategory: { name: sortOrder } },
      createdBy: { createdBy: { firstName: sortOrder } },
      team: { team: { name: sortOrder } },
      businessUnit: { businessUnit: { name: sortOrder } },
    };

    // Check if it's a relation field
    if (relationSortMap[sortBy]) {
      return relationSortMap[sortBy];
    }

    // Direct field sort
    return { [sortBy]: sortOrder };
  }
}
