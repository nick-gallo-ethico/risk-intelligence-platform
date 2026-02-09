// =============================================================================
// ACTIVITY TIMELINE CONTROLLER - REST API for activity timelines
// =============================================================================
//
// Provides endpoints for retrieving activity timelines for entities and users.
// All endpoints are protected by JWT auth and tenant isolation.
//
// ENDPOINTS:
// - GET /api/v1/activity/:entityType/:entityId - Get timeline for entity
// - GET /api/v1/activity/:entityType/:entityId/summary - Get activity summary
// - GET /api/v1/activity/my-recent - Get user's recent activity
// =============================================================================

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Logger,
  ParseEnumPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { AuditEntityType } from "@prisma/client";

// Guards
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";

// Decorators
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { TenantId } from "../../common/decorators/tenant-id.decorator";

// Service
import { ActivityTimelineService } from "./activity-timeline.service";

// DTOs
import {
  TimelineQueryDto,
  TimelineResponseDto,
  EntitySummaryDto,
} from "./dto";

// Types
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("Activity Timeline")
@ApiBearerAuth()
@Controller("activity")
@UseGuards(JwtAuthGuard, TenantGuard)
export class ActivityTimelineController {
  private readonly logger = new Logger(ActivityTimelineController.name);

  constructor(private readonly timelineService: ActivityTimelineService) {}

  // -------------------------------------------------------------------------
  // GET MY RECENT - GET /api/v1/activity/my-recent
  // -------------------------------------------------------------------------

  @Get("my-recent")
  @ApiOperation({
    summary: "Get current user's recent activity",
    description:
      "Retrieves the current user's recent activity across all entities. " +
      "Useful for 'My Recent Activity' panels.",
  })
  @ApiResponse({
    status: 200,
    description: "Recent activity timeline",
    type: TimelineResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMyRecentActivity(
    @Query() query: TimelineQueryDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<TimelineResponseDto> {
    this.logger.debug(
      `Getting recent activity for user ${user.id} in org ${organizationId}`,
    );

    return this.timelineService.getRecentActivity(user.id, organizationId, {
      page: query.page,
      limit: query.limit,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  // -------------------------------------------------------------------------
  // GET ENTITY TIMELINE - GET /api/v1/activity/:entityType/:entityId
  // -------------------------------------------------------------------------

  @Get(":entityType/:entityId")
  @ApiOperation({
    summary: "Get activity timeline for an entity",
    description:
      "Retrieves the activity timeline for a specific entity. " +
      "When includeRelated=true (default), includes activities from related " +
      "entities (e.g., Case timeline includes Investigation activities).",
  })
  @ApiParam({
    name: "entityType",
    description: "Type of entity",
    enum: AuditEntityType,
    example: "CASE",
  })
  @ApiParam({
    name: "entityId",
    description: "UUID of the entity",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiResponse({
    status: 200,
    description: "Entity activity timeline",
    type: TimelineResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  async getEntityTimeline(
    @Param("entityType", new ParseEnumPipe(AuditEntityType))
    entityType: AuditEntityType,
    @Param("entityId", ParseUUIDPipe) entityId: string,
    @Query() query: TimelineQueryDto,
    @TenantId() organizationId: string,
  ): Promise<TimelineResponseDto> {
    this.logger.debug(
      `Getting timeline for ${entityType}:${entityId} in org ${organizationId}`,
    );

    return this.timelineService.getTimeline(
      entityType,
      entityId,
      organizationId,
      {
        page: query.page,
        limit: query.limit,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        includeRelated: query.includeRelated,
      },
    );
  }

  // -------------------------------------------------------------------------
  // GET ENTITY SUMMARY - GET /api/v1/activity/:entityType/:entityId/summary
  // -------------------------------------------------------------------------

  @Get(":entityType/:entityId/summary")
  @ApiOperation({
    summary: "Get activity summary for an entity",
    description:
      "Retrieves activity summary statistics for an entity including " +
      "total activities, last activity, and unique actors.",
  })
  @ApiParam({
    name: "entityType",
    description: "Type of entity",
    enum: AuditEntityType,
    example: "CASE",
  })
  @ApiParam({
    name: "entityId",
    description: "UUID of the entity",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiResponse({
    status: 200,
    description: "Entity activity summary",
    type: EntitySummaryDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getEntitySummary(
    @Param("entityType", new ParseEnumPipe(AuditEntityType))
    entityType: AuditEntityType,
    @Param("entityId", ParseUUIDPipe) entityId: string,
    @TenantId() organizationId: string,
  ): Promise<EntitySummaryDto> {
    this.logger.debug(
      `Getting summary for ${entityType}:${entityId} in org ${organizationId}`,
    );

    return this.timelineService.getEntitySummary(
      entityType,
      entityId,
      organizationId,
    );
  }
}
