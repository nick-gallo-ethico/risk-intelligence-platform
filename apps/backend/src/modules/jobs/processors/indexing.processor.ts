import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Inject, Logger, forwardRef } from "@nestjs/common";
import { Job } from "bullmq";
import { INDEXING_QUEUE_NAME } from "../queues/indexing.queue";
import { IndexingJobData } from "../types/job-data.types";
import { PrismaService } from "../../prisma/prisma.service";
import { IndexingService } from "../../search/indexing/indexing.service";

/**
 * Search Indexing Queue Worker
 *
 * Handles Elasticsearch indexing operations:
 * - create: Index new document
 * - update: Update existing document
 * - delete: Remove document from index
 * - reindex: Full reindex of entity
 *
 * Loads entity from database, transforms to search document, indexes to ES.
 */
@Processor(INDEXING_QUEUE_NAME, { concurrency: 20 })
export class IndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(IndexingProcessor.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => IndexingService))
    private indexingService: IndexingService,
  ) {
    super();
  }

  async process(job: Job<IndexingJobData>): Promise<void> {
    this.logger.log(
      `Processing indexing job ${job.id}: ${job.data.operation} ${job.data.entityType}:${job.data.entityId} for org:${job.data.organizationId}`,
    );

    switch (job.data.operation) {
      case "create":
      case "update":
      case "reindex":
        await this.indexEntity(job.data);
        break;
      case "delete":
        await this.deleteEntity(job.data);
        break;
    }
  }

  private async indexEntity(data: IndexingJobData): Promise<void> {
    // Load entity from database
    const entity = await this.loadEntity(data.entityType, data.entityId);

    if (!entity) {
      this.logger.warn(
        `Entity not found for indexing: ${data.entityType}:${data.entityId}`,
      );
      return;
    }

    // Transform to search document
    const document = this.transformToDocument(data.entityType, entity);

    // Index the document
    await this.indexingService.indexDocument(
      data.organizationId,
      data.entityType,
      data.entityId,
      document,
    );
  }

  private async deleteEntity(data: IndexingJobData): Promise<void> {
    await this.indexingService.deleteDocument(
      data.organizationId,
      data.entityType,
      data.entityId,
    );
  }

  /**
   * Load entity from database based on type
   */
  private async loadEntity(
    entityType: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    switch (entityType.toLowerCase()) {
      case "cases":
        return this.loadCase(entityId);
      case "rius":
        return this.loadRiu(entityId);
      default:
        this.logger.warn(`Unknown entity type for indexing: ${entityType}`);
        return null;
    }
  }

  private async loadCase(id: string): Promise<Record<string, unknown> | null> {
    const caseEntity = await this.prisma.case.findUnique({
      where: { id },
      include: {
        primaryCategory: { select: { id: true, name: true } },
        secondaryCategory: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        intakeOperator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!caseEntity) return null;

    return caseEntity as unknown as Record<string, unknown>;
  }

  private async loadRiu(id: string): Promise<Record<string, unknown> | null> {
    const riu = await this.prisma.riskIntelligenceUnit.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!riu) return null;

    return riu as unknown as Record<string, unknown>;
  }

  /**
   * Transform entity to search document format
   */
  private transformToDocument(
    entityType: string,
    entity: Record<string, unknown>,
  ): Record<string, unknown> {
    switch (entityType.toLowerCase()) {
      case "cases":
        return this.transformCase(entity);
      case "rius":
        return this.transformRiu(entity);
      default:
        return entity;
    }
  }

  private transformCase(entity: Record<string, unknown>): Record<string, unknown> {
    const primaryCategory = entity.primaryCategory as {
      id: string;
      name: string;
    } | null;
    const createdBy = entity.createdBy as {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    const intakeOperator = entity.intakeOperator as {
      id: string;
      firstName: string;
      lastName: string;
    } | null;

    return {
      id: entity.id,
      referenceNumber: entity.referenceNumber,
      status: entity.status,
      severity: entity.severity,
      caseType: entity.caseType,
      categoryId: primaryCategory?.id,
      categoryName: primaryCategory?.name,
      primaryCategoryId: entity.primaryCategoryId,
      secondaryCategoryId: entity.secondaryCategoryId,
      details: entity.details,
      summary: entity.summary,
      aiSummary: entity.aiSummary,
      addendum: entity.addendum,
      reporterType: entity.reporterType,
      reporterRelationship: entity.reporterRelationship,
      locationName: entity.locationName,
      locationCity: entity.locationCity,
      locationState: entity.locationState,
      locationCountry: entity.locationCountry,
      locationAddress: entity.locationAddress,
      sourceChannel: entity.sourceChannel,
      intakeOperatorId: intakeOperator?.id,
      tags: entity.tags,
      createdById: createdBy?.id,
      createdByName: createdBy
        ? `${createdBy.firstName} ${createdBy.lastName}`
        : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      intakeTimestamp: entity.intakeTimestamp,
      releasedAt: entity.releasedAt,
    };
  }

  private transformRiu(entity: Record<string, unknown>): Record<string, unknown> {
    const category = entity.category as { id: string; name: string } | null;
    const createdBy = entity.createdBy as {
      id: string;
      firstName: string;
      lastName: string;
    } | null;

    return {
      id: entity.id,
      referenceNumber: entity.referenceNumber,
      type: entity.type,
      sourceChannel: entity.sourceChannel,
      status: entity.status,
      categoryId: category?.id,
      categoryName: category?.name,
      severity: entity.severity,
      details: entity.details,
      summary: entity.summary,
      aiSummary: entity.aiSummary,
      aiTranslation: entity.aiTranslation,
      reporterType: entity.reporterType,
      locationName: entity.locationName,
      locationCity: entity.locationCity,
      locationState: entity.locationState,
      locationCountry: entity.locationCountry,
      locationAddress: entity.locationAddress,
      campaignId: entity.campaignId,
      aiRiskScore: entity.aiRiskScore,
      aiLanguageDetected: entity.aiLanguageDetected,
      aiConfidenceScore: entity.aiConfidenceScore,
      createdById: createdBy?.id,
      createdByName: createdBy
        ? `${createdBy.firstName} ${createdBy.lastName}`
        : null,
      createdAt: entity.createdAt,
    };
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<IndexingJobData>) {
    this.logger.log(`Indexing job ${job.id} completed successfully`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<IndexingJobData>, error: Error) {
    this.logger.error(
      `Indexing job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
