import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { ProjectTemplateService } from "./project-template.service";
import {
  CreateProjectTemplateDto,
  ApplyTemplateDto,
  ProjectTemplateResponseDto,
} from "./dto/project-template.dto";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";

/**
 * Controller for project template management.
 * Exposes routes at /api/v1/project-templates.
 *
 * Provides:
 * - Template listing (organization + system templates)
 * - Template CRUD (for organization templates)
 * - Apply template to create new project
 */
@ApiTags("Project Templates")
@ApiBearerAuth("JWT")
@Controller("project-templates")
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProjectTemplateController {
  constructor(
    private readonly projectTemplateService: ProjectTemplateService,
  ) {}

  /**
   * GET /api/v1/project-templates
   * Lists all templates available to the organization.
   * Includes both organization-specific and system templates.
   */
  @Get()
  @ApiOperation({
    summary: "List project templates",
    description:
      "Returns all templates available to the organization (org + system)",
  })
  @ApiResponse({ status: 200, description: "List of templates" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async list(
    @TenantId() organizationId: string,
  ): Promise<ProjectTemplateResponseDto[]> {
    return this.projectTemplateService.list(organizationId);
  }

  /**
   * GET /api/v1/project-templates/:id
   * Gets a single template by ID.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get template by ID",
    description: "Returns a single template with its structure",
  })
  @ApiParam({ name: "id", description: "Template UUID" })
  @ApiResponse({ status: 200, description: "Template found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Template not found" })
  async get(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<ProjectTemplateResponseDto | null> {
    return this.projectTemplateService.get(organizationId, id);
  }

  /**
   * POST /api/v1/project-templates
   * Creates a new project template.
   */
  @Post()
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create project template",
    description: "Creates a new organization-specific project template",
  })
  @ApiResponse({ status: 201, description: "Template created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  async create(
    @Body() dto: CreateProjectTemplateDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ProjectTemplateResponseDto | null> {
    const template = await this.projectTemplateService.create(
      organizationId,
      user.id,
      dto,
    );
    return this.projectTemplateService.get(organizationId, template.id);
  }

  /**
   * DELETE /api/v1/project-templates/:id
   * Deletes a project template.
   * Only organization-specific templates can be deleted, not system templates.
   */
  @Delete(":id")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete project template",
    description: "Deletes an organization-specific template (not system)",
  })
  @ApiParam({ name: "id", description: "Template UUID" })
  @ApiResponse({ status: 204, description: "Template deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Cannot delete system template" })
  @ApiResponse({ status: 404, description: "Template not found" })
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<void> {
    await this.projectTemplateService.delete(organizationId, id);
  }

  /**
   * POST /api/v1/project-templates/:id/apply
   * Applies a template to create a new project.
   * Creates the project with groups, columns, and tasks from the template.
   */
  @Post(":id/apply")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Apply template",
    description:
      "Creates a new project from a template with groups, columns, and tasks",
  })
  @ApiParam({ name: "id", description: "Template UUID" })
  @ApiResponse({ status: 201, description: "Project created from template" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Template not found" })
  async apply(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: Omit<ApplyTemplateDto, "templateId">,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<{ projectId: string }> {
    const projectId = await this.projectTemplateService.applyTemplate(
      organizationId,
      user.id,
      { ...dto, templateId: id },
    );
    return { projectId };
  }
}
