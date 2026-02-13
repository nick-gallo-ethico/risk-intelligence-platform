// =============================================================================
// PIPELINE SERVICE - Manages pipeline configurations for cases
// =============================================================================
//
// This service handles:
// 1. Returning default pipeline stages for cases
// 2. Tenant-specific pipeline customization (future)
// 3. Pipeline stage validation
//
// KEY DESIGN DECISIONS:
// - Default stages returned when no tenant-specific config exists
// - Pipeline stages match the frontend PipelineStageBar expectations
// - Future: Store tenant-specific overrides in database
// =============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  PipelineConfigDto,
  PipelineStageDto,
  UpdatePipelineDto,
} from "./dto/pipeline.dto";

/**
 * Default pipeline stages for case management.
 * These stages are returned when no tenant-specific configuration exists.
 * Matches the frontend DEFAULT_CASE_PIPELINE constant.
 */
export const DEFAULT_CASE_STAGES: PipelineStageDto[] = [
  {
    id: "new",
    name: "New",
    order: 0,
    color: "#6B7280",
    isClosed: false,
    allowedTransitions: ["assigned"],
    description: "Newly created cases awaiting assignment",
  },
  {
    id: "assigned",
    name: "Assigned",
    order: 1,
    color: "#3B82F6",
    isClosed: false,
    allowedTransitions: ["active", "new"],
    description: "Cases assigned to an investigator",
  },
  {
    id: "active",
    name: "Active",
    order: 2,
    color: "#8B5CF6",
    isClosed: false,
    allowedTransitions: ["review", "assigned"],
    description: "Cases under active investigation",
  },
  {
    id: "review",
    name: "Review",
    order: 3,
    color: "#F59E0B",
    isClosed: false,
    allowedTransitions: ["active", "closed"],
    description: "Cases pending review before closure",
  },
  {
    id: "closed",
    name: "Closed",
    order: 4,
    color: "#10B981",
    isClosed: true,
    allowedTransitions: ["remediation", "active"],
    description: "Cases that have been closed",
  },
  {
    id: "remediation",
    name: "Remediation",
    order: 5,
    color: "#EF4444",
    isClosed: false,
    allowedTransitions: ["archived", "closed"],
    description: "Cases requiring remediation actions",
  },
  {
    id: "archived",
    name: "Archived",
    order: 6,
    color: "#9CA3AF",
    isClosed: true,
    allowedTransitions: [],
    description: "Archived cases (final state)",
  },
];

/**
 * Service for managing pipeline configurations.
 *
 * Provides default pipeline stages for cases, with support for
 * tenant-specific customization in the future.
 *
 * @example
 * ```typescript
 * // Get all pipelines for tenant
 * const pipelines = await pipelineService.findAll(tenantId);
 *
 * // Get specific pipeline
 * const pipeline = await pipelineService.findOne('default-case-pipeline', tenantId);
 * ```
 */
@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // FIND ALL - Returns all pipeline configs for a tenant
  // -------------------------------------------------------------------------

  /**
   * Returns all pipeline configurations for the tenant.
   * Currently returns the default case pipeline.
   * Future: Include tenant-specific custom pipelines.
   */
  async findAll(tenantId: string): Promise<PipelineConfigDto[]> {
    // TODO: In the future, check for tenant-specific pipeline configs
    // For now, return the default case pipeline

    const defaultPipeline: PipelineConfigDto = {
      id: "default-case-pipeline",
      moduleType: "cases",
      name: "Default Case Pipeline",
      stages: DEFAULT_CASE_STAGES,
      isDefault: true,
    };

    this.logger.debug(`Returning default pipeline for tenant ${tenantId}`);

    return [defaultPipeline];
  }

  // -------------------------------------------------------------------------
  // FIND ONE - Returns a specific pipeline config
  // -------------------------------------------------------------------------

  /**
   * Returns a specific pipeline configuration by ID.
   */
  async findOne(id: string, tenantId: string): Promise<PipelineConfigDto> {
    // TODO: Check for tenant-specific pipeline first

    if (id === "default-case-pipeline") {
      return {
        id: "default-case-pipeline",
        moduleType: "cases",
        name: "Default Case Pipeline",
        stages: DEFAULT_CASE_STAGES,
        isDefault: true,
      };
    }

    throw new NotFoundException(`Pipeline with ID ${id} not found`);
  }

  // -------------------------------------------------------------------------
  // UPDATE - Updates pipeline configuration
  // -------------------------------------------------------------------------

  /**
   * Updates a pipeline configuration.
   * Validates stage transitions and uniqueness.
   *
   * @throws NotFoundException if pipeline not found
   * @throws BadRequestException if validation fails
   */
  async update(
    id: string,
    dto: UpdatePipelineDto,
    tenantId: string,
  ): Promise<PipelineConfigDto> {
    // Validate stages if provided
    if (dto.stages) {
      this.validateStages(dto.stages);
    }

    // TODO: Persist to database for tenant-specific customization
    // For now, log the update and return the "updated" config
    this.logger.log(`Pipeline ${id} update requested for tenant ${tenantId}`);
    this.logger.log(
      `Update data: ${JSON.stringify(dto)} (not persisted - MVP limitation)`,
    );

    // Return the "updated" config (in MVP, just return defaults with requested changes applied in memory)
    const currentPipeline = await this.findOne(id, tenantId);

    return {
      ...currentPipeline,
      name: dto.name ?? currentPipeline.name,
      stages: dto.stages ?? currentPipeline.stages,
    };
  }

  // -------------------------------------------------------------------------
  // GET STAGE BY ID - Returns a single stage from a pipeline
  // -------------------------------------------------------------------------

  /**
   * Returns a single stage from a pipeline by stage ID.
   */
  async getStage(
    pipelineId: string,
    stageId: string,
    tenantId: string,
  ): Promise<PipelineStageDto | null> {
    const pipeline = await this.findOne(pipelineId, tenantId);
    return pipeline.stages.find((s) => s.id === stageId) ?? null;
  }

  // -------------------------------------------------------------------------
  // VALIDATE TRANSITION - Checks if a stage transition is allowed
  // -------------------------------------------------------------------------

  /**
   * Validates if a transition from one stage to another is allowed.
   *
   * @returns true if transition is valid, false otherwise
   */
  async validateTransition(
    pipelineId: string,
    fromStageId: string,
    toStageId: string,
    tenantId: string,
  ): Promise<boolean> {
    const pipeline = await this.findOne(pipelineId, tenantId);
    const fromStage = pipeline.stages.find((s) => s.id === fromStageId);

    if (!fromStage) {
      return false;
    }

    return fromStage.allowedTransitions.includes(toStageId);
  }

  // -------------------------------------------------------------------------
  // VALIDATE STAGES - Validates stage configuration
  // -------------------------------------------------------------------------

  /**
   * Validates pipeline stages for consistency.
   *
   * @throws BadRequestException if validation fails
   */
  private validateStages(stages: PipelineStageDto[]): void {
    // Check for duplicate IDs
    const ids = stages.map((s) => s.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new BadRequestException("Pipeline stages must have unique IDs");
    }

    // Check that all transition targets exist
    for (const stage of stages) {
      for (const targetId of stage.allowedTransitions) {
        if (!ids.includes(targetId)) {
          throw new BadRequestException(
            `Stage ${stage.id} references non-existent transition target: ${targetId}`,
          );
        }
      }
    }

    // Check order is sequential starting from 0
    const orders = stages.map((s) => s.order).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i) {
        throw new BadRequestException(
          "Stage orders must be sequential starting from 0",
        );
      }
    }
  }
}
