import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from "@nestjs/swagger";
import { MilestoneService } from "./milestone.service";
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CreateMilestoneItemDto,
  UpdateMilestoneItemDto,
  MilestoneQueryDto,
  MilestoneResponseDto,
  PaginatedMilestoneResult,
} from "./dto/milestone.dto";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";
import { MilestoneItem } from "@prisma/client";

/**
 * Controller for project/milestone management.
 * Exposes routes at /api/v1/projects.
 *
 * The frontend uses "projects" terminology while the backend
 * model uses "milestones" - this controller bridges that gap.
 */
@ApiTags("Projects")
@ApiBearerAuth("JWT")
@Controller("projects")
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProjectsController {
  constructor(private readonly milestoneService: MilestoneService) {}

  /**
   * POST /api/v1/projects
   * Creates a new project/milestone.
   */
  @Post()
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create project",
    description: "Creates a new project with optional initial items",
  })
  @ApiResponse({ status: 201, description: "Project created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  async create(
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<MilestoneResponseDto | null> {
    const milestone = await this.milestoneService.create(
      organizationId,
      user.id,
      dto,
    );
    return this.milestoneService.get(organizationId, milestone.id);
  }

  /**
   * GET /api/v1/projects
   * Returns paginated list of projects/milestones.
   */
  @Get()
  @ApiOperation({
    summary: "List projects",
    description: "Returns paginated list of projects with filtering options",
  })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "ownerId", required: false })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of projects" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @Query() query: MilestoneQueryDto,
    @TenantId() organizationId: string,
  ): Promise<PaginatedMilestoneResult> {
    return this.milestoneService.list(organizationId, query);
  }

  /**
   * GET /api/v1/projects/:id
   * Returns a single project/milestone by ID.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get project by ID",
    description: "Returns a single project with its items",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiResponse({ status: 200, description: "Project found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<MilestoneResponseDto | null> {
    return this.milestoneService.get(organizationId, id);
  }

  /**
   * PUT /api/v1/projects/:id
   * Updates an existing project/milestone.
   */
  @Put(":id")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update project",
    description: "Updates project fields",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiResponse({ status: 200, description: "Project updated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<MilestoneResponseDto | null> {
    await this.milestoneService.update(organizationId, id, user.id, dto);
    return this.milestoneService.get(organizationId, id);
  }

  /**
   * DELETE /api/v1/projects/:id
   * Deletes a project/milestone.
   */
  @Delete(":id")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete project",
    description: "Deletes a project and all its items",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiResponse({ status: 204, description: "Project deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<void> {
    await this.milestoneService.delete(organizationId, id, user.id);
  }

  // =========================================================================
  // Project Items (Tasks)
  // =========================================================================

  /**
   * POST /api/v1/projects/:id/items
   * Adds an item to a project.
   */
  @Post(":id/items")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Add project item",
    description: "Adds an item/task to a project",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiResponse({ status: 201, description: "Item added successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async addItem(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateMilestoneItemDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<MilestoneItem> {
    return this.milestoneService.addItem(organizationId, id, user.id, dto);
  }

  /**
   * PUT /api/v1/projects/:id/items/:itemId
   * Updates a project item.
   */
  @Put(":id/items/:itemId")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update project item",
    description: "Updates an item/task in a project",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiParam({ name: "itemId", description: "Item UUID" })
  @ApiResponse({ status: 200, description: "Item updated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Item not found" })
  async updateItem(
    @Param("id", ParseUUIDPipe) _id: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateMilestoneItemDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<MilestoneItem> {
    return this.milestoneService.updateItem(
      organizationId,
      itemId,
      user.id,
      dto,
    );
  }

  /**
   * DELETE /api/v1/projects/:id/items/:itemId
   * Removes an item from a project.
   */
  @Delete(":id/items/:itemId")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Remove project item",
    description: "Removes an item/task from a project",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiParam({ name: "itemId", description: "Item UUID" })
  @ApiResponse({ status: 204, description: "Item removed" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Item not found" })
  async removeItem(
    @Param("id", ParseUUIDPipe) _id: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<void> {
    await this.milestoneService.removeItem(organizationId, itemId, user.id);
  }
}
