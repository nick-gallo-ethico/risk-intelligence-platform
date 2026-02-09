/**
 * ExportsController - REST endpoints for flat file exports
 *
 * Provides endpoints for:
 * - Tag management: Configure admin-promoted custom field columns
 * - Export jobs: Create, list, check status, download, cancel
 *
 * Export workflow:
 * 1. Admin configures field tags (optional, for custom columns)
 * 2. User creates export job (POST /flat-file) - returns 202 Accepted
 * 3. FlatExportProcessor processes job asynchronously
 * 4. User polls status (GET /:id) until COMPLETED
 * 5. User downloads file (GET /:id/download)
 *
 * @see FlatFileService for tag and job management
 * @see FlatExportProcessor for async job processing
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles, UserRole } from "../../../common/decorators/roles.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { FlatFileService } from "./flat-file.service";
import {
  CreateTagDto,
  CreateExportJobDto,
  TagPreviewDto,
  ExportJobResponseDto,
  ExportJobListResponseDto,
} from "./dto/export.dto";
import {
  FLAT_EXPORT_QUEUE_NAME,
  FlatExportJobData,
} from "./processors/flat-export.processor";
import { User, ReportFieldTag, ExportJobStatus } from "@prisma/client";

@Controller("exports")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags("exports")
export class ExportsController {
  constructor(
    private readonly flatFileService: FlatFileService,
    @InjectQueue(FLAT_EXPORT_QUEUE_NAME) private readonly exportQueue: Queue,
  ) {}

  // =========================================================================
  // Tag Management
  // =========================================================================

  /**
   * Configure a tagged export field.
   * Tags allow admins to promote custom fields to named export columns.
   */
  @Post("tags")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Configure tagged export fields" })
  @ApiResponse({
    status: 201,
    description: "Tag configured successfully",
  })
  async configureTags(
    @CurrentUser() user: User,
    @Body() dto: CreateTagDto,
  ): Promise<ReportFieldTag> {
    return this.flatFileService.configureTag(user.organizationId, user.id, dto);
  }

  /**
   * List all configured tags for the organization.
   */
  @Get("tags")
  @ApiOperation({ summary: "List configured tags" })
  @ApiResponse({
    status: 200,
    description: "List of configured tags",
  })
  async getTags(@CurrentUser() user: User): Promise<ReportFieldTag[]> {
    return this.flatFileService.getTaggedFields(user.organizationId);
  }

  /**
   * Remove a tag from a specific slot.
   */
  @Delete("tags/:slot")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a tag" })
  @ApiParam({ name: "slot", type: "number", description: "Tag slot (1-20)" })
  @ApiResponse({
    status: 204,
    description: "Tag removed successfully",
  })
  async removeTag(
    @CurrentUser() user: User,
    @Param("slot", ParseIntPipe) slot: number,
  ): Promise<void> {
    if (slot < 1 || slot > 20) {
      throw new BadRequestException("Tag slot must be between 1 and 20");
    }
    return this.flatFileService.removeTag(user.organizationId, user.id, slot);
  }

  /**
   * Preview tags with sample case data.
   * Useful for verifying tag configuration before export.
   */
  @Get("tags/preview")
  @ApiOperation({ summary: "Preview tags with sample case" })
  @ApiQuery({
    name: "caseId",
    required: true,
    description: "Case ID to use for preview",
  })
  @ApiResponse({
    status: 200,
    description: "Preview of tag values for the case",
  })
  async previewTags(
    @CurrentUser() user: User,
    @Query("caseId") caseId: string,
  ): Promise<TagPreviewDto[]> {
    if (!caseId) {
      throw new BadRequestException("caseId query parameter is required");
    }
    return this.flatFileService.previewTag(user.organizationId, caseId);
  }

  // =========================================================================
  // Export Jobs
  // =========================================================================

  /**
   * Create a new flat file export job.
   * Returns 202 Accepted with job ID for polling.
   * The export is processed asynchronously by FlatExportProcessor.
   */
  @Post("flat-file")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Create flat file export job" })
  @ApiResponse({
    status: 202,
    description: "Export job created and queued",
    type: ExportJobResponseDto,
  })
  async createFlatExport(
    @CurrentUser() user: User,
    @Body() dto: CreateExportJobDto,
  ): Promise<ExportJobResponseDto> {
    // Create job record in database
    const job = await this.flatFileService.createExportJob(
      user.organizationId,
      user.id,
      dto,
    );

    // Get snapshotted column config from job
    const jobColumns = job.columns as Record<string, unknown>;

    // Queue for async processing
    const jobData: FlatExportJobData = {
      executionId: job.id,
      organizationId: user.organizationId,
      exportType: dto.exportType,
      format: dto.format,
      filters: {
        dateRange: dto.dateRange,
        statuses: dto.statuses,
        categories: dto.categories,
        businessUnits: dto.businessUnits,
        locations: dto.locations,
      },
      columnConfig: {
        includeInvestigations:
          (jobColumns.includeInvestigations as boolean) ?? true,
        maxInvestigations: (jobColumns.maxInvestigations as number) ?? 3,
        includeTaggedFields:
          (jobColumns.includeTaggedFields as boolean) ?? true,
        includeOverflow: (jobColumns.includeOverflow as boolean) ?? false,
        taggedFields:
          jobColumns.taggedFields as FlatExportJobData["columnConfig"]["taggedFields"],
      },
      createdById: user.id,
    };

    await this.exportQueue.add("flat-export", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000, // 5s, 10s, 20s
      },
    });

    return {
      jobId: job.id,
      status: job.status,
      progress: 0,
      format: job.format,
      createdAt: job.createdAt,
    };
  }

  /**
   * List export jobs for the current user.
   */
  @Get()
  @ApiOperation({ summary: "List export jobs" })
  @ApiQuery({ name: "page", required: false, type: "number" })
  @ApiQuery({ name: "pageSize", required: false, type: "number" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of export jobs",
    type: ExportJobListResponseDto,
  })
  async listExports(
    @CurrentUser() user: User,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<ExportJobListResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const size = pageSize ? parseInt(pageSize, 10) : 20;

    return this.flatFileService.listExportJobs(
      user.organizationId,
      user.id,
      pageNum,
      size,
    );
  }

  /**
   * Get export job status by ID.
   */
  @Get(":id")
  @ApiOperation({ summary: "Get export job status" })
  @ApiParam({ name: "id", description: "Export job ID" })
  @ApiResponse({
    status: 200,
    description: "Export job details",
    type: ExportJobResponseDto,
  })
  async getExport(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<ExportJobResponseDto> {
    return this.flatFileService.getExportJob(user.organizationId, id);
  }

  /**
   * Get download URL for a completed export.
   */
  @Get(":id/download")
  @ApiOperation({ summary: "Get download URL" })
  @ApiParam({ name: "id", description: "Export job ID" })
  @ApiResponse({
    status: 200,
    description: "Download URL and expiration",
  })
  async downloadExport(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    const job = await this.flatFileService.getExportJob(
      user.organizationId,
      id,
    );

    if (job.status !== ExportJobStatus.COMPLETED) {
      throw new BadRequestException(
        `Export not ready for download. Current status: ${job.status}`,
      );
    }

    if (!job.downloadUrl) {
      throw new NotFoundException("Export file not found");
    }

    if (!job.expiresAt) {
      throw new BadRequestException("Export has no expiration date");
    }

    // Check if expired
    if (new Date() > job.expiresAt) {
      throw new BadRequestException(
        "Export has expired. Please create a new export.",
      );
    }

    return {
      url: job.downloadUrl,
      expiresAt: job.expiresAt,
    };
  }

  /**
   * Cancel a pending or processing export job.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Cancel pending export" })
  @ApiParam({ name: "id", description: "Export job ID" })
  @ApiResponse({
    status: 204,
    description: "Export cancelled successfully",
  })
  async cancelExport(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<void> {
    return this.flatFileService.cancelExportJob(
      user.organizationId,
      user.id,
      id,
    );
  }
}
