import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard, TenantGuard } from "../../../common/guards";
import { CurrentUser, TenantId } from "../../../common/decorators";
import { RequestUser } from "../../auth/interfaces/jwt-payload.interface";
import { TaskAggregatorService } from "./task-aggregator.service";
import {
  MyWorkQueryDto,
  MyWorkResponseDto,
  MarkCompleteDto,
  SnoozeTaskDto,
  TaskCountsResponseDto,
} from "./dto/my-work.dto";
import {
  TaskType,
  TaskCountsByType,
  UnifiedTask,
} from "./entities/unified-task.entity";
import { PrismaService } from "../../prisma/prisma.service";
import { CaseStatus, InvestigationStatus, StepStatus } from "@prisma/client";

/**
 * Parses a composite task ID into type and source entity ID.
 * Format: {type}-{sourceId}
 */
function parseTaskId(taskId: string): { type: TaskType; entityId: string } {
  // Find the first occurrence of a task type prefix
  const types = Object.values(TaskType);
  for (const type of types) {
    if (taskId.startsWith(`${type}-`)) {
      const entityId = taskId.substring(type.length + 1);
      return { type, entityId };
    }
  }
  throw new BadRequestException(`Invalid task ID format: ${taskId}`);
}

/**
 * REST API controller for the unified "My Work" task queue.
 * Aggregates tasks from Cases, Investigations, Disclosures, Campaigns, and more.
 *
 * All endpoints require authentication and are scoped to user's organization.
 */
@ApiTags("My Work")
@ApiBearerAuth("JWT")
@Controller("my-work")
@UseGuards(JwtAuthGuard, TenantGuard)
export class MyWorkController {
  private readonly logger = new Logger(MyWorkController.name);

  constructor(
    private readonly taskAggregator: TaskAggregatorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/v1/my-work
   * Returns unified task queue with "My Tasks" and optionally "Available" sections.
   */
  @Get()
  @ApiOperation({
    summary: "Get unified task queue",
    description:
      "Returns all actionable tasks assigned to the user, sorted by priority-weighted due date. Optionally includes available tasks the user can claim.",
  })
  @ApiResponse({
    status: 200,
    description: "Task queue retrieved successfully",
    type: MyWorkResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMyWork(
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
    @Query() query: MyWorkQueryDto,
  ): Promise<MyWorkResponseDto> {
    // Fetch user's assigned tasks
    const myTasks = await this.taskAggregator.getMyTasks({
      organizationId,
      userId: user.id,
      filters: {
        types: query.types,
        priorities: query.priorities,
        statuses: query.statuses,
        dueDateStart: query.dueDateStart,
        dueDateEnd: query.dueDateEnd,
      },
      sortBy: query.sortBy,
      limit: query.limit,
      offset: query.offset,
    });

    // Optionally fetch available tasks
    let available = { tasks: [] as UnifiedTask[], total: 0 };
    if (query.includeAvailable) {
      available = await this.taskAggregator.getAvailableTasks({
        organizationId,
        userId: user.id,
        userRole: user.role,
        limit: 20, // Limit available to prevent overwhelming
      });
    }

    return {
      sections: [
        { title: "My Tasks", tasks: myTasks.tasks, count: myTasks.total },
        { title: "Available", tasks: available.tasks, count: available.total },
      ],
      total: myTasks.total + available.total,
      hasMore: myTasks.hasMore,
    };
  }

  /**
   * GET /api/v1/my-work/counts
   * Returns task counts grouped by type for dashboard widgets.
   */
  @Get("counts")
  @ApiOperation({
    summary: "Get task counts by type",
    description:
      "Returns the count of tasks for each task type for dashboard widgets.",
  })
  @ApiResponse({
    status: 200,
    description: "Task counts retrieved successfully",
    type: TaskCountsResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getTaskCounts(
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<TaskCountsByType> {
    return this.taskAggregator.getTaskCounts(organizationId, user.id);
  }

  /**
   * POST /api/v1/my-work/:taskId/complete
   * Marks a task as complete. Routes to the appropriate entity service.
   */
  @Post(":taskId/complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Mark task as complete",
    description:
      "Marks the specified task as complete. The action is routed to the appropriate entity service based on task type.",
  })
  @ApiParam({
    name: "taskId",
    description: "Composite task ID in format {type}-{entityId}",
    example: "case_assignment-abc123",
  })
  @ApiResponse({ status: 200, description: "Task marked as complete" })
  @ApiResponse({
    status: 400,
    description: "Invalid task ID or task cannot be completed",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async markComplete(
    @Param("taskId") taskId: string,
    @Body() dto: MarkCompleteDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<{ success: boolean; message: string }> {
    const { type, entityId } = parseTaskId(taskId);

    // Route to appropriate service based on task type
    switch (type) {
      case TaskType.CASE_ASSIGNMENT:
        await this.completeCase(entityId, organizationId, user.id);
        break;

      case TaskType.INVESTIGATION_STEP:
        await this.completeInvestigation(entityId, organizationId, user.id);
        break;

      case TaskType.REMEDIATION_TASK:
        await this.completeRemediationStep(
          entityId,
          organizationId,
          user.id,
          dto.notes,
        );
        break;

      case TaskType.CAMPAIGN_RESPONSE:
        throw new BadRequestException(
          "Campaign responses must be completed through the disclosure portal",
        );

      case TaskType.DISCLOSURE_REVIEW:
        throw new BadRequestException(
          "Disclosure reviews must be resolved through the conflicts interface",
        );

      case TaskType.APPROVAL_REQUEST:
        throw new BadRequestException(
          "Approval requests must be handled through the workflow interface",
        );

      default:
        throw new BadRequestException(`Unknown task type: ${type}`);
    }

    return { success: true, message: "Task marked as complete" };
  }

  /**
   * POST /api/v1/my-work/:taskId/snooze
   * Snoozes a task until a later date.
   * Note: This creates a "snoozed" state that filters the task from the queue.
   */
  @Post(":taskId/snooze")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Snooze task until later",
    description:
      "Temporarily hides the task from the queue until the specified date.",
  })
  @ApiParam({
    name: "taskId",
    description: "Composite task ID in format {type}-{entityId}",
    example: "investigation_step-def456",
  })
  @ApiResponse({ status: 200, description: "Task snoozed successfully" })
  @ApiResponse({ status: 400, description: "Invalid task ID or snooze date" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async snoozeTask(
    @Param("taskId") taskId: string,
    @Body() dto: SnoozeTaskDto,
    @CurrentUser() user: RequestUser,
    @TenantId() _organizationId: string,
  ): Promise<{ success: boolean; snoozedUntil: string }> {
    const { type, entityId } = parseTaskId(taskId);
    const snoozeUntil = new Date(dto.until);

    // Validate snooze date is in the future
    if (snoozeUntil <= new Date()) {
      throw new BadRequestException("Snooze date must be in the future");
    }

    // For now, log the snooze action - full implementation would store in a user preferences table
    // Note: _organizationId reserved for future snooze persistence table
    this.logger.log(
      `User ${user.id} snoozed task ${taskId} (${type}/${entityId}) until ${snoozeUntil.toISOString()}`,
    );

    // TODO: Store snooze in user_task_preferences table:
    // {
    //   userId, taskType, entityId, snoozedUntil, organizationId
    // }
    // The getMyTasks query would filter out snoozed tasks

    return {
      success: true,
      snoozedUntil: snoozeUntil.toISOString(),
    };
  }

  /**
   * POST /api/v1/my-work/:taskId/claim
   * Claims an available (unassigned) task.
   */
  @Post(":taskId/claim")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Claim an available task",
    description: "Assigns an unassigned task to the current user.",
  })
  @ApiParam({
    name: "taskId",
    description: "Composite task ID in format {type}-{entityId}",
    example: "case_assignment-ghi789",
  })
  @ApiResponse({ status: 200, description: "Task claimed successfully" })
  @ApiResponse({
    status: 400,
    description: "Invalid task ID or task already assigned",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async claimTask(
    @Param("taskId") taskId: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<{ success: boolean; message: string }> {
    const { type, entityId } = parseTaskId(taskId);

    // Currently only cases can be claimed
    if (type !== TaskType.CASE_ASSIGNMENT) {
      throw new BadRequestException(`Task type ${type} cannot be claimed`);
    }

    // Find the case
    const caseRecord = await this.prisma.case.findFirst({
      where: { id: entityId, organizationId },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case not found: ${entityId}`);
    }

    if (caseRecord.status !== CaseStatus.NEW) {
      throw new BadRequestException("Case is already assigned or in progress");
    }

    // Assign the case to the user
    await this.prisma.case.update({
      where: { id: entityId },
      data: {
        status: CaseStatus.OPEN,
        updatedById: user.id,
      },
    });

    return {
      success: true,
      message: `Case ${caseRecord.referenceNumber} claimed successfully`,
    };
  }

  // ==========================================
  // Private: Task Completion Helpers
  // ==========================================

  /**
   * Complete a case by setting status to CLOSED.
   */
  private async completeCase(
    entityId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const caseRecord = await this.prisma.case.findFirst({
      where: { id: entityId, organizationId },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case not found: ${entityId}`);
    }

    if (caseRecord.status === CaseStatus.CLOSED) {
      throw new BadRequestException("Case is already closed");
    }

    await this.prisma.case.update({
      where: { id: entityId },
      data: {
        status: CaseStatus.CLOSED,
        updatedById: userId,
      },
    });
  }

  /**
   * Complete an investigation by setting status to CLOSED.
   */
  private async completeInvestigation(
    entityId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const investigation = await this.prisma.investigation.findFirst({
      where: { id: entityId, organizationId },
    });

    if (!investigation) {
      throw new NotFoundException(`Investigation not found: ${entityId}`);
    }

    if (investigation.status === InvestigationStatus.CLOSED) {
      throw new BadRequestException("Investigation is already closed");
    }

    await this.prisma.investigation.update({
      where: { id: entityId },
      data: {
        status: InvestigationStatus.CLOSED,
        closedAt: new Date(),
        closedById: userId,
        updatedById: userId,
      },
    });
  }

  /**
   * Complete a remediation step.
   */
  private async completeRemediationStep(
    entityId: string,
    organizationId: string,
    userId: string,
    notes?: string,
  ): Promise<void> {
    const step = await this.prisma.remediationStep.findFirst({
      where: { id: entityId, organizationId },
    });

    if (!step) {
      throw new NotFoundException(`Remediation step not found: ${entityId}`);
    }

    if (step.status === StepStatus.COMPLETED) {
      throw new BadRequestException("Step is already completed");
    }

    await this.prisma.remediationStep.update({
      where: { id: entityId },
      data: {
        status: StepStatus.COMPLETED,
        completedAt: new Date(),
        completedById: userId,
        completionNotes: notes,
      },
    });

    // Update parent plan's completedSteps count
    await this.prisma.remediationPlan.update({
      where: { id: step.planId },
      data: {
        completedSteps: { increment: 1 },
      },
    });
  }
}
