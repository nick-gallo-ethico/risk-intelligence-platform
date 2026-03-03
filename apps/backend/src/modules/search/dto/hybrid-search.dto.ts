import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Source types available for hybrid search.
 * Maps to both ES index names and pgvector source types.
 */
export enum HybridSearchSourceType {
  POLICY = "POLICY",
  KNOWLEDGE_BASE = "KNOWLEDGE_BASE",
  CASE = "CASE",
  ALL = "ALL",
}

/**
 * Indicates which search method(s) found a result.
 * - keyword: Found only via Elasticsearch keyword search
 * - semantic: Found only via pgvector semantic search
 * - both: Found by both methods (higher confidence)
 */
export type SearchMethod = "keyword" | "semantic" | "both";

/**
 * Request DTO for hybrid search operations.
 */
export class HybridSearchRequestDto {
  @ApiProperty({
    description: "The search query text",
    example: "whistleblower protection policy",
  })
  @IsString()
  query!: string;

  @ApiPropertyOptional({
    description: "Source types to search",
    enum: HybridSearchSourceType,
    isArray: true,
    default: [HybridSearchSourceType.ALL],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(HybridSearchSourceType, { each: true })
  sourceTypes?: HybridSearchSourceType[];

  @ApiPropertyOptional({
    description: "Maximum number of results to return",
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description:
      "Minimum score threshold (0-1). Results below this score are filtered out.",
    default: 0.1,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;

  @ApiPropertyOptional({
    description:
      "Weight for keyword search results in RRF (0-1). Higher = more keyword influence.",
    default: 0.5,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  keywordWeight?: number;

  @ApiPropertyOptional({
    description:
      "Weight for semantic search results in RRF (0-1). Higher = more semantic influence.",
    default: 0.5,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  semanticWeight?: number;
}

/**
 * A single hybrid search result.
 * Combines data from both ES and pgvector sources.
 */
export interface HybridSearchResult {
  /** Unique identifier (ES doc ID or embedding source ID) */
  id: string;

  /** Source type (POLICY, KNOWLEDGE_BASE, CASE) */
  sourceType: HybridSearchSourceType;

  /** Original source document ID (e.g., policyId, knowledgeBaseDocId) */
  sourceId: string;

  /** Title of the document (policy title, KB doc title, case reference) */
  title: string;

  /** Matched text content or snippet */
  text: string;

  /** Combined RRF score (higher = more relevant) */
  score: number;

  /** Which search method(s) found this result */
  method: SearchMethod;

  /** Additional metadata from the source */
  metadata: HybridSearchResultMetadata;
}

/**
 * Metadata attached to hybrid search results.
 * Contains source-specific context for display and linking.
 */
export interface HybridSearchResultMetadata {
  /** For policies: version number */
  version?: number;

  /** For policies: category name */
  categoryName?: string;

  /** For policies: status (DRAFT, PUBLISHED, RETIRED) */
  status?: string;

  /** For knowledge base: document type (PDF, DOC, etc.) */
  documentType?: string;

  /** For knowledge base: file name */
  fileName?: string;

  /** For cases: case status */
  caseStatus?: string;

  /** For cases: severity */
  severity?: string;

  /** Chunk index if from semantic search */
  chunkIndex?: number;

  /** Highlights from keyword search */
  highlights?: Record<string, string[]>;

  /** Similarity score from semantic search (0-1) */
  semanticSimilarity?: number;

  /** ES score from keyword search */
  keywordScore?: number;
}

/**
 * Response DTO for hybrid search operations.
 */
export interface HybridSearchResponse {
  /** List of hybrid search results, sorted by score */
  results: HybridSearchResult[];

  /** Total number of results found (before limit) */
  total: number;

  /** Time taken to execute search in milliseconds */
  took: number;

  /** The original query */
  query: string;

  /** Count of results by method */
  methodCounts: {
    keyword: number;
    semantic: number;
    both: number;
  };

  /** Whether semantic search was available */
  semanticSearchEnabled: boolean;
}
