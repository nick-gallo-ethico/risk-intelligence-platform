/**
 * ReportController - REST API endpoints for the report system
 *
 * Thin controller layer that delegates business logic to services:
 * - ReportService: CRUD operations for saved reports
 * - ReportFieldRegistryService: Field metadata for report designer
 * - ReportScheduleService: Schedule management with format mapping
 * - ReportAiService: Natural language to report generation
 *
 * All operations enforce tenant isolation via organizationId from JWT.
 */

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
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles, UserRole } from "../../../common/decorators/roles.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { ReportService } from "./report.service";
import { ReportFieldRegistryService } from "./report-field-registry.service";
import {
  ReportScheduleService,
  CreateScheduleInput,
  UpdateScheduleInput,
} from "./services/report-schedule.service";
import { ReportAiService } from "./services/report-ai.service";
import {
  CreateReportDto,
  UpdateReportDto,
  RunReportDto,
  ReportFieldGroupDto,
  SavedReportResponseDto,
  ReportListResponseDto,
} from "./dto/report.dto";
import { ReportEntityType } from "./entities/saved-report.entity";
import { User } from "@prisma/client";

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags("reports")
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly fieldRegistryService: ReportFieldRegistryService,
    private readonly reportScheduleService: ReportScheduleService,
    private readonly reportAiService: ReportAiService,
  ) {}

  // =========================================================================
  // Field Discovery
  // =========================================================================

  @Get("fields/:entityType")
  @ApiOperation({ summary: "Get available fields for an entity type" })
  @ApiParam({
    name: "entityType",
    enum: [
      "cases",
      "rius",
      "persons",
      "campaigns",
      "policies",
      "disclosures",
      "investigations",
    ],
  })
  @ApiResponse({ status: 200, type: [ReportFieldGroupDto] })
  async getFieldsForEntityType(
    @CurrentUser() user: User,
    @Param("entityType") entityType: string,
  ): Promise<ReportFieldGroupDto[]> {
    return this.fieldRegistryService.getFieldGroups(
      entityType as ReportEntityType,
      user.organizationId,
    );
  }

  // =========================================================================
  // Templates
  // =========================================================================

  @Get("templates")
  @ApiOperation({ summary: "List pre-built report templates" })
  @ApiResponse({ status: 200, type: [SavedReportResponseDto] })
  async getTemplates(
    @CurrentUser() user: User,
  ): Promise<SavedReportResponseDto[]> {
    const templates = await this.reportService.getTemplates(
      user.organizationId,
    );
    return templates as unknown as SavedReportResponseDto[];
  }

  // =========================================================================
  // Report CRUD
  // =========================================================================

  @Get()
  @ApiOperation({ summary: "List saved reports" })
  @ApiQuery({
    name: "visibility",
    required: false,
    enum: ["PRIVATE", "TEAM", "EVERYONE"],
  })
  @ApiQuery({ name: "isTemplate", required: false, type: "boolean" })
  @ApiQuery({ name: "search", required: false, type: "string" })
  @ApiQuery({ name: "page", required: false, type: "number" })
  @ApiQuery({ name: "pageSize", required: false, type: "number" })
  @ApiResponse({ status: 200, type: ReportListResponseDto })
  async listReports(
    @CurrentUser() user: User,
    @Query("visibility") visibility?: string,
    @Query("isTemplate") isTemplate?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<ReportListResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const size = pageSize ? parseInt(pageSize, 10) : 20;
    const isTemplateFlag =
      isTemplate === "true" ? true : isTemplate === "false" ? false : undefined;

    const result = await this.reportService.findAll(
      user.organizationId,
      user.id,
      {
        visibility,
        isTemplate: isTemplateFlag,
        search,
        page: pageNum,
        pageSize: size,
      },
    );

    return {
      data: result.data as unknown as SavedReportResponseDto[],
      total: result.total,
      page: pageNum,
      pageSize: size,
    };
  }

  @Post()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new report" })
  @ApiResponse({ status: 201, type: SavedReportResponseDto })
  async createReport(
    @CurrentUser() user: User,
    @Body() dto: CreateReportDto,
  ): Promise<SavedReportResponseDto> {
    const report = await this.reportService.create(
      user.organizationId,
      user.id,
      dto,
    );
    return report as unknown as SavedReportResponseDto;
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single report" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200, type: SavedReportResponseDto })
  async getReport(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<SavedReportResponseDto> {
    const report = await this.reportService.findOne(user.organizationId, id);
    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }
    return report as unknown as SavedReportResponseDto;
  }

  @Put(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({ summary: "Update a report" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200, type: SavedReportResponseDto })
  async updateReport(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateReportDto,
  ): Promise<SavedReportResponseDto> {
    const report = await this.reportService.update(
      user.organizationId,
      user.id,
      id,
      dto,
      user.role as UserRole,
    );
    return report as unknown as SavedReportResponseDto;
  }

  @Delete(":id")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a report" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 204 })
  async deleteReport(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<void> {
    await this.reportService.delete(
      user.organizationId,
      user.id,
      id,
      user.role as UserRole,
    );
  }

  // =========================================================================
  // Report Execution
  // =========================================================================

  @Post(":id/run")
  @ApiOperation({ summary: "Run a saved report" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200 })
  async runReport(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto?: RunReportDto,
  ): Promise<unknown> {
    return this.reportService.run(user.organizationId, id, dto);
  }

  // =========================================================================
  // Report Actions
  // =========================================================================

  @Post(":id/duplicate")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Duplicate a report" })
  @ApiParam({ name: "id", description: "Report ID to duplicate" })
  @ApiResponse({ status: 201, type: SavedReportResponseDto })
  async duplicateReport(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<SavedReportResponseDto> {
    const report = await this.reportService.duplicate(
      user.organizationId,
      user.id,
      id,
    );
    return report as unknown as SavedReportResponseDto;
  }

  @Post(":id/favorite")
  @ApiOperation({ summary: "Toggle favorite status" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200 })
  async toggleFavorite(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<{ isFavorite: boolean }> {
    return this.reportService.toggleFavorite(user.organizationId, user.id, id);
  }

  @Post(":id/export")
  @ApiOperation({ summary: "Export report results" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200 })
  async exportReport(
    @Param("id") id: string,
    @Body() dto: { format: "excel" | "csv" | "pdf" },
  ): Promise<{ jobId?: string; downloadUrl?: string; status: string }> {
    return { status: "PENDING", jobId: `export-${id}-${Date.now()}` };
  }

  // =========================================================================
  // AI Generation
  // =========================================================================

  @Post("ai-generate")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Generate report from natural language" })
  @ApiResponse({ status: 200 })
  async generateFromNaturalLanguage(
    @CurrentUser() user: User,
    @Body() dto: { query: string },
  ): Promise<{
    report: Partial<CreateReportDto>;
    results: unknown;
    interpretation: string;
  }> {
    return this.reportAiService.generateFromNaturalLanguage(
      dto.query,
      user.id,
      user.organizationId,
    );
  }

  // =========================================================================
  // Schedule Management
  // =========================================================================

  @Post(":id/schedule")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({ summary: "Create a schedule for a report" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name", "scheduleType", "time", "format", "recipients"],
    },
  })
  @ApiResponse({ status: 201 })
  async createSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: CreateScheduleInput,
  ): Promise<unknown> {
    return this.reportScheduleService.createSchedule(
      id,
      dto,
      user.id,
      user.organizationId,
    );
  }

  @Get(":id/schedule")
  @ApiOperation({ summary: "Get the schedule for a report" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200 })
  async getSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<unknown> {
    return this.reportScheduleService.getSchedule(id, user.organizationId);
  }

  @Put(":id/schedule")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({ summary: "Update a report schedule" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200 })
  async updateSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateScheduleInput,
  ): Promise<unknown> {
    return this.reportScheduleService.updateSchedule(
      id,
      dto,
      user.organizationId,
    );
  }

  @Delete(":id/schedule")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a report schedule" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 204 })
  async deleteSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<void> {
    await this.reportScheduleService.deleteSchedule(id, user.organizationId);
  }

  @Post(":id/schedule/pause")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({ summary: "Pause a report schedule" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200 })
  async pauseSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<{ message: string; isActive: boolean }> {
    return this.reportScheduleService.pauseSchedule(id, user.organizationId);
  }

  @Post(":id/schedule/resume")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({ summary: "Resume a report schedule" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200 })
  async resumeSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<{ message: string; isActive: boolean }> {
    return this.reportScheduleService.resumeSchedule(id, user.organizationId);
  }

  @Post(":id/schedule/run-now")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Run scheduled report immediately" })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 202 })
  async runScheduleNow(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<{ message: string; runId: string }> {
    return this.reportScheduleService.runScheduleNow(id, user.organizationId);
  }
}
