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
} from "./dto/migration.dto";
import { MigrationParserService } from "./services/migration-parser.service";
import { MigrationValidatorService } from "./services/migration-validator.service";
import { MigrationExecutorService } from "./services/migration-executor.service";
import { MigrationTemplateService } from "./services/migration-template.service";

const PREVIEW_LIMIT = 10;

/**
 * MigrationService is a thin coordinator for data import from competitor systems.
 * Supports NAVEX, EQS, Legacy Ethico, and generic CSV imports.
 *
 * This service manages migration job state and delegates specialized operations:
 * - Parsing/format detection -> MigrationParserService
 * - Validation/preview -> MigrationValidatorService
 * - Import execution/rollback -> MigrationExecutorService
 * - Template management -> MigrationTemplateService
 */
@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly migrationParserService: MigrationParserService,
    private readonly migrationValidatorService: MigrationValidatorService,
    private readonly migrationExecutorService: MigrationExecutorService,
    private readonly migrationTemplateService: MigrationTemplateService,
  ) {}

  // ===========================================
  // Job Management (CRUD)
  // ===========================================

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

  async getJob(organizationId: string, jobId: string): Promise<MigrationJob> {
    const job = await this.prisma.migrationJob.findFirst({
      where: { id: jobId, organizationId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        migrationRecords: { select: { id: true }, take: 1 },
      },
    });
    if (!job) {
      throw new NotFoundException(`Migration job ${jobId} not found`);
    }
    return job;
  }

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
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.migrationJob.count({ where }),
    ]);
    return { jobs, total };
  }

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
  // Field Mapping (delegated to TemplateService)
  // ===========================================

  async getSuggestedMappings(
    orgId: string,
    jobId: string,
  ): Promise<FieldMappingDto[]> {
    const job = await this.getJob(orgId, jobId);
    if (job.fieldMappings) {
      return job.fieldMappings as unknown as FieldMappingDto[];
    }
    return this.migrationTemplateService.loadTemplate(orgId, job.sourceType);
  }

  async saveMappings(
    orgId: string,
    jobId: string,
    userId: string,
    dto: SaveFieldMappingsDto,
  ): Promise<void> {
    this.migrationTemplateService.validateMappingsOrThrow(dto.mappings);
    await this.migrationParserService.saveFieldMappings(
      orgId,
      jobId,
      dto.mappings,
    );
    if (dto.saveAsTemplate && dto.templateName) {
      const job = await this.getJob(orgId, jobId);
      await this.migrationTemplateService.saveTemplate(
        orgId,
        job.sourceType,
        dto.templateName,
        dto.mappings,
        userId,
      );
    }
  }

  async loadTemplateMapping(
    orgId: string,
    sourceType: MigrationSourceType,
  ): Promise<FieldMappingDto[]> {
    return this.migrationTemplateService.loadTemplate(orgId, sourceType);
  }

  // ===========================================
  // Validation & Preview (delegated to ValidatorService)
  // ===========================================

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
    if (!job.fieldMappings) {
      throw new BadRequestException(
        `Field mappings must be configured before ${operation}`,
      );
    }
    return job.fieldMappings as unknown as FieldMappingDto[];
  }

  // ===========================================
  // Import Execution (delegated to ExecutorService)
  // ===========================================

  async startImport(
    orgId: string,
    jobId: string,
    _userId: string,
  ): Promise<void> {
    const job = await this.getJob(orgId, jobId);
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
    await this.updateJobStatus(
      jobId,
      MigrationJobStatus.IMPORTING,
      "Starting import",
      0,
    );
    this.logger.log(`Starting import for job ${jobId}`);
  }

  async cancelImport(orgId: string, jobId: string): Promise<void> {
    const job = await this.getJob(orgId, jobId);
    if (job.status !== MigrationJobStatus.IMPORTING) {
      throw new BadRequestException(
        `Cannot cancel import with status ${job.status}`,
      );
    }
    await this.migrationExecutorService.cancelImport(jobId);
  }

  async completeImport(jobId: string, importedRows: number): Promise<void> {
    await this.migrationExecutorService.completeImport(jobId, importedRows);
  }

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

  async rollback(
    orgId: string,
    userId: string,
    jobId: string,
    confirmText: string,
  ): Promise<RollbackResultResponseDto> {
    const canRollbackResult = await this.canRollback(orgId, jobId);
    if (!canRollbackResult.canRollback) {
      throw new BadRequestException(canRollbackResult.reason);
    }
    return this.migrationExecutorService.executeRollback(
      orgId,
      jobId,
      userId,
      confirmText,
    );
  }
}
