import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { MigrationJobStatus, MigrationRecord } from "@prisma/client";
import {
  FieldMappingDto,
  RollbackCheckResponseDto,
  RollbackResultResponseDto,
  PreviewRow,
} from "../dto/migration.dto";
import { MigrationParserService } from "./migration-parser.service";

// Rollback window in days
const ROLLBACK_WINDOW_DAYS = 7;

// Batch size for import operations
const IMPORT_BATCH_SIZE = 100;

/**
 * MigrationExecutorService handles import execution and rollback logic.
 *
 * Responsibilities:
 * - Execute import operations in batches
 * - Track imported records for rollback
 * - Check rollback eligibility
 * - Execute rollback operations
 * - Emit progress events
 *
 * This service extracts import/rollback logic from MigrationService
 * to follow the thin coordinator pattern.
 */
@Injectable()
export class MigrationExecutorService {
  private readonly logger = new Logger(MigrationExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parserService: MigrationParserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Import Execution

  /**
   * Execute the import operation.
   * Processes data in batches and tracks imported records.
   *
   * @param organizationId - Tenant organization ID
   * @param jobId - Migration job ID
   * @param userId - User executing the import
   * @param data - Data rows to import
   * @param mappings - Field mappings for transformation
   */
  async executeImport(
    organizationId: string,
    jobId: string,
    userId: string,
    data: Record<string, unknown>[],
    mappings: FieldMappingDto[],
  ): Promise<void> {
    this.logger.log(
      `Starting import for job ${jobId} with ${data.length} rows`,
    );

    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.IMPORTING,
        currentStep: "Starting import",
        progress: 0,
      },
    });

    let importedCount = 0;
    let errorCount = 0;

    // Process in batches
    for (let i = 0; i < data.length; i += IMPORT_BATCH_SIZE) {
      const batch = data.slice(i, i + IMPORT_BATCH_SIZE);

      try {
        const batchResults = await this.importBatch(
          batch,
          jobId,
          organizationId,
          userId,
          mappings,
          i, // batchOffset
        );

        importedCount += batchResults.imported;
        errorCount += batchResults.errors;

        // Update progress
        const progress = Math.round(((i + batch.length) / data.length) * 100);
        await this.prisma.migrationJob.update({
          where: { id: jobId },
          data: {
            progress,
            currentStep: `Imported ${importedCount} of ${data.length} rows`,
            importedRows: importedCount,
          },
        });

        // Emit progress event
        this.eventEmitter.emit("migration.progress", {
          jobId,
          progress,
          importedCount,
          totalCount: data.length,
        });
      } catch (error) {
        this.logger.error(
          `Error importing batch at offset ${i} for job ${jobId}`,
          error,
        );
        throw error;
      }
    }

    // Complete import
    const rollbackUntil = new Date();
    rollbackUntil.setDate(rollbackUntil.getDate() + ROLLBACK_WINDOW_DAYS);

    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.COMPLETED,
        currentStep: "Import complete",
        progress: 100,
        importedRows: importedCount,
        errorRows: errorCount,
        completedAt: new Date(),
        rollbackAvailableUntil: rollbackUntil,
      },
    });

    this.eventEmitter.emit("migration.completed", {
      jobId,
      importedCount,
      errorCount,
    });

    this.logger.log(
      `Import completed for job ${jobId}: ${importedCount} imported, ${errorCount} errors`,
    );
  }

  /**
   * Import a batch of rows.
   *
   * @param batch - Array of rows to import
   * @param jobId - Migration job ID
   * @param organizationId - Tenant organization ID
   * @param userId - User executing the import
   * @param mappings - Field mappings for transformation
   * @param batchOffset - Starting row number for this batch
   * @returns Import result with counts
   */
  async importBatch(
    batch: Record<string, unknown>[],
    jobId: string,
    organizationId: string,
    userId: string,
    mappings: FieldMappingDto[],
    batchOffset: number = 0,
  ): Promise<{ imported: number; errors: number }> {
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const rowNumber = batchOffset + i + 1; // 1-based row number

      try {
        // Transform the row using parser service
        const transformedData = this.parserService.applyFieldMapping(
          row,
          mappings,
        );

        // Create entities based on transformed data
        const entityIds = await this.createEntities(
          transformedData,
          organizationId,
          userId,
        );

        // Create migration records to track imported data
        for (const entityId of entityIds) {
          await this.createMigrationRecord(
            organizationId,
            jobId,
            entityId.entityType,
            entityId.entityId,
            rowNumber,
            row,
          );
        }

        imported++;
      } catch (error) {
        this.logger.warn(
          `Error importing row ${rowNumber} in job ${jobId}: ${error instanceof Error ? error.message : error}`,
        );
        errors++;
      }
    }

    return { imported, errors };
  }

  /**
   * Create entities from transformed data.
   * This is a placeholder - actual implementation would create
   * Cases, RIUs, Persons, and Investigations based on mapped data.
   *
   * @param transformedData - Transformed data grouped by entity type
   * @param organizationId - Tenant organization ID
   * @param userId - User creating the entities
   * @returns Array of created entity IDs
   */
  private async createEntities(
    transformedData: PreviewRow["transformedData"],
    organizationId: string,
    userId: string,
  ): Promise<Array<{ entityType: string; entityId: string }>> {
    const entityIds: Array<{ entityType: string; entityId: string }> = [];

    // Create Case if case data exists
    if (transformedData.case && Object.keys(transformedData.case).length > 0) {
      // Placeholder - actual implementation would create a Case
      const caseId = await this.createCase(
        transformedData.case,
        organizationId,
        userId,
      );
      if (caseId) {
        entityIds.push({ entityType: "Case", entityId: caseId });
      }
    }

    // Create RIU if riu data exists
    if (transformedData.riu && Object.keys(transformedData.riu).length > 0) {
      // Placeholder - actual implementation would create an RIU
      const riuId = await this.createRiu(
        transformedData.riu,
        organizationId,
        userId,
      );
      if (riuId) {
        entityIds.push({ entityType: "RIU", entityId: riuId });
      }
    }

    // Create Person if person data exists
    if (
      transformedData.person &&
      Object.keys(transformedData.person).length > 0
    ) {
      // Placeholder - actual implementation would create a Person
      const personId = await this.createPerson(
        transformedData.person,
        organizationId,
        userId,
      );
      if (personId) {
        entityIds.push({ entityType: "Person", entityId: personId });
      }
    }

    return entityIds;
  }

  /**
   * Create a Case entity from migration data.
   * Placeholder implementation - would be replaced with actual Case creation.
   */
  private async createCase(
    data: Record<string, unknown>,
    organizationId: string,
    userId: string,
  ): Promise<string | null> {
    // Actual implementation would create a Case using CasesService
    // For now, return null to indicate no entity was created
    this.logger.debug(`Would create Case with data: ${JSON.stringify(data)}`);
    return null;
  }

  /**
   * Create an RIU entity from migration data.
   * Placeholder implementation - would be replaced with actual RIU creation.
   */
  private async createRiu(
    data: Record<string, unknown>,
    organizationId: string,
    userId: string,
  ): Promise<string | null> {
    // Actual implementation would create an RIU using RiusService
    this.logger.debug(`Would create RIU with data: ${JSON.stringify(data)}`);
    return null;
  }

  /**
   * Create a Person entity from migration data.
   * Placeholder implementation - would be replaced with actual Person creation.
   */
  private async createPerson(
    data: Record<string, unknown>,
    organizationId: string,
    userId: string,
  ): Promise<string | null> {
    // Actual implementation would create a Person using PersonsService
    this.logger.debug(`Would create Person with data: ${JSON.stringify(data)}`);
    return null;
  }

  /**
   * Create a migration record to track imported entities.
   *
   * @param organizationId - Tenant organization ID
   * @param jobId - Migration job ID
   * @param entityType - Type of entity created
   * @param entityId - ID of created entity
   * @param sourceRowNumber - Row number in source file
   * @param sourceData - Original source data for reference
   */
  async createMigrationRecord(
    organizationId: string,
    jobId: string,
    entityType: string,
    entityId: string,
    sourceRowNumber: number,
    sourceData: Record<string, unknown>,
  ): Promise<MigrationRecord> {
    return this.prisma.migrationRecord.create({
      data: {
        organizationId,
        migrationJobId: jobId,
        entityType,
        entityId,
        sourceRowNumber,
        sourceData: JSON.parse(JSON.stringify(sourceData)),
        modifiedAfterImport: false,
      },
    });
  }

  // Rollback

  /**
   * Check if a job can be rolled back.
   *
   * @param organizationId - Tenant organization ID
   * @param jobId - Migration job ID
   * @param job - Migration job (pre-fetched)
   * @returns Rollback eligibility status
   */
  async checkRollbackEligibility(
    organizationId: string,
    jobId: string,
    job: {
      status: MigrationJobStatus;
      rollbackAvailableUntil: Date | null;
    },
  ): Promise<RollbackCheckResponseDto> {
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

    if (modifiedCount === totalRecords && totalRecords > 0) {
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
   * Execute rollback of a completed import.
   *
   * @param organizationId - Tenant organization ID
   * @param jobId - Migration job ID
   * @param userId - User executing the rollback
   * @param confirmText - Confirmation text (must be "ROLLBACK")
   * @returns Rollback result with counts
   */
  async executeRollback(
    organizationId: string,
    jobId: string,
    userId: string,
    confirmText: string,
  ): Promise<RollbackResultResponseDto> {
    // Verify confirmation
    if (confirmText !== "ROLLBACK") {
      throw new BadRequestException('Confirmation text must be "ROLLBACK"');
    }

    this.logger.log(`Starting rollback for job ${jobId}`);

    // Get records that can be rolled back (not modified)
    const records = await this.prisma.migrationRecord.findMany({
      where: {
        migrationJobId: jobId,
        modifiedAfterImport: false,
      },
    });

    // Get records that were modified (cannot be rolled back)
    const skippedRecords = await this.prisma.migrationRecord.findMany({
      where: {
        migrationJobId: jobId,
        modifiedAfterImport: true,
      },
    });

    // Delete records that can be rolled back
    const deletedCount = await this.deleteMigratedRecords(jobId, records);

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

    this.eventEmitter.emit("migration.rolledBack", {
      jobId,
      rolledBackCount: deletedCount,
      skippedCount: skippedRecords.length,
    });

    this.logger.log(
      `Rollback completed for job ${jobId}: ${deletedCount} rolled back, ${skippedRecords.length} skipped`,
    );

    return {
      rolledBackCount: deletedCount,
      skippedCount: skippedRecords.length,
      skippedReasons,
    };
  }

  /**
   * Delete migrated records and their associated entities.
   *
   * @param jobId - Migration job ID
   * @param records - Migration records to delete
   * @returns Number of deleted records
   */
  async deleteMigratedRecords(
    jobId: string,
    records: MigrationRecord[],
  ): Promise<number> {
    let deletedCount = 0;

    for (const record of records) {
      try {
        // Delete the entity based on type
        // This is a placeholder - actual implementation would delete
        // the corresponding Case, RIU, Person, etc.
        await this.deleteEntity(record.entityType, record.entityId);

        // Delete the migration record
        await this.prisma.migrationRecord.delete({
          where: { id: record.id },
        });

        deletedCount++;
      } catch (error) {
        this.logger.warn(
          `Error deleting ${record.entityType} ${record.entityId}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return deletedCount;
  }

  /**
   * Delete an entity by type and ID.
   * Placeholder implementation - would be replaced with actual deletion logic.
   */
  private async deleteEntity(
    entityType: string,
    entityId: string,
  ): Promise<void> {
    // Actual implementation would delete based on entity type
    this.logger.debug(`Would delete ${entityType} ${entityId}`);
  }

  // Job Status Updates

  /**
   * Mark a job as completed.
   * Called by import processor when import finishes successfully.
   *
   * @param jobId - Migration job ID
   * @param importedRows - Number of successfully imported rows
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
   * Mark a job as failed.
   * Called by import processor when import encounters an error.
   *
   * @param jobId - Migration job ID
   * @param error - Error message
   * @param details - Additional error details
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

    this.eventEmitter.emit("migration.failed", {
      jobId,
      error,
    });

    this.logger.error(`Import failed for job ${jobId}: ${error}`);
  }

  /**
   * Cancel an in-progress import.
   *
   * @param jobId - Migration job ID
   */
  async cancelImport(jobId: string): Promise<void> {
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.FAILED,
        currentStep: "Import cancelled by user",
        errorMessage: "Import cancelled by user",
      },
    });

    this.eventEmitter.emit("migration.cancelled", { jobId });

    this.logger.log(`Import cancelled for job ${jobId}`);
  }
}
