import { Injectable, Logger } from "@nestjs/common";
import type { EmbeddingProvider } from "../providers/embedding-provider.interface";
import { VoyageProvider } from "../providers/voyage.provider";

/**
 * EmbeddingService abstracts embedding provider selection.
 *
 * Currently uses VoyageProvider, but can be extended to support
 * multiple providers based on configuration or tenant settings.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly voyageProvider: VoyageProvider) {}

  /**
   * Get the active embedding provider.
   * Future: Could select based on config or tenant preference.
   */
  get provider(): EmbeddingProvider {
    return this.voyageProvider;
  }

  /**
   * Check if embedding service is operational.
   */
  isReady(): boolean {
    return this.provider.isReady();
  }

  /**
   * Get embedding dimensions for the active provider.
   */
  get dimensions(): number {
    return this.provider.dimensions;
  }

  /**
   * Embed multiple texts, automatically batching if needed.
   *
   * @param texts - Array of texts to embed
   * @param inputType - 'query' for search queries, 'document' for documents
   * @returns Array of embedding vectors
   */
  async embedBatch(
    texts: string[],
    inputType: "query" | "document" = "document",
  ): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const maxBatch = this.provider.maxBatchSize;
    const results: number[][] = [];

    // Process in batches if needed
    for (let i = 0; i < texts.length; i += maxBatch) {
      const batch = texts.slice(i, i + maxBatch);
      const embeddings = await this.provider.embed(batch, inputType);
      results.push(...embeddings);
    }

    return results;
  }

  /**
   * Embed a single text.
   */
  async embedSingle(
    text: string,
    inputType: "query" | "document" = "document",
  ): Promise<number[]> {
    return this.provider.embedSingle(text, inputType);
  }

  /**
   * Embed a query for semantic search.
   * Uses 'query' input type for optimized search embeddings.
   */
  async embedQuery(query: string): Promise<number[]> {
    return this.embedSingle(query, "query");
  }
}
