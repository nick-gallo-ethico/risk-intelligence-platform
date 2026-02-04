import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DisclosureFormType,
  FormTemplateStatus,
  Prisma,
} from '@prisma/client';
import {
  CreateFormTemplateDto,
  UpdateFormTemplateDto,
  PublishFormTemplateDto,
  CloneFormTemplateDto,
  FormTemplateQueryDto,
  FormTemplateResponseDto,
  FormTemplateListItemDto,
  FormTemplateVersionDto,
  FormTemplateTranslationDto,
  DisclosureFormTypeDto,
  FormTemplateStatusDto,
} from './dto/form-template.dto';
import { FormField, FormSection } from './entities/form-field.types';

/**
 * DisclosureFormService handles CRUD operations for disclosure form templates.
 *
 * Implements RS.32 version-on-publish pattern:
 * - Templates can be edited freely in DRAFT status
 * - Publishing a template with existing submissions creates a new version
 * - Published templates become immutable snapshots
 *
 * Implements RS.33 translation support:
 * - Clone operation can create a translation child linked to parent
 * - Stale detection when parent template has newer version
 */
@Injectable()
export class DisclosureFormService {
  private readonly logger = new Logger(DisclosureFormService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new disclosure form template (draft).
   */
  async create(
    organizationId: string,
    dto: CreateFormTemplateDto,
    createdById: string,
  ): Promise<FormTemplateResponseDto> {
    // Check for name uniqueness within organization (for version 1)
    const existing = await this.prisma.disclosureFormTemplate.findFirst({
      where: {
        organizationId,
        name: dto.name,
        version: 1,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Form template with name '${dto.name}' already exists`,
      );
    }

    // Validate parent template if creating a translation
    if (dto.parentTemplateId) {
      const parent = await this.prisma.disclosureFormTemplate.findFirst({
        where: {
          id: dto.parentTemplateId,
          organizationId,
        },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent template ${dto.parentTemplateId} not found`,
        );
      }

      // Translations must be of the same disclosure type
      if (parent.disclosureType !== dto.disclosureType) {
        throw new BadRequestException(
          'Translation must have the same disclosure type as parent template',
        );
      }
    }

    const template = await this.prisma.disclosureFormTemplate.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        disclosureType: dto.disclosureType as DisclosureFormType,
        language: dto.language || 'en',
        parentTemplateId: dto.parentTemplateId,
        fields: dto.fields as unknown as Prisma.InputJsonValue,
        sections: dto.sections as unknown as Prisma.InputJsonValue,
        validationRules: dto.validationRules as unknown as Prisma.InputJsonValue,
        calculatedFields: dto.calculatedFields as unknown as Prisma.InputJsonValue,
        uiSchema: dto.uiSchema as unknown as Prisma.InputJsonValue,
        createdById,
      },
      include: {
        translations: true,
        parentTemplate: true,
      },
    });

    this.logger.log(
      `Created disclosure form template '${dto.name}' for org ${organizationId}`,
    );

    return this.mapToResponse(template);
  }

  /**
   * Find a form template by ID.
   */
  async findById(
    organizationId: string,
    id: string,
  ): Promise<FormTemplateResponseDto> {
    const template = await this.prisma.disclosureFormTemplate.findFirst({
      where: { id, organizationId },
      include: {
        translations: true,
        parentTemplate: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`Form template ${id} not found`);
    }

    return this.mapToResponse(template);
  }

  /**
   * Find all form templates with optional filters.
   */
  async findMany(
    organizationId: string,
    query: FormTemplateQueryDto,
  ): Promise<FormTemplateListItemDto[]> {
    const where: Prisma.DisclosureFormTemplateWhereInput = {
      organizationId,
    };

    if (query.disclosureType) {
      where.disclosureType = query.disclosureType as DisclosureFormType;
    }

    if (query.status) {
      where.status = query.status as FormTemplateStatus;
    } else if (!query.includeArchived) {
      // By default, exclude archived templates
      where.status = { not: 'ARCHIVED' as FormTemplateStatus };
    }

    if (query.language) {
      where.language = query.language;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // By default, only return master templates (not translations)
    if (!query.includeTranslations) {
      where.parentTemplateId = null;
    }

    const templates = await this.prisma.disclosureFormTemplate.findMany({
      where,
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
      include: {
        translations: {
          select: { id: true },
        },
      },
    });

    return templates.map((t) => this.mapToListItem(t));
  }

  /**
   * Update a form template (only DRAFT templates).
   * Published templates cannot be updated - create a new version instead.
   */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateFormTemplateDto,
    updatedById: string,
  ): Promise<FormTemplateResponseDto> {
    const template = await this.prisma.disclosureFormTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Form template ${id} not found`);
    }

    // Cannot update published templates with submissions - must create new version
    if (template.status === 'PUBLISHED') {
      const hasSubmissions = await this.prisma.riuDisclosureExtension.count({
        where: { formTemplateId: id },
      });

      if (hasSubmissions > 0) {
        throw new BadRequestException(
          'Cannot update published template with submissions. Publish a new version instead.',
        );
      }
    }

    // Cannot update archived templates
    if (template.status === 'ARCHIVED') {
      throw new BadRequestException(
        'Cannot update archived template. Clone it to create a new version.',
      );
    }

    const updateData: Prisma.DisclosureFormTemplateUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.fields !== undefined)
      updateData.fields = dto.fields as unknown as Prisma.InputJsonValue;
    if (dto.sections !== undefined)
      updateData.sections = dto.sections as unknown as Prisma.InputJsonValue;
    if (dto.validationRules !== undefined)
      updateData.validationRules = dto.validationRules as unknown as Prisma.InputJsonValue;
    if (dto.calculatedFields !== undefined)
      updateData.calculatedFields = dto.calculatedFields as unknown as Prisma.InputJsonValue;
    if (dto.uiSchema !== undefined)
      updateData.uiSchema = dto.uiSchema as unknown as Prisma.InputJsonValue;

    const updated = await this.prisma.disclosureFormTemplate.update({
      where: { id },
      data: updateData,
      include: {
        translations: true,
        parentTemplate: true,
      },
    });

    this.logger.log(`Updated form template ${id} by user ${updatedById}`);

    return this.mapToResponse(updated);
  }

  /**
   * Publish a form template (RS.32: version-on-publish).
   *
   * If the template is already published and has submissions,
   * creates a new version automatically.
   */
  async publish(
    organizationId: string,
    id: string,
    dto: PublishFormTemplateDto,
    publishedById: string,
  ): Promise<{ id: string; version: number }> {
    const template = await this.prisma.disclosureFormTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Form template ${id} not found`);
    }

    if (template.status === 'ARCHIVED') {
      throw new BadRequestException(
        'Cannot publish archived template. Clone it to create a new version.',
      );
    }

    // Check if there are existing submissions
    const hasSubmissions = await this.prisma.riuDisclosureExtension.count({
      where: { formTemplateId: id },
    });

    // If already published with submissions, or explicitly requested, create new version
    if (
      (template.status === 'PUBLISHED' && hasSubmissions > 0) ||
      dto.createNewVersion
    ) {
      const newVersion = await this.prisma.disclosureFormTemplate.create({
        data: {
          organizationId: template.organizationId,
          name: template.name,
          description: template.description,
          disclosureType: template.disclosureType,
          version: template.version + 1,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          publishedBy: publishedById,
          parentTemplateId: template.parentTemplateId,
          language: template.language,
          fields: template.fields as Prisma.InputJsonValue,
          sections: template.sections as Prisma.InputJsonValue,
          validationRules: template.validationRules as Prisma.InputJsonValue,
          calculatedFields: template.calculatedFields as Prisma.InputJsonValue,
          uiSchema: template.uiSchema as Prisma.InputJsonValue,
          isSystem: template.isSystem,
          createdById: template.createdById,
        },
      });

      // Archive the old version (keep for historical reference)
      await this.prisma.disclosureFormTemplate.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });

      this.logger.log(
        `Created new version ${newVersion.version} of template '${template.name}'`,
      );

      return { id: newVersion.id, version: newVersion.version };
    }

    // Just publish current version (no submissions or first publish)
    const updated = await this.prisma.disclosureFormTemplate.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: publishedById,
      },
    });

    this.logger.log(
      `Published template '${template.name}' version ${template.version}`,
    );

    return { id: updated.id, version: updated.version };
  }

  /**
   * Clone a form template.
   *
   * RS.33: If asTranslation is true, creates a linked translation child.
   */
  async clone(
    organizationId: string,
    id: string,
    dto: CloneFormTemplateDto,
    createdById: string,
  ): Promise<FormTemplateResponseDto> {
    const source = await this.prisma.disclosureFormTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!source) {
      throw new NotFoundException(`Form template ${id} not found`);
    }

    // Check if name already exists
    const existing = await this.prisma.disclosureFormTemplate.findFirst({
      where: {
        organizationId,
        name: dto.name,
        version: 1,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Form template with name '${dto.name}' already exists`,
      );
    }

    const cloned = await this.prisma.disclosureFormTemplate.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.asTranslation
          ? `Translation of: ${source.name}`
          : source.description
            ? `Cloned from: ${source.name}\n\n${source.description}`
            : `Cloned from: ${source.name}`,
        disclosureType: source.disclosureType,
        version: 1,
        status: 'DRAFT',
        // Link to parent if creating a translation
        parentTemplateId: dto.asTranslation ? id : null,
        language: dto.language || (dto.asTranslation ? undefined : source.language),
        fields: source.fields as Prisma.InputJsonValue,
        sections: source.sections as Prisma.InputJsonValue,
        validationRules: source.validationRules as Prisma.InputJsonValue,
        calculatedFields: source.calculatedFields as Prisma.InputJsonValue,
        uiSchema: source.uiSchema as Prisma.InputJsonValue,
        createdById,
      },
      include: {
        translations: true,
        parentTemplate: true,
      },
    });

    this.logger.log(
      `Cloned template '${source.name}' to '${dto.name}'${dto.asTranslation ? ' as translation' : ''}`,
    );

    return this.mapToResponse(cloned);
  }

  /**
   * Archive a form template.
   *
   * Checks for active campaigns before allowing archive.
   */
  async archive(
    organizationId: string,
    id: string,
    archivedById: string,
  ): Promise<void> {
    const template = await this.prisma.disclosureFormTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Form template ${id} not found`);
    }

    // Check for active campaigns using this template
    const activeCampaigns = await this.prisma.campaign.count({
      where: {
        disclosureFormTemplateId: id,
        status: { in: ['DRAFT', 'SCHEDULED', 'ACTIVE'] },
      },
    });

    if (activeCampaigns > 0) {
      throw new BadRequestException(
        `Cannot archive template with ${activeCampaigns} active campaign(s). Archive or complete the campaigns first.`,
      );
    }

    await this.prisma.disclosureFormTemplate.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    this.logger.log(
      `Archived template '${template.name}' by user ${archivedById}`,
    );
  }

  /**
   * Get version history for a form template.
   * Returns all versions of a template (same name).
   */
  async getVersions(
    organizationId: string,
    id: string,
  ): Promise<FormTemplateVersionDto[]> {
    const template = await this.prisma.disclosureFormTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Form template ${id} not found`);
    }

    // Find all versions with the same name
    const versions = await this.prisma.disclosureFormTemplate.findMany({
      where: {
        organizationId,
        name: template.name,
      },
      orderBy: { version: 'desc' },
    });

    return versions.map((v) => ({
      version: v.version,
      status: v.status,
      publishedAt: v.publishedAt || undefined,
      publishedBy: v.publishedBy || undefined,
      createdAt: v.createdAt,
      fieldCount: Array.isArray(v.fields) ? (v.fields as unknown[]).length : 0,
      changesSummary: v.version > 1 ? `Version ${v.version}` : 'Initial version',
    }));
  }

  /**
   * Get translations for a form template.
   */
  async getTranslations(
    organizationId: string,
    id: string,
  ): Promise<FormTemplateTranslationDto[]> {
    const template = await this.prisma.disclosureFormTemplate.findFirst({
      where: { id, organizationId },
      include: {
        translations: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`Form template ${id} not found`);
    }

    return template.translations.map((t) => ({
      id: t.id,
      language: t.language,
      name: t.name,
      status: t.status,
      version: t.version,
      isStale: template.version > t.version,
      updatedAt: t.updatedAt,
    }));
  }

  /**
   * Get the latest published version of a template by name.
   */
  async getPublishedTemplate(
    organizationId: string,
    name: string,
    language?: string,
  ): Promise<FormTemplateResponseDto> {
    const where: Prisma.DisclosureFormTemplateWhereInput = {
      organizationId,
      name,
      status: 'PUBLISHED',
    };

    if (language) {
      where.language = language;
    }

    const template = await this.prisma.disclosureFormTemplate.findFirst({
      where,
      orderBy: { version: 'desc' },
      include: {
        translations: true,
        parentTemplate: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`Published template '${name}' not found`);
    }

    return this.mapToResponse(template);
  }

  /**
   * Delete a form template (DRAFT only, no submissions).
   */
  async delete(
    organizationId: string,
    id: string,
  ): Promise<void> {
    const template = await this.prisma.disclosureFormTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Form template ${id} not found`);
    }

    if (template.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft templates can be deleted. Archive published templates instead.',
      );
    }

    // Check for submissions
    const hasSubmissions = await this.prisma.riuDisclosureExtension.count({
      where: { formTemplateId: id },
    });

    if (hasSubmissions > 0) {
      throw new BadRequestException(
        'Cannot delete template with existing submissions.',
      );
    }

    // Check for translations
    const hasTranslations = await this.prisma.disclosureFormTemplate.count({
      where: { parentTemplateId: id },
    });

    if (hasTranslations > 0) {
      throw new BadRequestException(
        'Cannot delete template with existing translations.',
      );
    }

    await this.prisma.disclosureFormTemplate.delete({
      where: { id },
    });

    this.logger.log(`Deleted draft template '${template.name}'`);
  }

  // ===========================================
  // Private Helper Methods
  // ===========================================

  /**
   * Map a Prisma model to the full response DTO.
   */
  private mapToResponse(
    template: Prisma.DisclosureFormTemplateGetPayload<{
      include: { translations: true; parentTemplate: true };
    }>,
  ): FormTemplateResponseDto {
    const fields = template.fields as unknown as FormField[];
    const sections = template.sections as unknown as FormSection[];

    return {
      id: template.id,
      organizationId: template.organizationId,
      name: template.name,
      description: template.description || undefined,
      disclosureType: template.disclosureType,
      version: template.version,
      status: template.status,
      publishedAt: template.publishedAt || undefined,
      publishedBy: template.publishedBy || undefined,
      language: template.language,
      parentTemplateId: template.parentTemplateId || undefined,
      fields,
      sections,
      validationRules:
        (template.validationRules as unknown as FormTemplateResponseDto['validationRules']) ||
        undefined,
      calculatedFields:
        (template.calculatedFields as unknown as FormTemplateResponseDto['calculatedFields']) ||
        undefined,
      uiSchema:
        (template.uiSchema as Record<string, unknown>) || undefined,
      isSystem: template.isSystem,
      createdById: template.createdById,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      // Computed fields
      isStale: template.parentTemplate
        ? template.parentTemplate.version > template.version
        : undefined,
      parentVersion: template.parentTemplate?.version,
      translationCount: template.translations?.length || 0,
    };
  }

  /**
   * Map a Prisma model to the lightweight list item DTO.
   */
  private mapToListItem(
    template: Prisma.DisclosureFormTemplateGetPayload<{
      include: { translations: { select: { id: true } } };
    }>,
  ): FormTemplateListItemDto {
    const fields = template.fields as unknown as FormField[];
    const sections = template.sections as unknown as FormSection[];

    return {
      id: template.id,
      name: template.name,
      description: template.description || undefined,
      disclosureType: template.disclosureType,
      version: template.version,
      status: template.status,
      language: template.language,
      hasTranslations: template.translations.length > 0,
      fieldCount: Array.isArray(fields) ? fields.length : 0,
      sectionCount: Array.isArray(sections) ? sections.length : 0,
      isSystem: template.isSystem,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
