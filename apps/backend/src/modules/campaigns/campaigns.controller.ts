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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
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

// TODO: Add guards when auth module is integrated
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';
// import { TenantId } from '../auth/decorators/tenant-id.decorator';

// Temporary hardcoded values for development
const TEMP_ORG_ID = "00000000-0000-0000-0000-000000000001";
const TEMP_USER_ID = "00000000-0000-0000-0000-000000000001";

@ApiTags("campaigns")
@Controller("campaigns")
// @UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: "Create a new campaign" })
  @ApiResponse({ status: 201, description: "Campaign created successfully" })
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    return this.campaignsService.create(dto, TEMP_USER_ID, TEMP_ORG_ID);
  }

  @Get()
  @ApiOperation({ summary: "List all campaigns" })
  @ApiQuery({ name: "status", required: false, enum: CampaignStatus })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  async findAllCampaigns(
    @Query("status") status?: CampaignStatus,
    @Query("type") type?: string,
    @Query("skip") skip?: number,
    @Query("take") take?: number,
    // @TenantId() orgId: string,
  ) {
    return this.campaignsService.findAll(TEMP_ORG_ID, {
      status,
      type,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  // ==================== Dashboard Endpoints ====================

  @Get("dashboard/stats")
  @ApiOperation({ summary: "Get dashboard statistics for campaigns" })
  @ApiResponse({
    status: 200,
    description: "Dashboard statistics retrieved successfully",
  })
  async getDashboardStats() {
    // @TenantId() orgId: string,
    return this.dashboardService.getDashboardStats(TEMP_ORG_ID);
  }

  @Get("dashboard/overdue")
  @ApiOperation({ summary: "Get campaigns with overdue assignments" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Overdue campaigns retrieved successfully",
  })
  async getOverdueCampaigns(
    @Query("limit") limit?: number,
    // @TenantId() orgId: string,
  ) {
    return this.dashboardService.getOverdueCampaigns(
      TEMP_ORG_ID,
      limit ? Number(limit) : 10,
    );
  }

  @Get("dashboard/upcoming")
  @ApiOperation({ summary: "Get active campaigns with upcoming deadlines" })
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Upcoming deadline campaigns retrieved successfully",
  })
  async getUpcomingDeadlines(
    @Query("days") days?: number,
    @Query("limit") limit?: number,
    // @TenantId() orgId: string,
  ) {
    return this.dashboardService.getUpcomingDeadlines(
      TEMP_ORG_ID,
      days ? Number(days) : 7,
      limit ? Number(limit) : 10,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get campaign by ID" })
  @ApiParam({ name: "id", type: "string" })
  async findOneCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    // @TenantId() orgId: string,
  ) {
    return this.campaignsService.findOne(id, TEMP_ORG_ID);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update campaign" })
  @ApiParam({ name: "id", type: "string" })
  async updateCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    return this.campaignsService.update(id, dto, TEMP_USER_ID, TEMP_ORG_ID);
  }

  @Post(":id/launch")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Launch a campaign" })
  @ApiParam({ name: "id", type: "string" })
  async launchCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: LaunchCampaignDto,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    return this.campaignsService.launch(id, dto, TEMP_USER_ID, TEMP_ORG_ID);
  }

  @Post(":id/pause")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Pause a campaign" })
  @ApiParam({ name: "id", type: "string" })
  async pauseCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    return this.campaignsService.pause(id, TEMP_USER_ID, TEMP_ORG_ID);
  }

  @Post(":id/resume")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resume a paused campaign" })
  @ApiParam({ name: "id", type: "string" })
  async resumeCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    return this.campaignsService.resume(id, TEMP_USER_ID, TEMP_ORG_ID);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel a campaign" })
  @ApiParam({ name: "id", type: "string" })
  async cancelCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("reason") reason?: string,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    return this.campaignsService.cancel(id, TEMP_USER_ID, TEMP_ORG_ID, reason);
  }

  @Post(":id/remind")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Trigger reminders for a campaign" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Reminders queued successfully",
  })
  async sendReminders(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    const pendingReminders =
      await this.reminderService.findAssignmentsNeedingReminders(TEMP_ORG_ID);
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
  @ApiOperation({ summary: "Delete a draft campaign" })
  @ApiParam({ name: "id", type: "string" })
  async removeCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    await this.campaignsService.remove(id, TEMP_USER_ID, TEMP_ORG_ID);
  }

  @Get(":id/statistics")
  @ApiOperation({ summary: "Get campaign statistics" })
  @ApiParam({ name: "id", type: "string" })
  async getCampaignStatistics(
    @Param("id", ParseUUIDPipe) id: string,
    // @TenantId() orgId: string,
  ) {
    return this.campaignsService.getStatistics(id, TEMP_ORG_ID);
  }

  // ==================== Assignment Endpoints ====================

  @Get(":id/assignments")
  @ApiOperation({ summary: "Get campaign assignments" })
  @ApiParam({ name: "id", type: "string" })
  @ApiQuery({ name: "status", required: false, enum: AssignmentStatus })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  async getCampaignAssignments(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("status") status?: AssignmentStatus,
    @Query("skip") skip?: number,
    @Query("take") take?: number,
    // @TenantId() orgId: string,
  ) {
    return this.assignmentService.findByCampaign(id, TEMP_ORG_ID, {
      status,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Post(":campaignId/assignments/:assignmentId/skip")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Skip an assignment (admin exemption)" })
  async skipAssignment(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @Param("assignmentId", ParseUUIDPipe) assignmentId: string,
    @Body("reason") reason: string,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    return this.assignmentService.skipAssignment(
      assignmentId,
      TEMP_ORG_ID,
      TEMP_USER_ID,
      reason,
    );
  }

  // ==================== Segment Endpoints ====================

  @Post("segments")
  @ApiOperation({ summary: "Create a new segment" })
  @ApiResponse({ status: 201, description: "Segment created successfully" })
  async createSegment(
    @Body() dto: CreateSegmentDto,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    return this.segmentService.create(dto, TEMP_USER_ID, TEMP_ORG_ID);
  }

  @Get("segments")
  @ApiOperation({ summary: "List all segments" })
  @ApiQuery({ name: "activeOnly", required: false, type: Boolean })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  async findAllSegments(
    @Query("activeOnly") activeOnly?: boolean,
    @Query("skip") skip?: number,
    @Query("take") take?: number,
    // @TenantId() orgId: string,
  ) {
    return this.segmentService.findAll(TEMP_ORG_ID, {
      activeOnly:
        activeOnly === true || activeOnly === ("true" as unknown as boolean),
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get("segments/:id")
  @ApiOperation({ summary: "Get segment by ID" })
  @ApiParam({ name: "id", type: "string" })
  async findOneSegment(
    @Param("id", ParseUUIDPipe) id: string,
    // @TenantId() orgId: string,
  ) {
    return this.segmentService.findOne(id, TEMP_ORG_ID);
  }

  @Put("segments/:id")
  @ApiOperation({ summary: "Update segment" })
  @ApiParam({ name: "id", type: "string" })
  async updateSegment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSegmentDto,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    return this.segmentService.update(id, dto, TEMP_USER_ID, TEMP_ORG_ID);
  }

  @Delete("segments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete or deactivate segment" })
  @ApiParam({ name: "id", type: "string" })
  async removeSegment(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ) {
    await this.segmentService.remove(id, TEMP_USER_ID, TEMP_ORG_ID);
  }

  @Post("segments/preview")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Preview audience for segment criteria" })
  async previewSegmentAudience(
    @Body() criteria: SegmentCriteria,
    // @TenantId() orgId: string,
  ) {
    return this.segmentService.previewAudience(criteria, TEMP_ORG_ID);
  }

  @Get("segments/:id/employees")
  @ApiOperation({ summary: "Get employees matching segment" })
  @ApiParam({ name: "id", type: "string" })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  async getSegmentEmployees(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("skip") skip?: number,
    @Query("take") take?: number,
    // @TenantId() orgId: string,
  ) {
    return this.segmentService.getSegmentEmployees(id, TEMP_ORG_ID, {
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }
}
