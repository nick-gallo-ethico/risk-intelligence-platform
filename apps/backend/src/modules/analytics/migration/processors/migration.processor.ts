/**
 * MigrationProcessor - BullMQ processor for async migration operations
 *
 * Handles the complete migration lifecycle asynchronously:
 * 1. validate - Check all rows against mappings, collect errors
 * 2. preview - Generate preview of transformed data (first 20 rows)
 * 3. import - Execute the import with progress tracking
 * 4. rollback - Remove imported records within 7-day window
 *
 * Key features:
 * - Concurrency of 1 (one operation at a time per worker)
 * - Progress tracking with job.updateProgress()
 * - 7-day rollback window via MigrationRecord tracking
 * - Error collection (max 100 stored)
 * - Transaction-safe entity creation
 * - Modified records skipped during rollback with reasons
 *
 * @see MigrationService for job management
 * @see BaseMigrationConnector for row parsing
 */

import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../../../prisma/prisma.service";
import { MigrationService } from "../migration.service";
import { StorageService } from "../../../../common/services/storage.service";
import { AuditService } from "../../../audit/audit.service";
import { NavexConnector } from "../connectors/navex.connector";
import { EqsConnector } from "../connectors/eqs.connector";
import { CsvConnector } from "../connectors/csv.connector";
import {
  MigrationConnector,
  TransformedRow,
  FieldMapping,
} from "../connectors/base.connector";
import {
  MigrationSourceType,
  MigrationJobStatus,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  CaseStatus,
  Severity,
  SourceChannel,
  ReporterType,
  CaseOutcome,
  RiuType,
  RiuSourceChannel,
  RiuReporterType,
  RiuStatus,
  PersonType,
  PersonSource,
  PersonCaseLabel,
  RiuCaseAssociationType,
  Prisma,
} from "@prisma/client";

/**
 * Queue name for migration operations.
 * Must match the queue registered in the module.
 */
export const MIGRATION_QUEUE_NAME = "migrations";

/**
 * Supported migration actions
 */
export type MigrationAction = "validate" | "preview" | "import" | "rollback";

/**
 * Job data structure for migration operations.
 */
export interface MigrationJobData {
  /** Migration job record ID */
  jobId: string;
  /** Tenant identifier */
  organizationId: string;
  /** User who initiated the operation */
  userId: string;
  /** Action to perform */
  action: MigrationAction;
}

/**
 * Result of a migration import.
 */
export interface MigrationResult {
  importedCount: number;
  errorCount: number;
  errors: { row: number; error: string }[];
}

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  validRows: number;
  errorRows: number;
  errors: { row: number; field: string; error: string }[];
}

/**
 * Result of a preview operation.
 */
export interface PreviewResult {
  rowCount: number;
  previewData: {
    rowNumber: number;
    sourceData: Record<string, unknown>;
    transformedData: TransformedRow;
    issues: string[];
  }[];
}

/**
 * Result of a rollback operation.
 */
export interface RollbackResult {
  rolledBackCount: number;
  skippedCount: number;
  skippedReasons: string[];
}

/**
 * Max errors to store in job record.
 */
const MAX_STORED_ERRORS = 100;

/**
 * Rollback window in days.
 */
const ROLLBACK_WINDOW_DAYS = 7;

/**
 * Progress update interval (rows).
 */
const PROGRESS_UPDATE_INTERVAL = 100;

/**
 * Max preview rows.
 */
const PREVIEW_ROW_LIMIT = 20;

@Processor(MIGRATION_QUEUE_NAME, { concurrency: 1 })
@Injectable()
export class MigrationProcessor extends WorkerHost {
  private readonly logger = new Logger(MigrationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly migrationService: MigrationService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly navexConnector: NavexConnector,
    private readonly eqsConnector: EqsConnector,
    private readonly csvConnector: CsvConnector,
  ) {
    super();
  }

  /**
   * Process a migration job based on the action type.
   *
   * @param job - BullMQ job containing operation configuration
   * @returns Result based on action type
   */
  async process(
    job: Job<MigrationJobData>,
  ): Promise<
    MigrationResult | ValidationResult | PreviewResult | RollbackResult
  > {
    const { jobId, organizationId, userId, action } = job.data;

    this.logger.log(`Processing migration job ${jobId}: ${action}`);

    // Load job record
    const migrationJob = await this.prisma.migrationJob.findUnique({
      where: { id: jobId },
    });

    if (!migrationJob) {
      throw new Error(`Migration job ${jobId} not found`);
    }

    // Verify job belongs to organization
    if (migrationJob.organizationId !== organizationId) {
      throw new Error(`Migration job ${jobId} does not belong to organization`);
    }

    try {
      switch (action) {
        case "validate":
          return await this.executeValidation(jobId, organizationId, job);
        case "preview":
          return await this.executePreview(jobId, organizationId, job);
        case "import":
          return await this.executeImport(jobId, organizationId, userId, job);
        case "rollback":
          return await this.executeRollback(jobId, organizationId, userId, job);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Migration job ${jobId} ${action} failed: ${errorMessage}`);

      await this.prisma.migrationJob.update({
        where: { id: jobId },
        data: {
          status: MigrationJobStatus.FAILED,
          currentStep: `${action} failed`,
          errorMessage,
          errorDetails: {
            stack: error instanceof Error ? error.stack : undefined,
          } as Prisma.InputJsonValue,
        },
      });

      throw error;
    }
  }

  // ==================== Validation ====================

  /**
   * Execute validation of all rows against field mappings.
   */
  private async executeValidation(
    jobId: string,
    organizationId: string,
    queueJob: Job<MigrationJobData>,
  ): Promise<ValidationResult> {
    await this.updateJobStatus(jobId, MigrationJobStatus.VALIDATING, "Starting validation");

    const migrationJob = await this.prisma.migrationJob.findUnique({
      where: { id: jobId },
    });

    if (!migrationJob) throw new Error("Job not found");

    // Download file from storage
    await this.updateStep(jobId, "Downloading file");
    const buffer = await this.downloadFile(migrationJob.fileUrl);

    // Get connector and mappings
    const connector = this.getConnector(migrationJob.sourceType);
    const mappings =
      (migrationJob.fieldMappings as unknown as FieldMapping[]) || [];

    let validRows = 0;
    let errorRows = 0;
    const errors: { row: number; field: string; error: string }[] = [];
    let rowNumber = 0;

    await this.updateStep(jobId, "Validating rows");

    // Stream through all rows
    for await (const row of connector.createRowStream(buffer)) {
      rowNumber++;

      const validation = connector.validateRow(row, mappings);
      if (validation.isValid) {
        validRows++;
      } else {
        errorRows++;
        // Collect errors (limit stored)
        for (const err of validation.errors) {
          if (errors.length < MAX_STORED_ERRORS) {
            errors.push({ row: rowNumber, field: err.field, error: err.message });
          }
        }
      }

      // Update progress periodically
      if (rowNumber % PROGRESS_UPDATE_INTERVAL === 0) {
        const progress = Math.min(rowNumber, 99);
        await queueJob.updateProgress(progress);
        await this.prisma.migrationJob.update({
          where: { id: jobId },
          data: {
            progress,
            currentStep: `Validating row ${rowNumber}`,
          },
        });
      }
    }

    // Update job with validation results
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.MAPPING,
        totalRows: rowNumber,
        validRows,
        errorRows,
        validationErrors:
          errors.length > 0
            ? (errors as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        progress: 100,
        currentStep: "Validation complete",
      },
    });

    this.logger.log(
      `Validation completed for job ${jobId}: ${validRows} valid, ${errorRows} errors`,
    );

    return { validRows, errorRows, errors };
  }

  // ==================== Preview ====================

  /**
   * Generate preview of transformed data for first N rows.
   */
  private async executePreview(
    jobId: string,
    organizationId: string,
    queueJob: Job<MigrationJobData>,
  ): Promise<PreviewResult> {
    await this.updateStep(jobId, "Generating preview");

    const migrationJob = await this.prisma.migrationJob.findUnique({
      where: { id: jobId },
    });

    if (!migrationJob) throw new Error("Job not found");

    // Download file
    const buffer = await this.downloadFile(migrationJob.fileUrl);

    // Get connector and mappings
    const connector = this.getConnector(migrationJob.sourceType);
    const mappings =
      (migrationJob.fieldMappings as unknown as FieldMapping[]) || [];

    const previewData: {
      rowNumber: number;
      sourceData: Record<string, unknown>;
      transformedData: TransformedRow;
      issues: string[];
    }[] = [];

    let rowNumber = 0;

    // Stream first N rows for preview
    for await (const row of connector.createRowStream(buffer)) {
      rowNumber++;

      if (rowNumber > PREVIEW_ROW_LIMIT) break;

      const validation = connector.validateRow(row, mappings);
      const transformed = connector.transformRow(row, mappings);

      previewData.push({
        rowNumber,
        sourceData: row as Record<string, unknown>,
        transformedData: transformed,
        issues: [
          ...validation.errors.map((e) => `${e.field}: ${e.message}`),
          ...validation.warnings.map((w) => `Warning: ${w.field}: ${w.message}`),
          ...transformed.issues,
        ],
      });

      await queueJob.updateProgress(Math.round((rowNumber / PREVIEW_ROW_LIMIT) * 100));
    }

    // Save preview data to job
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.PREVIEW,
        previewData: previewData as unknown as Prisma.InputJsonValue,
        currentStep: "Preview ready",
      },
    });

    this.logger.log(`Preview generated for job ${jobId}: ${previewData.length} rows`);

    return { rowCount: previewData.length, previewData };
  }

  // ==================== Import ====================

  /**
   * Execute the full import with progress tracking.
   */
  private async executeImport(
    jobId: string,
    organizationId: string,
    userId: string,
    queueJob: Job<MigrationJobData>,
  ): Promise<MigrationResult> {
    // Update status to IMPORTING
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.IMPORTING,
        progress: 0,
        currentStep: "Starting import",
      },
    });

    const migrationJob = await this.prisma.migrationJob.findUnique({
      where: { id: jobId },
    });

    if (!migrationJob) throw new Error(`Migration job ${jobId} not found`);

    // Download file from storage
    await this.updateStep(jobId, "Downloading file");
    const buffer = await this.downloadFile(migrationJob.fileUrl);

    // Get appropriate connector
    const connector = this.getConnector(migrationJob.sourceType);
    const mappings =
      (migrationJob.fieldMappings as unknown as FieldMapping[]) || [];

    // Process rows
    await this.updateStep(jobId, "Processing rows");
    let importedCount = 0;
    let errorCount = 0;
    const errors: { row: number; error: string }[] = [];

    let rowNumber = 0;
    const totalRows = migrationJob.totalRows || 0;

    for await (const row of connector.createRowStream(buffer)) {
      rowNumber++;

      try {
        // Validate row
        const validation = connector.validateRow(row, mappings);
        if (!validation.isValid) {
          const errorMsg = validation.errors
            .map((e) => `${e.field}: ${e.message}`)
            .join("; ");
          if (errors.length < MAX_STORED_ERRORS) {
            errors.push({ row: rowNumber, error: errorMsg });
          }
          errorCount++;
          continue;
        }

        // Transform row
        const transformed = connector.transformRow(row, mappings);

        // Create entities in transaction
        await this.createEntities(
          organizationId,
          userId,
          transformed,
          jobId,
          rowNumber,
          row,
        );
        importedCount++;

        // Update progress periodically
        if (rowNumber % PROGRESS_UPDATE_INTERVAL === 0) {
          const progress =
            totalRows > 0
              ? Math.round((rowNumber / totalRows) * 100)
              : Math.min(rowNumber, 99);

          await queueJob.updateProgress(progress);
          await this.prisma.migrationJob.update({
            where: { id: jobId },
            data: {
              progress,
              importedRows: importedCount,
              currentStep: `Processing row ${rowNumber}${totalRows > 0 ? ` of ${totalRows}` : ""}`,
            },
          });
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        if (errors.length < MAX_STORED_ERRORS) {
          errors.push({ row: rowNumber, error: errorMsg });
        }
        errorCount++;

        this.logger.warn(
          `Error processing row ${rowNumber} in job ${jobId}: ${errorMsg}`,
        );
      }
    }

    // Calculate rollback expiration
    const rollbackAvailableUntil = new Date(
      Date.now() + ROLLBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    // Complete job
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.COMPLETED,
        progress: 100,
        importedRows: importedCount,
        errorRows: errorCount,
        validationErrors:
          errors.length > 0
            ? (errors as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        completedAt: new Date(),
        rollbackAvailableUntil,
        currentStep: "Import complete",
      },
    });

    // Audit log
    await this.auditService.log({
      entityType: AuditEntityType.CASE,
      entityId: jobId,
      action: "migration_completed",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Migration completed: ${importedCount} records imported, ${errorCount} errors`,
      organizationId,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: {
        importedCount,
        errorCount,
        totalRows: rowNumber,
        sourceType: migrationJob.sourceType,
        fileName: migrationJob.fileName,
      },
    });

    this.logger.log(
      `Import completed for job ${jobId}: ${importedCount} imported, ${errorCount} errors`,
    );

    return { importedCount, errorCount, errors };
  }

  // ==================== Rollback ====================

  /**
   * Execute rollback of imported records.
   * Skips records modified after import with reasons.
   */
  private async executeRollback(
    jobId: string,
    organizationId: string,
    userId: string,
    queueJob: Job<MigrationJobData>,
  ): Promise<RollbackResult> {
    await this.updateStep(jobId, "Starting rollback");

    const migrationJob = await this.prisma.migrationJob.findUnique({
      where: { id: jobId },
      include: { migrationRecords: true },
    });

    if (!migrationJob) throw new Error("Job not found");

    // Check rollback window
    if (
      migrationJob.rollbackAvailableUntil &&
      migrationJob.rollbackAvailableUntil < new Date()
    ) {
      throw new Error("Rollback window has expired (7 days)");
    }

    // Check job status
    if (migrationJob.status !== MigrationJobStatus.COMPLETED) {
      throw new Error(`Cannot rollback job with status ${migrationJob.status}`);
    }

    let rolledBackCount = 0;
    let skippedCount = 0;
    const skippedReasons: string[] = [];

    // Group records by entity type (delete in reverse dependency order)
    const entityOrder = ["Case", "RIU", "Person", "Investigation"];
    const totalRecords = migrationJob.migrationRecords.length;

    for (const entityType of entityOrder) {
      const records = migrationJob.migrationRecords.filter(
        (r) => r.entityType === entityType,
      );

      for (const record of records) {
        // Check if modified after import
        if (record.modifiedAfterImport) {
          skippedCount++;
          skippedReasons.push(
            `${entityType} ${record.entityId}: Modified after import`,
          );
          continue;
        }

        try {
          // Delete based on entity type
          switch (entityType) {
            case "Case":
              // Delete associations first
              await this.prisma.riuCaseAssociation.deleteMany({
                where: { caseId: record.entityId },
              });
              await this.prisma.personCaseAssociation.deleteMany({
                where: { caseId: record.entityId },
              });
              await this.prisma.case.delete({
                where: { id: record.entityId },
              });
              break;

            case "RIU":
              // Delete RIU associations first
              await this.prisma.riuCaseAssociation.deleteMany({
                where: { riuId: record.entityId },
              });
              await this.prisma.riskIntelligenceUnit.delete({
                where: { id: record.entityId },
              });
              break;

            case "Person":
              // Delete person associations first
              await this.prisma.personCaseAssociation.deleteMany({
                where: { personId: record.entityId },
              });
              await this.prisma.person.delete({
                where: { id: record.entityId },
              });
              break;

            case "Investigation":
              // Delete investigation
              await this.prisma.investigation.delete({
                where: { id: record.entityId },
              });
              break;
          }

          rolledBackCount++;
        } catch (error) {
          skippedCount++;
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          skippedReasons.push(`${entityType} ${record.entityId}: ${errorMsg}`);
        }

        // Update progress
        const processed = rolledBackCount + skippedCount;
        await queueJob.updateProgress(
          Math.round((processed / totalRecords) * 100),
        );
      }
    }

    // Update job status
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.ROLLED_BACK,
        rolledBackAt: new Date(),
        rolledBackById: userId,
        currentStep: `Rolled back ${rolledBackCount} records, skipped ${skippedCount}`,
      },
    });

    // Audit log
    await this.auditService.log({
      entityType: AuditEntityType.CASE,
      entityId: jobId,
      action: "migration_rolled_back",
      actionCategory: AuditActionCategory.DELETE,
      actionDescription: `Migration rolled back: ${rolledBackCount} records removed, ${skippedCount} skipped`,
      organizationId,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: {
        rolledBackCount,
        skippedCount,
        skippedReasons: skippedReasons.slice(0, 50), // Limit stored reasons
      },
    });

    this.logger.log(
      `Rollback completed for job ${jobId}: ${rolledBackCount} removed, ${skippedCount} skipped`,
    );

    return { rolledBackCount, skippedCount, skippedReasons };
  }

  // ==================== Entity Creation ====================

  /**
   * Create entities from transformed row data.
   * Uses a transaction to ensure atomicity.
   */
  private async createEntities(
    organizationId: string,
    userId: string,
    transformed: TransformedRow,
    migrationJobId: string,
    rowNumber: number,
    sourceData: Record<string, string>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      let caseId: string | undefined;
      let riuId: string | undefined;
      let personId: string | undefined;

      // Create Person if data provided
      if (transformed.person && Object.keys(transformed.person).length > 0) {
        const personData = transformed.person;

        // Handle name splitting if only full name provided
        let firstName = personData.firstName;
        let lastName = personData.lastName;
        if (personData.name && (!firstName || !lastName)) {
          const nameParts = personData.name.split(" ");
          firstName = firstName || nameParts[0] || "";
          lastName = lastName || nameParts.slice(1).join(" ") || "";
        }

        const person = await tx.person.create({
          data: {
            organizationId,
            type: PersonType.EXTERNAL_CONTACT,
            source: PersonSource.INTAKE_CREATED,
            firstName: firstName || "Unknown",
            lastName: lastName || "Unknown",
            email: personData.email,
            phone: personData.phone,
            employeeId: personData.employeeId,
            jobTitle: personData.jobTitle,
            company: personData.company,
            notes: personData.notes,
            sourceSystem: "MIGRATION",
            sourceRecordId:
              (transformed.case?.referenceNumber as string) ||
              `row-${rowNumber}`,
            migratedAt: new Date(),
            createdById: userId,
          },
        });
        personId = person.id;

        // Track for rollback
        await tx.migrationRecord.create({
          data: {
            migrationJobId,
            entityType: "Person",
            entityId: person.id,
            sourceRowNumber: rowNumber,
            sourceData: sourceData as Prisma.InputJsonValue,
            modifiedAfterImport: false,
          },
        });
      }

      // Create RIU if data provided
      if (transformed.riu && Object.keys(transformed.riu).length > 0) {
        const riuData = transformed.riu;

        // Map severity string to valid RIU severity enum
        const riuSeverity = this.mapToSeverity(riuData.severity);

        // Map reporter type string to valid RIU reporter type enum
        const riuReporterType = this.mapToRiuReporterType(riuData.reporterType);

        const riu = await tx.riskIntelligenceUnit.create({
          data: {
            organizationId,
            type: RiuType.WEB_FORM_SUBMISSION,
            sourceChannel: RiuSourceChannel.DIRECT_ENTRY,
            status: RiuStatus.RELEASED,
            details: riuData.details || "",
            summary: riuData.summary,
            severity: riuSeverity,
            reporterType: riuReporterType,
            reporterName: riuData.reporterName,
            reporterEmail: riuData.reporterEmail,
            reporterPhone: riuData.reporterPhone,
            locationName: riuData.locationName,
            isAnonymous: riuData.isAnonymous || false,
            customFields: riuData.customFields as Prisma.InputJsonValue,
            sourceSystem: "MIGRATION",
            sourceRecordId: riuData.referenceNumber || `row-${rowNumber}`,
            migratedAt: new Date(),
            createdById: userId,
          },
        });
        riuId = riu.id;

        // Track for rollback
        await tx.migrationRecord.create({
          data: {
            migrationJobId,
            entityType: "RIU",
            entityId: riu.id,
            sourceRowNumber: rowNumber,
            sourceData: sourceData as Prisma.InputJsonValue,
            modifiedAfterImport: false,
          },
        });
      }

      // Create Case if data provided
      if (transformed.case && Object.keys(transformed.case).length > 0) {
        const caseData = transformed.case;

        // Map status string to valid CaseStatus enum
        const caseStatus = this.mapToCaseStatus(caseData.status);

        // Map severity string to valid Severity enum
        const caseSeverity = this.mapToSeverity(caseData.severity);

        // Map reporter type string to valid ReporterType enum
        const caseReporterType = this.mapToReporterType(caseData.reporterType);

        // Map outcome string to valid CaseOutcome enum
        const caseOutcome = caseData.outcome
          ? this.mapToCaseOutcome(caseData.outcome)
          : undefined;

        const caseRecord = await tx.case.create({
          data: {
            organizationId,
            referenceNumber:
              caseData.referenceNumber || `MIG-${Date.now()}-${rowNumber}`,
            status: caseStatus,
            severity: caseSeverity,
            details: caseData.details || "",
            summary: caseData.summary,
            sourceChannel: SourceChannel.DIRECT_ENTRY,
            intakeTimestamp: caseData.intakeTimestamp || new Date(),
            incidentDate: caseData.incidentDate,
            locationName: caseData.locationName,
            locationCity: caseData.locationCity,
            locationState: caseData.locationState,
            locationCountry: caseData.locationCountry,
            reporterAnonymous: caseData.reporterAnonymous || false,
            reporterType: caseReporterType,
            reporterName: caseData.reporterName,
            reporterEmail: caseData.reporterEmail,
            reporterPhone: caseData.reporterPhone,
            outcome: caseOutcome,
            outcomeNotes: caseData.outcomeNotes,
            customFields: caseData.customFields as Prisma.InputJsonValue,
            sourceSystem: "MIGRATION",
            sourceRecordId: caseData.referenceNumber || `row-${rowNumber}`,
            migratedAt: new Date(),
            createdById: userId,
          },
        });
        caseId = caseRecord.id;

        // Link RIU to Case if both created
        if (riuId) {
          await tx.riuCaseAssociation.create({
            data: {
              riuId,
              caseId: caseRecord.id,
              associationType: RiuCaseAssociationType.PRIMARY,
              createdById: userId,
            },
          });
        }

        // Link Person to Case if both created
        if (personId) {
          await tx.personCaseAssociation.create({
            data: {
              organizationId,
              personId,
              caseId: caseRecord.id,
              label: PersonCaseLabel.SUBJECT,
              createdById: userId,
            },
          });
        }

        // Track for rollback
        await tx.migrationRecord.create({
          data: {
            migrationJobId,
            entityType: "Case",
            entityId: caseRecord.id,
            sourceRowNumber: rowNumber,
            sourceData: sourceData as Prisma.InputJsonValue,
            modifiedAfterImport: false,
          },
        });
      }
    });
  }

  // ==================== Helpers ====================

  /**
   * Get the appropriate connector for the source type.
   */
  private getConnector(sourceType: MigrationSourceType): MigrationConnector {
    switch (sourceType) {
      case MigrationSourceType.NAVEX:
        return this.navexConnector;
      case MigrationSourceType.EQS:
        return this.eqsConnector;
      case MigrationSourceType.LEGACY_ETHICO:
      case MigrationSourceType.GENERIC_CSV:
      default:
        return this.csvConnector;
    }
  }

  /**
   * Download file from storage and return as buffer.
   */
  private async downloadFile(fileUrl: string): Promise<Buffer> {
    const downloadResult = await this.storageService.download(fileUrl);
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResult.stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Update job status with step description.
   */
  private async updateJobStatus(
    jobId: string,
    status: MigrationJobStatus,
    step: string,
  ): Promise<void> {
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: { status, currentStep: step },
    });
  }

  /**
   * Update job step description only.
   */
  private async updateStep(jobId: string, step: string): Promise<void> {
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: { currentStep: step },
    });
  }

  /**
   * Map string to CaseStatus enum.
   */
  private mapToCaseStatus(status: unknown): CaseStatus {
    const normalized = String(status || "").toUpperCase();
    const mapping: Record<string, CaseStatus> = {
      NEW: CaseStatus.NEW,
      OPEN: CaseStatus.OPEN,
      IN_PROGRESS: CaseStatus.OPEN,
      PENDING: CaseStatus.OPEN,
      CLOSED: CaseStatus.CLOSED,
      RESOLVED: CaseStatus.CLOSED,
      COMPLETE: CaseStatus.CLOSED,
    };
    return mapping[normalized] || CaseStatus.NEW;
  }

  /**
   * Map string to Severity enum.
   */
  private mapToSeverity(severity: unknown): Severity {
    const normalized = String(severity || "").toUpperCase();
    const mapping: Record<string, Severity> = {
      HIGH: Severity.HIGH,
      CRITICAL: Severity.HIGH,
      URGENT: Severity.HIGH,
      MEDIUM: Severity.MEDIUM,
      MODERATE: Severity.MEDIUM,
      NORMAL: Severity.MEDIUM,
      LOW: Severity.LOW,
      MINOR: Severity.LOW,
    };
    return mapping[normalized] || Severity.MEDIUM;
  }

  /**
   * Map string to ReporterType enum (for Case).
   */
  private mapToReporterType(reporterType: unknown): ReporterType | undefined {
    if (!reporterType) return undefined;
    const normalized = String(reporterType).toUpperCase();
    const mapping: Record<string, ReporterType> = {
      ANONYMOUS: ReporterType.ANONYMOUS,
      IDENTIFIED: ReporterType.IDENTIFIED,
      PROXY: ReporterType.PROXY,
      CONFIDENTIAL: ReporterType.ANONYMOUS,
    };
    return mapping[normalized];
  }

  /**
   * Map string to RiuReporterType enum (for RIU).
   */
  private mapToRiuReporterType(
    reporterType: unknown,
  ): RiuReporterType | undefined {
    if (!reporterType) return undefined;
    const normalized = String(reporterType).toUpperCase();
    const mapping: Record<string, RiuReporterType> = {
      ANONYMOUS: RiuReporterType.ANONYMOUS,
      CONFIDENTIAL: RiuReporterType.CONFIDENTIAL,
      IDENTIFIED: RiuReporterType.IDENTIFIED,
    };
    return mapping[normalized];
  }

  /**
   * Map string to CaseOutcome enum.
   */
  private mapToCaseOutcome(outcome: unknown): CaseOutcome | undefined {
    if (!outcome) return undefined;
    const normalized = String(outcome).toUpperCase().replace(/[\s-]/g, "_");
    const mapping: Record<string, CaseOutcome> = {
      SUBSTANTIATED: CaseOutcome.SUBSTANTIATED,
      UNSUBSTANTIATED: CaseOutcome.UNSUBSTANTIATED,
      INCONCLUSIVE: CaseOutcome.INCONCLUSIVE,
      POLICY_VIOLATION: CaseOutcome.POLICY_VIOLATION,
      NO_VIOLATION: CaseOutcome.NO_VIOLATION,
    };
    return mapping[normalized];
  }

  // ==================== Event Handlers ====================

  /**
   * Handle job failure after all retries exhausted.
   */
  @OnWorkerEvent("failed")
  onFailed(job: Job<MigrationJobData> | undefined, error: Error): void {
    if (!job) {
      this.logger.error(
        `Migration job failed with no context: ${error.message}`,
      );
      return;
    }

    this.logger.error(
      `Migration job ${job.data.jobId} (${job.data.action}) failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  /**
   * Handle job completion.
   */
  @OnWorkerEvent("completed")
  onCompleted(job: Job<MigrationJobData>): void {
    this.logger.log(
      `Migration job ${job.data.jobId} (${job.data.action}) completed successfully`,
    );
  }
}
