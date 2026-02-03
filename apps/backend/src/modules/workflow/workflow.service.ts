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
} from "./dto";
import { WorkflowStage, WorkflowTransition } from "./types/workflow.types";

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
}
