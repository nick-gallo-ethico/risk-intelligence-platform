import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplateRequirement } from '@prisma/client';
import { InvestigationTemplateService } from './template.service';
import {
  CreateCategoryMappingDto,
  UpdateCategoryMappingDto,
  TemplateRecommendation,
} from './dto/template.dto';

/**
 * TemplateAssignmentService manages category-to-template mappings.
 *
 * Features:
 * - CRUD operations for CategoryTemplateMapping
 * - Template recommendations based on category
 * - Parent category inheritance for recommendations
 * - Required template validation
 *
 * This service enables auto-assignment of investigation templates
 * based on case/investigation category configuration.
 */
@Injectable()
export class TemplateAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: InvestigationTemplateService,
  ) {}

  // ===========================================
  // Category Mapping CRUD
  // ===========================================

  /**
   * Create a new category-to-template mapping.
   *
   * @param organizationId - Organization scope
   * @param userId - User creating the mapping
   * @param dto - Mapping data
   * @returns Created mapping with category and template details
   */
  async createMapping(
    organizationId: string,
    userId: string,
    dto: CreateCategoryMappingDto,
  ) {
    // Verify category exists in the organization
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, organizationId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Verify template exists in the organization
    await this.templateService.findById(organizationId, dto.templateId);

    return this.prisma.categoryTemplateMapping.create({
      data: {
        organizationId,
        categoryId: dto.categoryId,
        templateId: dto.templateId,
        requirement: dto.requirement || TemplateRequirement.RECOMMENDED,
        priority: dto.priority || 0,
        createdById: userId,
      },
      include: {
        category: { select: { id: true, name: true, path: true } },
        template: { select: { id: true, name: true, tier: true } },
      },
    });
  }

  /**
   * Find all mappings for a specific category.
   *
   * @param organizationId - Organization scope
   * @param categoryId - Category to find mappings for
   * @returns Array of mappings ordered by priority
   */
  async findMappingsByCategory(organizationId: string, categoryId: string) {
    return this.prisma.categoryTemplateMapping.findMany({
      where: {
        organizationId,
        categoryId,
        isActive: true,
      },
      include: {
        template: true,
      },
      orderBy: { priority: 'asc' },
    });
  }

  /**
   * Find all mappings for a specific template.
   *
   * @param organizationId - Organization scope
   * @param templateId - Template to find mappings for
   * @returns Array of mappings with category details
   */
  async findMappingsByTemplate(organizationId: string, templateId: string) {
    return this.prisma.categoryTemplateMapping.findMany({
      where: {
        organizationId,
        templateId,
        isActive: true,
      },
      include: {
        category: { select: { id: true, name: true, path: true } },
      },
    });
  }

  /**
   * Find all mappings in an organization.
   *
   * @param organizationId - Organization scope
   * @returns Array of all mappings with category and template details
   */
  async findAllMappings(organizationId: string) {
    return this.prisma.categoryTemplateMapping.findMany({
      where: { organizationId, isActive: true },
      include: {
        category: { select: { id: true, name: true, path: true } },
        template: { select: { id: true, name: true, tier: true } },
      },
      orderBy: [{ category: { name: 'asc' } }, { priority: 'asc' }],
    });
  }

  /**
   * Update an existing mapping.
   *
   * @param organizationId - Organization scope
   * @param id - Mapping ID
   * @param dto - Update data
   * @returns Updated mapping
   */
  async updateMapping(
    organizationId: string,
    id: string,
    dto: UpdateCategoryMappingDto,
  ) {
    const existing = await this.prisma.categoryTemplateMapping.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Mapping not found');
    }

    return this.prisma.categoryTemplateMapping.update({
      where: { id },
      data: {
        ...(dto.requirement && { requirement: dto.requirement }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        category: { select: { id: true, name: true, path: true } },
        template: { select: { id: true, name: true, tier: true } },
      },
    });
  }

  /**
   * Delete a mapping.
   *
   * @param organizationId - Organization scope
   * @param id - Mapping ID
   */
  async deleteMapping(organizationId: string, id: string) {
    const existing = await this.prisma.categoryTemplateMapping.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Mapping not found');
    }

    await this.prisma.categoryTemplateMapping.delete({ where: { id } });
  }

  // ===========================================
  // Template Recommendation
  // ===========================================

  /**
   * Get template recommendations for a case/investigation category.
   *
   * Returns all applicable templates with their requirement levels.
   * Checks direct category mappings first, then parent category mappings.
   * Falls back to organization default template if no mappings found.
   *
   * @param organizationId - Organization scope
   * @param categoryId - Category to find templates for (null for no category)
   * @returns Templates and default template recommendation
   */
  async getTemplateForCase(
    organizationId: string,
    categoryId: string | null,
  ): Promise<{
    templates: TemplateRecommendation[];
    defaultTemplate: TemplateRecommendation | null;
  }> {
    const recommendations: TemplateRecommendation[] = [];

    // Check category-to-template mappings
    if (categoryId) {
      const mappings = await this.prisma.categoryTemplateMapping.findMany({
        where: {
          organizationId,
          categoryId,
          isActive: true,
        },
        include: { template: true },
        orderBy: { priority: 'asc' },
      });

      for (const mapping of mappings) {
        if (mapping.template.isActive && !mapping.template.isArchived) {
          recommendations.push({
            template: mapping.template,
            requirement: mapping.requirement,
            reason: 'Mapped to category',
          });
        }
      }

      // Check parent category if no direct mapping
      if (recommendations.length === 0) {
        const category = await this.prisma.category.findFirst({
          where: { id: categoryId, organizationId },
          select: { parentCategoryId: true },
        });

        if (category?.parentCategoryId) {
          const parentResult = await this.getTemplateForCase(
            organizationId,
            category.parentCategoryId,
          );
          for (const rec of parentResult.templates) {
            recommendations.push({
              ...rec,
              reason: 'Inherited from parent category',
            });
          }
        }
      }
    }

    // Get org default template if no category-specific
    let defaultTemplate: TemplateRecommendation | null = null;
    if (recommendations.length === 0) {
      const orgDefault = await this.prisma.investigationTemplate.findFirst({
        where: {
          organizationId,
          isActive: true,
          isArchived: false,
          isDefault: true,
        },
      });

      if (orgDefault) {
        defaultTemplate = {
          template: orgDefault,
          requirement: TemplateRequirement.OPTIONAL,
          reason: 'Organization default template',
        };
      }
    }

    return {
      templates: recommendations,
      defaultTemplate,
    };
  }

  /**
   * Get the highest-priority recommended template for a category.
   *
   * @param organizationId - Organization scope
   * @param categoryId - Category to find template for (null for no category)
   * @returns Single template recommendation or null
   */
  async getRecommendedTemplate(
    organizationId: string,
    categoryId: string | null,
  ): Promise<TemplateRecommendation | null> {
    const { templates, defaultTemplate } = await this.getTemplateForCase(
      organizationId,
      categoryId,
    );

    // Return highest priority (first) template if any mappings exist
    if (templates.length > 0) {
      return templates[0];
    }

    // Fall back to default
    return defaultTemplate;
  }

  /**
   * Check if a template is required for a category.
   *
   * Used to validate investigation creation without template.
   *
   * @param organizationId - Organization scope
   * @param categoryId - Category to check (null for no category)
   * @returns True if template is required for this category
   */
  async isTemplateRequired(
    organizationId: string,
    categoryId: string | null,
  ): Promise<boolean> {
    if (!categoryId) return false;

    const mapping = await this.prisma.categoryTemplateMapping.findFirst({
      where: {
        organizationId,
        categoryId,
        isActive: true,
        requirement: TemplateRequirement.REQUIRED,
      },
    });

    return !!mapping;
  }
}
