/**
 * MigrationController - REST API for data migration management
 *
 * Provides endpoints for the complete migration lifecycle:
 * 1. Upload migration file
 * 2. Detect format and suggest mappings
 * 3. Save/load field mapping templates
 * 4. Queue validation job (async)
 * 5. Queue preview generation (async)
 * 6. Start async import
 * 7. Check rollback availability
 * 8. Queue rollback (async)
 * 9. Extract form fields from screenshots (AI-powered)
 *
 * All queue operations return immediately with job IDs for status polling.
 * All endpoints require authentication and SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { MigrationService } from "./migration.service";
import { ScreenshotToFormService } from "./screenshot-to-form.service";
import { MappingSuggestionService } from "./mapping-suggestion.service";
import { StorageService } from "../../../common/services/storage.service";
import {
  CreateMigrationJobDto,
  SaveFieldMappingsDto,
  MigrationJobQueryDto,
  RollbackDto,
  StartImportDto,
  MigrationJobResponseDto,
  FormatDetectionResponseDto,
  RollbackCheckResponseDto,
  RollbackResultResponseDto,
  PreviewRow,
  FieldMappingDto,
} from "./dto/migration.dto";
import {
  AnalyzeScreenshotDto,
  ScreenshotContext,
  CompetitorHint,
  ScreenshotAnalysisResult,
} from "./dto/screenshot.dto";
import {
  MIGRATION_QUEUE_NAME,
  MigrationAction,
} from "./processors/migration.processor";
import { MigrationSourceType } from "@prisma/client";
import { nanoid } from "nanoid";

// TODO: Add guards when auth module is fully integrated
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../../../common/guards/roles.guard';
// import { Roles } from '../../../common/decorators/roles.decorator';
// import { CurrentUser } from '../../../common/decorators/current-user.decorator';
// import { Role } from '@prisma/client';

// Temporary hardcoded values for development
const TEMP_ORG_ID = "00000000-0000-0000-0000-000000000001";
const TEMP_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Response DTO for upload operation
 */
interface CreateMigrationJobResponseDto {
  jobId: string;
  status: string;
  fileName: string;
}

/**
 * Response DTO for job summary in list
 */
interface MigrationJobSummaryDto {
  id: string;
  status: string;
  sourceType: MigrationSourceType;
  fileName: string;
  totalRows?: number;
  importedRows: number;
  errorRows?: number;
  progress: number;
  createdAt: Date;
}

/**
 * Paginated result wrapper
 */
interface PaginatedResult<T> {
  data: T[];
  total: number;
}

/**
 * Queue job response
 */
interface QueuedJobResponse {
  queued: boolean;
  queueJobId: string;
  action: MigrationAction;
}

@ApiTags("migrations")
@Controller("migrations")
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER)
export class MigrationController {
  constructor(
    private readonly migrationService: MigrationService,
    private readonly screenshotService: ScreenshotToFormService,
    private readonly mappingSuggestionService: MappingSuggestionService,
    private readonly storageService: StorageService,
    @InjectQueue(MIGRATION_QUEUE_NAME) private readonly migrationQueue: Queue,
  ) {}

  // ==================== Job Management ====================

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload migration file" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "CSV or Excel file to import",
        },
        sourceType: {
          type: "string",
          enum: ["NAVEX", "EQS", "LEGACY_ETHICO", "GENERIC_CSV"],
          description: "Source system type (optional, will be auto-detected)",
        },
      },
      required: ["file"],
    },
  })
  @ApiResponse({ status: 201, description: "Migration job created" })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body("sourceType") sourceType?: MigrationSourceType,
    // @CurrentUser() user: User,
  ): Promise<CreateMigrationJobResponseDto> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const organizationId = TEMP_ORG_ID;
    const userId = TEMP_USER_ID;

    // Upload to storage
    const uploadResult = await this.storageService.upload(
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      organizationId,
      { subdirectory: "migrations" },
    );

    // Create job record
    const dto: CreateMigrationJobDto = {
      sourceType: sourceType || MigrationSourceType.GENERIC_CSV,
      fileName: file.originalname,
      fileUrl: uploadResult.key,
      fileSizeBytes: file.size,
    };

    const job = await this.migrationService.createJob(
      organizationId,
      userId,
      dto,
    );

    return {
      jobId: job.id,
      status: job.status,
      fileName: job.fileName,
    };
  }

  @Get()
  @ApiOperation({ summary: "List migration jobs" })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Filter by status",
  })
  @ApiQuery({
    name: "sourceType",
    required: false,
    description: "Filter by source type",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of migration jobs" })
  async listJobs(
    @Query() query: MigrationJobQueryDto,
    // @CurrentUser() user: User,
  ): Promise<PaginatedResult<MigrationJobSummaryDto>> {
    const organizationId = TEMP_ORG_ID;
    const result = await this.migrationService.listJobs(organizationId, query);

    return {
      data: result.jobs.map((job) => ({
        id: job.id,
        status: job.status,
        sourceType: job.sourceType,
        fileName: job.fileName,
        totalRows: job.totalRows ?? undefined,
        importedRows: job.importedRows,
        errorRows: job.errorRows ?? undefined,
        progress: job.progress,
        createdAt: job.createdAt,
      })),
      total: result.total,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get migration job details" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Migration job details" })
  async getJob(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
  ): Promise<MigrationJobResponseDto> {
    const organizationId = TEMP_ORG_ID;
    const job = await this.migrationService.getJob(organizationId, id);

    return {
      id: job.id,
      status: job.status,
      sourceType: job.sourceType,
      fileName: job.fileName,
      progress: job.progress,
      currentStep: job.currentStep ?? undefined,
      totalRows: job.totalRows ?? undefined,
      validRows: job.validRows ?? undefined,
      errorRows: job.errorRows ?? undefined,
      importedRows: job.importedRows,
      previewData: job.previewData as unknown as PreviewRow[] | undefined,
      validationErrors: job.validationErrors as unknown as
        | MigrationJobResponseDto["validationErrors"]
        | undefined,
      rollbackAvailableUntil: job.rollbackAvailableUntil ?? undefined,
      createdAt: job.createdAt,
      completedAt: job.completedAt ?? undefined,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Cancel pending migration" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 204, description: "Migration cancelled" })
  async cancelJob(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
  ): Promise<void> {
    const organizationId = TEMP_ORG_ID;
    await this.migrationService.cancelImport(organizationId, id);
  }

  // ==================== Format Detection & Mapping ====================

  @Post(":id/detect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Detect file format and suggest mappings" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Format detection result" })
  async detectFormat(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
  ): Promise<FormatDetectionResponseDto> {
    const organizationId = TEMP_ORG_ID;

    // Get job to retrieve file
    const job = await this.migrationService.getJob(organizationId, id);

    // Download file from storage
    const downloadResult = await this.storageService.download(job.fileUrl);
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResult.stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Parse file content (assuming CSV for now)
    const content = buffer.toString("utf-8");
    const lines = content.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

    // Parse sample data
    const sampleData: Record<string, unknown>[] = [];
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      sampleData.push(row);
    }

    // Detect format
    const result = await this.migrationService.detectFormat(
      organizationId,
      id,
      sampleData,
    );

    return result;
  }

  @Get(":id/mappings/suggestions")
  @ApiOperation({ summary: "Get AI-suggested field mappings" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Suggested mappings and target fields" })
  async getSuggestedMappings(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
  ): Promise<{ mappings: FieldMappingDto[]; targetFields: ReturnType<typeof MappingSuggestionService.prototype.getTargetFields> }> {
    const organizationId = TEMP_ORG_ID;
    const job = await this.migrationService.getJob(organizationId, id);

    // Get sample data from preview or parse file
    let sampleData: Record<string, unknown>[] = [];
    let sourceFields: string[] = [];

    if (job.previewData && Array.isArray(job.previewData)) {
      // Use existing preview data
      const preview = job.previewData as unknown as PreviewRow[];
      sampleData = preview.map((p) => p.sourceData);
      sourceFields = sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
    } else {
      // Parse file to get sample data
      const downloadResult = await this.storageService.download(job.fileUrl);
      const chunks: Buffer[] = [];
      for await (const chunk of downloadResult.stream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      const content = buffer.toString("utf-8");
      const lines = content.split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      sourceFields = headers;

      for (let i = 1; i < Math.min(6, lines.length); i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
        const row: Record<string, unknown> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || "";
        });
        sampleData.push(row);
      }
    }

    const mappings = await this.mappingSuggestionService.suggestMappings(
      organizationId,
      sourceFields,
      sampleData,
    );

    return {
      mappings: mappings.map((m) => ({
        sourceField: m.sourceField,
        targetField: m.targetField,
        targetEntity: m.targetEntity,
        transformFunction: m.transformFunction as FieldMappingDto["transformFunction"],
        isRequired: m.isRequired,
        description: m.description,
      })),
      targetFields: this.mappingSuggestionService.getTargetFields(),
    };
  }

  @Post(":id/mappings")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Save field mappings" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Mappings saved" })
  async saveMappings(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SaveFieldMappingsDto,
    // @CurrentUser() user: User,
  ): Promise<{ saved: boolean }> {
    const organizationId = TEMP_ORG_ID;
    const userId = TEMP_USER_ID;
    await this.migrationService.saveMappings(organizationId, id, userId, dto);

    // Optionally save as template
    if (dto.saveAsTemplate && dto.templateName) {
      await this.mappingSuggestionService.saveTemplate(
        organizationId,
        userId,
        dto.templateName,
        dto.mappings,
      );
    }

    return { saved: true };
  }

  @Get(":id/templates")
  @ApiOperation({ summary: "Get saved mapping templates for source type" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Available templates" })
  async getMappingTemplates(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
  ): Promise<FieldMappingDto[]> {
    const organizationId = TEMP_ORG_ID;
    const job = await this.migrationService.getJob(organizationId, id);
    return this.migrationService.loadTemplateMapping(
      organizationId,
      job.sourceType,
    );
  }

  // ==================== Validation & Preview (Queue-based) ====================

  @Post(":id/validate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Queue validation job" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Validation job queued" })
  async queueValidation(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
  ): Promise<QueuedJobResponse> {
    const organizationId = TEMP_ORG_ID;
    const userId = TEMP_USER_ID;

    // Queue for async processing
    const queueJob = await this.migrationQueue.add(
      "validate",
      {
        jobId: id,
        organizationId,
        userId,
        action: "validate" as MigrationAction,
      },
      {
        attempts: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500, age: 24 * 60 * 60 },
      },
    );

    return {
      queued: true,
      queueJobId: queueJob.id as string,
      action: "validate",
    };
  }

  @Post(":id/preview")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Queue preview generation" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Preview job queued" })
  async queuePreview(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
  ): Promise<QueuedJobResponse> {
    const organizationId = TEMP_ORG_ID;
    const userId = TEMP_USER_ID;

    // Queue for async processing
    const queueJob = await this.migrationQueue.add(
      "preview",
      {
        jobId: id,
        organizationId,
        userId,
        action: "preview" as MigrationAction,
      },
      {
        attempts: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500, age: 24 * 60 * 60 },
      },
    );

    return {
      queued: true,
      queueJobId: queueJob.id as string,
      action: "preview",
    };
  }

  @Get(":id/preview")
  @ApiOperation({ summary: "Get preview data (after preview job completes)" })
  @ApiParam({ name: "id", type: "string" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Preview rows" })
  async getPreview(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    // @CurrentUser() user: User,
  ): Promise<{ previewData: PreviewRow[]; status: string }> {
    const organizationId = TEMP_ORG_ID;
    const job = await this.migrationService.getJob(organizationId, id);

    const previewData = job.previewData as unknown as PreviewRow[] || [];

    return {
      previewData: previewData.slice(0, limit),
      status: job.status,
    };
  }

  // ==================== Import Execution ====================

  @Post(":id/import")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Start import (async)" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Import started" })
  async startImport(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: StartImportDto,
    // @CurrentUser() user: User,
  ): Promise<QueuedJobResponse> {
    const organizationId = TEMP_ORG_ID;
    const userId = TEMP_USER_ID;

    if (!dto.confirmed) {
      throw new BadRequestException("Import must be confirmed");
    }

    // Mark job as starting import
    await this.migrationService.startImport(organizationId, id, userId);

    // Queue for async processing
    const queueJob = await this.migrationQueue.add(
      "import",
      {
        jobId: id,
        organizationId,
        userId,
        action: "import" as MigrationAction,
      },
      {
        attempts: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500, age: 24 * 60 * 60 },
      },
    );

    return {
      queued: true,
      queueJobId: queueJob.id as string,
      action: "import",
    };
  }

  // ==================== Rollback ====================

  @Get(":id/rollback-status")
  @ApiOperation({ summary: "Check if rollback is available" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Rollback status" })
  async getRollbackStatus(
    @Param("id", ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
  ): Promise<RollbackCheckResponseDto> {
    const organizationId = TEMP_ORG_ID;
    return this.migrationService.canRollback(organizationId, id);
  }

  @Post(":id/rollback")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Queue rollback (async)" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Rollback queued" })
  async queueRollback(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RollbackDto,
    // @CurrentUser() user: User,
  ): Promise<QueuedJobResponse> {
    const organizationId = TEMP_ORG_ID;
    const userId = TEMP_USER_ID;

    if (dto.confirmText !== "ROLLBACK") {
      throw new BadRequestException('Confirmation text must be "ROLLBACK"');
    }

    // Check if rollback is possible
    const canRollback = await this.migrationService.canRollback(organizationId, id);
    if (!canRollback.canRollback) {
      throw new BadRequestException(canRollback.reason || "Rollback not available");
    }

    // Queue for async processing
    const queueJob = await this.migrationQueue.add(
      "rollback",
      {
        jobId: id,
        organizationId,
        userId,
        action: "rollback" as MigrationAction,
      },
      {
        attempts: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500, age: 24 * 60 * 60 },
      },
    );

    return {
      queued: true,
      queueJobId: queueJob.id as string,
      action: "rollback",
    };
  }

  // ==================== Template Management ====================

  @Get("templates/list")
  @ApiOperation({ summary: "List saved mapping templates" })
  @ApiResponse({ status: 200, description: "Available templates" })
  async listTemplates(
    // @CurrentUser() user: User,
  ): Promise<{ templates: { name: string; fieldCount: number }[] }> {
    const organizationId = TEMP_ORG_ID;
    const templates = await this.mappingSuggestionService.listTemplates(organizationId);
    return { templates };
  }

  // ==================== Screenshot to Form ====================

  @Post("screenshot-to-form")
  @UseInterceptors(FileInterceptor("image"))
  @ApiOperation({ summary: "Extract form fields from screenshot" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        image: {
          type: "string",
          format: "binary",
          description: "Screenshot/image of form to analyze",
        },
        context: {
          type: "string",
          enum: ["migration", "form_builder"],
          description: "Analysis context (migration for competitor analysis)",
        },
        competitorHint: {
          type: "string",
          enum: ["navex", "eqs", "onetrust", "star", "unknown"],
          description: "Known competitor system for improved field detection",
        },
        additionalInstructions: {
          type: "string",
          description: "Additional instructions for the AI analysis",
        },
      },
      required: ["image"],
    },
  })
  @ApiResponse({ status: 200, description: "Extracted form definition" })
  async screenshotToForm(
    @UploadedFile() file: Express.Multer.File,
    @Body("context") context?: string,
    @Body("competitorHint") competitorHint?: string,
    @Body("additionalInstructions") additionalInstructions?: string,
    // @CurrentUser() user: User,
  ): Promise<ScreenshotAnalysisResult> {
    if (!file) {
      throw new BadRequestException("No image provided");
    }

    const organizationId = TEMP_ORG_ID;
    const userId = TEMP_USER_ID;

    // Build DTO for screenshot analysis
    const dto: AnalyzeScreenshotDto = {
      context:
        context === "form_builder"
          ? ScreenshotContext.FORM_BUILDER
          : ScreenshotContext.MIGRATION,
      competitorHint: this.mapCompetitorHint(competitorHint),
      additionalInstructions,
    };

    // Use the existing analyzeScreenshot method
    return this.screenshotService.analyzeScreenshot(
      organizationId,
      userId,
      file,
      dto,
    );
  }

  /**
   * Map string competitor hint to enum value.
   */
  private mapCompetitorHint(hint?: string): CompetitorHint {
    if (!hint) return CompetitorHint.UNKNOWN;

    const mapping: Record<string, CompetitorHint> = {
      navex: CompetitorHint.NAVEX,
      eqs: CompetitorHint.EQS,
      onetrust: CompetitorHint.ONETRUST,
      star: CompetitorHint.STAR,
    };

    return mapping[hint.toLowerCase()] || CompetitorHint.UNKNOWN;
  }
}
