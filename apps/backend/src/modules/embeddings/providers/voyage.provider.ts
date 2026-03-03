import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { VoyageAIClient } from "voyageai";
import type { EmbeddingProvider } from "./embedding-provider.interface";
import type { EmbeddingConfig } from "../../../config/embedding.config";

/**
 * VoyageProvider implements EmbeddingProvider using Voyage AI.
 *
 * Voyage-3 provides high-quality embeddings with 1024 dimensions.
 * Supports batch embedding up to 128 texts per request.
 */
@Injectable()
export class VoyageProvider implements EmbeddingProvider, OnModuleInit {
  private readonly logger = new Logger(VoyageProvider.name);
  private client: VoyageAIClient | null = null;

  readonly name = "voyage";
  readonly dimensions: number;
  readonly maxTokens = 32000;
  readonly maxBatchSize: number;

  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const config =
      this.configService.get<EmbeddingConfig["voyage"]>("embedding.voyage");
    this.dimensions = config?.dimensions || 1024;
    this.maxBatchSize = config?.maxBatchSize || 128;
    this.model = config?.model || "voyage-3";
  }

  async onModuleInit(): Promise<void> {
    const apiKey = this.configService.get<string>("embedding.voyage.apiKey");

    if (!apiKey) {
      this.logger.warn(
        "VOYAGE_API_KEY not configured - embedding provider disabled",
      );
      return;
    }

    try {
      this.client = new VoyageAIClient({ apiKey });
      this.logger.log(
        `Voyage AI provider initialized with model: ${this.model}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize Voyage AI: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  isReady(): boolean {
    return this.client !== null;
  }

  async embed(
    texts: string[],
    inputType?: "query" | "document",
  ): Promise<number[][]> {
    if (!this.client) {
      throw new Error(
        "Voyage AI client not initialized - check VOYAGE_API_KEY",
      );
    }

    if (texts.length === 0) {
      return [];
    }

    if (texts.length > this.maxBatchSize) {
      throw new Error(
        `Batch size ${texts.length} exceeds maximum ${this.maxBatchSize}`,
      );
    }

    try {
      const response = await this.client.embed({
        model: this.model,
        input: texts,
        inputType: inputType,
      });

      // Extract embeddings from response data array
      const embeddings: number[][] = [];
      if (response.data) {
        // Sort by index to ensure order matches input
        const sortedData = [...response.data].sort(
          (a, b) => (a.index ?? 0) - (b.index ?? 0),
        );
        for (const item of sortedData) {
          if (item.embedding) {
            embeddings.push(item.embedding);
          }
        }
      }

      // Validate response dimensions match expected
      if (
        embeddings.length > 0 &&
        embeddings[0].length !== this.dimensions
      ) {
        this.logger.warn(
          `Embedding dimensions mismatch: expected ${this.dimensions}, got ${embeddings[0].length}`,
        );
      }

      return embeddings;
    } catch (error) {
      this.logger.error(
        `Voyage AI embed failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  async embedSingle(
    text: string,
    inputType?: "query" | "document",
  ): Promise<number[]> {
    const results = await this.embed([text], inputType);
    return results[0];
  }
}
