import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Delete,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import {
  ReportTemplateService,
  CreateReportTemplateDto as ServiceCreateDto,
} from "./report-template.service";
import { QueryBuilderService } from "./query-builder.service";
import { ExportService } from "./export.service";
import { CreateReportTemplateDto } from "./dto/create-report-template.dto";
import { RunReportDto } from "./dto/run-report.dto";
import { ColumnDefinition, FilterDefinition } from "./types/report.types";

/**
 * ReportingController
 *
 * REST API for the reporting engine.
 * Provides endpoints for:
 * - Template management (CRUD)
 * - Report execution (sync and async)
 * - Export to Excel/CSV
 */
@ApiTags("Reports")
@ApiBearerAuth()
@Controller("reports")
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportingController {
  constructor(
    private templateService: ReportTemplateService,
    private queryBuilder: QueryBuilderService,
    private exportService: ExportService,
  ) {}

  // ========================================
  // Template Endpoints
  // ========================================

  @Post("templates")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Create a new report template" })
  @ApiResponse({ status: 201, description: "Template created" })
  async createTemplate(
    @TenantId() orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReportTemplateDto,
  ) {
    // Cast DTO to service type (DTO uses class-validator, service uses interface)
    return this.templateService.create(orgId, dto as unknown as ServiceCreateDto, user.id);
  }

  @Get("templates")
  @ApiOperation({ summary: "List available report templates" })
  @ApiResponse({ status: 200, description: "List of templates" })
  async listTemplates(
    @TenantId() orgId: string,
    @Query("category") category?: string,
  ) {
    return this.templateService.findAll(orgId, category);
  }

  @Get("templates/:id")
  @ApiOperation({ summary: "Get a report template by ID" })
  @ApiResponse({ status: 200, description: "Template details" })
  @ApiResponse({ status: 404, description: "Template not found" })
  async getTemplate(@TenantId() orgId: string, @Param("id") id: string) {
    return this.templateService.findById(orgId, id);
  }

  @Delete("templates/:id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a report template" })
  @ApiResponse({ status: 204, description: "Template deleted" })
  @ApiResponse({ status: 404, description: "Template not found" })
  async deleteTemplate(@TenantId() orgId: string, @Param("id") id: string) {
    await this.templateService.delete(orgId, id);
  }

  @Post("templates/:id/duplicate")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Duplicate a report template" })
  @ApiResponse({ status: 201, description: "Template duplicated" })
  async duplicateTemplate(
    @TenantId() orgId: string,
    @Param("id") id: string,
    @Body() body: { name: string },
  ) {
    return this.templateService.duplicate(orgId, id, body.name);
  }

  // ========================================
  // Execution Endpoints
  // ========================================

  @Post("templates/:id/run")
  @ApiOperation({ summary: "Run a report and return results" })
  @ApiResponse({ status: 200, description: "Report data or file download" })
  async runReport(
    @TenantId() orgId: string,
    @Param("id") templateId: string,
    @Body() dto: RunReportDto,
    @Res() res: Response,
  ) {
    const template = await this.templateService.findById(orgId, templateId);

    // Convert filter DTOs to FilterDefinition[]
    const filters = dto.filters as FilterDefinition[] | undefined;

    // For JSON format, return directly
    if (dto.format === "json" || !dto.format) {
      const result = await this.queryBuilder.executeQuery({
        organizationId: orgId,
        dataSource: template.dataSource,
        columns: template.columns as unknown as ColumnDefinition[],
        filters,
        limit: dto.limit,
      });
      return res.json(result);
    }

    // For Excel, generate and stream
    if (dto.format === "excel") {
      const buffer = await this.exportService.exportToExcel({
        organizationId: orgId,
        templateId,
        filters,
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${template.name.replace(/[^a-z0-9]/gi, "_")}.xlsx"`,
      );
      return res.send(buffer);
    }

    // For CSV, generate and stream
    if (dto.format === "csv") {
      const csv = await this.exportService.exportToCsv({
        organizationId: orgId,
        templateId,
        filters,
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${template.name.replace(/[^a-z0-9]/gi, "_")}.csv"`,
      );
      return res.send(csv);
    }
  }

  @Post("templates/:id/queue")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Queue a large report for async export" })
  @ApiResponse({
    status: 201,
    description: "Export queued, returns execution ID",
  })
  async queueReport(
    @TenantId() orgId: string,
    @Param("id") templateId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: RunReportDto,
  ) {
    return this.exportService.queueExport({
      organizationId: orgId,
      templateId,
      filters: dto.filters as FilterDefinition[] | undefined,
      format: dto.format === "csv" ? "csv" : "excel",
      requestedById: user.id,
    });
  }

  @Get("executions/:id")
  @ApiOperation({ summary: "Get status of a queued export" })
  @ApiResponse({ status: 200, description: "Export status" })
  @ApiResponse({ status: 404, description: "Execution not found" })
  async getExportStatus(
    @TenantId() orgId: string,
    @Param("id") executionId: string,
  ) {
    const status = await this.exportService.getExportStatus(orgId, executionId);
    if (!status) {
      return { error: "Execution not found" };
    }
    return status;
  }
}
