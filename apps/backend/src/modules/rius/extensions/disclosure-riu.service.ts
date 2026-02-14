import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { DisclosureType, RiuDisclosureExtension, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * DTO for creating a disclosure extension
 */
export interface CreateDisclosureExtensionDto {
  disclosureType: DisclosureType;
  disclosureSubtype?: string;
  disclosureValue?: number;
  disclosureCurrency?: string;
  estimatedAnnualValue?: number;
  relatedPersonId?: string;
  relatedPersonName?: string;
  relatedCompany?: string;
  relationshipType?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
}

/**
 * Configuration for threshold checking
 */
export interface ThresholdConfig {
  amount: number;
  currency: string;
}

/**
 * Service for managing disclosure-specific RIU data.
 *
 * Disclosure RIUs have additional fields for:
 * - Disclosure classification (type, subtype)
 * - Value tracking (monetary value, currency)
 * - Threshold detection (automatic flagging when limits exceeded)
 * - Conflict detection (flagging potential conflicts of interest)
 * - Related party information (who/what the disclosure involves)
 *
 * Disclosure types:
 * - COI: Conflict of Interest
 * - GIFT: Gifts & Entertainment
 * - OUTSIDE_EMPLOYMENT: Outside business activities
 * - POLITICAL: Political contributions
 * - CHARITABLE: Charitable donations
 * - TRAVEL: Travel & hospitality
 */
@Injectable()
export class DisclosureRiuService {
  private readonly logger = new Logger(DisclosureRiuService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a disclosure extension for an RIU.
   * Should be called when creating a DISCLOSURE_RESPONSE type RIU.
   *
   * Automatically checks threshold if configuration is provided.
   */
  async createExtension(
    riuId: string,
    dto: CreateDisclosureExtensionDto,
    organizationId: string,
    thresholdConfig?: ThresholdConfig,
  ): Promise<RiuDisclosureExtension> {
    // Check if extension already exists
    const existing = await this.prisma.riuDisclosureExtension.findUnique({
      where: { riuId },
    });

    if (existing) {
      throw new BadRequestException(
        `Disclosure extension already exists for RIU ${riuId}`,
      );
    }

    // Check threshold if value and config provided
    const thresholdTriggered =
      dto.disclosureValue != null && thresholdConfig != null
        ? dto.disclosureValue >= thresholdConfig.amount
        : false;

    const extension = await this.prisma.riuDisclosureExtension.create({
      data: {
        riuId,
        organizationId,
        disclosureType: dto.disclosureType,
        disclosureSubtype: dto.disclosureSubtype,
        disclosureValue:
          dto.disclosureValue != null
            ? new Decimal(dto.disclosureValue)
            : undefined,
        disclosureCurrency: dto.disclosureCurrency,
        estimatedAnnualValue:
          dto.estimatedAnnualValue != null
            ? new Decimal(dto.estimatedAnnualValue)
            : undefined,
        thresholdTriggered,
        thresholdAmount:
          thresholdConfig != null
            ? new Decimal(thresholdConfig.amount)
            : undefined,
        relatedPersonId: dto.relatedPersonId,
        relatedPersonName: dto.relatedPersonName,
        relatedCompany: dto.relatedCompany,
        relationshipType: dto.relationshipType,
        effectiveDate: dto.effectiveDate,
        expirationDate: dto.expirationDate,
      },
    });

    this.logger.debug(
      `Created disclosure extension for RIU ${riuId} in org ${organizationId}, ` +
        `type: ${dto.disclosureType}, threshold: ${thresholdTriggered ? "triggered" : "not triggered"}`,
    );

    return extension;
  }

  /**
   * Gets the disclosure extension for an RIU.
   * Returns null if not found.
   */
  async getExtension(riuId: string): Promise<RiuDisclosureExtension | null> {
    return this.prisma.riuDisclosureExtension.findUnique({
      where: { riuId },
    });
  }

  /**
   * Gets the disclosure extension or throws NotFoundException.
   */
  async getExtensionOrFail(riuId: string): Promise<RiuDisclosureExtension> {
    const extension = await this.getExtension(riuId);

    if (!extension) {
      throw new NotFoundException(
        `Disclosure extension not found for RIU ${riuId}`,
      );
    }

    return extension;
  }

  /**
   * Flags a conflict of interest on a disclosure.
   * Used when compliance review identifies a potential conflict.
   *
   * @param riuId - The RIU ID
   * @param reason - The reason for flagging as a conflict
   */
  async flagConflict(
    riuId: string,
    reason: string,
  ): Promise<RiuDisclosureExtension> {
    if (!reason) {
      throw new BadRequestException("Conflict reason is required");
    }

    // Verify extension exists
    await this.getExtensionOrFail(riuId);

    const updated = await this.prisma.riuDisclosureExtension.update({
      where: { riuId },
      data: {
        conflictDetected: true,
        conflictReason: reason,
      },
    });

    this.logger.log(`Flagged conflict for RIU ${riuId}: ${reason}`);

    return updated;
  }

  /**
   * Clears the conflict flag on a disclosure.
   * Used when compliance review determines no actual conflict exists.
   */
  async clearConflict(riuId: string): Promise<RiuDisclosureExtension> {
    // Verify extension exists
    await this.getExtensionOrFail(riuId);

    const updated = await this.prisma.riuDisclosureExtension.update({
      where: { riuId },
      data: {
        conflictDetected: false,
        conflictReason: null,
      },
    });

    this.logger.log(`Cleared conflict flag for RIU ${riuId}`);

    return updated;
  }

  /**
   * Gets all disclosures involving a specific person.
   * Used for conflict detection and pattern analysis.
   */
  async getDisclosuresByPerson(
    personId: string,
    organizationId: string,
  ): Promise<RiuDisclosureExtension[]> {
    return this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        relatedPersonId: personId,
      },
      include: {
        riu: {
          select: {
            id: true,
            referenceNumber: true,
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Gets all disclosures involving a specific company.
   * Used for vendor relationship analysis.
   */
  async getDisclosuresByCompany(
    companyName: string,
    organizationId: string,
  ): Promise<RiuDisclosureExtension[]> {
    return this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        relatedCompany: {
          contains: companyName,
          mode: "insensitive",
        },
      },
      include: {
        riu: {
          select: {
            id: true,
            referenceNumber: true,
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Gets all disclosures that triggered threshold limits.
   * Used for compliance review prioritization.
   */
  async getThresholdTriggeredDisclosures(
    organizationId: string,
  ): Promise<RiuDisclosureExtension[]> {
    return this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        thresholdTriggered: true,
      },
      include: {
        riu: {
          select: {
            id: true,
            referenceNumber: true,
            createdAt: true,
            status: true,
            severity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Gets all disclosures flagged with conflicts.
   * Used for compliance dashboard and reporting.
   */
  async getConflictFlaggedDisclosures(
    organizationId: string,
  ): Promise<RiuDisclosureExtension[]> {
    return this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        conflictDetected: true,
      },
      include: {
        riu: {
          select: {
            id: true,
            referenceNumber: true,
            createdAt: true,
            status: true,
            severity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Gets disclosure statistics by type for an organization.
   */
  async getDisclosureStatsByType(organizationId: string): Promise<
    {
      type: DisclosureType;
      count: number;
      thresholdTriggered: number;
      conflictDetected: number;
    }[]
  > {
    const stats = await this.prisma.riuDisclosureExtension.groupBy({
      by: ["disclosureType"],
      where: { organizationId },
      _count: true,
    });

    // Get threshold and conflict counts per type
    const thresholdCounts = await this.prisma.riuDisclosureExtension.groupBy({
      by: ["disclosureType"],
      where: {
        organizationId,
        thresholdTriggered: true,
      },
      _count: true,
    });

    const conflictCounts = await this.prisma.riuDisclosureExtension.groupBy({
      by: ["disclosureType"],
      where: {
        organizationId,
        conflictDetected: true,
      },
      _count: true,
    });

    // Build result map
    const thresholdMap = new Map(
      thresholdCounts.map((t) => [t.disclosureType, t._count]),
    );
    const conflictMap = new Map(
      conflictCounts.map((c) => [c.disclosureType, c._count]),
    );

    return stats.map((s) => ({
      type: s.disclosureType,
      count: s._count,
      thresholdTriggered: thresholdMap.get(s.disclosureType) ?? 0,
      conflictDetected: conflictMap.get(s.disclosureType) ?? 0,
    }));
  }

  /**
   * Gets the total disclosed value for an organization within a date range.
   */
  async getTotalDisclosedValue(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ total: Decimal; currency: string }[]> {
    const where: Prisma.RiuDisclosureExtensionWhereInput = {
      organizationId,
      disclosureValue: { not: null },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const results = await this.prisma.riuDisclosureExtension.groupBy({
      by: ["disclosureCurrency"],
      where,
      _sum: {
        disclosureValue: true,
      },
    });

    return results
      .filter((r) => r._sum.disclosureValue != null)
      .map((r) => ({
        total: r._sum.disclosureValue!,
        currency: r.disclosureCurrency ?? "USD",
      }));
  }
}
