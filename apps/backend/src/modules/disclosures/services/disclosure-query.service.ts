/**
 * DisclosureQueryService - Query operations for disclosures
 *
 * Handles all read operations and DTO mapping:
 * - Get single disclosure by ID
 * - Find many with filters and pagination
 * - DTO mapping for responses
 *
 * Extracted from DisclosureSubmissionService for maintainability.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Prisma, RiuStatus, DisclosureType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DisclosureResponseDto,
  DisclosureListItemDto,
  DisclosureListResponseDto,
  DisclosureQueryDto,
  DisclosureStatus,
} from "../dto/disclosure-submission.dto";
import { ConflictAlertDto, DismissalCategory } from "../dto/conflict.dto";

@Injectable()
export class DisclosureQueryService {
  private readonly logger = new Logger(DisclosureQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets a disclosure by ID.
   */
  async getDisclosure(
    disclosureId: string,
    organizationId: string,
  ): Promise<DisclosureResponseDto | null> {
    const extension = await this.prisma.riuDisclosureExtension.findFirst({
      where: {
        riuId: disclosureId,
        organizationId,
      },
      include: {
        riu: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            caseAssociations: {
              include: {
                case: {
                  select: { id: true, referenceNumber: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!extension) {
      return null;
    }

    // Get conflicts for this disclosure
    const conflicts = await this.prisma.conflictAlert.findMany({
      where: {
        disclosureId,
        organizationId,
      },
    });

    return this.mapExtensionToResponse(extension, conflicts);
  }

  /**
   * Finds disclosures with filters and pagination.
   */
  async findMany(
    query: DisclosureQueryDto,
    organizationId: string,
  ): Promise<DisclosureListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.RiuDisclosureExtensionWhereInput = {
      organizationId,
    };

    if (query.disclosureType) {
      where.disclosureType = query.disclosureType;
    }

    if (query.thresholdTriggered !== undefined) {
      where.thresholdTriggered = query.thresholdTriggered;
    }

    if (query.conflictDetected !== undefined) {
      where.conflictDetected = query.conflictDetected;
    }

    if (query.relatedCompany) {
      where.relatedCompany = {
        contains: query.relatedCompany,
        mode: "insensitive",
      };
    }

    if (query.relatedPersonName) {
      where.relatedPersonName = {
        contains: query.relatedPersonName,
        mode: "insensitive",
      };
    }

    if (query.submittedById) {
      where.riu = {
        ...(where.riu as Prisma.RiskIntelligenceUnitWhereInput),
        createdById: query.submittedById,
      };
    }

    if (query.campaignId) {
      // Filter by campaign via the campaign assignment relation
      const assignmentIds = await this.prisma.campaignAssignment.findMany({
        where: { organizationId, campaignId: query.campaignId },
        select: { id: true },
      });
      where.riu = {
        ...(where.riu as Prisma.RiskIntelligenceUnitWhereInput),
        campaignAssignmentId: { in: assignmentIds.map((a) => a.id) },
      };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      where.OR = [
        { relatedCompany: { contains: query.search, mode: "insensitive" } },
        { relatedPersonName: { contains: query.search, mode: "insensitive" } },
        {
          riu: {
            referenceNumber: { contains: query.search, mode: "insensitive" },
          },
        },
      ];
    }

    // Determine sort field
    let orderBy: Prisma.RiuDisclosureExtensionOrderByWithRelationInput = {
      createdAt: "desc",
    };
    if (query.sortBy) {
      const order = query.sortOrder ?? "desc";
      switch (query.sortBy) {
        case "disclosureValue":
          orderBy = { disclosureValue: order };
          break;
        case "disclosureType":
          orderBy = { disclosureType: order };
          break;
        case "submittedAt":
        case "createdAt":
        default:
          orderBy = { createdAt: order };
          break;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.riuDisclosureExtension.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          riu: {
            select: {
              id: true,
              referenceNumber: true,
              status: true,
              createdAt: true,
              createdBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              // This would require a relation to ConflictAlert which may not exist
            },
          },
        },
      }),
      this.prisma.riuDisclosureExtension.count({ where }),
    ]);

    // Get conflict counts for each disclosure
    const disclosureIds = items.map((i) => i.riuId);
    const conflictCounts = await this.prisma.conflictAlert.groupBy({
      by: ["disclosureId"],
      where: {
        disclosureId: { in: disclosureIds },
        organizationId,
      },
      _count: true,
    });

    const conflictCountMap = new Map(
      conflictCounts.map((c) => [c.disclosureId, c._count]),
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      items: items.map((item) =>
        this.mapExtensionToListItem(
          item,
          conflictCountMap.get(item.riuId) ?? 0,
        ),
      ),
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Determines disclosure status from RIU status.
   */
  determineStatus(riuStatus: RiuStatus): DisclosureStatus {
    switch (riuStatus) {
      case RiuStatus.COMPLETED:
        return DisclosureStatus.APPROVED;
      case RiuStatus.CLOSED:
        return DisclosureStatus.REJECTED;
      case RiuStatus.RELEASED:
        return DisclosureStatus.UNDER_REVIEW;
      default:
        return DisclosureStatus.SUBMITTED;
    }
  }

  /**
   * Maps extension to response DTO.
   */
  mapExtensionToResponse(
    extension: {
      riuId: string;
      organizationId: string;
      disclosureType: DisclosureType;
      disclosureSubtype: string | null;
      disclosureValue: Decimal | null;
      disclosureCurrency: string | null;
      estimatedAnnualValue: Decimal | null;
      thresholdTriggered: boolean;
      thresholdAmount: Decimal | null;
      conflictDetected: boolean;
      conflictReason: string | null;
      relatedPersonId: string | null;
      relatedPersonName: string | null;
      relatedCompany: string | null;
      relationshipType: string | null;
      effectiveDate: Date | null;
      expirationDate: Date | null;
      formTemplateId: string | null;
      formVersion: number | null;
      createdAt: Date;
      riu: {
        id: string;
        referenceNumber: string;
        status: RiuStatus;
        organizationId: string;
        createdAt: Date;
        createdById: string;
        formResponses: Prisma.JsonValue;
        campaignId: string | null;
        campaignAssignmentId: string | null;
        caseAssociations?: Array<{
          case: {
            id: string;
            referenceNumber: string;
          };
        }>;
      };
    },
    conflicts: Array<{
      id: string;
      organizationId: string;
      disclosureId: string;
      conflictType: string;
      severity: string;
      status: string;
      summary: string;
      matchedEntity: string;
      matchConfidence: number;
      matchDetails: Prisma.JsonValue;
      severityFactors: Prisma.JsonValue | null;
      dismissedCategory: string | null;
      dismissedReason: string | null;
      dismissedBy: string | null;
      dismissedAt: Date | null;
      escalatedToCaseId: string | null;
      exclusionId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): DisclosureResponseDto {
    const riu = extension.riu;
    const status = this.determineStatus(riu.status);

    // Get case info if linked
    const caseAssoc = riu.caseAssociations?.[0];

    return {
      id: riu.id,
      referenceNumber: riu.referenceNumber,
      organizationId: riu.organizationId,
      status,
      disclosureType: extension.disclosureType,
      disclosureSubtype: extension.disclosureSubtype ?? undefined,
      disclosureValue: extension.disclosureValue
        ? Number(extension.disclosureValue)
        : undefined,
      disclosureCurrency: extension.disclosureCurrency ?? undefined,
      estimatedAnnualValue: extension.estimatedAnnualValue
        ? Number(extension.estimatedAnnualValue)
        : undefined,
      thresholdTriggered: extension.thresholdTriggered,
      thresholdAmount: extension.thresholdAmount
        ? Number(extension.thresholdAmount)
        : undefined,
      conflictDetected: extension.conflictDetected,
      conflictReason: extension.conflictReason ?? undefined,
      relatedPersonId: extension.relatedPersonId ?? undefined,
      relatedPersonName: extension.relatedPersonName ?? undefined,
      relatedCompany: extension.relatedCompany ?? undefined,
      relationshipType: extension.relationshipType ?? undefined,
      effectiveDate: extension.effectiveDate ?? undefined,
      expirationDate: extension.expirationDate ?? undefined,
      formTemplateId: extension.formTemplateId ?? undefined,
      formVersion: extension.formVersion ?? undefined,
      formData: (riu.formResponses as Record<string, unknown>) ?? {},
      campaignId: riu.campaignId ?? undefined,
      campaignAssignmentId: riu.campaignAssignmentId ?? undefined,
      thresholdEvaluation: undefined, // Not loaded in query
      conflicts: conflicts.map((c) => this.mapConflictToDto(c)),
      caseId: caseAssoc?.case?.id,
      caseReferenceNumber: caseAssoc?.case?.referenceNumber,
      createdAt: riu.createdAt,
      updatedAt: extension.createdAt,
      submittedAt: riu.createdAt,
      submittedById: riu.createdById,
    };
  }

  /**
   * Maps extension to list item DTO.
   */
  mapExtensionToListItem(
    extension: {
      riuId: string;
      createdAt: Date;
      disclosureType: DisclosureType;
      disclosureSubtype: string | null;
      disclosureValue: Decimal | null;
      disclosureCurrency: string | null;
      relatedCompany: string | null;
      relatedPersonName: string | null;
      thresholdTriggered: boolean;
      conflictDetected: boolean;
      riu: {
        id: string;
        referenceNumber: string;
        status: RiuStatus;
        createdAt: Date;
        createdBy?: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
        };
      };
    },
    conflictCount: number,
  ): DisclosureListItemDto {
    const riu = extension.riu;
    const status = this.determineStatus(riu.status);

    return {
      id: riu.id,
      referenceNumber: riu.referenceNumber,
      status,
      disclosureType: extension.disclosureType,
      disclosureSubtype: extension.disclosureSubtype ?? undefined,
      disclosureValue: extension.disclosureValue
        ? Number(extension.disclosureValue)
        : undefined,
      disclosureCurrency: extension.disclosureCurrency ?? undefined,
      relatedCompany: extension.relatedCompany ?? undefined,
      relatedPersonName: extension.relatedPersonName ?? undefined,
      thresholdTriggered: extension.thresholdTriggered,
      conflictDetected: extension.conflictDetected,
      conflictCount,
      createdAt: extension.createdAt,
      submittedAt: riu.createdAt,
      submittedBy: riu.createdBy ?? {
        id: "",
        firstName: "",
        lastName: "",
        email: "",
      },
    };
  }

  /**
   * Maps conflict alert to DTO.
   */
  mapConflictToDto(conflict: {
    id: string;
    organizationId: string;
    disclosureId: string;
    conflictType: string;
    severity: string;
    status: string;
    summary: string;
    matchedEntity: string;
    matchConfidence: number;
    matchDetails: Prisma.JsonValue;
    severityFactors: Prisma.JsonValue | null;
    dismissedCategory: string | null;
    dismissedReason: string | null;
    dismissedBy: string | null;
    dismissedAt: Date | null;
    escalatedToCaseId: string | null;
    exclusionId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ConflictAlertDto {
    return {
      id: conflict.id,
      organizationId: conflict.organizationId,
      disclosureId: conflict.disclosureId,
      conflictType: conflict.conflictType as ConflictAlertDto["conflictType"],
      severity: conflict.severity as ConflictAlertDto["severity"],
      status: conflict.status as ConflictAlertDto["status"],
      summary: conflict.summary,
      matchedEntity: conflict.matchedEntity,
      matchConfidence: conflict.matchConfidence,
      matchDetails: conflict.matchDetails as ConflictAlertDto["matchDetails"],
      severityFactors: conflict.severityFactors
        ? (conflict.severityFactors as unknown as ConflictAlertDto["severityFactors"])
        : undefined,
      dismissedCategory:
        (conflict.dismissedCategory as DismissalCategory | undefined) ??
        undefined,
      dismissedReason: conflict.dismissedReason ?? undefined,
      dismissedBy: conflict.dismissedBy ?? undefined,
      dismissedAt: conflict.dismissedAt ?? undefined,
      escalatedToCaseId: conflict.escalatedToCaseId ?? undefined,
      exclusionId: conflict.exclusionId ?? undefined,
      createdAt: conflict.createdAt,
      updatedAt: conflict.updatedAt,
    };
  }
}
