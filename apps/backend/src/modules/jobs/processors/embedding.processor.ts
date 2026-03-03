import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger, Injectable } from "@nestjs/common";
import { Job } from "bullmq";
import { KnowledgeBaseService } from "../../embeddings/services/knowledge-base.service";

interface EmbeddingJobData {
  documentId: string;
  organizationId: string;
}

const EMBEDDING_QUEUE_NAME = "embedding";

/**
 * EmbeddingProcessor consumes embedding queue jobs and triggers
 * document processing via KnowledgeBaseService.
 *
 * Jobs are added to this queue when:
 * - A knowledge base document is uploaded
 * - A document is re-embedded (model upgrade, manual re-trigger)
 *
 * Configuration:
 * - 3 retry attempts with exponential backoff (5s base)
 * - Job ID: kb-embed-{documentId} for deduplication
 */
@Injectable()
@Processor(EMBEDDING_QUEUE_NAME)
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {
    super();
  }

  async process(job: Job<EmbeddingJobData>): Promise<void> {
    const { documentId, organizationId } = job.data;

    this.logger.log(
      `Processing embedding job ${job.id} for document ${documentId}`,
    );

    try {
      await this.knowledgeBaseService.processEmbedding(
        documentId,
        organizationId,
      );

      this.logger.log(`Completed embedding job ${job.id}`);
    } catch (error) {
      this.logger.error(
        `Embedding job ${job.id} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error; // Re-throw to trigger BullMQ retry
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Embedding job ${job.id} failed permanently after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job): void {
    this.logger.debug(`Embedding job ${job.id} completed successfully`);
  }
}
