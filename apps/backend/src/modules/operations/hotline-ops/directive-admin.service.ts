/**
 * DirectiveAdminService - Cross-Tenant Directive Management
 *
 * Manages client-specific directives (scripts) for hotline operations.
 * Unlike DirectivesService (client-facing), this service operates across
 * tenants for internal Ethico staff.
 *
 * Key features:
 * - Cross-tenant directive listing and management
 * - Version tracking for directive changes
 * - Approval workflow for client-submitted drafts
 * - Full audit logging for compliance
 *
 * Per CONTEXT.md:
 * - "Both edit directives, Ethico approves" - clients can draft, Ethico publishes
 * - All cross-tenant operations are fully audited
 */

import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { CreateDirectiveDto, UpdateDirectiveDto } from "./dto/hotline-ops.dto";
import { DirectiveStage, Prisma } from "@prisma/client";

/** Directive with category and organization relations */
export interface DirectiveWithRelations {
  id: string;
  organizationId: string;
  stage: DirectiveStage;
  categoryId: string | null;
  title: string;
  content: string;
  isReadAloud: boolean;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string } | null;
  organization?: { id: string; name: string } | null;
}

/** Paginated directive listing result */
export interface DirectiveListResult {
  items: DirectiveWithRelations[];
  total: number;
}

@Injectable()
export class DirectiveAdminService {
  private readonly logger = new Logger(DirectiveAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a directive (with optional draft status for client-submitted).
   * Drafts require Ethico approval before becoming active.
   *
   * @param dto - Create data
   * @param createdById - Internal user ID creating the directive
   * @returns Created directive
   */
  async createDirective(
    dto: CreateDirectiveDto,
    createdById: string,
  ): Promise<DirectiveWithRelations> {
    // Validate category if CATEGORY_SPECIFIC
    if (dto.stage === "CATEGORY_SPECIFIC" && !dto.categoryId) {
      throw new BadRequestException(
        "categoryId required for CATEGORY_SPECIFIC stage",
      );
    }

    // Validate category exists in the organization if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          organizationId: dto.organizationId,
        },
      });
      if (!category) {
        throw new NotFoundException(`Category not found: ${dto.categoryId}`);
      }
    }

    // Get max order for this stage to auto-increment
    const maxOrder = await this.prisma.clientDirective.aggregate({
      where: {
        organizationId: dto.organizationId,
        stage: dto.stage as DirectiveStage,
      },
      _max: { order: true },
    });

    const directive = await this.prisma.clientDirective.create({
      data: {
        organizationId: dto.organizationId,
        stage: dto.stage as DirectiveStage,
        categoryId: dto.categoryId || null,
        title: dto.title,
        content: dto.content,
        isReadAloud: dto.isReadAloud ?? false,
        order: (maxOrder._max.order ?? -1) + 1,
        // Drafts are not active until approved
        isActive: !(dto.isDraft ?? false),
      },
      include: {
        category: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      organizationId: dto.organizationId,
      entityType: "RIU", // Using RIU as DIRECTIVE not in enum
      entityId: directive.id,
      action: "DIRECTIVE_CREATED",
      actionCategory: "CREATE",
      actionDescription: `Created directive: ${dto.title}${dto.isDraft ? " (draft)" : ""}`,
      actorUserId: createdById,
      actorType: "USER",
    });

    this.logger.log(
      `Created directive ${directive.id} for org ${dto.organizationId}: ${dto.title}`,
    );

    return directive as DirectiveWithRelations;
  }

  /**
   * Update a directive with version tracking.
   * Archives current content before updating.
   *
   * @param directiveId - Directive ID to update
   * @param dto - Update data
   * @param updatedById - Internal user ID performing the update
   * @returns Updated directive
   */
  async updateDirective(
    directiveId: string,
    dto: UpdateDirectiveDto,
    updatedById: string,
  ): Promise<DirectiveWithRelations> {
    const current = await this.prisma.clientDirective.findUnique({
      where: { id: directiveId },
    });

    if (!current) {
      throw new NotFoundException("Directive not found");
    }

    // Build update data
    const updateData: Prisma.ClientDirectiveUpdateInput = {
      updatedAt: new Date(),
    };

    // Track changes for audit
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    if (dto.title !== undefined && dto.title !== current.title) {
      updateData.title = dto.title;
      changes.title = { old: current.title, new: dto.title };
    }
    if (dto.content !== undefined && dto.content !== current.content) {
      updateData.content = dto.content;
      changes.content = { old: current.content, new: dto.content };
    }
    if (
      dto.isReadAloud !== undefined &&
      dto.isReadAloud !== current.isReadAloud
    ) {
      updateData.isReadAloud = dto.isReadAloud;
      changes.isReadAloud = { old: current.isReadAloud, new: dto.isReadAloud };
    }
    if (dto.isActive !== undefined && dto.isActive !== current.isActive) {
      updateData.isActive = dto.isActive;
      changes.isActive = { old: current.isActive, new: dto.isActive };
    }

    // Ethico approval: publish a client draft
    if (dto.approveAndPublish) {
      updateData.isActive = true;
      changes.approved = { old: false, new: true };
    }

    const updated = await this.prisma.clientDirective.update({
      where: { id: directiveId },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } },
      },
    });

    const action = dto.approveAndPublish
      ? "DIRECTIVE_APPROVED"
      : "DIRECTIVE_UPDATED";
    await this.auditService.log({
      organizationId: current.organizationId,
      entityType: "RIU", // Using RIU as DIRECTIVE not in enum
      entityId: directiveId,
      action,
      actionCategory: "UPDATE",
      actionDescription: `${dto.approveAndPublish ? "Approved and published" : "Updated"} directive: ${updated.title}`,
      actorUserId: updatedById,
      actorType: "USER",
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });

    this.logger.log(`${action} directive ${directiveId}: ${updated.title}`);

    return updated as DirectiveWithRelations;
  }

  /**
   * Delete a directive (soft delete by setting isActive = false).
   *
   * @param directiveId - Directive ID to delete
   * @param deletedById - Internal user ID performing the deletion
   */
  async deleteDirective(
    directiveId: string,
    deletedById: string,
  ): Promise<void> {
    const current = await this.prisma.clientDirective.findUnique({
      where: { id: directiveId },
    });

    if (!current) {
      throw new NotFoundException("Directive not found");
    }

    await this.prisma.clientDirective.update({
      where: { id: directiveId },
      data: { isActive: false },
    });

    await this.auditService.log({
      organizationId: current.organizationId,
      entityType: "RIU",
      entityId: directiveId,
      action: "DIRECTIVE_DELETED",
      actionCategory: "DELETE",
      actionDescription: `Soft deleted directive: ${current.title}`,
      actorUserId: deletedById,
      actorType: "USER",
    });

    this.logger.log(`Soft deleted directive ${directiveId}`);
  }

  /**
   * List all directives across tenants (for global management).
   * Supports filtering by organization, stage, and active status.
   *
   * @param filters - Query filters
   * @returns Paginated list of directives
   */
  async listAllDirectives(filters: {
    organizationId?: string;
    stage?: string;
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<DirectiveListResult> {
    const where: Prisma.ClientDirectiveWhereInput = {};

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }
    if (filters.stage) {
      where.stage = filters.stage as DirectiveStage;
    }
    if (!filters.includeInactive) {
      where.isActive = true;
    }

    const [items, total] = await Promise.all([
      this.prisma.clientDirective.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          organization: { select: { id: true, name: true } },
        },
        orderBy: [
          { organizationId: "asc" },
          { stage: "asc" },
          { order: "asc" },
        ],
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.clientDirective.count({ where }),
    ]);

    return {
      items: items as DirectiveWithRelations[],
      total,
    };
  }

  /**
   * Get a single directive by ID (cross-tenant).
   *
   * @param directiveId - Directive ID
   * @returns Directive with relations
   */
  async getDirective(directiveId: string): Promise<DirectiveWithRelations> {
    const directive = await this.prisma.clientDirective.findUnique({
      where: { id: directiveId },
      include: {
        category: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } },
      },
    });

    if (!directive) {
      throw new NotFoundException("Directive not found");
    }

    return directive as DirectiveWithRelations;
  }

  /**
   * Get pending drafts awaiting Ethico approval.
   * Returns inactive directives that need review.
   *
   * @param limit - Max items to return
   * @returns List of pending draft directives
   */
  async getPendingDrafts(limit = 50): Promise<DirectiveWithRelations[]> {
    const drafts = await this.prisma.clientDirective.findMany({
      where: {
        isActive: false,
      },
      include: {
        category: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return drafts as DirectiveWithRelations[];
  }
}
