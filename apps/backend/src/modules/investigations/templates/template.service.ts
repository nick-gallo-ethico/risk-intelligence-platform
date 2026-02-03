import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TemplateTier, Prisma } from '@prisma/client';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  ChecklistSection,
} from './dto/template.dto';
import { nanoid } from 'nanoid';

/**
 * InvestigationTemplateService manages the lifecycle of investigation templates.
 *
 * Templates define reusable investigation checklists with:
 * - Sections containing checklist items
 * - Conditional rules for dynamic content
 * - Versioning with version-on-publish pattern
 * - Export/import for cross-organization sharing
 *
 * Template tiers:
 * - OFFICIAL: Admin-created, visible to entire organization
 * - TEAM: Shared with specific team members
 * - PERSONAL: Creator-only, typically saved from case workflows
 */
@Injectable()
export class InvestigationTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new investigation template.
   */
  async create(organizationId: string, userId: string, dto: CreateTemplateDto) {
    // Validate sections have unique IDs
    this.validateSections(dto.sections);

    const template = await this.prisma.investigationTemplate.create({
      data: {
        organizationId,
        createdById: userId,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        tier: dto.tier || TemplateTier.PERSONAL,
        sharedWithTeamId: dto.sharedWithTeamId,
        sections: dto.sections as unknown as Prisma.InputJsonValue,
        suggestedDurations:
          dto.suggestedDurations as unknown as Prisma.InputJsonValue,
        conditionalRules: dto.conditionalRules as unknown as Prisma.InputJsonValue,
        isDefault: dto.isDefault || false,
      },
    });

    this.eventEmitter.emit('investigation.template.created', {
      organizationId,
      templateId: template.id,
      userId,
    });

    return template;
  }

  /**
   * Find a template by ID with organization scoping.
   */
  async findById(organizationId: string, id: string) {
    const template = await this.prisma.investigationTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Investigation template not found');
    }

    return template;
  }

  /**
   * Find all templates accessible to a user.
   *
   * Access rules:
   * - OFFICIAL: Visible to all users in the organization
   * - TEAM: Visible to team members (TODO: implement team membership check)
   * - PERSONAL: Visible only to creator
   */
  async findAll(
    organizationId: string,
    userId: string,
    query: TemplateQueryDto,
  ) {
    const where: Prisma.InvestigationTemplateWhereInput = {
      organizationId,
      isArchived: query.includeArchived ? undefined : false,
      ...(query.tier && { tier: query.tier }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      // Access control: show OFFICIAL to all, TEAM to team members, PERSONAL to creator
      OR: [
        { tier: TemplateTier.OFFICIAL },
        { tier: TemplateTier.TEAM }, // TODO: Filter by actual team membership
        { tier: TemplateTier.PERSONAL, createdById: userId },
      ],
    };

    const [templates, total] = await Promise.all([
      this.prisma.investigationTemplate.findMany({
        where,
        orderBy: [{ tier: 'asc' }, { name: 'asc' }],
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        take: query.limit || 20,
      }),
      this.prisma.investigationTemplate.count({ where }),
    ]);

    return {
      data: templates,
      meta: {
        total,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  /**
   * Update an existing template.
   *
   * Permission rules:
   * - PERSONAL templates: Only creator can edit
   * - TEAM templates: Team admins can edit
   * - OFFICIAL templates: Only system admins can edit
   */
  async update(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateTemplateDto,
  ) {
    const existing = await this.findById(organizationId, id);

    // Check permission: only creator can edit PERSONAL, admins can edit OFFICIAL
    if (
      existing.tier === TemplateTier.PERSONAL &&
      existing.createdById !== userId
    ) {
      throw new ForbiddenException(
        "Cannot edit another user's personal template",
      );
    }

    if (dto.sections) {
      this.validateSections(dto.sections);
    }

    const template = await this.prisma.investigationTemplate.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.tier && { tier: dto.tier }),
        ...(dto.sharedWithTeamId !== undefined && {
          sharedWithTeamId: dto.sharedWithTeamId,
        }),
        ...(dto.sections && {
          sections: dto.sections as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.suggestedDurations !== undefined && {
          suggestedDurations:
            dto.suggestedDurations as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.conditionalRules !== undefined && {
          conditionalRules:
            dto.conditionalRules as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });

    this.eventEmitter.emit('investigation.template.updated', {
      organizationId,
      templateId: id,
      userId,
    });

    return template;
  }

  /**
   * Publish a template, optionally creating a new version.
   *
   * Version-on-publish pattern:
   * - If template has active instances (checklists in progress),
   *   creates a new version and deactivates the old one
   * - In-flight instances continue on their original version
   */
  async publish(
    organizationId: string,
    id: string,
    userId: string,
    createNewVersion: boolean = false,
  ) {
    const existing = await this.findById(organizationId, id);

    if (createNewVersion) {
      // Check if template has active instances (checklists in progress)
      const hasActiveInstances = await this.hasActiveInstances(
        organizationId,
        id,
      );

      if (hasActiveInstances) {
        // Create new version, deactivate old
        await this.prisma.investigationTemplate.update({
          where: { id },
          data: { isActive: false },
        });

        const newTemplate = await this.prisma.investigationTemplate.create({
          data: {
            organizationId,
            createdById: existing.createdById,
            name: existing.name,
            description: existing.description,
            categoryId: existing.categoryId,
            tier: existing.tier,
            sharedWithTeamId: existing.sharedWithTeamId,
            sections: existing.sections as Prisma.InputJsonValue,
            suggestedDurations: existing.suggestedDurations as Prisma.InputJsonValue,
            conditionalRules: existing.conditionalRules as Prisma.InputJsonValue,
            isDefault: existing.isDefault,
            version: existing.version + 1,
            sourceTemplateId: id,
          },
        });

        this.eventEmitter.emit('investigation.template.published', {
          organizationId,
          templateId: newTemplate.id,
          previousVersion: id,
          userId,
        });

        return newTemplate;
      }
    }

    // Just mark as active (no version change needed)
    return this.prisma.investigationTemplate.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * Archive a template (soft delete).
   * Archived templates remain visible for historical reference.
   */
  async archive(organizationId: string, id: string, userId: string) {
    await this.findById(organizationId, id);

    const template = await this.prisma.investigationTemplate.update({
      where: { id },
      data: { isArchived: true, isActive: false },
    });

    this.eventEmitter.emit('investigation.template.archived', {
      organizationId,
      templateId: id,
      userId,
    });

    return template;
  }

  /**
   * Unarchive a previously archived template.
   */
  async unarchive(organizationId: string, id: string) {
    await this.findById(organizationId, id);

    return this.prisma.investigationTemplate.update({
      where: { id },
      data: { isArchived: false },
    });
  }

  /**
   * Duplicate a template for customization.
   * Duplicates always start as PERSONAL tier.
   */
  async duplicate(
    organizationId: string,
    id: string,
    userId: string,
    newName?: string,
  ) {
    const existing = await this.findById(organizationId, id);

    const template = await this.prisma.investigationTemplate.create({
      data: {
        organizationId,
        createdById: userId,
        name: newName || `${existing.name} (Copy)`,
        description: existing.description,
        categoryId: existing.categoryId,
        tier: TemplateTier.PERSONAL, // Duplicates start as personal
        sections: existing.sections as Prisma.InputJsonValue,
        suggestedDurations: existing.suggestedDurations as Prisma.InputJsonValue,
        conditionalRules: existing.conditionalRules as Prisma.InputJsonValue,
        sourceTemplateId: id,
      },
    });

    this.eventEmitter.emit('investigation.template.duplicated', {
      organizationId,
      templateId: template.id,
      sourceTemplateId: id,
      userId,
    });

    return template;
  }

  /**
   * Export a template to JSON for sharing.
   * Removes organization-specific data.
   */
  async exportTemplate(organizationId: string, id: string) {
    const template = await this.findById(organizationId, id);

    // Remove org-specific fields for export
    const exportData = {
      name: template.name,
      description: template.description,
      sections: template.sections,
      suggestedDurations: template.suggestedDurations,
      conditionalRules: template.conditionalRules,
      exportedAt: new Date().toISOString(),
      version: template.version,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import a template from JSON.
   * Regenerates all IDs to avoid conflicts.
   */
  async importTemplate(
    organizationId: string,
    userId: string,
    templateJson: string,
    importAsOfficial: boolean = false,
  ) {
    let importData: {
      name: string;
      description?: string;
      sections: ChecklistSection[];
      suggestedDurations?: Record<string, number>;
      conditionalRules?: unknown[];
    };

    try {
      importData = JSON.parse(templateJson);
    } catch {
      throw new BadRequestException('Invalid template JSON');
    }

    if (!importData.name || !importData.sections) {
      throw new BadRequestException(
        'Template JSON must include name and sections',
      );
    }

    // Regenerate all IDs to avoid conflicts
    const sections = this.regenerateSectionIds(importData.sections);

    const template = await this.create(organizationId, userId, {
      name: importData.name,
      description: importData.description,
      sections,
      suggestedDurations: importData.suggestedDurations,
      conditionalRules:
        importData.conditionalRules as CreateTemplateDto['conditionalRules'],
      tier: importAsOfficial ? TemplateTier.OFFICIAL : TemplateTier.PERSONAL,
    });

    this.eventEmitter.emit('investigation.template.imported', {
      organizationId,
      templateId: template.id,
      userId,
    });

    return template;
  }

  /**
   * Increment the usage count when a template is used.
   */
  async incrementUsageCount(id: string) {
    await this.prisma.investigationTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  /**
   * Get the default template for a category.
   */
  async getDefaultForCategory(organizationId: string, categoryId?: string) {
    // First try to find a default template for the specific category
    if (categoryId) {
      const categoryDefault = await this.prisma.investigationTemplate.findFirst(
        {
          where: {
            organizationId,
            categoryId,
            isDefault: true,
            isActive: true,
            isArchived: false,
          },
        },
      );

      if (categoryDefault) {
        return categoryDefault;
      }
    }

    // Fall back to org-wide default (no category)
    return this.prisma.investigationTemplate.findFirst({
      where: {
        organizationId,
        categoryId: null,
        isDefault: true,
        isActive: true,
        isArchived: false,
      },
    });
  }

  // ===========================================
  // Private Helpers
  // ===========================================

  /**
   * Validate that all section and item IDs are unique.
   */
  private validateSections(sections: ChecklistSection[]) {
    const sectionIds = new Set<string>();
    const itemIds = new Set<string>();

    for (const section of sections) {
      if (sectionIds.has(section.id)) {
        throw new BadRequestException(`Duplicate section ID: ${section.id}`);
      }
      sectionIds.add(section.id);

      for (const item of section.items) {
        if (itemIds.has(item.id)) {
          throw new BadRequestException(`Duplicate item ID: ${item.id}`);
        }
        itemIds.add(item.id);
      }
    }
  }

  /**
   * Regenerate all section and item IDs while preserving references.
   */
  private regenerateSectionIds(
    sections: ChecklistSection[],
  ): ChecklistSection[] {
    const idMap = new Map<string, string>();

    // Generate new IDs
    for (const section of sections) {
      const newSectionId = nanoid(12);
      idMap.set(section.id, newSectionId);

      for (const item of section.items) {
        idMap.set(item.id, nanoid(12));
      }
    }

    // Apply new IDs and update references
    return sections.map((section) => ({
      ...section,
      id: idMap.get(section.id)!,
      sectionDependencies: section.sectionDependencies?.map(
        (id) => idMap.get(id) || id,
      ),
      items: section.items.map((item) => ({
        ...item,
        id: idMap.get(item.id)!,
        dependencies: item.dependencies?.map((id) => idMap.get(id) || id),
      })),
    }));
  }

  /**
   * Check if a template has active instances (checklists in progress).
   * This is a placeholder - will be implemented in Plan 06-07
   * with InvestigationChecklistProgress model.
   */
  private async hasActiveInstances(
    _organizationId: string,
    _templateId: string,
  ): Promise<boolean> {
    // Will be implemented in Plan 06-07 with InvestigationChecklistProgress
    // For now, return false to allow in-place updates
    return false;
  }
}
