/**
 * ConflictExclusionService - Manages conflict exclusions
 *
 * Handles exclusion creation, checking, and lifecycle:
 * - Creating exclusions (from dismissals or directly)
 * - Checking if a conflict is excluded
 * - Querying and deactivating exclusions
 *
 * Extracted from ConflictDetectionService for maintainability.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  ConflictType,
  ExclusionScope,
  ConflictExclusion,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ConflictExclusionDto, CreateExclusionDto } from "../dto/conflict.dto";
import { ConflictMatchingService } from "./conflict-matching.service";

@Injectable()
export class ConflictExclusionService {
  private readonly logger = new Logger(ConflictExclusionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingService: ConflictMatchingService,
  ) {}

  // Exclusion Creation

  /**
   * Creates a conflict exclusion.
   */
  async createExclusion(
    dto: CreateExclusionDto,
    userId: string,
    organizationId: string,
    sourceAlertId?: string,
  ): Promise<ConflictExclusion> {
    // Check for existing active exclusion
    const existing = await this.prisma.conflictExclusion.findFirst({
      where: {
        organizationId,
        personId: dto.personId,
        matchedEntity: dto.matchedEntity,
        conflictType: dto.conflictType,
        isActive: true,
      },
    });

    if (existing) {
      throw new BadRequestException(
        "An active exclusion already exists for this combination",
      );
    }

    const exclusion = await this.prisma.conflictExclusion.create({
      data: {
        organizationId,
        personId: dto.personId,
        matchedEntity: dto.matchedEntity,
        conflictType: dto.conflictType,
        reason: dto.reason,
        notes: dto.notes,
        scope: dto.scope ?? ExclusionScope.PERMANENT,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdBy: userId,
        createdFromAlertId: sourceAlertId,
      },
    });

    this.logger.log(
      `Created exclusion ${exclusion.id} for person ${dto.personId} + entity "${dto.matchedEntity}"`,
    );

    return exclusion;
  }

  // Exclusion Checking

  /**
   * Checks if a conflict is excluded by an active exclusion.
   */
  async isExcluded(
    personId: string,
    matchedEntity: string,
    conflictType: ConflictType,
    organizationId: string,
  ): Promise<{ excluded: boolean; exclusionId?: string }> {
    const exclusion = await this.prisma.conflictExclusion.findFirst({
      where: {
        organizationId,
        personId,
        conflictType,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!exclusion) {
      return { excluded: false };
    }

    // Check fuzzy match on entity name
    const match = this.matchingService.fuzzyMatch(
      matchedEntity,
      exclusion.matchedEntity,
    );
    if (match.confidence >= 90) {
      // If ONE_TIME scope, mark as used
      if (exclusion.scope === ExclusionScope.ONE_TIME) {
        await this.prisma.conflictExclusion.update({
          where: { id: exclusion.id },
          data: { isActive: false },
        });
      }

      return { excluded: true, exclusionId: exclusion.id };
    }

    return { excluded: false };
  }

  // Query Methods

  /**
   * Finds exclusions with pagination and filters.
   */
  async findExclusions(
    organizationId: string,
    options: {
      personId?: string;
      conflictType?: ConflictType;
      activeOnly?: boolean;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{
    items: ConflictExclusionDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ConflictExclusionWhereInput = {
      organizationId,
    };

    if (options.personId) {
      where.personId = options.personId;
    }

    if (options.conflictType) {
      where.conflictType = options.conflictType;
    }

    if (options.activeOnly) {
      where.isActive = true;
    }

    const [items, total] = await Promise.all([
      this.prisma.conflictExclusion.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.conflictExclusion.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapExclusionToDto(item)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Deactivates an exclusion (soft delete).
   */
  async deactivateExclusion(
    exclusionId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const exclusion = await this.prisma.conflictExclusion.findFirst({
      where: { id: exclusionId, organizationId },
    });

    if (!exclusion) {
      throw new NotFoundException(`Exclusion ${exclusionId} not found`);
    }

    await this.prisma.conflictExclusion.update({
      where: { id: exclusionId },
      data: { isActive: false },
    });

    this.logger.log(`Deactivated exclusion ${exclusionId}`);
  }

  // Helpers

  /**
   * Maps a ConflictExclusion to DTO.
   */
  mapExclusionToDto(exclusion: ConflictExclusion): ConflictExclusionDto {
    return {
      id: exclusion.id,
      organizationId: exclusion.organizationId,
      personId: exclusion.personId,
      matchedEntity: exclusion.matchedEntity,
      conflictType: exclusion.conflictType,
      reason: exclusion.reason,
      notes: exclusion.notes ?? undefined,
      scope: exclusion.scope,
      expiresAt: exclusion.expiresAt ?? undefined,
      isActive: exclusion.isActive,
      createdBy: exclusion.createdBy,
      createdFromAlertId: exclusion.createdFromAlertId ?? undefined,
      createdAt: exclusion.createdAt,
      updatedAt: exclusion.updatedAt,
    };
  }
}
