/**
 * MigrationProcessor - BullMQ processor for async data imports
 *
 * Handles large-scale data migrations asynchronously:
 * 1. Downloads file from storage
 * 2. Parses rows using appropriate connector
 * 3. Validates and transforms each row
 * 4. Creates entities in transaction (Person, RIU, Case)
 * 5. Tracks imported records for rollback
 * 6. Updates job progress throughout
 *
 * Key features:
 * - Concurrency of 1 (one import at a time per worker)
 * - Progress tracking with job.updateProgress()
 * - 7-day rollback window via MigrationRecord tracking
 * - Error collection (max 100 stored)
 * - Transaction-safe entity creation
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
 * Queue name for migration imports.
 * Must match the queue registered in the module.
 */
export const MIGRATION_QUEUE_NAME = "migrations";

/**
 * Job data structure for migration imports.
 */
export interface MigrationJobData {
  /** Migration job record ID */
  jobId: string;
  /** Tenant identifier */
  organizationId: string;
  /** User who initiated the import */
  userId: string;
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
   * Process a migration import job.
   *
   * @param job - BullMQ job containing import configuration
   * @returns Result with counts and errors
   */
  async process(job: Job<MigrationJobData>): Promise<MigrationResult> {
    const { jobId, organizationId, userId } = job.data;

    this.logger.log(`Starting import for job ${jobId}`);

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

    // Update status to IMPORTING
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.IMPORTING,
        progress: 0,
        currentStep: "Starting import",
      },
    });

    try {
      // Download file from storage
      await this.updateStep(jobId, "Downloading file");
      const downloadResult = await this.storageService.download(
        migrationJob.fileUrl,
      );
      const chunks: Buffer[] = [];
      for await (const chunk of downloadResult.stream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

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

            await job.updateProgress(progress);
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
        entityType: AuditEntityType.CASE, // Use CASE as closest match for migration
        entityId: jobId,
        action: "migration_completed",
        actionCategory: AuditActionCategory.CREATE, // Use CREATE as closest match for data import
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Import failed for job ${jobId}: ${errorMessage}`);

      await this.prisma.migrationJob.update({
        where: { id: jobId },
        data: {
          status: MigrationJobStatus.FAILED,
          currentStep: "Import failed",
          errorMessage,
          errorDetails: {
            stack: error instanceof Error ? error.stack : undefined,
          } as Prisma.InputJsonValue,
        },
      });

      // Audit log for failure
      await this.auditService.log({
        entityType: AuditEntityType.CASE, // Use CASE as closest match for migration
        entityId: jobId,
        action: "migration_failed",
        actionCategory: AuditActionCategory.SYSTEM, // Use SYSTEM for automated/background errors
        actionDescription: `Migration failed: ${errorMessage}`,
        organizationId,
        actorUserId: userId,
        actorType: ActorType.USER,
        context: {
          error: errorMessage,
          sourceType: migrationJob.sourceType,
          fileName: migrationJob.fileName,
        },
      });

      throw error;
    }
  }

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
      `Migration job ${job.data.jobId} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  /**
   * Handle job completion.
   */
  @OnWorkerEvent("completed")
  onCompleted(job: Job<MigrationJobData>): void {
    this.logger.log(`Migration job ${job.data.jobId} completed successfully`);
  }

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
            type: PersonType.EXTERNAL_CONTACT, // Default for migrated persons
            source: PersonSource.INTAKE_CREATED, // Closest match for migration
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
            type: RiuType.WEB_FORM_SUBMISSION, // Best match for migrated data
            sourceChannel: RiuSourceChannel.DIRECT_ENTRY, // Best match for migration
            status: RiuStatus.RELEASED, // Migrated data is already released
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
      }

      // Create Case if data provided
      if (transformed.case && Object.keys(transformed.case).length > 0) {
        const caseData = transformed.case;

        // Map status string to valid CaseStatus enum (NEW, OPEN, CLOSED only)
        const caseStatus = this.mapToCaseStatus(caseData.status);

        // Map severity string to valid Severity enum
        const caseSeverity = this.mapToSeverity(caseData.severity);

        // Map reporter type string to valid ReporterType enum
        const caseReporterType = this.mapToReporterType(caseData.reporterType);

        // Map outcome string to valid CaseOutcome enum (if provided)
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
            sourceChannel: SourceChannel.DIRECT_ENTRY, // Best match for migration
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
      }

      // Track imported record for rollback
      const primaryEntityType = caseId ? "Case" : riuId ? "RIU" : "Person";
      const primaryEntityId = caseId || riuId || personId;

      if (primaryEntityId) {
        await tx.migrationRecord.create({
          data: {
            migrationJobId,
            entityType: primaryEntityType,
            entityId: primaryEntityId,
            sourceRowNumber: rowNumber,
            sourceData: sourceData as Prisma.InputJsonValue,
            modifiedAfterImport: false,
          },
        });
      }
    });
  }

  /**
   * Update job step description.
   */
  private async updateStep(jobId: string, step: string): Promise<void> {
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: { currentStep: step },
    });
  }

  /**
   * Map string to CaseStatus enum.
   * CaseStatus only has NEW, OPEN, CLOSED.
   */
  private mapToCaseStatus(status: unknown): CaseStatus {
    const normalized = String(status || "").toUpperCase();
    const mapping: Record<string, CaseStatus> = {
      NEW: CaseStatus.NEW,
      OPEN: CaseStatus.OPEN,
      IN_PROGRESS: CaseStatus.OPEN, // Map to OPEN since no IN_PROGRESS
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
      CONFIDENTIAL: ReporterType.ANONYMOUS, // Map to closest
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
}
