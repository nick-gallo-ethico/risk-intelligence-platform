/**
 * ReportController - REST API endpoints for the report system
 *
 * Provides endpoints for:
 * - Field discovery: Get available fields for report designer
 * - Report CRUD: Create, read, update, delete saved reports
 * - Report execution: Run reports and get results
 * - Report actions: Duplicate, favorite, export
 * - AI generation: Natural language to report configuration
 * - Schedule management: Create, update, delete scheduled report delivery
 *
 * All operations enforce tenant isolation via organizationId from JWT.
 *
 * @see ReportService for business logic
 * @see ReportFieldRegistryService for field metadata
 * @see ReportExecutionService for query execution
 * @see ScheduledExportService for schedule management
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
import { AiQueryService } from "../ai-query/ai-query.service";
import {
  ScheduledExportService,
  CreateScheduledExportDto,
  UpdateScheduledExportDto,
} from "../exports/scheduled-export.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateReportDto,
  UpdateReportDto,
  RunReportDto,
  ReportFieldGroupDto,
  SavedReportResponseDto,
  ReportListResponseDto,
} from "./dto/report.dto";
import { ReportEntityType } from "./entities/saved-report.entity";
import { QueryEntityType } from "../ai-query/dto/ai-query.dto";
import { User, ExportType, ExportFormat, DeliveryMethod } from "@prisma/client";

/**
 * Map AI query entity type to report entity type.
 * AI uses singular (case), reports use plural (cases).
 */
const AI_TO_REPORT_ENTITY_MAP: Record<string, ReportEntityType> = {
  [QueryEntityType.CASE]: "cases",
  [QueryEntityType.RIU]: "rius",
  [QueryEntityType.CAMPAIGN]: "campaigns",
  [QueryEntityType.PERSON]: "persons",
  [QueryEntityType.DISCLOSURE]: "disclosures",
  [QueryEntityType.INVESTIGATION]: "investigations",
};

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags("reports")
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly fieldRegistryService: ReportFieldRegistryService,
    private readonly aiQueryService: AiQueryService,
    private readonly scheduledExportService: ScheduledExportService,
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================================
  // Field Discovery (Endpoint 1)
  // =========================================================================

  /**
   * Get available fields for an entity type.
   * Returns fields grouped by category for the report designer field picker.
   */
  @Get("fields/:entityType")
  @ApiOperation({
    summary: "Get available fields for an entity type",
    description:
      "Returns all available fields for the specified entity type, grouped by category. Includes static fields and tenant-specific custom properties.",
  })
  @ApiParam({
    name: "entityType",
    description: "Entity type to get fields for",
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
  @ApiResponse({
    status: 200,
    description: "Field groups for the entity type",
    type: [ReportFieldGroupDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
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
  // Templates (Endpoint 2)
  // =========================================================================

  /**
   * List pre-built report templates.
   * Templates are shared reports marked as isTemplate=true.
   */
  @Get("templates")
  @ApiOperation({
    summary: "List pre-built report templates",
    description:
      "Returns all report templates available to the organization. Templates can be used as starting points for new reports.",
  })
  @ApiResponse({
    status: 200,
    description: "List of report templates",
    type: [SavedReportResponseDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getTemplates(
    @CurrentUser() user: User,
  ): Promise<SavedReportResponseDto[]> {
    const templates = await this.reportService.getTemplates(
      user.organizationId,
    );
    return templates as unknown as SavedReportResponseDto[];
  }

  // =========================================================================
  // Report CRUD (Endpoints 3-7)
  // =========================================================================

  /**
   * List saved reports with pagination and filtering.
   */
  @Get()
  @ApiOperation({
    summary: "List saved reports",
    description:
      "Returns a paginated list of saved reports. Shows user's private reports and shared reports (TEAM/EVERYONE visibility).",
  })
  @ApiQuery({
    name: "visibility",
    required: false,
    enum: ["PRIVATE", "TEAM", "EVERYONE"],
    description: "Filter by visibility",
  })
  @ApiQuery({
    name: "isTemplate",
    required: false,
    type: "boolean",
    description: "Filter to templates only",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: "string",
    description: "Search by name or description",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: "number",
    description: "Page number (1-based)",
  })
  @ApiQuery({
    name: "pageSize",
    required: false,
    type: "number",
    description: "Items per page (default: 20)",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of reports",
    type: ReportListResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
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

  /**
   * Create a new saved report.
   */
  @Post()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new report",
    description:
      "Creates a new saved report configuration. Requires SYSTEM_ADMIN, COMPLIANCE_OFFICER, or POLICY_AUTHOR role.",
  })
  @ApiResponse({
    status: 201,
    description: "Report created successfully",
    type: SavedReportResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid report configuration" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
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

  /**
   * Get a single report by ID.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get a single report",
    description: "Returns the full configuration of a saved report.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({
    status: 200,
    description: "Report details",
    type: SavedReportResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Report not found" })
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

  /**
   * Update an existing report.
   */
  @Put(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({
    summary: "Update a report",
    description:
      "Updates an existing report configuration. Only the creator or SYSTEM_ADMIN can update.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({
    status: 200,
    description: "Report updated successfully",
    type: SavedReportResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid report configuration" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Report not found" })
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

  /**
   * Delete a report.
   */
  @Delete(":id")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a report",
    description:
      "Permanently deletes a saved report. Only the creator or SYSTEM_ADMIN can delete.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 204, description: "Report deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Report not found" })
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
  // Report Execution (Endpoint 8)
  // =========================================================================

  /**
   * Execute a saved report.
   */
  @Post(":id/run")
  @ApiOperation({
    summary: "Run a saved report",
    description:
      "Executes the report and returns results. Supports optional parameter overrides for date range, filters, and pagination.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({
    status: 200,
    description: "Report execution results",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Report not found" })
  async runReport(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto?: RunReportDto,
  ): Promise<unknown> {
    const result = await this.reportService.run(user.organizationId, id, dto);
    return result;
  }

  // =========================================================================
  // Report Actions (Endpoints 9-11)
  // =========================================================================

  /**
   * Duplicate a report.
   */
  @Post(":id/duplicate")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Duplicate a report",
    description:
      'Creates a copy of the report with "(Copy)" appended to the name. The duplicate starts as PRIVATE visibility.',
  })
  @ApiParam({ name: "id", description: "Report ID to duplicate" })
  @ApiResponse({
    status: 201,
    description: "Duplicated report",
    type: SavedReportResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Report not found" })
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

  /**
   * Toggle favorite status.
   */
  @Post(":id/favorite")
  @ApiOperation({
    summary: "Toggle favorite status",
    description: "Toggles the favorite flag on a report for quick access.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({
    status: 200,
    description: "Updated favorite status",
    schema: {
      type: "object",
      properties: {
        isFavorite: { type: "boolean" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Report not found" })
  async toggleFavorite(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<{ isFavorite: boolean }> {
    return this.reportService.toggleFavorite(user.organizationId, user.id, id);
  }

  /**
   * Export report results.
   */
  @Post(":id/export")
  @ApiOperation({
    summary: "Export report results",
    description:
      "Exports report results to the specified format. For large reports, returns a job ID for async processing.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({
    status: 200,
    description: "Export result or job status",
    schema: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID for async exports" },
        downloadUrl: { type: "string", description: "Direct download URL" },
        status: {
          type: "string",
          enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Report not found" })
  async exportReport(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: { format: "excel" | "csv" | "pdf" },
  ): Promise<{ jobId?: string; downloadUrl?: string; status: string }> {
    // For now, return a placeholder - actual export implementation
    // would integrate with ExportsModule/FlatFileService
    // This is a stub that can be wired to the export queue later
    return {
      status: "PENDING",
      jobId: `export-${id}-${Date.now()}`,
    };
  }

  // =========================================================================
  // AI Generation (Endpoint 12)
  // =========================================================================

  /**
   * Generate report from natural language.
   */
  @Post("ai-generate")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({
    summary: "Generate report from natural language",
    description:
      "Converts a natural language query into a report configuration and optionally runs it. Uses AI to parse the query and select appropriate visualization.",
  })
  @ApiResponse({
    status: 200,
    description: "Generated report config and results",
    schema: {
      type: "object",
      properties: {
        report: {
          type: "object",
          description: "Unsaved report configuration",
        },
        results: {
          type: "object",
          description: "Report execution results",
        },
        interpretation: {
          type: "string",
          description: "How the query was interpreted",
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid query" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  async generateFromNaturalLanguage(
    @CurrentUser() user: User,
    @Body() dto: { query: string },
  ): Promise<{
    report: Partial<CreateReportDto>;
    results: unknown;
    interpretation: string;
  }> {
    // Execute the AI query to get parsed query and results
    const aiResult = await this.aiQueryService.executeQuery(
      { query: dto.query, includeSuggestions: true },
      user.id,
      user.organizationId,
    );

    // Convert AI query result to report configuration
    const aiEntityType = aiResult.parsedQuery?.entityType;
    const reportEntityType: ReportEntityType = aiEntityType
      ? AI_TO_REPORT_ENTITY_MAP[aiEntityType] || "cases"
      : "cases";

    const reportConfig: Partial<CreateReportDto> = {
      name: `Report: ${dto.query.substring(0, 50)}${dto.query.length > 50 ? "..." : ""}`,
      description: aiResult.interpretedQuery,
      entityType: reportEntityType,
      columns: aiResult.parsedQuery?.selectFields || [
        "referenceNumber",
        "status",
        "createdAt",
      ],
      filters: aiResult.parsedQuery?.filters || [],
      groupBy: aiResult.parsedQuery?.groupBy?.map((g) => g.field),
      visualization: this.mapVisualizationType(aiResult.visualizationType),
      sortBy: aiResult.parsedQuery?.orderBy?.[0]?.field,
      sortOrder: aiResult.parsedQuery?.orderBy?.[0]?.direction as
        | "asc"
        | "desc"
        | undefined,
    };

    return {
      report: reportConfig,
      results: aiResult.data,
      interpretation: aiResult.interpretedQuery,
    };
  }

  /**
   * Map AI visualization type to report visualization type
   */
  private mapVisualizationType(
    aiVizType: string,
  ): "table" | "bar" | "line" | "pie" | "kpi" | "funnel" | "stacked_bar" {
    const mapping: Record<
      string,
      "table" | "bar" | "line" | "pie" | "kpi" | "funnel" | "stacked_bar"
    > = {
      TABLE: "table",
      BAR_CHART: "bar",
      LINE_CHART: "line",
      PIE_CHART: "pie",
      KPI: "kpi",
      FUNNEL: "funnel",
      TEXT: "table",
    };
    return mapping[aiVizType] || "table";
  }

  // =========================================================================
  // Schedule Management (Endpoints 13-19)
  // =========================================================================

  /**
   * Helper to verify report exists and belongs to org.
   */
  private async verifyReportAccess(
    reportId: string,
    organizationId: string,
  ): Promise<{
    id: string;
    scheduledExportId: string | null;
    name: string;
  }> {
    const report = await this.prisma.savedReport.findFirst({
      where: { id: reportId, organizationId },
      select: { id: true, scheduledExportId: true, name: true },
    });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    return report;
  }

  /**
   * Create a schedule for a report.
   */
  @Post(":id/schedule")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({
    summary: "Create a schedule for a report",
    description:
      "Creates a scheduled export configuration for automatic report delivery. Supports daily, weekly, and monthly schedules.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name", "scheduleType", "time", "format", "recipients"],
      properties: {
        name: { type: "string", description: "Schedule name" },
        scheduleType: {
          type: "string",
          enum: ["DAILY", "WEEKLY", "MONTHLY"],
        },
        time: {
          type: "string",
          description: "Time in HH:MM format",
          example: "08:00",
        },
        dayOfWeek: {
          type: "number",
          description: "Day of week (0-6) for weekly schedules",
        },
        dayOfMonth: {
          type: "number",
          description: "Day of month (1-31) for monthly schedules",
        },
        timezone: { type: "string", example: "America/New_York" },
        format: { type: "string", enum: ["EXCEL", "CSV", "PDF"] },
        recipients: {
          type: "array",
          items: { type: "string" },
          description: "Email addresses",
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Schedule created successfully" })
  @ApiResponse({ status: 400, description: "Invalid schedule configuration" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Report not found" })
  async createSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body()
    dto: {
      name: string;
      scheduleType: "DAILY" | "WEEKLY" | "MONTHLY";
      time: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      timezone?: string;
      format: "EXCEL" | "CSV" | "PDF";
      recipients: string[];
    },
  ): Promise<unknown> {
    const report = await this.verifyReportAccess(id, user.organizationId);

    // Check if report already has a schedule
    if (report.scheduledExportId) {
      throw new NotFoundException(
        "Report already has a schedule. Use PUT to update or DELETE to remove.",
      );
    }

    // Map format string to ExportFormat enum
    const formatMap: Record<string, ExportFormat> = {
      EXCEL: ExportFormat.XLSX,
      CSV: ExportFormat.CSV,
      PDF: ExportFormat.PDF,
    };

    // Create the scheduled export
    const scheduleDto: CreateScheduledExportDto = {
      name: dto.name,
      description: `Scheduled delivery for report: ${report.name}`,
      exportType: ExportType.CUSTOM, // CUSTOM type for saved report exports
      format: formatMap[dto.format] || ExportFormat.XLSX,
      filters: { reportId: id },
      columnConfig: {
        includeInvestigations: false,
        maxInvestigations: 0,
        includeTaggedFields: false,
        includeOverflow: false,
      },
      scheduleType: dto.scheduleType as "DAILY" | "WEEKLY" | "MONTHLY",
      scheduleConfig: {
        time: dto.time,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
      },
      timezone: dto.timezone || "America/New_York",
      deliveryMethod: DeliveryMethod.EMAIL,
      recipients: dto.recipients,
    };

    const schedule = await this.scheduledExportService.createSchedule(
      user.organizationId,
      user.id,
      scheduleDto,
    );

    // Link schedule to report
    await this.prisma.savedReport.update({
      where: { id },
      data: { scheduledExportId: schedule.id },
    });

    // Transform to frontend format
    return {
      id: schedule.id,
      name: schedule.name,
      scheduleType: schedule.scheduleType,
      time: (schedule.scheduleConfig as { time?: string })?.time || dto.time,
      dayOfWeek: (schedule.scheduleConfig as { dayOfWeek?: number })?.dayOfWeek,
      dayOfMonth: (schedule.scheduleConfig as { dayOfMonth?: number })
        ?.dayOfMonth,
      timezone: schedule.timezone,
      format: dto.format,
      recipients: schedule.recipients,
      isActive: schedule.isActive,
    };
  }

  /**
   * Get the schedule for a report.
   */
  @Get(":id/schedule")
  @ApiOperation({
    summary: "Get the schedule for a report",
    description: "Returns the schedule configuration if one exists.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200, description: "Schedule details" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Report or schedule not found" })
  async getSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<unknown> {
    const report = await this.verifyReportAccess(id, user.organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    const schedule = await this.scheduledExportService.getSchedule(
      user.organizationId,
      report.scheduledExportId,
    );

    if (!schedule) {
      throw new NotFoundException("Schedule not found");
    }

    // Map format back to frontend format
    const formatReverseMap: Record<string, string> = {
      XLSX: "EXCEL",
      CSV: "CSV",
      PDF: "PDF",
    };

    return {
      id: schedule.id,
      name: schedule.name,
      scheduleType: schedule.scheduleType,
      time: (schedule.scheduleConfig as { time?: string })?.time || "08:00",
      dayOfWeek: (schedule.scheduleConfig as { dayOfWeek?: number })?.dayOfWeek,
      dayOfMonth: (schedule.scheduleConfig as { dayOfMonth?: number })
        ?.dayOfMonth,
      timezone: schedule.timezone,
      format: formatReverseMap[schedule.format] || "EXCEL",
      recipients: schedule.recipients,
      isActive: schedule.isActive,
      lastRunAt: schedule.lastRunAt,
      lastRunStatus: schedule.lastRunStatus,
      nextRunAt: schedule.nextRunAt,
    };
  }

  /**
   * Update an existing schedule.
   */
  @Put(":id/schedule")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({
    summary: "Update a report schedule",
    description: "Updates the schedule configuration for a report.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200, description: "Schedule updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Report or schedule not found" })
  async updateSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body()
    dto: {
      name?: string;
      scheduleType?: "DAILY" | "WEEKLY" | "MONTHLY";
      time?: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      timezone?: string;
      format?: "EXCEL" | "CSV" | "PDF";
      recipients?: string[];
    },
  ): Promise<unknown> {
    const report = await this.verifyReportAccess(id, user.organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    // Map format string to ExportFormat enum
    const formatMap: Record<string, ExportFormat> = {
      EXCEL: ExportFormat.XLSX,
      CSV: ExportFormat.CSV,
      PDF: ExportFormat.PDF,
    };

    const updateDto: UpdateScheduledExportDto = {};

    if (dto.name !== undefined) updateDto.name = dto.name;
    if (dto.format !== undefined) updateDto.format = formatMap[dto.format];
    if (dto.recipients !== undefined) updateDto.recipients = dto.recipients;
    if (dto.timezone !== undefined) updateDto.timezone = dto.timezone;
    if (dto.scheduleType !== undefined)
      updateDto.scheduleType = dto.scheduleType as
        | "DAILY"
        | "WEEKLY"
        | "MONTHLY";

    // Build schedule config if any timing params provided
    if (
      dto.time !== undefined ||
      dto.dayOfWeek !== undefined ||
      dto.dayOfMonth !== undefined
    ) {
      updateDto.scheduleConfig = {
        time: dto.time || "08:00",
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
      };
    }

    const schedule = await this.scheduledExportService.updateSchedule(
      user.organizationId,
      report.scheduledExportId,
      updateDto,
    );

    // Map format back to frontend format
    const formatReverseMap: Record<string, string> = {
      XLSX: "EXCEL",
      CSV: "CSV",
      PDF: "PDF",
    };

    return {
      id: schedule.id,
      name: schedule.name,
      scheduleType: schedule.scheduleType,
      time: (schedule.scheduleConfig as { time?: string })?.time || "08:00",
      dayOfWeek: (schedule.scheduleConfig as { dayOfWeek?: number })?.dayOfWeek,
      dayOfMonth: (schedule.scheduleConfig as { dayOfMonth?: number })
        ?.dayOfMonth,
      timezone: schedule.timezone,
      format: formatReverseMap[schedule.format] || "EXCEL",
      recipients: schedule.recipients,
      isActive: schedule.isActive,
    };
  }

  /**
   * Delete a schedule.
   */
  @Delete(":id/schedule")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a report schedule",
    description: "Removes the schedule from a report.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 204, description: "Schedule deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Report or schedule not found" })
  async deleteSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<void> {
    const report = await this.verifyReportAccess(id, user.organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    // Delete the scheduled export
    await this.scheduledExportService.deleteSchedule(
      user.organizationId,
      report.scheduledExportId,
    );

    // Remove link from report
    await this.prisma.savedReport.update({
      where: { id },
      data: { scheduledExportId: null },
    });
  }

  /**
   * Pause a schedule.
   */
  @Post(":id/schedule/pause")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({
    summary: "Pause a report schedule",
    description: "Temporarily pauses scheduled delivery without deleting.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200, description: "Schedule paused" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Report or schedule not found" })
  async pauseSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<{ message: string; isActive: boolean }> {
    const report = await this.verifyReportAccess(id, user.organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    await this.scheduledExportService.pauseSchedule(
      user.organizationId,
      report.scheduledExportId,
    );

    return { message: "Schedule paused", isActive: false };
  }

  /**
   * Resume a paused schedule.
   */
  @Post(":id/schedule/resume")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({
    summary: "Resume a report schedule",
    description: "Resumes a paused schedule and recalculates next run time.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({ status: 200, description: "Schedule resumed" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Report or schedule not found" })
  async resumeSchedule(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<{ message: string; isActive: boolean }> {
    const report = await this.verifyReportAccess(id, user.organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    await this.scheduledExportService.resumeSchedule(
      user.organizationId,
      report.scheduledExportId,
    );

    return { message: "Schedule resumed", isActive: true };
  }

  /**
   * Trigger immediate execution of a scheduled report.
   */
  @Post(":id/schedule/run-now")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Run scheduled report immediately",
    description:
      "Triggers immediate execution of the scheduled report delivery.",
  })
  @ApiParam({ name: "id", description: "Report ID" })
  @ApiResponse({
    status: 202,
    description: "Report queued for immediate delivery",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Report or schedule not found" })
  async runScheduleNow(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<{ message: string; runId: string }> {
    const report = await this.verifyReportAccess(id, user.organizationId);

    if (!report.scheduledExportId) {
      throw new NotFoundException("No schedule exists for this report");
    }

    const runId = await this.scheduledExportService.runNow(
      user.organizationId,
      report.scheduledExportId,
    );

    return { message: "Report queued for immediate delivery", runId };
  }
}
