/**
 * DirectivesService - Client-Specific Script Management
 *
 * Manages client-specific scripts (directives) that operators read during hotline calls.
 * Directives ensure operators follow client-specific legal and compliance requirements.
 *
 * Key features:
 * - Stage-based retrieval (opening, intake, category-specific, closing)
 * - Category-specific directives for specialized guidance
 * - Read-aloud flag for verbatim requirements
 * - Ordering support for multiple directives per stage
 *
 * Example directives:
 * - "HIPAA Disclosure Warning" (read-aloud, healthcare category)
 * - "Welcome Script" (opening stage)
 * - "Anonymous Reporting Assurance" (closing stage)
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ClientDirective,
  DirectiveStage,
  Prisma,
} from '@prisma/client';
import {
  CreateDirectiveDto,
  UpdateDirectiveDto,
} from './dto/directives.dto';
import {
  CallDirectives,
  DirectiveWithCategory,
  DirectivesByStage,
  GetDirectivesOptions,
} from './types/directives.types';

@Injectable()
export class DirectivesService {
  private readonly logger = new Logger(DirectivesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get directives for a specific stage.
   * Returns active directives sorted by order.
   *
   * @param organizationId - Client organization ID
   * @param stage - Directive stage (OPENING, INTAKE, CATEGORY_SPECIFIC, CLOSING)
   * @param categoryId - Category ID (required for CATEGORY_SPECIFIC stage)
   * @returns Array of directives with category relation
   */
  async getDirectivesForStage(
    organizationId: string,
    stage: DirectiveStage,
    categoryId?: string,
  ): Promise<DirectiveWithCategory[]> {
    const where: Prisma.ClientDirectiveWhereInput = {
      organizationId,
      stage,
      isActive: true,
    };

    // For CATEGORY_SPECIFIC, filter by categoryId
    if (stage === DirectiveStage.CATEGORY_SPECIFIC) {
      if (!categoryId) {
        return []; // No category selected, return empty
      }
      where.categoryId = categoryId;
    }

    const directives = await this.prisma.clientDirective.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    return directives as DirectiveWithCategory[];
  }

  /**
   * Get all directives needed for a call in one query.
   * Groups directives by stage for easy UI consumption.
   *
   * @param organizationId - Client organization ID
   * @param categoryId - Category ID (optional, for category-specific directives)
   * @returns CallDirectives with all stages populated
   */
  async getDirectivesForCall(
    organizationId: string,
    categoryId?: string,
  ): Promise<CallDirectives> {
    // Query all active directives for this organization in one query
    const where: Prisma.ClientDirectiveWhereInput = {
      organizationId,
      isActive: true,
      // Exclude CATEGORY_SPECIFIC unless categoryId is provided
      OR: [
        { stage: { not: DirectiveStage.CATEGORY_SPECIFIC } },
        ...(categoryId
          ? [{ stage: DirectiveStage.CATEGORY_SPECIFIC, categoryId }]
          : []),
      ],
    };

    const directives = await this.prisma.clientDirective.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Group by stage
    const grouped: CallDirectives = {
      opening: [],
      intake: [],
      categorySpecific: [],
      closing: [],
    };

    for (const directive of directives) {
      const d = directive as DirectiveWithCategory;
      switch (d.stage) {
        case DirectiveStage.OPENING:
          grouped.opening.push(d);
          break;
        case DirectiveStage.INTAKE:
          grouped.intake.push(d);
          break;
        case DirectiveStage.CATEGORY_SPECIFIC:
          grouped.categorySpecific.push(d);
          break;
        case DirectiveStage.CLOSING:
          grouped.closing.push(d);
          break;
      }
    }

    return grouped;
  }

  /**
   * Get all directives for admin management.
   * Returns all directives grouped by stage, including inactive ones.
   *
   * @param organizationId - Client organization ID
   * @param options - Query options (includeInactive, categoryId filter)
   * @returns DirectivesByStage with all stages
   */
  async getAllDirectives(
    organizationId: string,
    options?: GetDirectivesOptions,
  ): Promise<DirectivesByStage> {
    const where: Prisma.ClientDirectiveWhereInput = {
      organizationId,
    };

    // Filter by active status unless includeInactive is true
    if (!options?.includeInactive) {
      where.isActive = true;
    }

    // Filter by category if provided
    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }

    const directives = await this.prisma.clientDirective.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ stage: 'asc' }, { order: 'asc' }],
    });

    // Group by stage
    const grouped: DirectivesByStage = {
      [DirectiveStage.OPENING]: [],
      [DirectiveStage.INTAKE]: [],
      [DirectiveStage.CATEGORY_SPECIFIC]: [],
      [DirectiveStage.CLOSING]: [],
    };

    for (const directive of directives) {
      grouped[directive.stage].push(directive as DirectiveWithCategory);
    }

    return grouped;
  }

  /**
   * Create a new directive.
   * Auto-assigns order as max(order) + 1 for the stage.
   *
   * @param organizationId - Client organization ID
   * @param dto - Create data
   * @returns Created directive with category relation
   */
  async create(
    organizationId: string,
    dto: CreateDirectiveDto,
  ): Promise<DirectiveWithCategory> {
    // Validate categoryId is required when stage is CATEGORY_SPECIFIC
    if (dto.stage === DirectiveStage.CATEGORY_SPECIFIC && !dto.categoryId) {
      throw new BadRequestException(
        'categoryId is required when stage is CATEGORY_SPECIFIC',
      );
    }

    // Validate categoryId exists in the organization
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          organizationId,
        },
      });

      if (!category) {
        throw new NotFoundException(
          `Category not found: ${dto.categoryId}`,
        );
      }
    }

    // Auto-calculate order as max + 1 for the stage
    const maxOrder = await this.prisma.clientDirective.aggregate({
      where: {
        organizationId,
        stage: dto.stage,
      },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const directive = await this.prisma.clientDirective.create({
      data: {
        organizationId,
        stage: dto.stage,
        categoryId: dto.categoryId || null,
        title: dto.title,
        content: dto.content,
        isReadAloud: dto.isReadAloud ?? false,
        order: nextOrder,
        isActive: true,
      },
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    this.logger.log(
      `Created directive ${directive.id} for org ${organizationId}: ${directive.title}`,
    );

    return directive as DirectiveWithCategory;
  }

  /**
   * Update an existing directive.
   * Clears categoryId if stage changes from CATEGORY_SPECIFIC.
   *
   * @param id - Directive ID
   * @param organizationId - Client organization ID (for authorization)
   * @param dto - Update data
   * @returns Updated directive with category relation
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateDirectiveDto,
  ): Promise<DirectiveWithCategory> {
    // Verify directive exists and belongs to organization
    const existing = await this.prisma.clientDirective.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Directive not found: ${id}`);
    }

    // Determine effective stage (new or existing)
    const effectiveStage = dto.stage ?? existing.stage;

    // Validate categoryId when stage is/becomes CATEGORY_SPECIFIC
    if (effectiveStage === DirectiveStage.CATEGORY_SPECIFIC) {
      const effectiveCategoryId = dto.categoryId ?? existing.categoryId;
      if (!effectiveCategoryId) {
        throw new BadRequestException(
          'categoryId is required when stage is CATEGORY_SPECIFIC',
        );
      }
    }

    // Validate categoryId exists if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          organizationId,
        },
      });

      if (!category) {
        throw new NotFoundException(
          `Category not found: ${dto.categoryId}`,
        );
      }
    }

    // Build update data
    const updateData: Prisma.ClientDirectiveUpdateInput = {};

    if (dto.stage !== undefined) {
      updateData.stage = dto.stage;

      // Clear category if stage changes from CATEGORY_SPECIFIC
      if (
        existing.stage === DirectiveStage.CATEGORY_SPECIFIC &&
        dto.stage !== DirectiveStage.CATEGORY_SPECIFIC
      ) {
        updateData.category = { disconnect: true };
      }
    }

    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        updateData.category = { connect: { id: dto.categoryId } };
      } else {
        updateData.category = { disconnect: true };
      }
    }

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.isReadAloud !== undefined) updateData.isReadAloud = dto.isReadAloud;
    if (dto.order !== undefined) updateData.order = dto.order;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const directive = await this.prisma.clientDirective.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    this.logger.log(
      `Updated directive ${directive.id}: ${directive.title}`,
    );

    return directive as DirectiveWithCategory;
  }

  /**
   * Soft delete a directive by setting isActive = false.
   *
   * @param id - Directive ID
   * @param organizationId - Client organization ID (for authorization)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    // Verify directive exists and belongs to organization
    const existing = await this.prisma.clientDirective.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Directive not found: ${id}`);
    }

    await this.prisma.clientDirective.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Soft deleted directive ${id}`);
  }

  /**
   * Reorder directives within a stage.
   * Updates order field based on array position.
   *
   * @param organizationId - Client organization ID
   * @param ids - Array of directive IDs in desired order
   */
  async reorder(organizationId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    // Verify all directives exist and belong to organization
    const directives = await this.prisma.clientDirective.findMany({
      where: {
        id: { in: ids },
        organizationId,
      },
      select: { id: true, stage: true },
    });

    if (directives.length !== ids.length) {
      throw new BadRequestException(
        'Some directive IDs are invalid or do not belong to this organization',
      );
    }

    // Verify all directives are in the same stage
    const stages = new Set(directives.map((d) => d.stage));
    if (stages.size > 1) {
      throw new BadRequestException(
        'Cannot reorder directives from different stages',
      );
    }

    // Update order for each directive in a transaction
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.clientDirective.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    this.logger.log(
      `Reordered ${ids.length} directives for org ${organizationId}`,
    );
  }

  /**
   * Get a single directive by ID.
   *
   * @param id - Directive ID
   * @param organizationId - Client organization ID (for authorization)
   * @returns Directive with category relation
   */
  async getById(
    id: string,
    organizationId: string,
  ): Promise<DirectiveWithCategory> {
    const directive = await this.prisma.clientDirective.findFirst({
      where: { id, organizationId },
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!directive) {
      throw new NotFoundException(`Directive not found: ${id}`);
    }

    return directive as DirectiveWithCategory;
  }
}
