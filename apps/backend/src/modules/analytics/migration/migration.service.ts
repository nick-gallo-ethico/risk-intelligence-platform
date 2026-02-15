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
} from "./dto/migration.dto";
import { MigrationParserService } from "./services/migration-parser.service";
import { MigrationValidatorService } from "./services/migration-validator.service";
import { MigrationExecutorService } from "./services/migration-executor.service";

// Max rows for preview
const PREVIEW_LIMIT = 10;

/**
 * MigrationService is a thin coordinator for data import from competitor systems.
 * Supports NAVEX, EQS, Legacy Ethico, and generic CSV imports.
 *
 * This service manages migration job state and delegates specialized operations:
 * - Parsing/format detection -> MigrationParserService
 * - Validation/preview -> MigrationValidatorService
 * - Import execution/rollback -> MigrationExecutorService
 */
@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly migrationParserService: MigrationParserService,
    private readonly migrationValidatorService: MigrationValidatorService,
    private readonly migrationExecutorService: MigrationExecutorService,
  ) {}

  // ===========================================
  // Job Management (CRUD)
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

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    status: MigrationJobStatus,
    currentStep?: string,
    progress?: number,
  ): Promise<void> {
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status,
        ...(currentStep && { currentStep }),
        ...(progress !== undefined && { progress }),
      },
    });
  }

  // ===========================================
  // Format Detection (delegated to ParserService)
  // ===========================================

  /**
   * Detect file format and suggest field mappings
   */
  async detectFormat(
    organizationId: string,
    jobId: string,
    fileContent: Record<string, unknown>[],
  ): Promise<FormatDetectionResponseDto> {
    const job = await this.getJob(organizationId, jobId);
    return this.migrationParserService.detectFormat(
      organizationId,
      jobId,
      job,
      fileContent,
    );
  }

  // ===========================================
  // Field Mapping
  // ===========================================

  /** Get suggested mappings for a job */
  async getSuggestedMappings(
    orgId: string,
    jobId: string,
  ): Promise<FieldMappingDto[]> {
    const job = await this.getJob(orgId, jobId);
    if (job.fieldMappings)
      return job.fieldMappings as unknown as FieldMappingDto[];
    return this.loadTemplateMapping(orgId, job.sourceType);
  }

  /** Save field mappings to a job */
  async saveMappings(
    orgId: string,
    jobId: string,
    userId: string,
    dto: SaveFieldMappingsDto,
  ): Promise<void> {
    const errors = this.collectMappingErrors(dto.mappings);
    if (errors.length > 0) throw new BadRequestException(errors.join("; "));
    await this.migrationParserService.saveFieldMappings(
      orgId,
      jobId,
      dto.mappings,
    );
    if (dto.saveAsTemplate && dto.templateName) {
      const job = await this.getJob(orgId, jobId);
      await this.saveTemplate(
        orgId,
        job.sourceType,
        dto.templateName,
        dto.mappings,
        userId,
      );
    }
  }

  /** Load a saved field mapping template */
  async loadTemplateMapping(
    orgId: string,
    sourceType: MigrationSourceType,
  ): Promise<FieldMappingDto[]> {
    const template = await this.prisma.migrationFieldTemplate.findFirst({
      where: { organizationId: orgId, sourceType },
      orderBy: { updatedAt: "desc" },
    });
    return template ? (template.mappings as unknown as FieldMappingDto[]) : [];
  }

  private collectMappingErrors(mappings: FieldMappingDto[]): string[] {
    return Object.values(TargetEntityType).flatMap((entityType) =>
      this.migrationParserService.validateMapping(
        mappings.filter((m) => m.targetEntity === entityType),
        entityType,
      ),
    );
  }

  private async saveTemplate(
    orgId: string,
    sourceType: MigrationSourceType,
    name: string,
    mappings: FieldMappingDto[],
    userId: string,
  ): Promise<void> {
    await this.prisma.migrationFieldTemplate.upsert({
      where: {
        organizationId_sourceType_name: {
          organizationId: orgId,
          sourceType,
          name,
        },
      },
      create: {
        organizationId: orgId,
        sourceType,
        name,
        mappings: JSON.parse(JSON.stringify(mappings)),
        createdById: userId,
      },
      update: { mappings: JSON.parse(JSON.stringify(mappings)) },
    });
  }

  // ===========================================
  // Validation & Preview (delegated to ValidatorService)
  // ===========================================

  /** Validate data against mappings */
  async validate(
    orgId: string,
    jobId: string,
    data: Record<string, unknown>[],
  ): Promise<{
    validRows: number;
    errorRows: number;
    errors: ValidationError[];
  }> {
    const mappings = await this.getMappingsOrThrow(orgId, jobId, "validation");
    return this.migrationValidatorService.validateJob(
      orgId,
      jobId,
      data,
      mappings,
    );
  }

  /** Generate preview of transformed data */
  async generatePreview(
    orgId: string,
    jobId: string,
    data: Record<string, unknown>[],
    limit = PREVIEW_LIMIT,
  ): Promise<PreviewRow[]> {
    const mappings = await this.getMappingsOrThrow(orgId, jobId, "preview");
    return this.migrationValidatorService.getPreview(
      orgId,
      jobId,
      data,
      mappings,
      limit,
    );
  }

  private async getMappingsOrThrow(
    orgId: string,
    jobId: string,
    operation: string,
  ): Promise<FieldMappingDto[]> {
    const job = await this.getJob(orgId, jobId);
    if (!job.fieldMappings)
      throw new BadRequestException(
        `Field mappings must be configured before ${operation}`,
      );
    return job.fieldMappings as unknown as FieldMappingDto[];
  }

  // ===========================================
  // Import Execution (delegated to ExecutorService)
  // ===========================================

  /** Start the import process */
  async startImport(
    orgId: string,
    jobId: string,
    _userId: string,
  ): Promise<void> {
    const job = await this.getJob(orgId, jobId);
    if (job.status !== MigrationJobStatus.PREVIEW)
      throw new BadRequestException(
        `Cannot start import from status ${job.status}`,
      );
    if (!job.fieldMappings)
      throw new BadRequestException(
        "Field mappings must be configured before import",
      );
    await this.updateJobStatus(
      jobId,
      MigrationJobStatus.IMPORTING,
      "Starting import",
      0,
    );
    this.logger.log(`Starting import for job ${jobId}`);
    // Actual import handled by background job processor
  }

  /** Cancel an in-progress import */
  async cancelImport(orgId: string, jobId: string): Promise<void> {
    const job = await this.getJob(orgId, jobId);
    if (job.status !== MigrationJobStatus.IMPORTING)
      throw new BadRequestException(
        `Cannot cancel import with status ${job.status}`,
      );
    await this.migrationExecutorService.cancelImport(jobId);
  }

  /** Mark job as completed (called by import processor) */
  async completeImport(jobId: string, importedRows: number): Promise<void> {
    await this.migrationExecutorService.completeImport(jobId, importedRows);
  }

  /** Mark job as failed (called by import processor) */
  async failImport(
    jobId: string,
    error: string,
    details?: unknown,
  ): Promise<void> {
    await this.migrationExecutorService.failImport(jobId, error, details);
  }

  // ===========================================
  // Rollback (delegated to ExecutorService)
  // ===========================================

  /** Check if a job can be rolled back */
  async canRollback(
    orgId: string,
    jobId: string,
  ): Promise<RollbackCheckResponseDto> {
    const job = await this.getJob(orgId, jobId);
    return this.migrationExecutorService.checkRollbackEligibility(
      orgId,
      jobId,
      job,
    );
  }

  /** Rollback a completed import */
  async rollback(
    orgId: string,
    userId: string,
    jobId: string,
    confirmText: string,
  ): Promise<RollbackResultResponseDto> {
    const canRollbackResult = await this.canRollback(orgId, jobId);
    if (!canRollbackResult.canRollback)
      throw new BadRequestException(canRollbackResult.reason);
    return this.migrationExecutorService.executeRollback(
      orgId,
      jobId,
      userId,
      confirmText,
    );
  }
}
