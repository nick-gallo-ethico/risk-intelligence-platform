import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ReportDataSource } from "@prisma/client";
import { ColumnDefinition, FilterDefinition } from "./types/report.types";

/**
 * DTO for creating a new report template.
 */
export interface CreateReportTemplateDto {
  name: string;
  description?: string;
  category?: string;
  dataSource: ReportDataSource;
  columns: ColumnDefinition[];
  filters?: FilterDefinition[];
  aggregations?: unknown;
  sortBy?: string;
  sortOrder?: string;
  chartType?: string;
  chartConfig?: unknown;
  allowedRoles?: string[];
  isPublic?: boolean;
}

/**
 * DTO for updating a report template.
 */
export interface UpdateReportTemplateDto extends Partial<CreateReportTemplateDto> {}

/**
 * ReportTemplateService
 *
 * Manages CRUD operations for report templates.
 * Templates can be:
 * - Organization-specific (custom templates)
 * - System templates (Ethico-provided, shared across all orgs)
 */
@Injectable()
export class ReportTemplateService {
  private readonly logger = new Logger(ReportTemplateService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new report template for an organization.
   */
  async create(
    organizationId: string,
    dto: CreateReportTemplateDto,
    createdById?: string,
  ) {
    this.logger.log(
      `Creating report template '${dto.name}' for org:${organizationId}`,
    );

    return this.prisma.reportTemplate.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        dataSource: dto.dataSource,
        columns: JSON.parse(JSON.stringify(dto.columns)),
        filters: dto.filters ? JSON.parse(JSON.stringify(dto.filters)) : null,
        aggregations: dto.aggregations
          ? JSON.parse(JSON.stringify(dto.aggregations))
          : null,
        sortBy: dto.sortBy,
        sortOrder: dto.sortOrder,
        chartType: dto.chartType,
        chartConfig: dto.chartConfig
          ? JSON.parse(JSON.stringify(dto.chartConfig))
          : null,
        allowedRoles: dto.allowedRoles || [],
        isPublic: dto.isPublic ?? false,
        createdById,
      },
    });
  }

  /**
   * Find a template by ID.
   * Returns template if it belongs to the organization OR is a system template.
   */
  async findById(organizationId: string, id: string) {
    const template = await this.prisma.reportTemplate.findFirst({
      where: {
        id,
        OR: [{ organizationId }, { isSystem: true }],
      },
    });

    if (!template) {
      throw new NotFoundException(`Report template ${id} not found`);
    }

    return template;
  }

  /**
   * Find all templates accessible to an organization.
   * Includes org-specific templates and system templates.
   */
  async findAll(organizationId: string, category?: string) {
    return this.prisma.reportTemplate.findMany({
      where: {
        OR: [{ organizationId }, { isSystem: true }],
        ...(category && { category }),
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  }

  /**
   * Find templates by data source.
   * Useful for filtering available templates for a specific entity type.
   */
  async findByDataSource(organizationId: string, dataSource: ReportDataSource) {
    return this.prisma.reportTemplate.findMany({
      where: {
        OR: [{ organizationId }, { isSystem: true }],
        dataSource,
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  }

  /**
   * Update an existing template.
   * Cannot update system templates.
   */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateReportTemplateDto,
  ) {
    const template = await this.findById(organizationId, id);

    if (template.isSystem) {
      throw new Error("Cannot modify system templates");
    }

    if (template.organizationId !== organizationId) {
      throw new Error("Cannot modify templates from other organizations");
    }

    this.logger.log(`Updating report template ${id}`);

    return this.prisma.reportTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        dataSource: dto.dataSource,
        columns: dto.columns
          ? JSON.parse(JSON.stringify(dto.columns))
          : undefined,
        filters: dto.filters
          ? JSON.parse(JSON.stringify(dto.filters))
          : undefined,
        aggregations: dto.aggregations
          ? JSON.parse(JSON.stringify(dto.aggregations))
          : undefined,
        sortBy: dto.sortBy,
        sortOrder: dto.sortOrder,
        chartType: dto.chartType,
        chartConfig: dto.chartConfig
          ? JSON.parse(JSON.stringify(dto.chartConfig))
          : undefined,
        allowedRoles: dto.allowedRoles,
        isPublic: dto.isPublic,
      },
    });
  }

  /**
   * Delete a template.
   * Cannot delete system templates.
   */
  async delete(organizationId: string, id: string) {
    const template = await this.findById(organizationId, id);

    if (template.isSystem) {
      throw new Error("Cannot delete system templates");
    }

    if (template.organizationId !== organizationId) {
      throw new Error("Cannot delete templates from other organizations");
    }

    this.logger.log(`Deleting report template ${id}`);

    await this.prisma.reportTemplate.delete({ where: { id } });
  }

  /**
   * Duplicate a template (including system templates).
   * Creates a new organization-specific copy.
   */
  async duplicate(organizationId: string, id: string, newName: string) {
    const template = await this.findById(organizationId, id);

    this.logger.log(`Duplicating report template ${id} as '${newName}'`);

    return this.prisma.reportTemplate.create({
      data: {
        organizationId,
        name: newName,
        description: template.description,
        category: template.category,
        dataSource: template.dataSource,
        columns: JSON.parse(JSON.stringify(template.columns)),
        filters: template.filters
          ? JSON.parse(JSON.stringify(template.filters))
          : null,
        aggregations: template.aggregations
          ? JSON.parse(JSON.stringify(template.aggregations))
          : null,
        sortBy: template.sortBy,
        sortOrder: template.sortOrder,
        chartType: template.chartType,
        chartConfig: template.chartConfig
          ? JSON.parse(JSON.stringify(template.chartConfig))
          : null,
        allowedRoles: template.allowedRoles,
        isPublic: false, // Duplicated templates are private by default
        isSystem: false, // Never duplicate as system template
      },
    });
  }
}
