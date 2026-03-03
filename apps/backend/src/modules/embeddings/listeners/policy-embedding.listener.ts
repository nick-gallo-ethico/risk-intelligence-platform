import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { EmbeddingService } from "../services/embedding.service";
import { ChunkingService } from "../services/chunking.service";
import { VectorStoreService } from "../services/vector-store.service";
import { PolicyPublishedEvent } from "../../policies/events/policy.events";

/**
 * PolicyEmbeddingListener auto-embeds policy documents when published.
 *
 * On policy.published event:
 * 1. Load policy version content
 * 2. Chunk by section structure
 * 3. Generate embeddings
 * 4. Store in vector store (replaces previous version)
 *
 * This enables semantic search for policy Q&A in the chatbot.
 */
@Injectable()
export class PolicyEmbeddingListener {
  private readonly logger = new Logger(PolicyEmbeddingListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly chunkingService: ChunkingService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  /**
   * Handle policy.published event.
   *
   * Runs asynchronously to avoid blocking the publish operation.
   * Errors are logged but don't fail the publish.
   */
  @OnEvent(PolicyPublishedEvent.eventName, { async: true })
  async onPolicyPublished(event: PolicyPublishedEvent): Promise<void> {
    // Check if embedding service is ready
    if (!this.embeddingService.isReady()) {
      this.logger.warn(
        `Embedding service not ready, skipping policy ${event.policyId} embedding`,
      );
      return;
    }

    try {
      await this.embedPolicyVersion(event);
    } catch (error) {
      // Log error but don't propagate - embedding failure shouldn't block publish
      this.logger.error(
        `Failed to embed policy ${event.policyId} version ${event.version}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Embed a specific policy version.
   */
  private async embedPolicyVersion(event: PolicyPublishedEvent): Promise<void> {
    const startTime = Date.now();

    // Load policy version with content
    const policyVersion = await this.prisma.policyVersion.findUnique({
      where: { id: event.policyVersionId },
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    });

    if (!policyVersion) {
      this.logger.warn(`Policy version ${event.policyVersionId} not found`);
      return;
    }

    // Get the text content for embedding
    // Prefer plainText (extracted from HTML), fall back to content
    const content = policyVersion.plainText || policyVersion.content;

    if (!content || content.trim().length === 0) {
      this.logger.warn(
        `Policy version ${event.policyVersionId} has no content`,
      );
      return;
    }

    // Chunk by section structure
    const chunkingResult = await this.chunkingService.chunkPolicy(
      content,
      event.policyId,
      event.policyVersionId,
    );

    if (chunkingResult.chunks.length === 0) {
      this.logger.warn(`No chunks generated for policy ${event.policyId}`);
      return;
    }

    // Add policy metadata to chunks
    const enrichedChunks = chunkingResult.chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        policyTitle: policyVersion.policy.title,
        policyCategory: policyVersion.policy.category || undefined,
        policyVersion: event.version,
      },
    }));

    // Generate embeddings
    const embeddings = await this.embeddingService.embedBatch(
      enrichedChunks.map((c) => c.text),
      "document",
    );

    // Combine chunks with embeddings
    const embeddedChunks = enrichedChunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }));

    // Store in vector store
    // This replaces any existing embeddings for this policy version
    const result = await this.vectorStore.upsertChunks(
      event.organizationId,
      "POLICY_VERSION",
      event.policyVersionId,
      embeddedChunks,
      this.embeddingService.provider.name,
    );

    const duration = Date.now() - startTime;

    this.logger.log(
      `Embedded policy ${event.policyId} v${event.version}: ` +
        `${result.chunksInserted} chunks in ${duration}ms`,
    );
  }

  /**
   * Re-embed all published policy versions for an organization.
   * Useful after embedding model upgrade.
   */
  async reEmbedAllPolicies(organizationId: string): Promise<{
    total: number;
    succeeded: number;
    failed: number;
  }> {
    const policyVersions = await this.prisma.policyVersion.findMany({
      where: {
        organizationId,
        isLatest: true, // Only re-embed latest versions
      },
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    let succeeded = 0;
    let failed = 0;

    for (const pv of policyVersions) {
      // Skip retired policies
      if (pv.policy.status === "RETIRED") {
        continue;
      }

      try {
        await this.embedPolicyVersion({
          organizationId,
          actorUserId: null,
          actorType: "SYSTEM",
          timestamp: new Date(),
          policyId: pv.policy.id,
          policyVersionId: pv.id,
          version: pv.version,
        } as PolicyPublishedEvent);
        succeeded++;
      } catch (error) {
        this.logger.error(
          `Failed to re-embed policy ${pv.policy.id}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
        failed++;
      }
    }

    return { total: policyVersions.length, succeeded, failed };
  }
}
