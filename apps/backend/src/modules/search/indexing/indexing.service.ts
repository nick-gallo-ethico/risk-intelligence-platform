import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { INDEXING_QUEUE_NAME } from "../../jobs/queues/indexing.queue";
import { IndexingJobData } from "../../jobs/types/job-data.types";
import { CASE_INDEX_MAPPING, RIU_INDEX_MAPPING } from "./index-mappings";

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
}
