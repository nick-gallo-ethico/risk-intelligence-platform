import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { SegmentQueryBuilder } from "./segment-query.builder";
import {
  CreateSegmentDto,
  UpdateSegmentDto,
  SegmentCriteria,
} from "../dto/segment-criteria.dto";
import {
  Segment,
  Employee,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";

export interface SegmentPreview {
  totalCount: number;
  sampleEmployees: Pick<
    Employee,
    "id" | "firstName" | "lastName" | "email" | "jobTitle"
  >[];
}

@Injectable()
export class SegmentService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private queryBuilder: SegmentQueryBuilder,
  ) {}

  /**
   * Create a new segment.
   */
  async create(
    dto: CreateSegmentDto,
    userId: string,
    organizationId: string,
  ): Promise<Segment> {
    // Validate criteria
    const errors = this.queryBuilder.validateCriteria(dto.criteria);
    if (errors.length > 0) {
      throw new BadRequestException(`Invalid segment criteria: ${errors.join(", ")}`);
    }

    // Calculate initial audience size
    const preview = await this.previewAudience(
      dto.criteria,
      organizationId,
    );

    const segment = await this.prisma.segment.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        criteria: dto.criteria as object,
        isActive: dto.isActive ?? true,
        estimatedAudienceSize: preview.totalCount,
        audienceSizeUpdatedAt: new Date(),
        createdById: userId,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.SEGMENT,
      entityId: segment.id,
      action: "created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Created segment "${dto.name}" targeting ${preview.totalCount} employees`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return segment;
  }

  /**
   * Find all segments for an organization.
   */
  async findAll(
    organizationId: string,
    options?: {
      activeOnly?: boolean;
      skip?: number;
      take?: number;
    },
  ): Promise<{ segments: Segment[]; total: number }> {
    const where = {
      organizationId,
      ...(options?.activeOnly && { isActive: true }),
    };

    const [segments, total] = await Promise.all([
      this.prisma.segment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: options?.skip,
        take: options?.take,
      }),
      this.prisma.segment.count({ where }),
    ]);

    return { segments, total };
  }

  /**
   * Find a segment by ID.
   */
  async findOne(id: string, organizationId: string): Promise<Segment> {
    const segment = await this.prisma.segment.findFirst({
      where: { id, organizationId },
    });

    if (!segment) {
      throw new NotFoundException(`Segment with ID ${id} not found`);
    }

    return segment;
  }

  /**
   * Update a segment.
   */
  async update(
    id: string,
    dto: UpdateSegmentDto,
    userId: string,
    organizationId: string,
  ): Promise<Segment> {
    const existing = await this.findOne(id, organizationId);

    // Validate new criteria if provided
    if (dto.criteria) {
      const errors = this.queryBuilder.validateCriteria(dto.criteria);
      if (errors.length > 0) {
        throw new BadRequestException(`Invalid segment criteria: ${errors.join(", ")}`);
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedById: userId,
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.criteria !== undefined) {
      updateData.criteria = dto.criteria as object;

      // Recalculate audience size
      const preview = await this.previewAudience(dto.criteria, organizationId);
      updateData.estimatedAudienceSize = preview.totalCount;
      updateData.audienceSizeUpdatedAt = new Date();
    }

    const segment = await this.prisma.segment.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.SEGMENT,
      entityId: segment.id,
      action: "updated",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Updated segment "${segment.name}"`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    return segment;
  }

  /**
   * Delete a segment (soft delete by setting isActive = false).
   * Hard delete is prevented if segment is used by campaigns.
   */
  async remove(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const segment = await this.findOne(id, organizationId);

    // Check if segment is used by any campaigns
    const campaignCount = await this.prisma.campaign.count({
      where: { segmentId: id },
    });

    if (campaignCount > 0) {
      // Soft delete - keep for historical reference
      await this.prisma.segment.update({
        where: { id },
        data: { isActive: false, updatedById: userId },
      });

      await this.auditService.log({
        organizationId,
        entityType: AuditEntityType.SEGMENT,
        entityId: id,
        action: "deactivated",
        actionCategory: AuditActionCategory.UPDATE,
        actionDescription: `Deactivated segment "${segment.name}" (used by ${campaignCount} campaigns)`,
        actorUserId: userId,
        actorType: ActorType.USER,
      });
    } else {
      // Hard delete if not used
      await this.prisma.segment.delete({ where: { id } });

      await this.auditService.log({
        organizationId,
        entityType: AuditEntityType.SEGMENT,
        entityId: id,
        action: "deleted",
        actionCategory: AuditActionCategory.DELETE,
        actionDescription: `Deleted segment "${segment.name}"`,
        actorUserId: userId,
        actorType: ActorType.USER,
      });
    }
  }

  /**
   * Preview audience for segment criteria without saving.
   * Returns count and sample of matching employees.
   */
  async previewAudience(
    criteria: SegmentCriteria,
    organizationId: string,
    sampleSize: number = 10,
  ): Promise<SegmentPreview> {
    const where = this.queryBuilder.buildWhereClause(criteria, organizationId);

    const [totalCount, sampleEmployees] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
        },
        take: sampleSize,
        orderBy: { lastName: "asc" },
      }),
    ]);

    return { totalCount, sampleEmployees };
  }

  /**
   * Evaluate a saved segment and return matching employee IDs.
   * Used when launching a campaign.
   */
  async evaluateSegment(
    segmentId: string,
    organizationId: string,
  ): Promise<string[]> {
    const segment = await this.findOne(segmentId, organizationId);
    const criteria = segment.criteria as unknown as SegmentCriteria;
    const where = this.queryBuilder.buildWhereClause(criteria, organizationId);

    const employees = await this.prisma.employee.findMany({
      where,
      select: { id: true },
    });

    // Update cached audience size
    await this.prisma.segment.update({
      where: { id: segmentId },
      data: {
        estimatedAudienceSize: employees.length,
        audienceSizeUpdatedAt: new Date(),
      },
    });

    return employees.map((e) => e.id);
  }

  /**
   * Refresh audience size for a segment.
   */
  async refreshAudienceSize(
    segmentId: string,
    organizationId: string,
  ): Promise<number> {
    const segment = await this.findOne(segmentId, organizationId);
    const criteria = segment.criteria as unknown as SegmentCriteria;
    const where = this.queryBuilder.buildWhereClause(criteria, organizationId);

    const count = await this.prisma.employee.count({ where });

    await this.prisma.segment.update({
      where: { id: segmentId },
      data: {
        estimatedAudienceSize: count,
        audienceSizeUpdatedAt: new Date(),
      },
    });

    return count;
  }

  /**
   * Get employees matching a segment with full details.
   * Supports pagination for large audiences.
   */
  async getSegmentEmployees(
    segmentId: string,
    organizationId: string,
    options?: { skip?: number; take?: number },
  ): Promise<{ employees: Employee[]; total: number }> {
    const segment = await this.findOne(segmentId, organizationId);
    const criteria = segment.criteria as unknown as SegmentCriteria;
    const where = this.queryBuilder.buildWhereClause(criteria, organizationId);

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: options?.skip,
        take: options?.take,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { employees, total };
  }
}
