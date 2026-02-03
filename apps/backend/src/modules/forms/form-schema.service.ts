import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FormType, Prisma } from '@prisma/client';
import { FormValidationService } from './form-validation.service';
import { FormSchema, UiSchema } from './types/form.types';

/**
 * DTO for creating a new form definition.
 */
export interface CreateFormDefinitionDto {
  name: string;
  description?: string;
  formType: FormType;
  schema: FormSchema;
  uiSchema?: UiSchema;
  defaultValues?: Record<string, unknown>;
  allowAnonymous?: boolean;
  requiresApproval?: boolean;
  categoryId?: string;
  tags?: string[];
}

/**
 * DTO for updating an existing form definition.
 */
export interface UpdateFormDefinitionDto {
  name?: string;
  description?: string;
  schema?: FormSchema;
  uiSchema?: UiSchema;
  defaultValues?: Record<string, unknown>;
  allowAnonymous?: boolean;
  requiresApproval?: boolean;
  categoryId?: string;
  tags?: string[];
}

/**
 * FormSchemaService handles CRUD operations for form definitions.
 * Manages form versioning and publishing lifecycle.
 *
 * Key behaviors:
 * - Validates JSON Schema before saving
 * - Auto-versions on publish with existing submissions
 * - Maintains historical form definitions for audit
 */
@Injectable()
export class FormSchemaService {
  private readonly logger = new Logger(FormSchemaService.name);

  constructor(
    private prisma: PrismaService,
    private validationService: FormValidationService,
  ) {}

  /**
   * Create a new form definition (draft).
   */
  async create(
    organizationId: string,
    dto: CreateFormDefinitionDto,
    createdById?: string,
  ) {
    // Validate schema before saving
    const schemaValidation = this.validationService.validateSchema(dto.schema);
    if (!schemaValidation.valid) {
      throw new BadRequestException(
        `Invalid schema: ${schemaValidation.errors[0]?.message}`,
      );
    }

    // Check for name uniqueness within organization (for version 1)
    const existing = await this.prisma.formDefinition.findFirst({
      where: {
        organizationId,
        name: dto.name,
        version: 1,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Form definition with name '${dto.name}' already exists`,
      );
    }

    return this.prisma.formDefinition.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        formType: dto.formType,
        schema: dto.schema as Prisma.InputJsonValue,
        uiSchema: dto.uiSchema as unknown as Prisma.InputJsonValue,
        defaultValues: dto.defaultValues as Prisma.InputJsonValue,
        allowAnonymous: dto.allowAnonymous ?? false,
        requiresApproval: dto.requiresApproval ?? false,
        categoryId: dto.categoryId,
        tags: dto.tags ?? [],
        createdById,
      },
    });
  }

  /**
   * Find a form definition by ID.
   */
  async findById(organizationId: string, id: string) {
    const form = await this.prisma.formDefinition.findFirst({
      where: { id, organizationId },
    });

    if (!form) {
      throw new NotFoundException(`Form definition ${id} not found`);
    }

    return form;
  }

  /**
   * Find all form definitions by type.
   */
  async findByType(organizationId: string, formType: FormType) {
    return this.prisma.formDefinition.findMany({
      where: { organizationId, formType, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * List all active form definitions for an organization.
   */
  async findAll(
    organizationId: string,
    options?: {
      formType?: FormType;
      isPublished?: boolean;
      includeInactive?: boolean;
    },
  ) {
    const where: Prisma.FormDefinitionWhereInput = {
      organizationId,
    };

    if (options?.formType) {
      where.formType = options.formType;
    }

    if (options?.isPublished !== undefined) {
      where.isPublished = options.isPublished;
    }

    if (!options?.includeInactive) {
      where.isActive = true;
    }

    return this.prisma.formDefinition.findMany({
      where,
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
    });
  }

  /**
   * Update a form definition (only unpublished forms).
   */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateFormDefinitionDto,
    updatedById?: string,
  ) {
    const form = await this.findById(organizationId, id);

    // Cannot update published forms with submissions - must create new version
    if (form.isPublished) {
      const hasSubmissions = await this.prisma.formSubmission.count({
        where: { formDefinitionId: id },
      });

      if (hasSubmissions > 0) {
        throw new BadRequestException(
          'Cannot update published form with submissions. Publish a new version instead.',
        );
      }
    }

    // Validate new schema if provided
    if (dto.schema) {
      const schemaValidation = this.validationService.validateSchema(dto.schema);
      if (!schemaValidation.valid) {
        throw new BadRequestException(
          `Invalid schema: ${schemaValidation.errors[0]?.message}`,
        );
      }
    }

    // Build update data
    const updateData: Prisma.FormDefinitionUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.schema !== undefined)
      updateData.schema = dto.schema as Prisma.InputJsonValue;
    if (dto.uiSchema !== undefined)
      updateData.uiSchema = dto.uiSchema as unknown as Prisma.InputJsonValue;
    if (dto.defaultValues !== undefined)
      updateData.defaultValues = dto.defaultValues as Prisma.InputJsonValue;
    if (dto.allowAnonymous !== undefined)
      updateData.allowAnonymous = dto.allowAnonymous;
    if (dto.requiresApproval !== undefined)
      updateData.requiresApproval = dto.requiresApproval;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    if (dto.tags !== undefined) updateData.tags = dto.tags;

    this.logger.log(`Updating form definition ${id} by user ${updatedById}`);

    return this.prisma.formDefinition.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Publish a form definition.
   * If already published with submissions, creates a new version.
   */
  async publish(organizationId: string, id: string): Promise<{ id: string; version: number }> {
    const form = await this.findById(organizationId, id);

    // If already published with submissions, create new version
    if (form.isPublished) {
      const hasSubmissions = await this.prisma.formSubmission.count({
        where: { formDefinitionId: id },
      });

      if (hasSubmissions > 0) {
        // Create new version
        const newVersion = await this.prisma.formDefinition.create({
          data: {
            organizationId: form.organizationId,
            name: form.name,
            description: form.description,
            formType: form.formType,
            version: form.version + 1,
            isActive: true,
            isPublished: true,
            publishedAt: new Date(),
            schema: form.schema as Prisma.InputJsonValue,
            uiSchema: form.uiSchema as Prisma.InputJsonValue,
            defaultValues: form.defaultValues as Prisma.InputJsonValue,
            allowAnonymous: form.allowAnonymous,
            requiresApproval: form.requiresApproval,
            notifyOnSubmit: form.notifyOnSubmit,
            categoryId: form.categoryId,
            tags: form.tags,
            createdById: form.createdById,
          },
        });

        // Mark old version as inactive
        await this.prisma.formDefinition.update({
          where: { id },
          data: { isActive: false },
        });

        this.logger.log(
          `Created new version ${newVersion.version} of form ${form.name}`,
        );

        return { id: newVersion.id, version: newVersion.version };
      }
    }

    // Just publish current version
    const updated = await this.prisma.formDefinition.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });

    this.logger.log(`Published form ${form.name} version ${form.version}`);

    return { id: updated.id, version: updated.version };
  }

  /**
   * Get the latest published version of a form by name.
   */
  async getPublishedForm(organizationId: string, name: string) {
    const form = await this.prisma.formDefinition.findFirst({
      where: {
        organizationId,
        name,
        isPublished: true,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!form) {
      throw new NotFoundException(`Published form '${name}' not found`);
    }

    return form;
  }

  /**
   * Deactivate a form definition.
   * Does not delete - maintains for historical submissions.
   */
  async deactivate(organizationId: string, id: string): Promise<void> {
    const form = await this.findById(organizationId, id);

    await this.prisma.formDefinition.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Deactivated form ${form.name} version ${form.version}`);
  }

  /**
   * Clone a form definition (creates a new draft with same schema).
   */
  async clone(
    organizationId: string,
    id: string,
    newName: string,
    createdById?: string,
  ) {
    const form = await this.findById(organizationId, id);

    return this.prisma.formDefinition.create({
      data: {
        organizationId,
        name: newName,
        description: form.description
          ? `Cloned from: ${form.name}\n\n${form.description}`
          : `Cloned from: ${form.name}`,
        formType: form.formType,
        version: 1,
        isActive: true,
        isPublished: false,
        schema: form.schema as Prisma.InputJsonValue,
        uiSchema: form.uiSchema as Prisma.InputJsonValue,
        defaultValues: form.defaultValues as Prisma.InputJsonValue,
        allowAnonymous: form.allowAnonymous,
        requiresApproval: form.requiresApproval,
        categoryId: form.categoryId,
        tags: form.tags,
        createdById,
      },
    });
  }
}
