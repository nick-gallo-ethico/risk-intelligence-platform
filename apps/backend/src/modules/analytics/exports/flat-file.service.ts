import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService, CreateAuditLogDto } from "../../audit/audit.service";
import {
  ExportJob,
  ReportFieldTag,
  ExportDataType,
  ExportJobStatus,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  Prisma,
} from "@prisma/client";
import {
  CreateTagDto,
  CreateExportJobDto,
  TagPreviewDto,
  ExportJobResponseDto,
  ExportJobListResponseDto,
} from "./dto/export.dto";
import {
  ColumnDefinition,
  TaggedFieldConfig,
  CORE_COLUMN_DEFINITIONS,
  generateInvestigationColumns,
} from "./entities/export.entity";

/**
 * FlatFileService
 *
 * Manages flat file export infrastructure including:
 * - Admin-configured field tags (up to 20 per org)
 * - Async export job lifecycle (create, track, cancel)
 * - Column definitions for core, investigation, and tagged fields
 * - Value resolution and formatting
 */
@Injectable()
export class FlatFileService {
  private readonly logger = new Logger(FlatFileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ===========================================
  // Tag Management
  // ===========================================

  /**
   * Configure or update a field tag for flat file exports.
   * Tags allow admins to promote custom fields to named export columns.
   */
  async configureTag(
    orgId: string,
    userId: string,
    dto: CreateTagDto,
  ): Promise<ReportFieldTag> {
    this.logger.log(
      `Configuring tag slot ${dto.tagSlot} for org ${orgId}: ${dto.columnName}`,
    );

    // Check if slot is already taken
    const existing = await this.prisma.reportFieldTag.findUnique({
      where: {
        organizationId_tagSlot: {
          organizationId: orgId,
          tagSlot: dto.tagSlot,
        },
      },
    });

    let tag: ReportFieldTag;

    if (existing) {
      // Update existing tag
      tag = await this.prisma.reportFieldTag.update({
        where: { id: existing.id },
        data: {
          sourceEntityType: dto.sourceEntityType,
          sourceFieldPath: dto.sourceFieldPath,
          templateId: dto.templateId ?? null,
          columnName: dto.columnName,
          displayLabel: dto.displayLabel,
          dataType: dto.dataType,
          formatPattern: dto.formatPattern ?? null,
        },
      });

      await this.logAudit({
        organizationId: orgId,
        entityType: AuditEntityType.REPORT,
        entityId: tag.id,
        action: "TAG_UPDATED",
        actionCategory: AuditActionCategory.UPDATE,
        actionDescription: `Updated export tag slot ${dto.tagSlot}: ${dto.displayLabel}`,
        actorUserId: userId,
        actorType: ActorType.USER,
        changes: {
          columnName: { old: existing.columnName, new: dto.columnName },
          sourceFieldPath: {
            old: existing.sourceFieldPath,
            new: dto.sourceFieldPath,
          },
        },
      });
    } else {
      // Create new tag
      tag = await this.prisma.reportFieldTag.create({
        data: {
          organizationId: orgId,
          sourceEntityType: dto.sourceEntityType,
          sourceFieldPath: dto.sourceFieldPath,
          templateId: dto.templateId ?? null,
          tagSlot: dto.tagSlot,
          columnName: dto.columnName,
          displayLabel: dto.displayLabel,
          dataType: dto.dataType,
          formatPattern: dto.formatPattern ?? null,
          createdById: userId,
        },
      });

      await this.logAudit({
        organizationId: orgId,
        entityType: AuditEntityType.REPORT,
        entityId: tag.id,
        action: "TAG_CREATED",
        actionCategory: AuditActionCategory.UPDATE,
        actionDescription: `Created export tag slot ${dto.tagSlot}: ${dto.displayLabel}`,
        actorUserId: userId,
        actorType: ActorType.USER,
      });
    }

    return tag;
  }

  /**
   * Get all configured field tags for an organization.
   * Returns sorted by tagSlot ascending.
   */
  async getTaggedFields(orgId: string): Promise<ReportFieldTag[]> {
    return this.prisma.reportFieldTag.findMany({
      where: { organizationId: orgId },
      orderBy: { tagSlot: "asc" },
    });
  }

  /**
   * Remove a tag from a specific slot.
   */
  async removeTag(orgId: string, userId: string, slot: number): Promise<void> {
    const tag = await this.prisma.reportFieldTag.findUnique({
      where: {
        organizationId_tagSlot: {
          organizationId: orgId,
          tagSlot: slot,
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag slot ${slot} not found`);
    }

    await this.prisma.reportFieldTag.delete({
      where: { id: tag.id },
    });

    await this.logAudit({
      organizationId: orgId,
      entityType: AuditEntityType.REPORT,
      entityId: tag.id,
      action: "TAG_DELETED",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Removed export tag slot ${slot}: ${tag.displayLabel}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.logger.log(`Removed tag slot ${slot} for org ${orgId}`);
  }

  /**
   * Preview tagged field values for a sample case.
   * Used to verify tag configuration before export.
   */
  async previewTag(orgId: string, caseId: string): Promise<TagPreviewDto[]> {
    const tags = await this.getTaggedFields(orgId);
    if (tags.length === 0) {
      return [];
    }

    // Load case with relations for field resolution
    const caseData = await this.prisma.case.findFirst({
      where: { id: caseId, organizationId: orgId },
      include: {
        investigations: true,
        riuAssociations: { include: { riu: true } },
      },
    });

    if (!caseData) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    const previews: TagPreviewDto[] = [];

    for (const tag of tags) {
      const rawValue = await this.resolveTaggedFieldValue(
        {
          tagSlot: tag.tagSlot,
          sourceEntityType: tag.sourceEntityType,
          sourceFieldPath: tag.sourceFieldPath,
          templateId: tag.templateId ?? undefined,
          columnName: tag.columnName,
          displayLabel: tag.displayLabel,
          dataType: tag.dataType,
          formatPattern: tag.formatPattern ?? undefined,
        },
        caseData,
      );

      const formattedValue = this.formatValue(
        rawValue,
        tag.dataType,
        tag.formatPattern ?? undefined,
      );

      previews.push({
        tagSlot: tag.tagSlot,
        columnName: tag.columnName,
        displayLabel: tag.displayLabel,
        rawValue,
        formattedValue,
        dataType: tag.dataType,
      });
    }

    return previews;
  }

  // ===========================================
  // Export Job Management
  // ===========================================

  /**
   * Create a new export job.
   * Job starts in PENDING status and will be picked up by the job processor.
   */
  async createExportJob(
    orgId: string,
    userId: string,
    dto: CreateExportJobDto,
  ): Promise<ExportJob> {
    this.logger.log(
      `Creating ${dto.exportType} export job for org ${orgId}, format: ${dto.format}`,
    );

    // Build filters JSON
    const filters: Record<string, unknown> = {};
    if (dto.dateRange) {
      filters.dateRange = dto.dateRange;
    }
    if (dto.statuses?.length) {
      filters.statuses = dto.statuses;
    }
    if (dto.categories?.length) {
      filters.categories = dto.categories;
    }
    if (dto.businessUnits?.length) {
      filters.businessUnits = dto.businessUnits;
    }
    if (dto.locations?.length) {
      filters.locations = dto.locations;
    }

    // Build column configuration snapshot
    const columns: Record<string, unknown> = {
      includeInvestigations: dto.includeInvestigations ?? true,
      maxInvestigations: dto.maxInvestigations ?? 3,
      includeTaggedFields: dto.includeTaggedFields ?? true,
      includeOverflow: dto.includeOverflow ?? false,
    };

    // If including tagged fields, snapshot current tag configuration
    if (dto.includeTaggedFields !== false) {
      const tags = await this.getTaggedFields(orgId);
      columns.taggedFields = tags.map((t) => ({
        tagSlot: t.tagSlot,
        columnName: t.columnName,
        displayLabel: t.displayLabel,
        sourceEntityType: t.sourceEntityType,
        sourceFieldPath: t.sourceFieldPath,
        templateId: t.templateId,
        dataType: t.dataType,
        formatPattern: t.formatPattern,
      }));
    }

    const job = await this.prisma.exportJob.create({
      data: {
        organizationId: orgId,
        exportType: dto.exportType,
        format: dto.format,
        filters: filters as Prisma.InputJsonValue,
        columns: columns as Prisma.InputJsonValue,
        status: ExportJobStatus.PENDING,
        createdById: userId,
      },
    });

    await this.logAudit({
      organizationId: orgId,
      entityType: AuditEntityType.REPORT,
      entityId: job.id,
      action: "EXPORT_JOB_CREATED",
      actionCategory: AuditActionCategory.ACCESS,
      actionDescription: `Created ${dto.exportType} export job in ${dto.format} format`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: { filters, exportType: dto.exportType, format: dto.format },
    });

    this.logger.log(`Created export job ${job.id} for org ${orgId}`);

    return job;
  }

  /**
   * Get export job by ID.
   */
  async getExportJob(
    orgId: string,
    jobId: string,
  ): Promise<ExportJobResponseDto> {
    const job = await this.prisma.exportJob.findFirst({
      where: { id: jobId, organizationId: orgId },
    });

    if (!job) {
      throw new NotFoundException(`Export job ${jobId} not found`);
    }

    return this.mapJobToResponse(job);
  }

  /**
   * Cancel a pending or processing export job.
   */
  async cancelExportJob(
    orgId: string,
    userId: string,
    jobId: string,
  ): Promise<void> {
    const job = await this.prisma.exportJob.findFirst({
      where: { id: jobId, organizationId: orgId },
    });

    if (!job) {
      throw new NotFoundException(`Export job ${jobId} not found`);
    }

    if (
      job.status !== ExportJobStatus.PENDING &&
      job.status !== ExportJobStatus.PROCESSING
    ) {
      this.logger.warn(
        `Cannot cancel export job ${jobId} - status is ${job.status}`,
      );
      return;
    }

    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { status: ExportJobStatus.CANCELLED },
    });

    await this.logAudit({
      organizationId: orgId,
      entityType: AuditEntityType.REPORT,
      entityId: jobId,
      action: "EXPORT_JOB_CANCELLED",
      actionCategory: AuditActionCategory.ACCESS,
      actionDescription: `Cancelled export job ${jobId}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.logger.log(`Cancelled export job ${jobId}`);
  }

  /**
   * List export jobs for a user with pagination.
   */
  async listExportJobs(
    orgId: string,
    userId: string,
    page = 1,
    pageSize = 20,
  ): Promise<ExportJobListResponseDto> {
    const skip = (page - 1) * pageSize;

    const [jobs, total] = await Promise.all([
      this.prisma.exportJob.findMany({
        where: { organizationId: orgId, createdById: userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.exportJob.count({
        where: { organizationId: orgId, createdById: userId },
      }),
    ]);

    return {
      data: jobs.map((job) => this.mapJobToResponse(job)),
      total,
      page,
      pageSize,
    };
  }

  // ===========================================
  // Column Builders
  // ===========================================

  /**
   * Get core case column definitions.
   * These ~40 columns are always present in flat file exports.
   */
  getCoreColumns(): ColumnDefinition[] {
    return CORE_COLUMN_DEFINITIONS;
  }

  /**
   * Get investigation column definitions for N investigations.
   * Returns columns like inv_1_id, inv_1_status, inv_2_id, etc.
   */
  getInvestigationColumns(maxInvestigations: number): ColumnDefinition[] {
    return generateInvestigationColumns(maxInvestigations);
  }

  /**
   * Build column definitions from tagged field configuration.
   */
  getTaggedColumns(tags: ReportFieldTag[]): ColumnDefinition[] {
    return tags.map((tag) => ({
      key: `tag_${tag.tagSlot}_value`,
      label: tag.displayLabel,
      type: this.mapDataTypeToColumnType(tag.dataType),
      format: tag.formatPattern ?? undefined,
      width: 20,
      tagSlot: tag.tagSlot,
    }));
  }

  // ===========================================
  // Value Resolution
  // ===========================================

  /**
   * Resolve the value of a tagged field from a case and its relations.
   */
  async resolveTaggedFieldValue(
    tag: TaggedFieldConfig,
    entity: unknown,
  ): Promise<string | number | boolean | null> {
    try {
      // Parse the field path
      const pathParts = tag.sourceFieldPath.split(".");

      // Navigate to the value based on source entity type
      let value: unknown = entity;

      // For nested paths like "customFields.totalDollarAmount"
      for (const part of pathParts) {
        if (value === null || value === undefined) {
          return null;
        }
        value = (value as Record<string, unknown>)[part];
      }

      // Coerce to appropriate type
      if (value === null || value === undefined) {
        return null;
      }

      switch (tag.dataType) {
        case ExportDataType.NUMBER:
        case ExportDataType.CURRENCY:
        case ExportDataType.PERCENTAGE:
          return typeof value === "number"
            ? value
            : parseFloat(String(value)) || null;

        case ExportDataType.BOOLEAN:
          return Boolean(value);

        case ExportDataType.DATE:
          if (value instanceof Date) {
            return value.toISOString();
          }
          return String(value);

        case ExportDataType.TEXT:
        default:
          return String(value);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve tagged field ${tag.sourceFieldPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  // ===========================================
  // Formatting
  // ===========================================

  /**
   * Format a value based on data type and optional pattern.
   */
  formatValue(
    value: unknown,
    dataType: ExportDataType,
    pattern?: string,
  ): string {
    if (value === null || value === undefined) {
      return "";
    }

    switch (dataType) {
      case ExportDataType.CURRENCY:
        return this.formatCurrency(value as number, pattern);

      case ExportDataType.PERCENTAGE:
        return this.formatPercentage(value as number, pattern);

      case ExportDataType.DATE:
        return this.formatDate(value, pattern);

      case ExportDataType.BOOLEAN:
        return value ? "Yes" : "No";

      case ExportDataType.NUMBER:
        return this.formatNumber(value as number, pattern);

      case ExportDataType.TEXT:
      default:
        return String(value);
    }
  }

  /**
   * Format a number as currency.
   * Default pattern: "$#,##0.00"
   */
  private formatCurrency(value: number, pattern?: string): string {
    // Extract currency symbol from pattern or default to $
    const symbol = pattern?.match(/^[^#0-9]+/)?.[0] || "$";

    // Format with thousands separator and 2 decimal places
    const formatted = Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return value < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
  }

  /**
   * Format a number as percentage.
   * Assumes value is already in percentage form (e.g., 75 for 75%).
   */
  private formatPercentage(value: number, _pattern?: string): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * Format a date value.
   * Default pattern: "YYYY-MM-DD"
   */
  private formatDate(value: unknown, pattern?: string): string {
    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === "string") {
      date = new Date(value);
    } else {
      return String(value);
    }

    if (isNaN(date.getTime())) {
      return String(value);
    }

    // Simple pattern replacements
    const effectivePattern = pattern || "YYYY-MM-DD";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return effectivePattern
      .replace("YYYY", String(year))
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds);
  }

  /**
   * Format a number with optional pattern.
   */
  private formatNumber(value: number, _pattern?: string): string {
    return value.toLocaleString("en-US");
  }

  // ===========================================
  // Helpers
  // ===========================================

  /**
   * Map Prisma ExportDataType to column type string.
   */
  private mapDataTypeToColumnType(
    dataType: ExportDataType,
  ): "string" | "number" | "date" | "boolean" | "currency" | "percentage" {
    switch (dataType) {
      case ExportDataType.NUMBER:
        return "number";
      case ExportDataType.DATE:
        return "date";
      case ExportDataType.BOOLEAN:
        return "boolean";
      case ExportDataType.CURRENCY:
        return "currency";
      case ExportDataType.PERCENTAGE:
        return "percentage";
      case ExportDataType.TEXT:
      default:
        return "string";
    }
  }

  /**
   * Map ExportJob to response DTO.
   */
  private mapJobToResponse(job: ExportJob): ExportJobResponseDto {
    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      totalRows: job.totalRows ?? undefined,
      format: job.format,
      fileSizeBytes: job.fileSizeBytes ?? undefined,
      downloadUrl: job.fileUrl ?? undefined,
      expiresAt: job.expiresAt ?? undefined,
      createdAt: job.createdAt,
      completedAt: job.completedAt ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
    };
  }

  /**
   * Log audit entry with error handling.
   */
  private async logAudit(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.auditService.log(dto);
    } catch (error) {
      // Audit failures shouldn't break export operations
      this.logger.warn(
        `Failed to log audit: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
