/**
 * ImplementationController - Implementation Project API
 *
 * REST endpoints for managing implementation projects:
 * - Project CRUD
 * - Task management
 * - Blocker management
 * - Phase transitions
 *
 * All endpoints are internal operations (ops.ethico.com) and require
 * InternalUser authentication.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ImplementationPhase, ImplTaskStatus } from "@prisma/client";
import { ImplementationService } from "./implementation.service";
import { ChecklistService } from "./checklist.service";
import {
  CreateProjectDto,
  UpdateProjectDto,
  UpdateTaskDto,
  CreateBlockerDto,
  UpdateBlockerDto,
  TransitionPhaseDto,
  ListProjectsQueryDto,
} from "./dto/implementation.dto";

@Controller("api/v1/internal/implementations")
export class ImplementationController {
  private readonly logger = new Logger(ImplementationController.name);

  constructor(
    private readonly implementationService: ImplementationService,
    private readonly checklistService: ChecklistService,
  ) {}

  // ==================== Project Endpoints ====================

  /**
   * Create a new implementation project.
   * Automatically generates checklist from template.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProject(@Body() dto: CreateProjectDto) {
    // TODO: Get internal user ID from auth context
    const internalUserId = dto.leadImplementerId;
    return this.implementationService.createProject(dto, internalUserId);
  }

  /**
   * List implementation projects with filtering.
   */
  @Get()
  async listProjects(@Query() query: ListProjectsQueryDto) {
    return this.implementationService.listProjects(query);
  }

  /**
   * Get a single project with all details.
   */
  @Get(":id")
  async getProject(@Param("id", ParseUUIDPipe) id: string) {
    return this.implementationService.getProject(id);
  }

  /**
   * Update a project.
   */
  @Patch(":id")
  async updateProject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    // TODO: Get internal user ID from auth context
    const internalUserId = "system";
    return this.implementationService.updateProject(id, dto, internalUserId);
  }

  /**
   * Complete a project (mark as go-live).
   */
  @Post(":id/complete")
  @HttpCode(HttpStatus.OK)
  async completeProject(@Param("id", ParseUUIDPipe) id: string) {
    // TODO: Get internal user ID from auth context
    const internalUserId = "system";
    return this.implementationService.completeProject(id, internalUserId);
  }

  /**
   * Transition a project to a new phase.
   */
  @Post(":id/phase-transition")
  @HttpCode(HttpStatus.OK)
  async transitionPhase(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TransitionPhaseDto,
  ) {
    // TODO: Get internal user ID from auth context
    const internalUserId = "system";
    await this.implementationService.transitionPhase(
      id,
      dto.phase,
      internalUserId,
    );
    return { success: true, phase: dto.phase };
  }

  // ==================== Task Endpoints ====================

  /**
   * Get all tasks for a project, grouped by phase.
   */
  @Get(":id/tasks")
  async getProjectTasks(@Param("id", ParseUUIDPipe) id: string) {
    return this.checklistService.getTasksByPhase(id);
  }

  /**
   * Get a single task.
   */
  @Get(":id/tasks/:taskId")
  async getTask(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
  ) {
    return this.checklistService.getTask(taskId);
  }

  /**
   * Update a task (status, assignment, notes).
   */
  @Patch(":id/tasks/:taskId")
  async updateTask(
    @Param("id", ParseUUIDPipe) projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    // TODO: Get internal user ID from auth context
    const internalUserId = "system";
    const task = await this.checklistService.updateTask(
      taskId,
      dto,
      internalUserId,
    );

    // Update project health score after task change
    await this.checklistService.updateProjectHealthScore(projectId);

    return task;
  }

  /**
   * Bulk update all tasks in a phase.
   */
  @Post(":id/tasks/phase/:phase/bulk-update")
  @HttpCode(HttpStatus.OK)
  async bulkUpdatePhase(
    @Param("id", ParseUUIDPipe) projectId: string,
    @Param("phase") phase: ImplementationPhase,
    @Body("status") status: ImplTaskStatus,
  ) {
    // TODO: Get internal user ID from auth context
    const internalUserId = "system";
    const result = await this.checklistService.bulkUpdatePhase(
      projectId,
      phase,
      status,
      internalUserId,
    );

    // Update project health score
    await this.checklistService.updateProjectHealthScore(projectId);

    return result;
  }

  /**
   * Get project health score with breakdown.
   */
  @Get(":id/health")
  async getProjectHealth(@Param("id", ParseUUIDPipe) projectId: string) {
    return this.checklistService.calculateProjectHealth(projectId);
  }

  // ==================== Blocker Endpoints ====================

  /**
   * Get all blockers for a project.
   */
  @Get(":id/blockers")
  async getProjectBlockers(
    @Param("id", ParseUUIDPipe) projectId: string,
    @Query("includeResolved") includeResolved?: string,
  ) {
    return this.implementationService.getProjectBlockers(
      projectId,
      includeResolved === "true",
    );
  }

  /**
   * Create a new blocker.
   */
  @Post(":id/blockers")
  @HttpCode(HttpStatus.CREATED)
  async createBlocker(
    @Param("id", ParseUUIDPipe) projectId: string,
    @Body() dto: CreateBlockerDto,
  ) {
    // TODO: Get internal user ID from auth context
    const internalUserId = "system";
    return this.implementationService.createBlocker(
      projectId,
      dto,
      internalUserId,
    );
  }

  /**
   * Update a blocker (snooze, resolve, etc).
   */
  @Patch(":id/blockers/:blockerId")
  async updateBlocker(
    @Param("id", ParseUUIDPipe) _projectId: string,
    @Param("blockerId", ParseUUIDPipe) blockerId: string,
    @Body() dto: UpdateBlockerDto,
  ) {
    // TODO: Get internal user ID from auth context
    const internalUserId = "system";
    return this.implementationService.updateBlocker(
      blockerId,
      dto,
      internalUserId,
    );
  }
}
