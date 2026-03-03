/**
 * Represents a chunked document segment ready for embedding.
 */
export interface DocumentChunk {
  /** Sequential index within the source document */
  chunkIndex: number;

  /** Text content of the chunk */
  text: string;

  /** Metadata about the chunk's source and context */
  metadata: ChunkMetadata;
}

/**
 * Metadata attached to each document chunk.
 * Enables tracing chunks back to source content.
 */
export interface ChunkMetadata {
  /** Section title/header if available */
  sectionTitle?: string;

  /** Page number for PDF documents */
  pageNumber?: number;

  /** Parent document ID (policyId, caseId, etc.) */
  parentId?: string;

  /** Version ID for versioned content */
  versionId?: string;

  /** Activity type for case chunks */
  activityType?: string;

  /** Timestamp for time-ordered content */
  timestamp?: string;

  /** Character offset in original document */
  charOffset?: number;

  /** Additional custom metadata */
  [key: string]: string | number | undefined;
}

/**
 * Options for chunking operations.
 */
export interface ChunkingOptions {
  /** Target chunk size in characters (default: 1500 ~400 tokens) */
  chunkSize?: number;

  /** Overlap between chunks in characters (default: 150 ~10%) */
  chunkOverlap?: number;

  /** Minimum chunk size to keep (default: 100) */
  minChunkSize?: number;
}

/**
 * Result of a chunking operation.
 */
export interface ChunkingResult {
  /** Generated chunks */
  chunks: DocumentChunk[];

  /** Total character count of source */
  sourceCharCount: number;

  /** Number of chunks created */
  chunkCount: number;

  /** Strategy used for chunking */
  strategy: "section" | "recursive" | "activity" | "passage";
}
