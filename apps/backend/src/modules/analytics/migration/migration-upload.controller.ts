import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles, UserRole } from "../../../common/decorators/roles.decorator";
import { TenantId } from "../../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { MigrationUploadService } from "./migration-upload.service";
import { UploadMigrationFileDto, UploadResultDto } from "./dto/upload.dto";
import { MigrationSourceType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Controller for migration file uploads.
 *
 * Provides endpoints for uploading migration files, retrieving sample data,
 * and re-detecting file format with different source type hints.
 */
@Controller("migrations/upload")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MigrationUploadController {
  constructor(
    private readonly uploadService: MigrationUploadService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload a migration file.
   *
   * Accepts CSV, XLSX, and XLS files up to 100MB.
   * Automatically detects the source system based on column headers.
   *
   * @param orgId - Organization ID from JWT
   * @param userId - User ID from JWT
   * @param file - Uploaded file
   * @param dto - Optional hint for source type
   * @returns Upload result with job ID and detected format
   */
  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @TenantId() orgId: string,
    @CurrentUser("id") userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({
            fileType:
              /(csv|xlsx|xls|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel|text\/csv)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadMigrationFileDto,
  ): Promise<UploadResultDto> {
    return this.uploadService.uploadFile(
      orgId,
      userId,
      file,
      dto.hintSourceType,
    );
  }

  /**
   * Get sample data from an uploaded file.
   *
   * Returns up to 100 rows by default for preview before mapping.
   *
   * @param orgId - Organization ID from JWT
   * @param jobId - Migration job ID
   * @param limit - Maximum number of rows to return (default: 100)
   * @returns Sample rows from the uploaded file
   */
  @Get(":jobId/sample")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async getSampleData(
    @TenantId() orgId: string,
    @Param("jobId") jobId: string,
    @Query("limit") limit?: string,
  ): Promise<Record<string, unknown>[]> {
    return this.uploadService.getSampleData(
      orgId,
      jobId,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  /**
   * Re-detect format with a different source type hint.
   *
   * Allows users to override the auto-detected source type and get
   * updated field mapping suggestions.
   *
   * @param orgId - Organization ID from JWT
   * @param jobId - Migration job ID
   * @param sourceType - New source type to use
   * @returns Updated source type, confidence, and suggested mappings
   */
  @Post(":jobId/redetect")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async redetectFormat(
    @TenantId() orgId: string,
    @Param("jobId") jobId: string,
    @Body("sourceType") sourceType: MigrationSourceType,
  ): Promise<{
    sourceType: MigrationSourceType;
    confidence: number;
    suggestedMappings: { sourceField: string; targetField: string }[];
  }> {
    const job = await this.prisma.migrationJob.findFirst({
      where: { id: jobId, organizationId: orgId },
    });

    if (!job) {
      throw new BadRequestException("Migration job not found");
    }

    // Update job with new source type
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: { sourceType },
    });

    // Get suggested mappings for new type
    const sample = await this.uploadService.getSampleData(orgId, jobId, 1);
    const fields = sample.length > 0 ? Object.keys(sample[0]) : [];

    // Generate mapping suggestions based on field names
    const suggestedMappings = fields.map((sourceField) => ({
      sourceField,
      targetField: this.suggestTargetField(sourceField, sourceType),
    }));

    return {
      sourceType,
      confidence: 100, // User-selected, so 100% confidence
      suggestedMappings,
    };
  }

  /**
   * Suggest a target field based on source field name.
   *
   * Uses common field name patterns to map source columns to target fields.
   *
   * @param sourceField - Source column name
   * @param sourceType - Migration source type
   * @returns Suggested target field name, or empty string if no match
   */
  private suggestTargetField(
    sourceField: string,
    _sourceType: MigrationSourceType,
  ): string {
    const normalized = sourceField.toLowerCase().replace(/[^a-z0-9]/g, "_");

    // Common field name mappings
    const mappings: Record<string, string> = {
      // Reference numbers
      case_number: "referenceNumber",
      case_id: "referenceNumber",
      report_id: "referenceNumber",
      incident_id: "referenceNumber",
      matter_id: "referenceNumber",

      // Categories
      incident_type: "categoryName",
      category: "categoryName",
      type: "categoryName",
      issue_type: "categoryName",

      // Dates
      incident_date: "incidentDate",
      report_date: "createdAt",
      created_date: "createdAt",
      created_at: "createdAt",
      closed_date: "closedAt",

      // Content
      description: "details",
      allegation: "details",
      narrative: "details",
      summary: "summary",

      // Status
      status: "status",
      case_status: "status",
      state: "status",

      // Assignment
      assigned_to: "assignedToEmail",
      handler: "assignedToEmail",
      investigator: "assignedToEmail",

      // Reporter
      reporter_type: "reporterType",
      anonymous: "isAnonymous",

      // Location
      location: "locationName",
      site: "locationName",
      facility: "locationName",
      business_unit: "businessUnitName",
      department: "businessUnitName",
      business_area: "businessUnitName",

      // Severity
      severity: "severity",
      priority: "severity",
    };

    // Check for pattern matches
    for (const [pattern, target] of Object.entries(mappings)) {
      if (normalized.includes(pattern) || pattern.includes(normalized)) {
        return target;
      }
    }

    return ""; // No mapping suggestion
  }
}
