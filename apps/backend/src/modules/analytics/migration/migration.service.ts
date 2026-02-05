import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  MigrationJob,
  MigrationSourceType,
  MigrationJobStatus,
  Prisma,
} from "@prisma/client";
import {
  CreateMigrationJobDto,
  FieldMappingDto,
  SaveFieldMappingsDto,
  ValidationError,
  PreviewRow,
  FormatDetectionResponseDto,
  RollbackCheckResponseDto,
  RollbackResultResponseDto,
  MigrationJobQueryDto,
  TargetEntityType,
  TransformFunction,
} from "./dto/migration.dto";
import {
  getFieldMappingHints,
  TARGET_FIELDS,
} from "./entities/migration.entity";

// Rollback window in days
const ROLLBACK_WINDOW_DAYS = 7;

// Max rows for preview
const PREVIEW_LIMIT = 10;

// Max validation errors to store
const MAX_VALIDATION_ERRORS = 1000;

/**
 * MigrationService handles data import from competitor systems.
 * Supports NAVEX, EQS, Legacy Ethico, and generic CSV imports.
 * Provides validation, field mapping, preview, import, and rollback capabilities.
 */
@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================
  // Job Management
  // ===========================================

  /**
   * Create a new migration job
   */
  async createJob(
    organizationId: string,
    userId: string,
    dto: CreateMigrationJobDto,
  ): Promise<MigrationJob> {
    this.logger.log(
      `Creating migration job for ${dto.sourceType} from ${dto.fileName}`,
    );

    return this.prisma.migrationJob.create({
      data: {
        organizationId,
        sourceType: dto.sourceType,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileSizeBytes: dto.fileSizeBytes,
        status: MigrationJobStatus.PENDING,
        createdById: userId,
      },
    });
  }

  /**
   * Get a migration job by ID
   */
  async getJob(organizationId: string, jobId: string): Promise<MigrationJob> {
    const job = await this.prisma.migrationJob.findFirst({
      where: { id: jobId, organizationId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        migrationRecords: {
          select: { id: true },
          take: 1, // Just to check if records exist
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Migration job ${jobId} not found`);
    }

    return job;
  }

  /**
   * List migration jobs for an organization
   */
  async listJobs(
    organizationId: string,
    query: MigrationJobQueryDto,
  ): Promise<{ jobs: MigrationJob[]; total: number }> {
    const where: Prisma.MigrationJobWhereInput = {
      organizationId,
      ...(query.status && { status: query.status }),
      ...(query.sourceType && { sourceType: query.sourceType }),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.migrationJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        take: query.limit || 20,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.migrationJob.count({ where }),
    ]);

    return { jobs, total };
  }

  // ===========================================
  // Format Detection
  // ===========================================

  /**
   * Detect file format and suggest field mappings
   * This is a stub - actual implementation would parse the file
   */
  async detectFormat(
    organizationId: string,
    jobId: string,
    fileContent: Record<string, unknown>[],
  ): Promise<FormatDetectionResponseDto> {
    const job = await this.getJob(organizationId, jobId);

    // Update job status
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.VALIDATING,
        currentStep: "Detecting file format",
      },
    });

    // Detect fields from first row
    const detectedFields =
      fileContent.length > 0 ? Object.keys(fileContent[0]) : [];

    // Get sample rows
    const sampleRows = fileContent.slice(0, 5);

    // Get suggested mappings based on source type
    const hints = getFieldMappingHints(job.sourceType);
    const suggestedMappings = this.generateSuggestedMappings(
      detectedFields,
      hints,
      job.sourceType,
    );

    // Calculate confidence based on matched fields
    const matchedCount = suggestedMappings.filter((m) => m.targetField).length;
    const confidence =
      detectedFields.length > 0
        ? Math.round((matchedCount / detectedFields.length) * 100)
        : 0;

    // Update job with total rows
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        totalRows: fileContent.length,
        status: MigrationJobStatus.MAPPING,
        currentStep: "Awaiting field mapping",
      },
    });

    return {
      sourceType: job.sourceType,
      confidence,
      detectedFields,
      sampleRows,
      suggestedMappings,
    };
  }

  /**
   * Generate suggested field mappings based on source fields and hints
   */
  private generateSuggestedMappings(
    sourceFields: string[],
    hints: Record<
      string,
      { targetField: string; targetEntity: TargetEntityType }
    >,
    sourceType: MigrationSourceType,
  ): FieldMappingDto[] {
    return sourceFields.map((field) => {
      const normalizedField = field.toLowerCase().replace(/[^a-z0-9]/g, "_");

      // Check for exact match in hints
      const hint = hints[normalizedField] || hints[field.toLowerCase()];

      if (hint) {
        return {
          sourceField: field,
          targetField: hint.targetField,
          targetEntity: hint.targetEntity,
          isRequired: false,
        };
      }

      // Fuzzy match for generic CSV
      if (sourceType === MigrationSourceType.GENERIC_CSV) {
        const fuzzyMatch = this.fuzzyMatchField(normalizedField);
        if (fuzzyMatch) {
          return {
            sourceField: field,
            targetField: fuzzyMatch.targetField,
            targetEntity: fuzzyMatch.targetEntity,
            isRequired: false,
          };
        }
      }

      // No match - return unmapped
      return {
        sourceField: field,
        targetField: "",
        targetEntity: TargetEntityType.CASE,
        isRequired: false,
      };
    });
  }

  /**
   * Fuzzy match a field name to a target field
   */
  private fuzzyMatchField(
    fieldName: string,
  ): { targetField: string; targetEntity: TargetEntityType } | null {
    const commonPatterns: Record<
      string,
      { targetField: string; targetEntity: TargetEntityType }
    > = {
      // Case fields
      case: {
        targetField: "referenceNumber",
        targetEntity: TargetEntityType.CASE,
      },
      ref: {
        targetField: "referenceNumber",
        targetEntity: TargetEntityType.CASE,
      },
      number: {
        targetField: "referenceNumber",
        targetEntity: TargetEntityType.CASE,
      },
      status: { targetField: "status", targetEntity: TargetEntityType.CASE },
      severity: {
        targetField: "severity",
        targetEntity: TargetEntityType.CASE,
      },
      priority: {
        targetField: "severity",
        targetEntity: TargetEntityType.CASE,
      },
      category: {
        targetField: "categoryName",
        targetEntity: TargetEntityType.CASE,
      },
      type: {
        targetField: "categoryName",
        targetEntity: TargetEntityType.CASE,
      },
      description: {
        targetField: "details",
        targetEntity: TargetEntityType.RIU,
      },
      details: { targetField: "details", targetEntity: TargetEntityType.RIU },
      narrative: { targetField: "details", targetEntity: TargetEntityType.RIU },
      summary: { targetField: "summary", targetEntity: TargetEntityType.RIU },

      // Location fields
      location: {
        targetField: "locationName",
        targetEntity: TargetEntityType.CASE,
      },
      site: {
        targetField: "locationName",
        targetEntity: TargetEntityType.CASE,
      },
      facility: {
        targetField: "locationName",
        targetEntity: TargetEntityType.CASE,
      },
      city: {
        targetField: "locationCity",
        targetEntity: TargetEntityType.CASE,
      },
      state: {
        targetField: "locationState",
        targetEntity: TargetEntityType.CASE,
      },
      country: {
        targetField: "locationCountry",
        targetEntity: TargetEntityType.CASE,
      },

      // Date fields
      date: { targetField: "createdAt", targetEntity: TargetEntityType.CASE },
      created: {
        targetField: "createdAt",
        targetEntity: TargetEntityType.CASE,
      },
      reported: {
        targetField: "intakeTimestamp",
        targetEntity: TargetEntityType.CASE,
      },

      // Person fields
      name: { targetField: "name", targetEntity: TargetEntityType.PERSON },
      employee: {
        targetField: "employeeId",
        targetEntity: TargetEntityType.PERSON,
      },
      email: { targetField: "email", targetEntity: TargetEntityType.PERSON },
    };

    for (const [pattern, mapping] of Object.entries(commonPatterns)) {
      if (fieldName.includes(pattern)) {
        return mapping;
      }
    }

    return null;
  }

  // ===========================================
  // Field Mapping
  // ===========================================

  /**
   * Get suggested mappings for a job
   */
  async getSuggestedMappings(
    organizationId: string,
    jobId: string,
  ): Promise<FieldMappingDto[]> {
    const job = await this.getJob(organizationId, jobId);

    // If job already has mappings, return those
    if (job.fieldMappings) {
      return job.fieldMappings as unknown as FieldMappingDto[];
    }

    // Otherwise, check for saved template
    const template = await this.loadTemplateMapping(
      organizationId,
      job.sourceType,
    );
    if (template.length > 0) {
      return template;
    }

    // No mappings or template available
    return [];
  }

  /**
   * Save field mappings to a job
   */
  async saveMappings(
    organizationId: string,
    jobId: string,
    userId: string,
    dto: SaveFieldMappingsDto,
  ): Promise<void> {
    // Validate mappings
    this.validateMappings(dto.mappings);

    // Update job with mappings
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        fieldMappings: JSON.parse(JSON.stringify(dto.mappings)),
        status: MigrationJobStatus.MAPPING,
        currentStep: "Field mappings saved",
      },
    });

    // Save as template if requested
    if (dto.saveAsTemplate && dto.templateName) {
      const job = await this.getJob(organizationId, jobId);

      await this.prisma.migrationFieldTemplate.upsert({
        where: {
          organizationId_sourceType_name: {
            organizationId,
            sourceType: job.sourceType,
            name: dto.templateName,
          },
        },
        create: {
          organizationId,
          sourceType: job.sourceType,
          name: dto.templateName,
          mappings: JSON.parse(JSON.stringify(dto.mappings)),
          createdById: userId,
        },
        update: {
          mappings: JSON.parse(JSON.stringify(dto.mappings)),
        },
      });
    }
  }

  /**
   * Load a saved field mapping template
   */
  async loadTemplateMapping(
    organizationId: string,
    sourceType: MigrationSourceType,
  ): Promise<FieldMappingDto[]> {
    const template = await this.prisma.migrationFieldTemplate.findFirst({
      where: { organizationId, sourceType },
      orderBy: { updatedAt: "desc" },
    });

    if (!template) {
      return [];
    }

    return template.mappings as unknown as FieldMappingDto[];
  }

  /**
   * Validate field mappings
   */
  private validateMappings(mappings: FieldMappingDto[]): void {
    const errors: string[] = [];

    // Check for required fields without mapping
    const requiredMappings = mappings.filter(
      (m) => m.isRequired && !m.targetField,
    );
    if (requiredMappings.length > 0) {
      errors.push(
        `Required fields not mapped: ${requiredMappings.map((m) => m.sourceField).join(", ")}`,
      );
    }

    // Check for valid target fields
    for (const mapping of mappings) {
      if (mapping.targetField) {
        const validFields = TARGET_FIELDS[mapping.targetEntity];
        if (!validFields.includes(mapping.targetField)) {
          errors.push(
            `Invalid target field '${mapping.targetField}' for entity ${mapping.targetEntity}`,
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join("; "));
    }
  }

  // ===========================================
  // Validation & Preview
  // ===========================================

  /**
   * Validate data against mappings
   */
  async validate(
    organizationId: string,
    jobId: string,
    data: Record<string, unknown>[],
  ): Promise<{
    validRows: number;
    errorRows: number;
    errors: ValidationError[];
  }> {
    const job = await this.getJob(organizationId, jobId);

    if (!job.fieldMappings) {
      throw new BadRequestException(
        "Field mappings must be configured before validation",
      );
    }

    const mappings = job.fieldMappings as unknown as FieldMappingDto[];
    const errors: ValidationError[] = [];
    let validRows = 0;
    let errorRows = 0;

    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.VALIDATING,
        currentStep: "Validating data",
        progress: 0,
      },
    });

    // Validate each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowErrors = this.validateRow(row, mappings, i + 1);

      if (rowErrors.length > 0) {
        errorRows++;
        if (errors.length < MAX_VALIDATION_ERRORS) {
          errors.push(...rowErrors);
        }
      } else {
        validRows++;
      }

      // Update progress every 100 rows
      if (i % 100 === 0) {
        const progress = Math.round((i / data.length) * 100);
        await this.prisma.migrationJob.update({
          where: { id: jobId },
          data: {
            progress,
            currentStep: `Validating row ${i + 1} of ${data.length}`,
          },
        });
      }
    }

    // Update job with validation results
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        validRows,
        errorRows,
        validationErrors: JSON.parse(JSON.stringify(errors)),
        status: MigrationJobStatus.PREVIEW,
        currentStep: "Validation complete",
        progress: 100,
      },
    });

    return { validRows, errorRows, errors };
  }

  /**
   * Validate a single row
   */
  private validateRow(
    row: Record<string, unknown>,
    mappings: FieldMappingDto[],
    rowNumber: number,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const mapping of mappings) {
      const value = row[mapping.sourceField];

      // Check required fields
      if (
        mapping.isRequired &&
        (value === null || value === undefined || value === "")
      ) {
        errors.push({
          rowNumber,
          field: mapping.sourceField,
          value,
          error: "Required field is empty",
          severity: "error",
        });
        continue;
      }

      // Skip validation for empty optional fields
      if (value === null || value === undefined || value === "") {
        continue;
      }

      // Validate based on transform function
      if (mapping.transformFunction) {
        const validationError = this.validateTransform(
          value,
          mapping.transformFunction,
          rowNumber,
          mapping.sourceField,
        );
        if (validationError) {
          errors.push(validationError);
        }
      }
    }

    return errors;
  }

  /**
   * Validate a value for a specific transform function
   */
  private validateTransform(
    value: unknown,
    transform: TransformFunction,
    rowNumber: number,
    field: string,
  ): ValidationError | null {
    switch (transform) {
      case TransformFunction.PARSE_DATE:
      case TransformFunction.PARSE_DATE_US:
      case TransformFunction.PARSE_DATE_EU:
      case TransformFunction.PARSE_DATE_ISO:
        const dateValue = this.parseDate(String(value), transform);
        if (dateValue === null) {
          return {
            rowNumber,
            field,
            value,
            error: `Invalid date format: ${value}`,
            severity: "error",
          };
        }
        break;

      case TransformFunction.PARSE_NUMBER:
        if (isNaN(Number(value))) {
          return {
            rowNumber,
            field,
            value,
            error: `Invalid number: ${value}`,
            severity: "error",
          };
        }
        break;

      case TransformFunction.EXTRACT_EMAIL:
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        if (!emailRegex.test(String(value))) {
          return {
            rowNumber,
            field,
            value,
            error: `No valid email found in: ${value}`,
            severity: "warning",
          };
        }
        break;
    }

    return null;
  }

  /**
   * Generate preview of transformed data
   */
  async generatePreview(
    organizationId: string,
    jobId: string,
    data: Record<string, unknown>[],
    limit: number = PREVIEW_LIMIT,
  ): Promise<PreviewRow[]> {
    const job = await this.getJob(organizationId, jobId);

    if (!job.fieldMappings) {
      throw new BadRequestException(
        "Field mappings must be configured before preview",
      );
    }

    const mappings = job.fieldMappings as unknown as FieldMappingDto[];
    const previewRows: PreviewRow[] = [];

    // Generate preview for first N rows
    const sampleData = data.slice(0, limit);

    for (let i = 0; i < sampleData.length; i++) {
      const row = sampleData[i];
      const transformedData = this.transformRow(row, mappings);
      const rowErrors = this.validateRow(row, mappings, i + 1);

      previewRows.push({
        rowNumber: i + 1,
        sourceData: row,
        transformedData,
        issues: rowErrors.map((e) => `${e.field}: ${e.error}`),
      });
    }

    // Save preview data to job
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        previewData: JSON.parse(JSON.stringify(previewRows)),
      },
    });

    return previewRows;
  }

  /**
   * Transform a single row based on mappings
   */
  private transformRow(
    row: Record<string, unknown>,
    mappings: FieldMappingDto[],
  ): PreviewRow["transformedData"] {
    const result: PreviewRow["transformedData"] = {
      case: {},
      riu: {},
      person: {},
      investigation: {},
    };

    for (const mapping of mappings) {
      if (!mapping.targetField) continue;

      let value = row[mapping.sourceField];

      // Apply transform if specified
      if (mapping.transformFunction && value !== null && value !== undefined) {
        value = this.applyTransform(
          value,
          mapping.transformFunction,
          mapping.transformParams,
        );
      }

      // Apply default value if empty
      if (
        (value === null || value === undefined || value === "") &&
        mapping.defaultValue !== undefined
      ) {
        value = mapping.defaultValue;
      }

      // Skip if still empty
      if (value === null || value === undefined || value === "") continue;

      // Add to appropriate entity
      switch (mapping.targetEntity) {
        case TargetEntityType.CASE:
          result.case![mapping.targetField] = value;
          break;
        case TargetEntityType.RIU:
          result.riu![mapping.targetField] = value;
          break;
        case TargetEntityType.PERSON:
          result.person![mapping.targetField] = value;
          break;
        case TargetEntityType.INVESTIGATION:
          result.investigation![mapping.targetField] = value;
          break;
      }
    }

    return result;
  }

  /**
   * Apply a transform function to a value
   */
  private applyTransform(
    value: unknown,
    transform: TransformFunction,
    _params?: Record<string, unknown>, // Reserved for future use (e.g., custom date formats)
  ): unknown {
    const strValue = String(value);

    switch (transform) {
      case TransformFunction.UPPERCASE:
        return strValue.toUpperCase();

      case TransformFunction.LOWERCASE:
        return strValue.toLowerCase();

      case TransformFunction.TRIM:
        return strValue.trim();

      case TransformFunction.PARSE_DATE:
      case TransformFunction.PARSE_DATE_US:
      case TransformFunction.PARSE_DATE_EU:
      case TransformFunction.PARSE_DATE_ISO:
        return this.parseDate(strValue, transform);

      case TransformFunction.PARSE_BOOLEAN:
        const lowered = strValue.toLowerCase().trim();
        return ["yes", "true", "1", "y"].includes(lowered);

      case TransformFunction.PARSE_NUMBER:
        return Number(strValue.replace(/[^0-9.-]/g, ""));

      case TransformFunction.SPLIT_COMMA:
        return strValue
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      case TransformFunction.EXTRACT_EMAIL:
        const emailMatch = strValue.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
        );
        return emailMatch ? emailMatch[0] : null;

      case TransformFunction.EXTRACT_PHONE:
        const phoneMatch = strValue.match(/[\d\-\(\)\s\.]+/);
        return phoneMatch ? phoneMatch[0].replace(/\D/g, "") : null;

      case TransformFunction.MAP_SEVERITY:
        return this.mapSeverity(strValue);

      case TransformFunction.MAP_STATUS:
        return this.mapStatus(strValue);

      case TransformFunction.MAP_CATEGORY:
        // Category mapping requires lookup - return original for now
        return strValue;

      default:
        return value;
    }
  }

  /**
   * Parse a date string
   */
  private parseDate(value: string, format: TransformFunction): Date | null {
    try {
      const trimmed = value.trim();

      switch (format) {
        case TransformFunction.PARSE_DATE_US: {
          // MM/DD/YYYY
          const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (match) {
            return new Date(
              parseInt(match[3]),
              parseInt(match[1]) - 1,
              parseInt(match[2]),
            );
          }
          break;
        }
        case TransformFunction.PARSE_DATE_EU: {
          // DD/MM/YYYY
          const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (match) {
            return new Date(
              parseInt(match[3]),
              parseInt(match[2]) - 1,
              parseInt(match[1]),
            );
          }
          break;
        }
        case TransformFunction.PARSE_DATE_ISO: {
          // YYYY-MM-DD
          const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (match) {
            return new Date(
              parseInt(match[1]),
              parseInt(match[2]) - 1,
              parseInt(match[3]),
            );
          }
          break;
        }
        default: {
          // Auto-detect
          const date = new Date(trimmed);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Map severity strings to enum values
   */
  private mapSeverity(value: string): string {
    const lowered = value.toLowerCase().trim();

    if (["high", "critical", "3", "urgent"].includes(lowered)) return "HIGH";
    if (["medium", "moderate", "2", "normal"].includes(lowered))
      return "MEDIUM";
    if (["low", "1", "minor"].includes(lowered)) return "LOW";

    return "MEDIUM"; // Default
  }

  /**
   * Map status strings to enum values
   */
  private mapStatus(value: string): string {
    const lowered = value.toLowerCase().trim();

    if (["new", "pending", "received"].includes(lowered)) return "NEW";
    if (["open", "in progress", "active", "investigating"].includes(lowered))
      return "OPEN";
    if (["closed", "resolved", "complete", "completed"].includes(lowered))
      return "CLOSED";

    return "NEW"; // Default
  }

  // ===========================================
  // Import Execution
  // ===========================================

  /**
   * Start the import process
   * This is a stub - actual implementation would create records
   */
  async startImport(
    organizationId: string,
    jobId: string,
    _userId: string, // Reserved for audit logging in background processor
  ): Promise<void> {
    const job = await this.getJob(organizationId, jobId);

    if (job.status !== MigrationJobStatus.PREVIEW) {
      throw new BadRequestException(
        `Cannot start import from status ${job.status}`,
      );
    }

    if (!job.fieldMappings) {
      throw new BadRequestException(
        "Field mappings must be configured before import",
      );
    }

    // Update job status
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.IMPORTING,
        currentStep: "Starting import",
        progress: 0,
      },
    });

    this.logger.log(`Starting import for job ${jobId}`);

    // Note: Actual import would be handled by a background job processor
    // This method would queue the import job and return immediately
  }

  /**
   * Cancel an in-progress import
   */
  async cancelImport(organizationId: string, jobId: string): Promise<void> {
    const job = await this.getJob(organizationId, jobId);

    if (job.status !== MigrationJobStatus.IMPORTING) {
      throw new BadRequestException(
        `Cannot cancel import with status ${job.status}`,
      );
    }

    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.FAILED,
        currentStep: "Import cancelled by user",
        errorMessage: "Import cancelled by user",
      },
    });
  }

  /**
   * Mark a job as completed (called by import processor)
   */
  async completeImport(jobId: string, importedRows: number): Promise<void> {
    const rollbackUntil = new Date();
    rollbackUntil.setDate(rollbackUntil.getDate() + ROLLBACK_WINDOW_DAYS);

    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.COMPLETED,
        currentStep: "Import complete",
        progress: 100,
        importedRows,
        completedAt: new Date(),
        rollbackAvailableUntil: rollbackUntil,
      },
    });

    this.logger.log(`Import completed for job ${jobId}: ${importedRows} rows`);
  }

  /**
   * Mark a job as failed (called by import processor)
   */
  async failImport(
    jobId: string,
    error: string,
    details?: unknown,
  ): Promise<void> {
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.FAILED,
        currentStep: "Import failed",
        errorMessage: error,
        errorDetails: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
    });

    this.logger.error(`Import failed for job ${jobId}: ${error}`);
  }

  // ===========================================
  // Rollback
  // ===========================================

  /**
   * Check if a job can be rolled back
   */
  async canRollback(
    organizationId: string,
    jobId: string,
  ): Promise<RollbackCheckResponseDto> {
    const job = await this.getJob(organizationId, jobId);

    // Check job status
    if (job.status !== MigrationJobStatus.COMPLETED) {
      return {
        canRollback: false,
        reason: `Job status is ${job.status}, not COMPLETED`,
      };
    }

    // Check rollback window
    if (
      !job.rollbackAvailableUntil ||
      new Date() > job.rollbackAvailableUntil
    ) {
      return {
        canRollback: false,
        reason: "Rollback window has expired (7 days)",
        expiresAt: job.rollbackAvailableUntil || undefined,
      };
    }

    // Check for modified records
    const totalRecords = await this.prisma.migrationRecord.count({
      where: { migrationJobId: jobId },
    });

    const modifiedCount = await this.prisma.migrationRecord.count({
      where: {
        migrationJobId: jobId,
        modifiedAfterImport: true,
      },
    });

    if (modifiedCount === totalRecords) {
      return {
        canRollback: false,
        reason:
          "All imported records have been modified and cannot be rolled back",
        modifiedCount,
        totalRecords,
      };
    }

    return {
      canRollback: true,
      modifiedCount,
      totalRecords,
      expiresAt: job.rollbackAvailableUntil,
    };
  }

  /**
   * Rollback a completed import
   */
  async rollback(
    organizationId: string,
    userId: string,
    jobId: string,
    confirmText: string,
  ): Promise<RollbackResultResponseDto> {
    // Verify confirmation
    if (confirmText !== "ROLLBACK") {
      throw new BadRequestException('Confirmation text must be "ROLLBACK"');
    }

    // Check if rollback is possible
    const canRollbackResult = await this.canRollback(organizationId, jobId);
    if (!canRollbackResult.canRollback) {
      throw new BadRequestException(canRollbackResult.reason);
    }

    this.logger.log(`Starting rollback for job ${jobId}`);

    // Get records that can be rolled back
    const records = await this.prisma.migrationRecord.findMany({
      where: {
        migrationJobId: jobId,
        modifiedAfterImport: false,
      },
    });

    const skippedRecords = await this.prisma.migrationRecord.findMany({
      where: {
        migrationJobId: jobId,
        modifiedAfterImport: true,
      },
    });

    // Note: Actual rollback would delete the created entities
    // This is a stub that just updates the job status

    // Update job status
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.ROLLED_BACK,
        currentStep: "Rollback complete",
        rolledBackAt: new Date(),
        rolledBackById: userId,
      },
    });

    const skippedReasons = skippedRecords.map(
      (r) => `${r.entityType} ${r.entityId} was modified after import`,
    );

    return {
      rolledBackCount: records.length,
      skippedCount: skippedRecords.length,
      skippedReasons,
    };
  }
}
