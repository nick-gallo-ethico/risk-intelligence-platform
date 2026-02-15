import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CampaignsService } from "./campaigns.service";
import { SegmentService } from "./targeting/segment.service";
import { CampaignAssignmentService } from "./assignments/campaign-assignment.service";
import { CampaignDashboardService } from "./campaign-dashboard.service";
import { CampaignReminderService } from "./campaign-reminder.service";
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  LaunchCampaignDto,
} from "./dto/create-campaign.dto";
import {
  CreateSegmentDto,
  UpdateSegmentDto,
  SegmentCriteria,
} from "./dto/segment-criteria.dto";
import { CampaignStatus, AssignmentStatus } from "@prisma/client";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("campaigns")
@ApiBearerAuth()
@Controller("campaigns")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class CampaignsController {
  constructor(
    private campaignsService: CampaignsService,
    private segmentService: SegmentService,
    private assignmentService: CampaignAssignmentService,
    private dashboardService: CampaignDashboardService,
    private reminderService: CampaignReminderService,
  ) {}

  // ==================== Campaign Endpoints ====================

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Create a new campaign" })
  @ApiResponse({ status: 201, description: "Campaign created successfully" })
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.campaignsService.create(dto, user.id, organizationId);
  }

  @Get()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "List all campaigns" })
  @ApiQuery({ name: "status", required: false, enum: CampaignStatus })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  async findAllCampaigns(
    @Query("status") status: CampaignStatus | undefined,
    @Query("type") type: string | undefined,
    @Query("skip") skip: number | undefined,
    @Query("take") take: number | undefined,
    @TenantId() organizationId: string,
  ) {
    return this.campaignsService.findAll(organizationId, {
      status,
      type,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  // ==================== Dashboard Endpoints ====================

  @Get("dashboard/stats")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Get dashboard statistics for campaigns" })
  @ApiResponse({
    status: 200,
    description: "Dashboard statistics retrieved successfully",
  })
  async getDashboardStats(@TenantId() organizationId: string) {
    return this.dashboardService.getDashboardStats(organizationId);
  }

  @Get("dashboard/overdue")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Get campaigns with overdue assignments" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Overdue campaigns retrieved successfully",
  })
  async getOverdueCampaigns(
    @Query("limit") limit: number | undefined,
    @TenantId() organizationId: string,
  ) {
    return this.dashboardService.getOverdueCampaigns(
      organizationId,
      limit ? Number(limit) : 10,
    );
  }

  @Get("dashboard/upcoming")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Get active campaigns with upcoming deadlines" })
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Upcoming deadline campaigns retrieved successfully",
  })
  async getUpcomingDeadlines(
    @Query("days") days: number | undefined,
    @Query("limit") limit: number | undefined,
    @TenantId() organizationId: string,
  ) {
    return this.dashboardService.getUpcomingDeadlines(
      organizationId,
      days ? Number(days) : 7,
      limit ? Number(limit) : 10,
    );
  }

  @Get(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Get campaign by ID" })
  @ApiParam({ name: "id", type: "string" })
  async findOneCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    return this.campaignsService.findOne(id, organizationId);
  }

  @Put(":id")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Update campaign" })
  @ApiParam({ name: "id", type: "string" })
  async updateCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.campaignsService.update(id, dto, user.id, organizationId);
  }

  @Post(":id/launch")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Launch a campaign" })
  @ApiParam({ name: "id", type: "string" })
  async launchCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: LaunchCampaignDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.campaignsService.launch(id, dto, user.id, organizationId);
  }

  @Post(":id/pause")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Pause a campaign" })
  @ApiParam({ name: "id", type: "string" })
  async pauseCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.campaignsService.pause(id, user.id, organizationId);
  }

  @Post(":id/resume")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Resume a paused campaign" })
  @ApiParam({ name: "id", type: "string" })
  async resumeCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.campaignsService.resume(id, user.id, organizationId);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Cancel a campaign" })
  @ApiParam({ name: "id", type: "string" })
  async cancelCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("reason") reason: string | undefined,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.campaignsService.cancel(id, user.id, organizationId, reason);
  }

  @Post(":id/remind")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Trigger reminders for a campaign" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Reminders queued successfully",
  })
  async sendReminders(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    const pendingReminders =
      await this.reminderService.findAssignmentsNeedingReminders(
        organizationId,
      );
    const campaignReminders = pendingReminders.filter(
      (r) => r.campaignId === id,
    );
    await this.reminderService.queueReminders(campaignReminders);
    return {
      message: "Reminders queued successfully",
      count: campaignReminders.length,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Delete a draft campaign" })
  @ApiParam({ name: "id", type: "string" })
  async removeCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    await this.campaignsService.remove(id, user.id, organizationId);
  }

  @Get(":id/statistics")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Get campaign statistics" })
  @ApiParam({ name: "id", type: "string" })
  async getCampaignStatistics(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    return this.campaignsService.getStatistics(id, organizationId);
  }

  // ==================== Assignment Endpoints ====================

  @Get(":id/assignments")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Get campaign assignments" })
  @ApiParam({ name: "id", type: "string" })
  @ApiQuery({ name: "status", required: false, enum: AssignmentStatus })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  async getCampaignAssignments(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("status") status: AssignmentStatus | undefined,
    @Query("skip") skip: number | undefined,
    @Query("take") take: number | undefined,
    @TenantId() organizationId: string,
  ) {
    return this.assignmentService.findByCampaign(id, organizationId, {
      status,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Post(":campaignId/assignments/:assignmentId/skip")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Skip an assignment (admin exemption)" })
  async skipAssignment(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @Param("assignmentId", ParseUUIDPipe) assignmentId: string,
    @Body("reason") reason: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.assignmentService.skipAssignment(
      assignmentId,
      organizationId,
      user.id,
      reason,
    );
  }

  // ==================== Segment Endpoints ====================

  @Post("segments")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Create a new segment" })
  @ApiResponse({ status: 201, description: "Segment created successfully" })
  async createSegment(
    @Body() dto: CreateSegmentDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.segmentService.create(dto, user.id, organizationId);
  }

  @Get("segments")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "List all segments" })
  @ApiQuery({ name: "activeOnly", required: false, type: Boolean })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  async findAllSegments(
    @Query("activeOnly") activeOnly: boolean | undefined,
    @Query("skip") skip: number | undefined,
    @Query("take") take: number | undefined,
    @TenantId() organizationId: string,
  ) {
    return this.segmentService.findAll(organizationId, {
      activeOnly:
        activeOnly === true || activeOnly === ("true" as unknown as boolean),
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get("segments/:id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Get segment by ID" })
  @ApiParam({ name: "id", type: "string" })
  async findOneSegment(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    return this.segmentService.findOne(id, organizationId);
  }

  @Put("segments/:id")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Update segment" })
  @ApiParam({ name: "id", type: "string" })
  async updateSegment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSegmentDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.segmentService.update(id, dto, user.id, organizationId);
  }

  @Delete("segments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Delete or deactivate segment" })
  @ApiParam({ name: "id", type: "string" })
  async removeSegment(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    await this.segmentService.remove(id, user.id, organizationId);
  }

  @Post("segments/preview")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Preview audience for segment criteria" })
  async previewSegmentAudience(
    @Body() criteria: SegmentCriteria,
    @TenantId() organizationId: string,
  ) {
    return this.segmentService.previewAudience(criteria, organizationId);
  }

  @Get("segments/:id/employees")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Get employees matching segment" })
  @ApiParam({ name: "id", type: "string" })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  async getSegmentEmployees(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("skip") skip: number | undefined,
    @Query("take") take: number | undefined,
    @TenantId() organizationId: string,
  ) {
    return this.segmentService.getSegmentEmployees(id, organizationId, {
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }
}
