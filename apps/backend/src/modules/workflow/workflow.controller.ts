import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { WorkflowEntityType } from "@prisma/client";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { WorkflowService } from "./workflow.service";
import { WorkflowEngineService } from "./engine/workflow-engine.service";
import {
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  TransitionDto,
  StartWorkflowDto,
  ListInstancesDto,
} from "./dto";

interface AuthenticatedUser {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
}

/**
 * WorkflowController handles workflow template and instance management.
 *
 * Endpoints:
 * - Templates: CRUD for workflow templates (admin only)
 * - Instances: Start, transition, and query workflow instances
 */
@Controller("workflows")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class WorkflowController {
  constructor(
    private workflowService: WorkflowService,
    private workflowEngine: WorkflowEngineService,
  ) {}

  // ============================================
  // Template Endpoints
  // ============================================

  /**
   * Create a new workflow template.
   */
  @Post("templates")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async createTemplate(
    @Body() dto: CreateWorkflowTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
    @TenantId() organizationId: string,
  ) {
    return this.workflowService.create(organizationId, dto, user.id);
  }

  /**
   * List all workflow templates with instance counts.
   */
  @Get("templates")
  async listTemplates(
    @TenantId() organizationId: string,
    @Query("entityType") entityType?: WorkflowEntityType,
    @Query("isActive") isActive?: string,
  ) {
    return this.workflowService.findAllWithCounts(organizationId, {
      entityType,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
    });
  }

  /**
   * Get version history for a workflow template.
   * Returns all versions ordered by version number descending.
   * Must be defined BEFORE templates/:id to avoid route conflict.
   */
  @Get("templates/:id/versions")
  async getTemplateVersions(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    return this.workflowService.findVersions(organizationId, id);
  }

  /**
   * Clone a workflow template.
   * Creates a copy with "(Copy)" appended to name, in draft state.
   */
  @Post("templates/:id/clone")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async cloneTemplate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @TenantId() organizationId: string,
  ) {
    return this.workflowService.clone(organizationId, id, user.id);
  }

  /**
   * Get the default template for an entity type.
   * Must be defined BEFORE templates/:id to avoid route conflict.
   */
  @Get("templates/default/:entityType")
  async getDefaultTemplate(
    @Param("entityType") entityType: WorkflowEntityType,
    @TenantId() organizationId: string,
  ) {
    return this.workflowService.findDefault(organizationId, entityType);
  }

  /**
   * Get a specific workflow template.
   */
  @Get("templates/:id")
  async getTemplate(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    const template = await this.workflowService.findById(organizationId, id);
    if (!template) {
      return { error: "Template not found" };
    }
    return template;
  }

  /**
   * Update a workflow template.
   */
  @Patch("templates/:id")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async updateTemplate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowTemplateDto,
    @TenantId() organizationId: string,
  ) {
    return this.workflowService.update(organizationId, id, dto);
  }

  /**
   * Delete a workflow template.
   */
  @Delete("templates/:id")
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    await this.workflowService.delete(organizationId, id);
  }

  // ============================================
  // Instance Endpoints
  // ============================================

  /**
   * List all workflow instances with optional filters.
   * Supports filtering by templateId, status, entityType.
   * Must be defined BEFORE instances/:id to avoid route conflict.
   */
  @Get("instances")
  async listInstances(
    @Query() query: ListInstancesDto,
    @TenantId() organizationId: string,
  ) {
    return this.workflowService.listInstances(organizationId, query);
  }

  /**
   * Start a new workflow instance for an entity.
   */
  @Post("instances")
  async startWorkflow(
    @Body() dto: StartWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
    @TenantId() organizationId: string,
  ) {
    const instanceId = await this.workflowEngine.startWorkflow({
      organizationId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      templateId: dto.templateId,
      actorUserId: user.id,
    });

    return { instanceId };
  }

  /**
   * Get a workflow instance by ID.
   */
  @Get("instances/:id")
  async getInstance(@Param("id", ParseUUIDPipe) id: string) {
    const instance = await this.workflowEngine.getInstance(id);
    if (!instance) {
      return { error: "Instance not found" };
    }
    return instance;
  }

  /**
   * Get workflow instance for a specific entity.
   */
  @Get("entity/:entityType/:entityId")
  async getByEntity(
    @Param("entityType") entityType: WorkflowEntityType,
    @Param("entityId", ParseUUIDPipe) entityId: string,
    @TenantId() organizationId: string,
  ) {
    return this.workflowEngine.getInstanceByEntity(
      organizationId,
      entityType,
      entityId,
    );
  }

  /**
   * Get allowed transitions for a workflow instance.
   */
  @Get("instances/:id/transitions")
  async getAllowedTransitions(@Param("id", ParseUUIDPipe) id: string) {
    return this.workflowEngine.getAllowedTransitions(id);
  }

  /**
   * Transition a workflow instance to a new stage.
   */
  @Post("instances/:id/transition")
  async transition(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TransitionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflowEngine.transition({
      instanceId: id,
      toStage: dto.toStage,
      actorUserId: user.id,
      validateGates: dto.validateGates,
      reason: dto.reason,
    });
  }

  /**
   * Complete a workflow instance.
   */
  @Post("instances/:id/complete")
  async complete(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { outcome?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.workflowEngine.complete({
      instanceId: id,
      outcome: body.outcome,
      actorUserId: user.id,
    });
    return { success: true };
  }

  /**
   * Cancel a workflow instance.
   */
  @Post("instances/:id/cancel")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.workflowEngine.cancel(id, user.id, body.reason);
    return { success: true };
  }

  /**
   * Pause a workflow instance.
   */
  @Post("instances/:id/pause")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async pause(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.workflowEngine.pause(id, user.id, body.reason);
    return { success: true };
  }

  /**
   * Resume a paused workflow instance.
   */
  @Post("instances/:id/resume")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async resume(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.workflowEngine.resume(id, user.id);
    return { success: true };
  }
}
