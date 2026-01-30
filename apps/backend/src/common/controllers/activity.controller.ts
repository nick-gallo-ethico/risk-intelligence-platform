// =============================================================================
// ACTIVITY CONTROLLER - API endpoints for activity/audit log access
// =============================================================================
//
// Provides read-only access to the organization's activity timeline.
// All endpoints are protected by JWT auth and tenant isolation.
//
// KEY DESIGN DECISIONS:
// 1. Read-only - no mutations (logging is done via ActivityService.log)
// 2. Tenant isolation enforced on all queries
// 3. Self-access OR admin roles for user-specific activity
// =============================================================================

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Logger,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";

// Guards
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { TenantGuard } from "../guards/tenant.guard";
import { RolesGuard } from "../guards/roles.guard";

// Decorators
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../decorators/roles.decorator";
import { CurrentUser } from "../decorators/current-user.decorator";
import { TenantId } from "../decorators/tenant-id.decorator";

// DTOs
import { ActivityQueryDto, ActivityListResponseDto } from "../dto";

// Service
import { ActivityService } from "../services/activity.service";

// Types
import { RequestUser } from "../../modules/auth/interfaces/jwt-payload.interface";
import { AuditEntityType } from "@prisma/client";

@ApiTags("Activity")
@ApiBearerAuth()
@Controller("api/v1/activity")
@UseGuards(JwtAuthGuard, TenantGuard) // REQUIRED: Protect ALL routes
export class ActivityController {
  private readonly logger = new Logger(ActivityController.name);

  constructor(private readonly activityService: ActivityService) {}

  // -------------------------------------------------------------------------
  // LIST ORG ACTIVITY - GET /api/v1/activity
  // -------------------------------------------------------------------------
  @Get()
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Get organization-wide activity (paginated)" })
  @ApiResponse({
    status: 200,
    description: "Success",
    type: ActivityListResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  async getOrganizationActivity(
    @Query() query: ActivityQueryDto,
    @TenantId() organizationId: string,
  ): Promise<ActivityListResponseDto> {
    this.logger.debug(
      `Fetching organization activity for org ${organizationId}`,
    );
    return this.activityService.getOrganizationActivity(organizationId, query);
  }

  // -------------------------------------------------------------------------
  // ENTITY TIMELINE - GET /api/v1/activity/entity/:entityType/:entityId
  // -------------------------------------------------------------------------
  @Get("entity/:entityType/:entityId")
  @ApiOperation({ summary: "Get activity timeline for a specific entity" })
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
    description: "Success",
    type: ActivityListResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  async getEntityTimeline(
    @Param("entityType") entityType: AuditEntityType,
    @Param("entityId", ParseUUIDPipe) entityId: string,
    @Query() query: ActivityQueryDto,
    @TenantId() organizationId: string,
  ): Promise<ActivityListResponseDto> {
    this.logger.debug(
      `Fetching timeline for ${entityType}:${entityId} in org ${organizationId}`,
    );
    return this.activityService.getEntityTimeline(
      entityType,
      entityId,
      organizationId,
      {
        page: query.page,
        limit: query.limit,
        sortOrder: query.sortOrder,
      },
    );
  }

  // -------------------------------------------------------------------------
  // USER ACTIVITY - GET /api/v1/activity/user/:userId
  // -------------------------------------------------------------------------
  @Get("user/:userId")
  @ApiOperation({ summary: "Get activity history for a specific user" })
  @ApiParam({
    name: "userId",
    description: "UUID of the user",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @ApiResponse({
    status: 200,
    description: "Success",
    type: ActivityListResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - can only view own or admin",
  })
  async getUserActivity(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Query() query: ActivityQueryDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ActivityListResponseDto> {
    // Access control: self OR admin roles
    const isOwnActivity = user.id === userId;
    const isAdmin =
      user.role === UserRole.SYSTEM_ADMIN ||
      user.role === UserRole.COMPLIANCE_OFFICER;

    if (!isOwnActivity && !isAdmin) {
      throw new ForbiddenException(
        "You can only view your own activity or require admin privileges",
      );
    }

    this.logger.debug(
      `Fetching activity for user ${userId} in org ${organizationId}`,
    );
    return this.activityService.getUserActivity(userId, organizationId, {
      page: query.page,
      limit: query.limit,
      sortOrder: query.sortOrder,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }
}
