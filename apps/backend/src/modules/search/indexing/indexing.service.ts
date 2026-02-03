import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { OnEvent } from "@nestjs/event-emitter";
import { INDEXING_QUEUE_NAME } from "../../jobs/queues/indexing.queue";
import { IndexingJobData } from "../../jobs/types/job-data.types";
import { CASE_INDEX_MAPPING, CaseDocument, RIU_INDEX_MAPPING } from "./index-mappings";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * IndexingService manages Elasticsearch indices and document indexing.
 *
 * Key responsibilities:
 * - Per-tenant index naming (org_{organizationId}_{entityType})
 * - Index creation with correct mappings
 * - Document indexing via job queue (async)
 * - Direct document indexing (called by job processor)
 *
 * Per CONTEXT.md:
 * - Index structure: org_{tenantId}_cases, org_{tenantId}_rius
 * - Async queue: DB Write -> Event -> Index job -> ES updated (2-5s)
 */
@Injectable()
export class IndexingService implements OnModuleInit {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    private readonly esService: ElasticsearchService,
    @InjectQueue(INDEXING_QUEUE_NAME) private readonly indexingQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Verify ES connection on startup
    try {
      const health = await this.esService.cluster.health({});
      this.logger.log(`Elasticsearch cluster status: ${health.status}`);
    } catch (error) {
      this.logger.warn(
        `Elasticsearch not available: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get index name for a tenant and entity type.
   * Per CONTEXT.md: org_{tenantId}_cases, org_{tenantId}_rius, etc.
   */
  getIndexName(organizationId: string, entityType: string): string {
    return `org_${organizationId}_${entityType}`.toLowerCase();
  }

  /**
   * Ensure index exists with correct mapping.
   * Creates the index if it doesn't exist.
   */
  async ensureIndex(
    organizationId: string,
    entityType: string,
  ): Promise<void> {
    const indexName = this.getIndexName(organizationId, entityType);

    try {
      const exists = await this.esService.indices.exists({ index: indexName });

      if (!exists) {
        const mapping = this.getMappingForType(entityType);
        await this.esService.indices.create({
          index: indexName,
          ...mapping,
        });
        this.logger.log(`Created index: ${indexName}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to ensure index ${indexName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Queue a document for indexing (async).
   * Used by event handlers to trigger background indexing.
   */
  async queueIndex(params: {
    organizationId: string;
    entityType: string;
    entityId: string;
    operation: "create" | "update" | "delete" | "reindex";
  }): Promise<void> {
    const jobData: IndexingJobData = {
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      operation: params.operation,
    };

    // Include orgId in job ID to prevent tenant collision
    await this.indexingQueue.add("index-entity", jobData, {
      jobId: `${params.organizationId}:${params.entityType}:${params.entityId}:${Date.now()}`,
    });

    this.logger.debug(
      `Queued ${params.operation} for ${params.entityType}:${params.entityId}`,
    );
  }

  /**
   * Index a document directly.
   * Called by the job processor after loading entity data.
   */
  async indexDocument(
    organizationId: string,
    entityType: string,
    entityId: string,
    document: Record<string, unknown>,
  ): Promise<void> {
    await this.ensureIndex(organizationId, entityType);
    const indexName = this.getIndexName(organizationId, entityType);

    await this.esService.index({
      index: indexName,
      id: entityId,
      document,
      refresh: false, // Don't wait for refresh (eventual consistency)
    });

    this.logger.debug(`Indexed ${entityType}:${entityId} to ${indexName}`);
  }

  /**
   * Delete a document from index.
   */
  async deleteDocument(
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    const indexName = this.getIndexName(organizationId, entityType);

    try {
      await this.esService.delete({
        index: indexName,
        id: entityId,
        refresh: false,
      });
      this.logger.debug(`Deleted ${entityType}:${entityId} from ${indexName}`);
    } catch (error) {
      // Ignore 404 - document already gone
      if (
        error &&
        typeof error === "object" &&
        "meta" in error &&
        (error as { meta?: { statusCode?: number } }).meta?.statusCode !== 404
      ) {
        throw error;
      }
    }
  }

  /**
   * Bulk index multiple documents.
   * Useful for initial indexing or reindexing.
   */
  async bulkIndex(
    organizationId: string,
    entityType: string,
    documents: Array<{ id: string; document: Record<string, unknown> }>,
  ): Promise<void> {
    if (documents.length === 0) return;

    await this.ensureIndex(organizationId, entityType);
    const indexName = this.getIndexName(organizationId, entityType);

    const operations = documents.flatMap((doc) => [
      { index: { _index: indexName, _id: doc.id } },
      doc.document,
    ]);

    const response = await this.esService.bulk({
      operations,
      refresh: false,
    });

    if (response.errors) {
      const errorItems = response.items.filter((item) => item.index?.error);
      this.logger.error(
        `Bulk index errors: ${JSON.stringify(errorItems.slice(0, 3))}`,
      );
    }

    this.logger.log(
      `Bulk indexed ${documents.length} documents to ${indexName}`,
    );
  }

  /**
   * Delete an entire index (for tenant cleanup).
   */
  async deleteIndex(
    organizationId: string,
    entityType: string,
  ): Promise<void> {
    const indexName = this.getIndexName(organizationId, entityType);

    try {
      const exists = await this.esService.indices.exists({ index: indexName });
      if (exists) {
        await this.esService.indices.delete({ index: indexName });
        this.logger.log(`Deleted index: ${indexName}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete index ${indexName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get mapping configuration for entity type.
   */
  private getMappingForType(
    entityType: string,
  ): Record<string, unknown> {
    switch (entityType.toLowerCase()) {
      case "cases":
        return CASE_INDEX_MAPPING;
      case "rius":
        return RIU_INDEX_MAPPING;
      default:
        // Return minimal mapping for unknown types
        return {
          mappings: { dynamic: true },
          settings: { number_of_shards: 1, number_of_replicas: 0 },
        };
    }
  }

  // ===========================================
  // CASE INDEXING WITH ASSOCIATIONS
  // ===========================================

  /**
   * Build association data for a Case document.
   *
   * Gathers all Person-Case, RIU-Case, and Case-Case associations
   * and formats them for Elasticsearch indexing.
   *
   * Per CONTEXT.md: "Association search is a wow moment in demos."
   * Pre-indexing associations enables sub-second pattern detection queries.
   */
  private async buildCaseAssociations(
    caseId: string,
    organizationId: string,
  ): Promise<CaseDocument["associations"]> {
    // Get person-case associations
    const personAssocs = await this.prisma.personCaseAssociation.findMany({
      where: { caseId, organizationId },
      include: { person: true },
    });

    // Get RIU associations
    const riuAssocs = await this.prisma.riuCaseAssociation.findMany({
      where: { caseId },
      include: { riu: true },
    });

    // Get case-case associations (both directions)
    const caseAssocs = await this.prisma.caseCaseAssociation.findMany({
      where: {
        organizationId,
        OR: [{ sourceCaseId: caseId }, { targetCaseId: caseId }],
      },
      include: { sourceCase: true, targetCase: true },
    });

    return {
      persons: personAssocs.map((a) => ({
        personId: a.personId,
        personName: a.person
          ? `${a.person.firstName || ""} ${a.person.lastName || ""}`.trim()
          : "",
        personEmail: a.person?.email || undefined,
        label: a.label,
        evidentiaryStatus: a.evidentiaryStatus || undefined,
        isActive: !a.endedAt,
      })),
      rius: riuAssocs.map((a) => ({
        riuId: a.riuId,
        riuReferenceNumber: a.riu.referenceNumber,
        associationType: a.associationType,
        riuType: a.riu.type,
      })),
      linkedCases: caseAssocs.map((a) => {
        const isSource = a.sourceCaseId === caseId;
        const linked = isSource ? a.targetCase : a.sourceCase;
        return {
          caseId: linked.id,
          caseReferenceNumber: linked.referenceNumber,
          label: a.label,
        };
      }),
    };
  }

  /**
   * Index a Case with all its associations.
   *
   * This method loads the Case entity and its associations,
   * builds a complete CaseDocument, and indexes it to Elasticsearch.
   *
   * Called by:
   * - Case creation/update handlers
   * - Association change event handlers (to re-index when associations change)
   */
  async indexCase(caseId: string, organizationId: string): Promise<void> {
    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        primaryCategory: true,
        secondaryCategory: true,
        createdBy: true,
        intakeOperator: true,
      },
    });

    if (!caseData) {
      this.logger.warn(`Case ${caseId} not found for indexing`);
      return;
    }

    // Build associations
    const associations = await this.buildCaseAssociations(caseId, organizationId);

    // Get assignee from personAssociations if exists
    const assignedInvestigator = associations.persons.find(
      (p) => p.label === "ASSIGNED_INVESTIGATOR" && p.isActive,
    );

    // Build complete CaseDocument
    const document: CaseDocument = {
      id: caseData.id,
      organizationId: caseData.organizationId,
      referenceNumber: caseData.referenceNumber,
      status: caseData.status,
      severity: caseData.severity || "MEDIUM",
      caseType: caseData.caseType,
      categoryId: caseData.primaryCategoryId || undefined,
      categoryName: caseData.primaryCategory?.name || undefined,
      primaryCategoryId: caseData.primaryCategoryId || undefined,
      primaryCategoryName: caseData.primaryCategory?.name || undefined,
      secondaryCategoryId: caseData.secondaryCategoryId || undefined,
      pipelineStage: caseData.pipelineStage || undefined,
      outcome: caseData.outcome || undefined,
      details: caseData.details,
      summary: caseData.summary || undefined,
      aiSummary: caseData.aiSummary || undefined,
      reporterType: caseData.reporterType,
      reporterRelationship: caseData.reporterRelationship || undefined,
      sourceChannel: caseData.sourceChannel,
      // Assignee comes from person-case associations (ASSIGNED_INVESTIGATOR)
      assigneeId: assignedInvestigator?.personId || undefined,
      assigneeName: assignedInvestigator?.personName || undefined,
      intakeOperatorId: caseData.intakeOperatorId || undefined,
      // Location fields are denormalized on Case
      locationName: caseData.locationName || undefined,
      locationCity: caseData.locationCity || undefined,
      locationState: caseData.locationState || undefined,
      locationCountry: caseData.locationCountry || undefined,
      locationAddress: caseData.locationAddress || undefined,
      createdById: caseData.createdById,
      createdByName: caseData.createdBy
        ? `${caseData.createdBy.firstName || ""} ${caseData.createdBy.lastName || ""}`.trim()
        : undefined,
      createdAt: caseData.createdAt.toISOString(),
      updatedAt: caseData.updatedAt.toISOString(),
      intakeTimestamp: caseData.intakeTimestamp.toISOString(),
      releasedAt: caseData.releasedAt?.toISOString() || undefined,
      associations,
      // Flattened arrays for faceting
      personIds: associations.persons.map((p) => p.personId),
      subjectPersonIds: associations.persons
        .filter((p) => p.label === "SUBJECT")
        .map((p) => p.personId),
      witnessPersonIds: associations.persons
        .filter((p) => p.label === "WITNESS")
        .map((p) => p.personId),
      reporterPersonIds: associations.persons
        .filter((p) => p.label === "REPORTER")
        .map((p) => p.personId),
      investigatorPersonIds: associations.persons
        .filter((p) => p.label === "ASSIGNED_INVESTIGATOR")
        .map((p) => p.personId),
    };

    // Index the document
    await this.indexDocument(
      organizationId,
      "cases",
      caseId,
      document as unknown as Record<string, unknown>,
    );

    this.logger.debug(
      `Indexed case ${caseData.referenceNumber} with ${associations.persons.length} person associations`,
    );
  }

  // ===========================================
  // ASSOCIATION CHANGE EVENT HANDLERS
  // ===========================================

  /**
   * Re-index Case when a person-case association is created.
   */
  @OnEvent("association.person-case.created")
  async handlePersonCaseCreated(payload: {
    caseId: string;
    organizationId: string;
  }) {
    await this.queueIndex({
      organizationId: payload.organizationId,
      entityType: "cases",
      entityId: payload.caseId,
      operation: "update",
    });
  }

  /**
   * Re-index Case when a person-case association status changes.
   */
  @OnEvent("association.person-case.status-changed")
  async handlePersonCaseStatusChanged(payload: {
    caseId: string;
    organizationId: string;
  }) {
    await this.queueIndex({
      organizationId: payload.organizationId,
      entityType: "cases",
      entityId: payload.caseId,
      operation: "update",
    });
  }

  /**
   * Re-index Case when a person-case association ends.
   */
  @OnEvent("association.person-case.ended")
  async handlePersonCaseEnded(payload: {
    caseId: string;
    organizationId: string;
  }) {
    await this.queueIndex({
      organizationId: payload.organizationId,
      entityType: "cases",
      entityId: payload.caseId,
      operation: "update",
    });
  }

  /**
   * Re-index Case when an RIU-case association is created.
   */
  @OnEvent("association.riu-case.created")
  async handleRiuCaseCreated(payload: {
    caseId: string;
    organizationId: string;
  }) {
    await this.queueIndex({
      organizationId: payload.organizationId,
      entityType: "cases",
      entityId: payload.caseId,
      operation: "update",
    });
  }

  /**
   * Re-index both Cases when a case-case association is created.
   */
  @OnEvent("association.case-case.created")
  async handleCaseCaseCreated(payload: {
    sourceCaseId: string;
    targetCaseId: string;
    organizationId: string;
  }) {
    // Re-index both cases involved in the association
    await Promise.all([
      this.queueIndex({
        organizationId: payload.organizationId,
        entityType: "cases",
        entityId: payload.sourceCaseId,
        operation: "update",
      }),
      this.queueIndex({
        organizationId: payload.organizationId,
        entityType: "cases",
        entityId: payload.targetCaseId,
        operation: "update",
      }),
    ]);
  }
}
