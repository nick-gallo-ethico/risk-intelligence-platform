import { ChunkMetadata } from "./chunk.dto";

/**
 * Result from semantic search operation.
 * Includes distance and similarity scores for ranking.
 */
export interface SemanticSearchResult {
  /** Unique identifier of the embedding record */
  id: string;

  /** Source entity type (POLICY_VERSION, KNOWLEDGE_BASE, etc.) */
  sourceType: string;

  /** Source entity ID */
  sourceId: string;

  /** Chunk index within the source document */
  chunkIndex: number;

  /** Text content of the matched chunk */
  text: string;

  /** Metadata about the chunk's source and context */
  metadata: ChunkMetadata;

  /** Cosine distance (0 = identical, 2 = opposite) */
  distance: number;

  /** Similarity score (1 = identical, 0 = orthogonal) */
  similarity: number;
}

/**
 * Options for semantic search queries.
 */
export interface SemanticSearchOptions {
  /** Maximum number of results (default: 10) */
  limit?: number;

  /** Minimum similarity threshold (0-1, filters low-quality matches) */
  minSimilarity?: number;

  /** Filter to specific source types */
  sourceTypes?: string[];

  /** Filter to specific source IDs */
  sourceIds?: string[];
}

/**
 * A chunk with its computed embedding vector.
 * Used for upsert operations.
 */
export interface EmbeddedChunk {
  /** Chunk index within the source document */
  chunkIndex: number;

  /** Text content of the chunk */
  text: string;

  /** Metadata about the chunk */
  metadata: ChunkMetadata;

  /** Embedding vector (1024 dimensions for voyage-3) */
  embedding: number[];
}

/**
 * Result of an upsert operation.
 */
export interface UpsertResult {
  /** Source entity type */
  sourceType: string;

  /** Source entity ID */
  sourceId: string;

  /** Number of chunks inserted */
  chunksInserted: number;

  /** Number of existing chunks deleted (for atomic replacement) */
  chunksDeleted: number;
}
