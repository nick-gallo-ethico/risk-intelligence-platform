/**
 * RiuQueryService - Query and retrieval operations for RIUs
 *
 * Handles all read operations including:
 * - Finding RIUs by ID, reference number, access code
 * - Paginated list queries with filtering
 * - Retrieving RIUs with type-specific extensions
 *
 * Extracted from RiusService for maintainability.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, RiskIntelligenceUnit } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RiuQueryDto } from "../dto";

@Injectable()
export class RiuQueryService {
  private readonly logger = new Logger(RiuQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns paginated list of RIUs for the current organization.
   */
  async findAll(
    query: RiuQueryDto,
    organizationId: string,
  ): Promise<{
    data: RiskIntelligenceUnit[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const {
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const where = this.buildWhereClause(query, organizationId);

    const [data, total] = await Promise.all([
      this.prisma.riskIntelligenceUnit.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          category: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      this.prisma.riskIntelligenceUnit.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Returns a single RIU by ID.
   * Throws NotFoundException if not found or belongs to different org.
   */
  async findOne(
    id: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        category: {
          select: { id: true, name: true, code: true },
        },
        caseAssociations: {
          include: {
            case: {
              select: { id: true, referenceNumber: true, status: true },
            },
          },
        },
      },
    });

    if (!riu) {
      throw new NotFoundException(`RIU with ID ${id} not found`);
    }

    return riu;
  }

  /**
   * Finds a RIU by reference number.
   */
  async findByReferenceNumber(
    referenceNumber: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: {
        referenceNumber,
        organizationId,
      },
    });

    if (!riu) {
      throw new NotFoundException(`RIU ${referenceNumber} not found`);
    }

    return riu;
  }

  /**
   * Finds a RIU by anonymous access code.
   * Used for anonymous reporters to check status.
   */
  async findByAccessCode(
    accessCode: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit | null> {
    return this.prisma.riskIntelligenceUnit.findFirst({
      where: {
        anonymousAccessCode: accessCode,
        organizationId,
      },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        type: true,
        sourceChannel: true,
        reporterType: true,
        anonymousAccessCode: true,
        severity: true,
        createdAt: true,
        // Don't include sensitive content for anonymous access
      } as Prisma.RiskIntelligenceUnitSelect,
    });
  }

  /**
   * Returns a single RIU by ID with its type-specific extension.
   * Includes the appropriate extension based on RIU type.
   */
  async findOneWithExtension(
    id: string,
    organizationId: string,
  ): Promise<
    RiskIntelligenceUnit & {
      hotlineExtension?: unknown;
      disclosureExtension?: unknown;
      webFormExtension?: unknown;
    }
  > {
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        category: {
          select: { id: true, name: true, code: true },
        },
        caseAssociations: {
          include: {
            case: {
              select: { id: true, referenceNumber: true, status: true },
            },
          },
        },
        hotlineExtension: true,
        disclosureExtension: true,
        webFormExtension: true,
      },
    });

    if (!riu) {
      throw new NotFoundException(`RIU with ID ${id} not found`);
    }

    return riu;
  }

  /**
   * Builds Prisma where clause from query parameters.
   */
  buildWhereClause(
    query: RiuQueryDto,
    organizationId: string,
  ): Prisma.RiskIntelligenceUnitWhereInput {
    const where: Prisma.RiskIntelligenceUnitWhereInput = {
      organizationId,
    };

    // Type filters
    if (query.type) {
      where.type = query.type;
    }

    if (query.sourceChannel) {
      where.sourceChannel = query.sourceChannel;
    }

    if (query.reporterType) {
      where.reporterType = query.reporterType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.createdById) {
      where.createdById = query.createdById;
    }

    // Date range filters
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

    // Text search on reference number
    if (query.search) {
      where.referenceNumber = {
        contains: query.search,
        mode: "insensitive",
      };
    }

    return where;
  }
}
