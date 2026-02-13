import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { PipelineService } from "./pipeline.service";
import { PipelineConfigDto, UpdatePipelineDto } from "./dto/pipeline.dto";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../common/guards";
import { TenantId, Roles, UserRole } from "../../common/decorators";

/**
 * REST API controller for pipeline configuration management.
 * Pipelines define the workflow stages for cases (and potentially other modules).
 */
@ApiTags("Pipelines")
@ApiBearerAuth("JWT")
@Controller("pipelines")
@UseGuards(JwtAuthGuard, TenantGuard)
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  /**
   * GET /api/v1/pipelines
   * Returns all pipeline configurations for the tenant.
   */
  @Get()
  @ApiOperation({
    summary: "List pipeline configurations",
    description:
      "Returns all pipeline configurations available for the tenant, including the default case pipeline",
  })
  @ApiResponse({
    status: 200,
    description: "List of pipeline configurations",
    type: [PipelineConfigDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async listPipelines(
    @TenantId() organizationId: string,
  ): Promise<PipelineConfigDto[]> {
    return this.pipelineService.findAll(organizationId);
  }

  /**
   * GET /api/v1/pipelines/:id
   * Returns a specific pipeline configuration by ID.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get pipeline configuration",
    description: "Returns a specific pipeline configuration by ID",
  })
  @ApiParam({ name: "id", description: "Pipeline configuration ID" })
  @ApiResponse({
    status: 200,
    description: "Pipeline configuration",
    type: PipelineConfigDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Pipeline not found" })
  async getPipeline(
    @Param("id") id: string,
    @TenantId() organizationId: string,
  ): Promise<PipelineConfigDto> {
    return this.pipelineService.findOne(id, organizationId);
  }

  /**
   * PUT /api/v1/pipelines/:id
   * Updates a pipeline configuration.
   * Requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
   */
  @Put(":id")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update pipeline configuration",
    description:
      "Updates a pipeline configuration. Requires admin or compliance officer role.",
  })
  @ApiParam({ name: "id", description: "Pipeline configuration ID" })
  @ApiResponse({
    status: 200,
    description: "Pipeline configuration updated",
    type: PipelineConfigDto,
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Pipeline not found" })
  async updatePipeline(
    @Param("id") id: string,
    @Body() dto: UpdatePipelineDto,
    @TenantId() organizationId: string,
  ): Promise<PipelineConfigDto> {
    return this.pipelineService.update(id, dto, organizationId);
  }

  /**
   * GET /api/v1/pipelines/:id/stages/:stageId
   * Returns a specific stage from a pipeline.
   */
  @Get(":id/stages/:stageId")
  @ApiOperation({
    summary: "Get pipeline stage",
    description: "Returns a specific stage from a pipeline configuration",
  })
  @ApiParam({ name: "id", description: "Pipeline configuration ID" })
  @ApiParam({ name: "stageId", description: "Stage ID within the pipeline" })
  @ApiResponse({
    status: 200,
    description: "Pipeline stage",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Pipeline or stage not found" })
  async getStage(
    @Param("id") id: string,
    @Param("stageId") stageId: string,
    @TenantId() organizationId: string,
  ) {
    return this.pipelineService.getStage(id, stageId, organizationId);
  }

  /**
   * GET /api/v1/pipelines/:id/validate-transition
   * Validates if a stage transition is allowed.
   */
  @Get(":id/validate-transition")
  @ApiOperation({
    summary: "Validate stage transition",
    description: "Checks if a transition from one stage to another is allowed",
  })
  @ApiParam({ name: "id", description: "Pipeline configuration ID" })
  @ApiResponse({
    status: 200,
    description: "Transition validation result",
    schema: {
      type: "object",
      properties: {
        valid: { type: "boolean" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async validateTransition(
    @Param("id") id: string,
    @Param("fromStageId") fromStageId: string,
    @Param("toStageId") toStageId: string,
    @TenantId() organizationId: string,
  ) {
    const valid = await this.pipelineService.validateTransition(
      id,
      fromStageId,
      toStageId,
      organizationId,
    );
    return { valid };
  }
}
