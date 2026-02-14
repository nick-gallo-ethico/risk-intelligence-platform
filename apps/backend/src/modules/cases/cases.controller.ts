/**
 * CasesController - REST API for case management
 *
 * Thin controller layer that delegates business logic to services:
 * - CasesService: Core case CRUD operations
 * - CaseMergeService: Case merge operations
 * - CaseExportService: Export to Excel
 * - ActivityService: Activity timeline
 *
 * All endpoints require authentication and are scoped to user's organization.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { Response } from "express";
import { Case, AuditEntityType } from "@prisma/client";
import { CasesService } from "./cases.service";
import { CaseMergeService } from "./case-merge.service";
import { CaseExportService } from "./services/case-export.service";
import {
  CreateCaseDto,
  UpdateCaseDto,
  CaseQueryDto,
  ChangeCaseStatusDto,
  MergeResultDto,
  MergeHistoryDto,
} from "./dto";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";
import { ActivityService } from "../../common/services/activity.service";
import { ActivityListResponseDto } from "../../common/dto";

@ApiTags("Cases")
@ApiBearerAuth("JWT")
@Controller("cases")
@UseGuards(JwtAuthGuard, TenantGuard)
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly caseMergeService: CaseMergeService,
    private readonly caseExportService: CaseExportService,
    private readonly activityService: ActivityService,
  ) {}

  @Post()
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new case" })
  @ApiResponse({ status: 201, description: "Case created successfully" })
  async create(
    @Body() dto: CreateCaseDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.create(dto, user.id, organizationId);
  }

  @Get()
  @ApiOperation({ summary: "List cases" })
  @ApiResponse({ status: 200, description: "List of cases with pagination" })
  async findAll(
    @Query() query: CaseQueryDto,
    @TenantId() organizationId: string,
  ): Promise<{ data: Case[]; total: number; limit: number; offset: number }> {
    return this.casesService.findAll(query, organizationId);
  }

  // Merge endpoints - must be before generic :id route

  @Post(":id/merge")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Merge cases" })
  @ApiParam({
    name: "id",
    description: "Target case UUID (case to merge INTO)",
  })
  @ApiResponse({ status: 200, type: MergeResultDto })
  async mergeCases(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { sourceCaseId: string; reason: string },
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<MergeResultDto> {
    return this.caseMergeService.merge(
      {
        sourceCaseId: body.sourceCaseId,
        targetCaseId: id,
        reason: body.reason,
      },
      user.id,
      organizationId,
    );
  }

  @Get(":id/merge-history")
  @ApiOperation({ summary: "Get merge history" })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200, type: [MergeHistoryDto] })
  async getMergeHistory(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<MergeHistoryDto[]> {
    return this.caseMergeService.getMergeHistory(id, organizationId);
  }

  @Get(":id/can-merge/:targetId")
  @ApiOperation({ summary: "Check merge feasibility" })
  @ApiParam({ name: "id", description: "Source case UUID" })
  @ApiParam({ name: "targetId", description: "Target case UUID" })
  @ApiResponse({ status: 200 })
  async canMerge(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("targetId", ParseUUIDPipe) targetId: string,
    @TenantId() organizationId: string,
  ): Promise<{ canMerge: boolean; reason?: string }> {
    return this.caseMergeService.canMerge(id, targetId, organizationId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get case by ID" })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200 })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.findOne(id, organizationId);
  }

  @Get("reference/:referenceNumber")
  @ApiOperation({ summary: "Get case by reference number" })
  @ApiParam({
    name: "referenceNumber",
    description: "Case reference number",
    example: "ETH-2026-00001",
  })
  @ApiResponse({ status: 200 })
  async findByReference(
    @Param("referenceNumber") referenceNumber: string,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.findByReferenceNumber(
      referenceNumber,
      organizationId,
    );
  }

  @Put(":id")
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Update case" })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200 })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.update(id, dto, user.id, organizationId);
  }

  @Patch(":id")
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Partial update case" })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200 })
  async partialUpdate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.update(id, dto, user.id, organizationId);
  }

  @Patch(":id/status")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Change case status" })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200 })
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeCaseStatusDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.updateStatus(
      id,
      dto.status,
      dto.rationale,
      user.id,
      organizationId,
    );
  }

  @Post(":id/close")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Close case" })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200 })
  async close(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { rationale: string },
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.close(id, body.rationale, user.id, organizationId);
  }

  @Get(":id/activity")
  @ApiOperation({ summary: "Get case activity timeline" })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @ApiResponse({ status: 200, type: ActivityListResponseDto })
  async getActivity(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @TenantId() organizationId: string,
  ): Promise<ActivityListResponseDto> {
    await this.casesService.findOne(id, organizationId);
    return this.activityService.getEntityTimeline(
      AuditEntityType.CASE,
      id,
      organizationId,
      { page, limit },
    );
  }

  @Put(":id/activities/:activityId/pin")
  @ApiOperation({ summary: "Pin/unpin case activity" })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiParam({ name: "activityId", description: "Activity UUID" })
  @ApiResponse({ status: 200 })
  async pinActivity(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("activityId", ParseUUIDPipe) activityId: string,
    @Body() body: { isPinned: boolean },
    @TenantId() organizationId: string,
  ): Promise<{ success: boolean; isPinned: boolean }> {
    await this.casesService.findOne(id, organizationId);
    const result = await this.activityService.pinActivity(
      activityId,
      body.isPinned,
      organizationId,
    );
    if (!result) return { success: false, isPinned: false };
    return {
      success: true,
      isPinned: (result.context as { isPinned?: boolean })?.isPinned ?? false,
    };
  }

  @Get(":id/status-history")
  @ApiOperation({ summary: "Get case status history" })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200 })
  async getStatusHistory(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    await this.casesService.findOne(id, organizationId);
    return this.activityService.getStatusHistory(
      AuditEntityType.CASE,
      id,
      organizationId,
    );
  }

  @Post("export")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Export cases" })
  @ApiResponse({ status: 200, description: "Excel file generated" })
  async exportCases(
    @Body() body: { format?: "excel" | "csv"; columns?: string[] },
    @Query() query: CaseQueryDto,
    @TenantId() organizationId: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.caseExportService.exportCases(
      query,
      organizationId,
      body,
    );
    res.setHeader("Content-Type", this.caseExportService.getContentType());
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${this.caseExportService.getFilename()}"`,
    );
    res.send(buffer);
  }
}
