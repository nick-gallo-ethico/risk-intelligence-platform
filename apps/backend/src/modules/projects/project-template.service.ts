import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectTemplate, Prisma } from "@prisma/client";
import {
  CreateProjectTemplateDto,
  ApplyTemplateDto,
  ProjectTemplateResponseDto,
} from "./dto/project-template.dto";
import { TemplateRegistryService } from "./services/template-registry.service";
import { TemplateApplierService } from "./services/template-applier.service";

// Re-export TemplateData for backward compatibility
export { TemplateData } from "./services/template-registry.service";

/**
 * ProjectTemplateService manages project templates for reusable project structures.
 *
 * Features:
 * - CRUD operations for custom templates
 * - System templates for common compliance projects
 * - Apply template to create new project with groups, columns, and tasks
 *
 * Architecture:
 * This is a thin coordinator service that delegates to focused sub-services:
 * - TemplateRegistryService: System template definitions and database seeding
 * - TemplateApplierService: Template application to create new projects
 */
@Injectable()
export class ProjectTemplateService {
  private readonly logger = new Logger(ProjectTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateRegistry: TemplateRegistryService,
    private readonly templateApplier: TemplateApplierService,
  ) {}

  /**
   * Creates a new project template.
   */
  async create(
    orgId: string,
    userId: string,
    dto: CreateProjectTemplateDto,
  ): Promise<ProjectTemplate> {
    const template = await this.prisma.projectTemplate.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        templateData: dto.templateData as Prisma.InputJsonValue,
        isSystem: false,
        createdById: userId,
      },
    });

    this.logger.log(`Template created: ${template.id} - ${template.name}`);

    return template;
  }

  /**
   * Lists all templates available to the organization.
   * Includes both organization-specific and system templates.
   */
  async list(orgId: string): Promise<ProjectTemplateResponseDto[]> {
    // Ensure system templates exist
    await this.templateRegistry.ensureSystemTemplates();

    const templates = await this.prisma.projectTemplate.findMany({
      where: {
        OR: [{ organizationId: orgId }, { isSystem: true }],
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return templates.map(
      (t): ProjectTemplateResponseDto => ({
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        category: t.category,
        templateData: t.templateData as Record<string, unknown>,
        isSystem: t.isSystem,
        createdBy: t.createdBy
          ? {
              id: t.createdBy.id,
              name: `${t.createdBy.firstName} ${t.createdBy.lastName}`,
            }
          : undefined,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }),
    );
  }

  /**
   * Gets a single template by ID.
   */
  async get(
    orgId: string,
    templateId: string,
  ): Promise<ProjectTemplateResponseDto | null> {
    const template = await this.prisma.projectTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ organizationId: orgId }, { isSystem: true }],
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!template) return null;

    return {
      id: template.id,
      name: template.name,
      description: template.description ?? undefined,
      category: template.category,
      templateData: template.templateData as Record<string, unknown>,
      isSystem: template.isSystem,
      createdBy: template.createdBy
        ? {
            id: template.createdBy.id,
            name: `${template.createdBy.firstName} ${template.createdBy.lastName}`,
          }
        : undefined,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * Deletes a template (only non-system templates).
   */
  async delete(orgId: string, templateId: string): Promise<void> {
    const template = await this.prisma.projectTemplate.findFirst({
      where: { id: templateId, organizationId: orgId },
    });

    if (!template) {
      throw new NotFoundException("Template not found");
    }

    if (template.isSystem) {
      throw new ForbiddenException("Cannot delete system templates");
    }

    await this.prisma.projectTemplate.delete({
      where: { id: templateId },
    });

    this.logger.log(`Template deleted: ${templateId}`);
  }

  /**
   * Applies a template to create a new project (Milestone).
   * Delegates to TemplateApplierService.
   */
  async applyTemplate(
    orgId: string,
    userId: string,
    dto: ApplyTemplateDto,
  ): Promise<string> {
    return this.templateApplier.applyTemplate(orgId, userId, dto);
  }
}
