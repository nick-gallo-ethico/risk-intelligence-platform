/**
 * EmbeddingProvider Interface
 *
 * Abstraction layer for embedding providers, matching the existing AIProvider pattern.
 * Enables swapping providers (Voyage, OpenAI, Azure) without changing calling code.
 */
export interface EmbeddingProvider {
  /** Provider identifier (e.g., 'voyage', 'openai') */
  readonly name: string;

  /** Embedding dimensions (e.g., 1024 for voyage-3) */
  readonly dimensions: number;

  /** Maximum tokens per text input */
  readonly maxTokens: number;

  /** Maximum batch size for embed() calls */
  readonly maxBatchSize: number;

  /**
   * Check if the provider is properly configured and ready.
   * Returns false if required configuration (e.g., API key) is missing.
   */
  isReady(): boolean;

  /**
   * Generate embeddings for multiple texts.
   *
   * @param texts - Array of text strings to embed (max: maxBatchSize)
   * @param inputType - Optional hint for embedding optimization
   * @returns Array of embedding vectors (same order as input texts)
   */
  embed(texts: string[], inputType?: "query" | "document"): Promise<number[][]>;

  /**
   * Generate embedding for a single text.
   * Convenience method wrapping embed().
   */
  embedSingle(
    text: string,
    inputType?: "query" | "document",
  ): Promise<number[]>;
}
