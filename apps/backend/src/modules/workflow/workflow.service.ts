import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  WorkflowEntityType,
  WorkflowTemplate,
  WorkflowInstanceStatus,
} from "@prisma/client";
import {
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  ListInstancesDto,
} from "./dto";
import { WorkflowStage, WorkflowTransition } from "./types/workflow.types";

/**
 * Type for workflow template with instance count.
 */
export type WorkflowTemplateWithCount = WorkflowTemplate & {
  _instanceCount: number;
};

/**
 * WorkflowService manages workflow template CRUD operations.
 *
 * Key features:
 * - Template versioning on publish (in-flight instances complete on their version)
 * - Default template per entity type per organization
 * - Template validation (stages, transitions, initial stage)
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new workflow template.
   *
   * @param organizationId - Organization ID
   * @param dto - Template data
   * @param createdById - User creating the template
   * @returns The created template
   */
  async create(
    organizationId: string,
    dto: CreateWorkflowTemplateDto,
    createdById: string
  ): Promise<WorkflowTemplate> {
    // Validate template configuration
    this.validateTemplate(dto);

    // Check for duplicate name (at version 1)
    const existing = await this.prisma.workflowTemplate.findFirst({
      where: {
        organizationId,
        name: dto.name,
        version: 1,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Workflow template with name "${dto.name}" already exists`
      );
    }

    // If this is marked as default, unset any existing default for this entity type
    if (dto.isDefault) {
      await this.prisma.workflowTemplate.updateMany({
        where: {
          organizationId,
          entityType: dto.entityType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const template = await this.prisma.workflowTemplate.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        entityType: dto.entityType,
        stages: dto.stages as unknown as object,
        transitions: dto.transitions as unknown as object,
        initialStage: dto.initialStage,
        defaultSlaDays: dto.defaultSlaDays,
        tags: dto.tags || [],
        isDefault: dto.isDefault || false,
        createdById,
      },
    });

    this.logger.log(`Created workflow template ${template.id}: ${template.name}`);
    return template;
  }

  /**
   * Update an existing workflow template.
   *
   * If the template has active instances, creates a new version instead of updating in-place.
   *
   * @param organizationId - Organization ID
   * @param templateId - Template ID
   * @param dto - Updated template data
   * @returns The updated or new version template
   */
  async update(
    organizationId: string,
    templateId: string,
    dto: UpdateWorkflowTemplateDto
  ): Promise<WorkflowTemplate> {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Workflow template ${templateId} not found`);
    }

    // Validate if stages/transitions are being updated
    if (dto.stages || dto.transitions || dto.initialStage) {
      this.validateTemplate({
        stages: dto.stages || (template.stages as any),
        transitions: dto.transitions || (template.transitions as any),
        initialStage: dto.initialStage || template.initialStage,
      } as CreateWorkflowTemplateDto);
    }

    // Check if template has active instances
    const activeInstances = await this.prisma.workflowInstance.count({
      where: {
        templateId,
        templateVersion: template.version,
        status: WorkflowInstanceStatus.ACTIVE,
      },
    });

    // If active instances exist and significant changes are being made, create new version
    if (activeInstances > 0 && (dto.stages || dto.transitions || dto.initialStage)) {
      return this.createNewVersion(template, dto);
    }

    // If this is marked as default, unset any existing default for this entity type
    if (dto.isDefault && !template.isDefault) {
      await this.prisma.workflowTemplate.updateMany({
        where: {
          organizationId,
          entityType: template.entityType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    // Update in-place
    const updated = await this.prisma.workflowTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name,
        description: dto.description,
        stages: dto.stages ? (dto.stages as unknown as object) : undefined,
        transitions: dto.transitions ? (dto.transitions as unknown as object) : undefined,
        initialStage: dto.initialStage,
        defaultSlaDays: dto.defaultSlaDays,
        tags: dto.tags,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
      },
    });

    this.logger.log(`Updated workflow template ${templateId}`);
    return updated;
  }

  /**
   * Create a new version of a template.
   * Called when updating a template that has active instances.
   */
  private async createNewVersion(
    existing: WorkflowTemplate,
    dto: UpdateWorkflowTemplateDto
  ): Promise<WorkflowTemplate> {
    // Deactivate the old version
    await this.prisma.workflowTemplate.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    // Create new version
    const newVersion = await this.prisma.workflowTemplate.create({
      data: {
        organizationId: existing.organizationId,
        name: dto.name || existing.name,
        description: dto.description ?? existing.description,
        entityType: existing.entityType,
        version: existing.version + 1,
        stages: dto.stages ? (dto.stages as unknown as object) : (existing.stages as object),
        transitions: dto.transitions ? (dto.transitions as unknown as object) : (existing.transitions as object),
        initialStage: dto.initialStage || existing.initialStage,
        defaultSlaDays: dto.defaultSlaDays ?? existing.defaultSlaDays,
        tags: dto.tags || existing.tags,
        isDefault: dto.isDefault ?? existing.isDefault,
        isActive: true,
        createdById: existing.createdById,
        sourceTemplateId: existing.id,
      },
    });

    this.logger.log(
      `Created new version ${newVersion.version} of template ${existing.name}`
    );
    return newVersion;
  }

  /**
   * Get a workflow template by ID.
   */
  async findById(
    organizationId: string,
    templateId: string
  ): Promise<WorkflowTemplate | null> {
    return this.prisma.workflowTemplate.findFirst({
      where: { id: templateId, organizationId },
    });
  }

  /**
   * Get all workflow templates for an organization.
   */
  async findAll(
    organizationId: string,
    options?: {
      entityType?: WorkflowEntityType;
      isActive?: boolean;
    }
  ): Promise<WorkflowTemplate[]> {
    return this.prisma.workflowTemplate.findMany({
      where: {
        organizationId,
        entityType: options?.entityType,
        isActive: options?.isActive,
      },
      orderBy: [{ entityType: "asc" }, { name: "asc" }, { version: "desc" }],
    });
  }

  /**
   * Get the default template for an entity type.
   */
  async findDefault(
    organizationId: string,
    entityType: WorkflowEntityType
  ): Promise<WorkflowTemplate | null> {
    return this.prisma.workflowTemplate.findFirst({
      where: {
        organizationId,
        entityType,
        isDefault: true,
        isActive: true,
      },
    });
  }

  /**
   * Delete a workflow template.
   * Only allowed if no instances exist.
   */
  async delete(organizationId: string, templateId: string): Promise<void> {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Workflow template ${templateId} not found`);
    }

    const instanceCount = await this.prisma.workflowInstance.count({
      where: { templateId },
    });

    if (instanceCount > 0) {
      throw new ConflictException(
        "Cannot delete template with existing instances. Deactivate it instead."
      );
    }

    await this.prisma.workflowTemplate.delete({
      where: { id: templateId },
    });

    this.logger.log(`Deleted workflow template ${templateId}`);
  }

  /**
   * Validate template configuration.
   */
  private validateTemplate(dto: CreateWorkflowTemplateDto): void {
    const stages = dto.stages as WorkflowStage[];
    const transitions = dto.transitions as WorkflowTransition[];
    const stageIds = new Set(stages.map((s) => s.id));

    // Validate initial stage exists
    if (!stageIds.has(dto.initialStage)) {
      throw new BadRequestException(
        `Initial stage "${dto.initialStage}" not found in stages`
      );
    }

    // Validate all transition references exist
    for (const transition of transitions) {
      if (transition.from !== "*" && !stageIds.has(transition.from)) {
        throw new BadRequestException(
          `Transition references unknown stage "${transition.from}"`
        );
      }
      if (!stageIds.has(transition.to)) {
        throw new BadRequestException(
          `Transition references unknown stage "${transition.to}"`
        );
      }
    }

    // Validate at least one terminal stage or transition to self for completion
    const hasTerminalStage = stages.some((s) => s.isTerminal);
    if (!hasTerminalStage) {
      this.logger.warn("Template has no terminal stages - ensure completion is handled externally");
    }
  }

  // ============================================
  // Additional Methods for UI Support
  // ============================================

  /**
   * List workflow instances with optional filters and pagination.
   *
   * @param organizationId - Organization ID
   * @param filters - Optional filters (templateId, status, entityType) and pagination
   * @returns Paginated list of workflow instances
   */
  async listInstances(
    organizationId: string,
    filters: ListInstancesDto
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { templateId, status, entityType, page = 1, limit = 20 } = filters;

    // Build where clause
    const where: any = { organizationId };
    if (templateId) where.templateId = templateId;
    if (status) where.status = status;
    if (entityType) where.entityType = entityType;

    // Query with pagination
    const [data, total] = await Promise.all([
      this.prisma.workflowInstance.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          template: {
            select: { id: true, name: true, version: true },
          },
        },
      }),
      this.prisma.workflowInstance.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Clone a workflow template.
   * Creates a new template with same configuration but:
   * - Name appended with " (Copy)"
   * - Version reset to 1
   * - isActive = false (draft state)
   * - isDefault = false
   *
   * @param organizationId - Organization ID
   * @param templateId - Template ID to clone
   * @param userId - User performing the clone
   * @returns The cloned template
   */
  async clone(
    organizationId: string,
    templateId: string,
    userId: string
  ): Promise<WorkflowTemplate> {
    const original = await this.prisma.workflowTemplate.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!original) {
      throw new NotFoundException(`Workflow template ${templateId} not found`);
    }

    const cloned = await this.prisma.workflowTemplate.create({
      data: {
        organizationId,
        name: `${original.name} (Copy)`,
        description: original.description,
        entityType: original.entityType,
        version: 1,
        stages: original.stages as object,
        transitions: original.transitions as object,
        initialStage: original.initialStage,
        defaultSlaDays: original.defaultSlaDays,
        tags: original.tags,
        isDefault: false,
        isActive: false,
        createdById: userId,
        sourceTemplateId: original.id,
      },
    });

    this.logger.log(`Cloned workflow template ${templateId} to ${cloned.id}`);
    return cloned;
  }

  /**
   * Find all versions of a workflow template.
   * Uses name matching since versioned templates share the same name.
   *
   * @param organizationId - Organization ID
   * @param templateId - Any version's template ID
   * @returns All versions of the template, ordered by version descending
   */
  async findVersions(
    organizationId: string,
    templateId: string
  ): Promise<WorkflowTemplate[]> {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Workflow template ${templateId} not found`);
    }

    // Find all templates with the same name in this organization
    return this.prisma.workflowTemplate.findMany({
      where: {
        organizationId,
        name: template.name,
      },
      orderBy: { version: "desc" },
    });
  }

  /**
   * Get all workflow templates with instance counts.
   * Enriches each template with _instanceCount showing active instances.
   *
   * @param organizationId - Organization ID
   * @param options - Optional filters
   * @returns Templates with _instanceCount property
   */
  async findAllWithCounts(
    organizationId: string,
    options?: {
      entityType?: WorkflowEntityType;
      isActive?: boolean;
    }
  ): Promise<WorkflowTemplateWithCount[]> {
    // Get all templates matching filters
    const templates = await this.prisma.workflowTemplate.findMany({
      where: {
        organizationId,
        entityType: options?.entityType,
        isActive: options?.isActive,
      },
      orderBy: [{ entityType: "asc" }, { name: "asc" }, { version: "desc" }],
    });

    if (templates.length === 0) {
      return [];
    }

    // Get instance counts for all templates in one query
    const counts = await this.prisma.workflowInstance.groupBy({
      by: ["templateId"],
      where: {
        organizationId,
        templateId: { in: templates.map((t) => t.id) },
        status: WorkflowInstanceStatus.ACTIVE,
      },
      _count: { id: true },
    });

    // Create a map for quick lookup
    const countMap = new Map(
      counts.map((c) => [c.templateId, c._count.id])
    );

    // Enrich templates with counts
    return templates.map((template) => ({
      ...template,
      _instanceCount: countMap.get(template.id) || 0,
    }));
  }
}
