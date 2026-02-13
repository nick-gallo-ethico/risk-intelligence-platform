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
import { ProjectService } from "./project.service";
import { ProjectTaskService } from "./project-task.service";
import { ProjectGroupService } from "./project-group.service";
import {
  ProjectStatsService,
  ProjectStatsResponse,
} from "./services/project-stats.service";
import { ProjectUpdateService } from "./services/project-update.service";
import { ProjectTaskSubscriberService } from "./services/project-task-subscriber.service";
import { ProjectTaskDependencyService } from "./services/project-task-dependency.service";
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CreateMilestoneItemDto,
  UpdateMilestoneItemDto,
  MilestoneQueryDto,
  MilestoneResponseDto,
  PaginatedMilestoneResult,
} from "./dto/milestone.dto";
import {
  ProjectDetailResponseDto,
  ProjectQueryDto,
  PaginatedProjectResult,
} from "./dto/project.dto";
import {
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
  ProjectTaskQueryDto,
  BulkUpdateTasksDto,
  ReorderTasksDto,
  ProjectTaskResponseDto,
  PaginatedProjectTaskResult,
} from "./dto/project-task.dto";
import {
  CreateProjectGroupDto,
  UpdateProjectGroupDto,
  ReorderGroupsDto,
} from "./dto/project-group.dto";
import {
  CreateTaskUpdateDto,
  UpdateTaskUpdateDto,
  AddReactionDto,
  SubscribeToTaskDto,
  CreateTaskDependencyDto,
} from "./dto/project-update.dto";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";
import { MilestoneItem, ProjectGroup, ProjectTask } from "@prisma/client";

/**
 * Controller for project/milestone management.
 * Exposes routes at /api/v1/projects.
 *
 * The frontend uses "projects" terminology while the backend
 * model uses "milestones" - this controller bridges that gap.
 *
 * Extended in 21-02 with:
 * - Task CRUD endpoints
 * - Group CRUD endpoints
 * - Bulk update for drag-drop
 * - Reorder endpoints
 */
@ApiTags("Projects")
@ApiBearerAuth("JWT")
@Controller("projects")
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProjectsController {
  constructor(
    private readonly milestoneService: MilestoneService,
    private readonly projectService: ProjectService,
    private readonly projectTaskService: ProjectTaskService,
    private readonly projectGroupService: ProjectGroupService,
    private readonly projectStatsService: ProjectStatsService,
    private readonly projectUpdateService: ProjectUpdateService,
    private readonly projectTaskSubscriberService: ProjectTaskSubscriberService,
    private readonly projectTaskDependencyService: ProjectTaskDependencyService,
  ) {}

  // =========================================================================
  // Project CRUD
  // =========================================================================

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
   * Returns paginated list of projects/milestones with task counts.
   */
  @Get()
  @ApiOperation({
    summary: "List projects",
    description:
      "Returns paginated list of projects with filtering options and task counts",
  })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "ownerId", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of projects" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @Query() query: ProjectQueryDto,
    @TenantId() organizationId: string,
  ): Promise<PaginatedProjectResult> {
    return this.projectService.getProjectsWithTaskCounts(organizationId, query);
  }

  /**
   * GET /api/v1/projects/:id
   * Returns a single project/milestone by ID with full detail.
   * Includes groups, tasks, columns, and task counts.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get project by ID",
    description:
      "Returns a single project with groups, tasks, columns, and task counts",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiResponse({ status: 200, description: "Project found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<ProjectDetailResponseDto | null> {
    return this.projectService.getDetail(organizationId, id);
  }

  /**
   * GET /api/v1/projects/:id/stats
   * Returns aggregated statistics for a project.
   * Includes status/priority counts, workload per assignee, progress over time.
   */
  @Get(":id/stats")
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.MANAGER,
    UserRole.SYSTEM_ADMIN,
    UserRole.POLICY_AUTHOR,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Get project statistics",
    description:
      "Returns aggregated statistics including status distribution, workload per assignee, and progress over time",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiResponse({ status: 200, description: "Project statistics" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async getProjectStats(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<ProjectStatsResponse> {
    return this.projectStatsService.getProjectStats(id, organizationId);
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
  ): Promise<ProjectDetailResponseDto | null> {
    await this.milestoneService.update(organizationId, id, user.id, dto);
    return this.projectService.getDetail(organizationId, id);
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
  // Project Items (Legacy Tasks)
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

  // =========================================================================
  // Project Tasks (Monday.com-style board tasks)
  // =========================================================================

  /**
   * GET /api/v1/projects/:id/tasks
   * Lists tasks for a project with filtering and pagination.
   */
  @Get(":id/tasks")
  @ApiOperation({
    summary: "List project tasks",
    description:
      "Returns paginated list of tasks for a project with filtering options",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "priority", required: false })
  @ApiQuery({ name: "assigneeId", required: false })
  @ApiQuery({ name: "groupId", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "sortBy", required: false })
  @ApiQuery({ name: "sortOrder", required: false })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of tasks" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async listTasks(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ProjectTaskQueryDto,
    @TenantId() organizationId: string,
  ): Promise<PaginatedProjectTaskResult> {
    return this.projectTaskService.list(organizationId, id, query);
  }

  /**
   * POST /api/v1/projects/:id/tasks
   * Creates a new task in a project.
   */
  @Post(":id/tasks")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create project task",
    description: "Creates a new task in a project",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiResponse({ status: 201, description: "Task created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async createTask(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectTaskDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ProjectTask> {
    return this.projectTaskService.create(organizationId, id, user.id, dto);
  }

  /**
   * PUT /api/v1/projects/:id/tasks/:taskId
   * Updates a task in a project.
   */
  @Put(":id/tasks/:taskId")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update project task",
    description: "Updates a task in a project",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiParam({ name: "taskId", description: "Task UUID" })
  @ApiResponse({ status: 200, description: "Task updated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async updateTask(
    @Param("id", ParseUUIDPipe) _id: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateProjectTaskDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ProjectTask> {
    return this.projectTaskService.update(organizationId, taskId, user.id, dto);
  }

  /**
   * DELETE /api/v1/projects/:id/tasks/:taskId
   * Deletes a task from a project.
   */
  @Delete(":id/tasks/:taskId")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete project task",
    description: "Deletes a task and its subtasks from a project",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiParam({ name: "taskId", description: "Task UUID" })
  @ApiResponse({ status: 204, description: "Task deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async deleteTask(
    @Param("id", ParseUUIDPipe) _id: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<void> {
    await this.projectTaskService.delete(organizationId, taskId, user.id);
  }

  /**
   * PUT /api/v1/projects/:id/tasks/bulk
   * Bulk updates multiple tasks (for drag-drop operations).
   */
  @Put(":id/tasks/bulk")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Bulk update tasks",
    description:
      "Updates multiple tasks at once (for drag-drop status/group changes)",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiResponse({ status: 200, description: "Tasks updated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "One or more tasks not found" })
  async bulkUpdateTasks(
    @Param("id", ParseUUIDPipe) _id: string,
    @Body() dto: BulkUpdateTasksDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<{ updated: number }> {
    return this.projectTaskService.bulkUpdate(organizationId, user.id, dto);
  }

  /**
   * PUT /api/v1/projects/:id/tasks/reorder
   * Reorders tasks within a group.
   */
  @Put(":id/tasks/reorder")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Reorder tasks",
    description: "Reorders tasks within a group by providing new order",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiQuery({ name: "groupId", required: false, description: "Group UUID" })
  @ApiResponse({ status: 204, description: "Tasks reordered" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "One or more tasks not found" })
  async reorderTasks(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("groupId") groupId: string | undefined,
    @Body() dto: ReorderTasksDto,
    @TenantId() organizationId: string,
  ): Promise<void> {
    await this.projectTaskService.reorder(
      organizationId,
      id,
      groupId || null,
      dto.orderedIds,
    );
  }

  /**
   * GET /api/v1/projects/:id/tasks/:taskId/subtasks
   * Gets subtasks for a parent task.
   */
  @Get(":id/tasks/:taskId/subtasks")
  @ApiOperation({
    summary: "Get subtasks",
    description: "Returns subtasks for a parent task",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiParam({ name: "taskId", description: "Parent task UUID" })
  @ApiResponse({ status: 200, description: "List of subtasks" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async getSubtasks(
    @Param("id", ParseUUIDPipe) _id: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @TenantId() organizationId: string,
  ): Promise<ProjectTaskResponseDto[]> {
    return this.projectTaskService.getSubtasks(organizationId, taskId);
  }

  // =========================================================================
  // Project Groups
  // =========================================================================

  /**
   * GET /api/v1/projects/:id/groups
   * Lists all groups for a project.
   */
  @Get(":id/groups")
  @ApiOperation({
    summary: "List project groups",
    description: "Returns all groups/sections for a project",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiResponse({ status: 200, description: "List of groups" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async listGroups(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<ProjectGroup[]> {
    return this.projectGroupService.list(organizationId, id);
  }

  /**
   * POST /api/v1/projects/:id/groups
   * Creates a new group in a project.
   */
  @Post(":id/groups")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create project group",
    description: "Creates a new group/section in a project",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiResponse({ status: 201, description: "Group created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async createGroup(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectGroupDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ProjectGroup> {
    return this.projectGroupService.create(organizationId, id, user.id, dto);
  }

  /**
   * PUT /api/v1/projects/:id/groups/:groupId
   * Updates a group in a project.
   */
  @Put(":id/groups/:groupId")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update project group",
    description: "Updates a group/section in a project",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiParam({ name: "groupId", description: "Group UUID" })
  @ApiResponse({ status: 200, description: "Group updated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Group not found" })
  async updateGroup(
    @Param("id", ParseUUIDPipe) _id: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateProjectGroupDto,
    @TenantId() organizationId: string,
  ): Promise<ProjectGroup> {
    return this.projectGroupService.update(organizationId, groupId, dto);
  }

  /**
   * DELETE /api/v1/projects/:id/groups/:groupId
   * Deletes a group from a project.
   */
  @Delete(":id/groups/:groupId")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete project group",
    description:
      "Deletes a group/section from a project. Tasks in the group become ungrouped.",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiParam({ name: "groupId", description: "Group UUID" })
  @ApiResponse({ status: 204, description: "Group deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Group not found" })
  async deleteGroup(
    @Param("id", ParseUUIDPipe) _id: string,
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<void> {
    await this.projectGroupService.delete(organizationId, groupId, user.id);
  }

  /**
   * PUT /api/v1/projects/:id/groups/reorder
   * Reorders groups within a project.
   */
  @Put(":id/groups/reorder")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Reorder groups",
    description: "Reorders groups within a project by providing new order",
  })
  @ApiParam({ name: "id", description: "Project UUID" })
  @ApiResponse({ status: 204, description: "Groups reordered" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "One or more groups not found" })
  async reorderGroups(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReorderGroupsDto,
    @TenantId() organizationId: string,
  ): Promise<void> {
    await this.projectGroupService.reorder(organizationId, id, dto.orderedIds);
  }

  // =========================================================================
  // Task Updates (Conversation Thread)
  // =========================================================================

  @Get(":id/tasks/:taskId/updates")
  @ApiOperation({ summary: "Get task updates" })
  async getTaskUpdates(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @TenantId() organizationId: string,
  ) {
    return this.projectUpdateService.getTaskUpdates(organizationId, taskId);
  }

  @Post(":id/tasks/:taskId/updates")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create task update" })
  async createTaskUpdate(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body() dto: CreateTaskUpdateDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.projectUpdateService.createUpdate(
      organizationId,
      taskId,
      user.id,
      dto,
    );
  }

  @Put(":id/tasks/:taskId/updates/:updateId")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Edit task update" })
  async editTaskUpdate(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) _taskId: string,
    @Param("updateId", ParseUUIDPipe) updateId: string,
    @Body() dto: UpdateTaskUpdateDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.projectUpdateService.editUpdate(
      organizationId,
      updateId,
      user.id,
      dto,
    );
  }

  @Delete(":id/tasks/:taskId/updates/:updateId")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete task update" })
  async deleteTaskUpdate(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) _taskId: string,
    @Param("updateId", ParseUUIDPipe) updateId: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    await this.projectUpdateService.deleteUpdate(
      organizationId,
      updateId,
      user.id,
    );
  }

  @Post(":id/tasks/:taskId/updates/:updateId/reactions")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add reaction to update" })
  async addUpdateReaction(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) _taskId: string,
    @Param("updateId", ParseUUIDPipe) updateId: string,
    @Body() dto: AddReactionDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    await this.projectUpdateService.addReaction(
      organizationId,
      updateId,
      user.id,
      dto.emoji,
    );
  }

  // =========================================================================
  // Task Subscribers (Watcher System)
  // =========================================================================

  @Get(":id/tasks/:taskId/subscribers")
  @ApiOperation({ summary: "Get task subscribers" })
  async getTaskSubscribers(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @TenantId() organizationId: string,
  ) {
    return this.projectTaskSubscriberService.getTaskSubscribers(
      organizationId,
      taskId,
    );
  }

  @Post(":id/tasks/:taskId/subscribers")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Subscribe user to task" })
  async subscribeToTask(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body() dto: SubscribeToTaskDto,
    @TenantId() organizationId: string,
  ) {
    return this.projectTaskSubscriberService.subscribe(
      organizationId,
      taskId,
      dto.userId,
    );
  }

  @Delete(":id/tasks/:taskId/subscribers/:subscriberId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unsubscribe from task" })
  async unsubscribeFromTask(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) _taskId: string,
    @Param("subscriberId", ParseUUIDPipe) subscriberId: string,
    @TenantId() organizationId: string,
  ) {
    await this.projectTaskSubscriberService.unsubscribe(
      organizationId,
      subscriberId,
    );
  }

  // =========================================================================
  // Task Dependencies
  // =========================================================================

  @Get(":id/tasks/:taskId/dependencies")
  @ApiOperation({ summary: "Get task dependencies" })
  async getTaskDependencies(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @TenantId() organizationId: string,
  ) {
    return this.projectTaskDependencyService.getTaskDependencies(
      organizationId,
      taskId,
    );
  }

  @Post(":id/tasks/:taskId/dependencies")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create task dependency" })
  async createTaskDependency(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body() dto: CreateTaskDependencyDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.projectTaskDependencyService.createDependency(
      organizationId,
      taskId,
      dto.dependsOnTaskId,
      dto.type || "FINISH_TO_START",
      user.id,
    );
  }

  @Delete(":id/tasks/:taskId/dependencies/:dependencyId")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.MANAGER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete task dependency" })
  async deleteTaskDependency(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) _taskId: string,
    @Param("dependencyId", ParseUUIDPipe) dependencyId: string,
    @TenantId() organizationId: string,
  ) {
    await this.projectTaskDependencyService.deleteDependency(
      organizationId,
      dependencyId,
    );
  }
}
