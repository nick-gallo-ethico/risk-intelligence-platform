import { Injectable, Logger } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import type {
  SearchResponse,
  SearchHit,
} from "@elastic/elasticsearch/lib/api/types";
import { IndexingService } from "./indexing/indexing.service";
import { EmbeddingService, VectorStoreService } from "../embeddings";
import { SemanticSearchResult } from "../embeddings/dto/search.dto";
import {
  HybridSearchSourceType,
  HybridSearchRequestDto,
  HybridSearchResult,
  HybridSearchResponse,
  SearchMethod,
  HybridSearchResultMetadata,
} from "./dto/hybrid-search.dto";

/**
 * Intermediate result from keyword search before RRF fusion.
 */
interface KeywordSearchResult {
  id: string;
  sourceType: HybridSearchSourceType;
  sourceId: string;
  title: string;
  text: string;
  score: number;
  rank: number;
  metadata: HybridSearchResultMetadata;
}

/**
 * Intermediate result from semantic search before RRF fusion.
 */
interface SemanticSearchResultIntermediate {
  id: string;
  sourceType: HybridSearchSourceType;
  sourceId: string;
  title: string;
  text: string;
  similarity: number;
  rank: number;
  metadata: HybridSearchResultMetadata;
}

/**
 * Combined result during RRF fusion.
 */
interface FusionCandidate {
  id: string;
  sourceType: HybridSearchSourceType;
  sourceId: string;
  title: string;
  text: string;
  keywordRank?: number;
  semanticRank?: number;
  keywordScore?: number;
  semanticSimilarity?: number;
  rrfScore: number;
  method: SearchMethod;
  metadata: HybridSearchResultMetadata;
}

/**
 * HybridSearchService combines Elasticsearch keyword search with
 * pgvector semantic search using Reciprocal Rank Fusion (RRF).
 *
 * RRF merges results from both search methods by:
 * 1. Ranking results from each method
 * 2. Computing RRF score: weight / (k + rank + 1)
 * 3. Combining scores when results appear in both lists
 * 4. Sorting by combined RRF score
 *
 * This provides the best of both worlds:
 * - Exact keyword matches (reference numbers, specific terms)
 * - Semantic understanding (conceptual queries, synonyms)
 */
@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name);

  /**
   * RRF K constant. Standard value is 60.
   * Higher K = more smoothing between ranks.
   */
  private readonly RRF_K = 60;

  constructor(
    private readonly esService: ElasticsearchService,
    private readonly indexingService: IndexingService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  /**
   * Execute hybrid search combining keyword and semantic search.
   *
   * @param organizationId - Tenant ID for data isolation
   * @param request - Search request parameters
   * @returns Combined and ranked search results
   */
  async search(
    organizationId: string,
    request: HybridSearchRequestDto,
  ): Promise<HybridSearchResponse> {
    const startTime = Date.now();
    const limit = request.limit ?? 10;
    const minScore = request.minScore ?? 0.1;
    const keywordWeight = request.keywordWeight ?? 0.5;
    const semanticWeight = request.semanticWeight ?? 0.5;

    // Determine source types to search
    const sourceTypes = this.normalizeSourceTypes(request.sourceTypes);

    // Run keyword and semantic searches in parallel
    const [keywordResults, semanticResults] = await Promise.all([
      this.executeKeywordSearch(
        organizationId,
        request.query,
        sourceTypes,
        limit * 2,
      ),
      this.executeSemanticSearch(
        organizationId,
        request.query,
        sourceTypes,
        limit * 2,
      ),
    ]);

    // Fuse results using RRF
    const fusedResults = this.reciprocalRankFusion(
      keywordResults,
      semanticResults,
      keywordWeight,
      semanticWeight,
    );

    // Filter by minimum score and limit
    const filteredResults = fusedResults
      .filter((r) => r.rrfScore >= minScore)
      .slice(0, limit);

    // Transform to response format
    const results: HybridSearchResult[] = filteredResults.map((r) => ({
      id: r.id,
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      title: r.title,
      text: r.text,
      score: r.rrfScore,
      method: r.method,
      metadata: {
        ...r.metadata,
        keywordScore: r.keywordScore,
        semanticSimilarity: r.semanticSimilarity,
      },
    }));

    // Count results by method
    const methodCounts = {
      keyword: results.filter((r) => r.method === "keyword").length,
      semantic: results.filter((r) => r.method === "semantic").length,
      both: results.filter((r) => r.method === "both").length,
    };

    const took = Date.now() - startTime;
    this.logger.debug(
      `Hybrid search completed in ${took}ms: ${keywordResults.length} keyword + ${semanticResults.length} semantic = ${results.length} results`,
    );

    return {
      results,
      total: fusedResults.length,
      took,
      query: request.query,
      methodCounts,
      semanticSearchEnabled: this.embeddingService.isReady(),
    };
  }

  /**
   * Normalize source types from request to concrete types.
   * If ALL is specified, expand to all searchable types.
   */
  private normalizeSourceTypes(
    sourceTypes?: HybridSearchSourceType[],
  ): HybridSearchSourceType[] {
    if (!sourceTypes || sourceTypes.length === 0) {
      return [HybridSearchSourceType.ALL];
    }

    if (sourceTypes.includes(HybridSearchSourceType.ALL)) {
      return [
        HybridSearchSourceType.POLICY,
        HybridSearchSourceType.KNOWLEDGE_BASE,
        HybridSearchSourceType.CASE,
      ];
    }

    return sourceTypes;
  }

  /**
   * Execute keyword search via Elasticsearch.
   */
  private async executeKeywordSearch(
    organizationId: string,
    query: string,
    sourceTypes: HybridSearchSourceType[],
    limit: number,
  ): Promise<KeywordSearchResult[]> {
    try {
      // Map source types to ES index names
      const indices = this.getEsIndices(organizationId, sourceTypes);

      if (indices.length === 0) {
        return [];
      }

      const response: SearchResponse = await this.esService.search({
        index: indices,
        timeout: "5s",
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: [
                    "referenceNumber^10",
                    "title^5",
                    "name^5",
                    "content^2",
                    "details^2",
                    "summary^3",
                    "aiSummary^2",
                    "categoryName^2",
                    "*",
                  ],
                  fuzziness: "AUTO",
                  operator: "or",
                  type: "best_fields",
                },
              },
            ],
          },
        },
        highlight: {
          pre_tags: ["<mark>"],
          post_tags: ["</mark>"],
          fields: {
            content: { fragment_size: 200, number_of_fragments: 2 },
            details: { fragment_size: 200, number_of_fragments: 2 },
            summary: { fragment_size: 200, number_of_fragments: 2 },
            title: {},
            name: {},
          },
        },
        size: limit,
        _source: true,
      });

      // Transform ES hits to intermediate format
      return response.hits.hits.map((hit, index: number) => {
        const source = (hit._source || {}) as Record<string, unknown>;
        const sourceType = this.indexNameToSourceType(hit._index);

        return {
          id: hit._id || "",
          sourceType,
          sourceId: (source.id as string) || hit._id || "",
          title: this.extractTitle(source, sourceType),
          text: this.extractText(source, hit.highlight),
          score: hit._score || 0,
          rank: index + 1,
          metadata: this.extractMetadata(source, sourceType, hit.highlight),
        };
      });
    } catch (error) {
      // Handle index not found (no data yet)
      if (
        error &&
        typeof error === "object" &&
        "meta" in error &&
        (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
      ) {
        this.logger.debug(`ES index not found for org ${organizationId}`);
        return [];
      }

      this.logger.error(
        `Keyword search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return [];
    }
  }

  /**
   * Execute semantic search via pgvector.
   */
  private async executeSemanticSearch(
    organizationId: string,
    query: string,
    sourceTypes: HybridSearchSourceType[],
    limit: number,
  ): Promise<SemanticSearchResultIntermediate[]> {
    // Check if embedding service is ready
    if (!this.embeddingService.isReady()) {
      this.logger.debug(
        "Embedding service not ready, skipping semantic search",
      );
      return [];
    }

    try {
      // Embed the query
      const queryEmbedding = await this.embeddingService.embedQuery(query);

      // Map source types to pgvector source types
      const vectorSourceTypes = this.mapToVectorSourceTypes(sourceTypes);

      // Execute semantic search
      const results = await this.vectorStoreService.semanticSearch(
        organizationId,
        queryEmbedding,
        {
          limit,
          sourceTypes: vectorSourceTypes,
          minSimilarity: 0.3, // Low threshold, RRF will handle ranking
        },
      );

      // Transform to intermediate format
      return results.map((result: SemanticSearchResult, index: number) => ({
        id: result.id,
        sourceType: this.vectorSourceTypeToHybridType(result.sourceType),
        sourceId: result.sourceId,
        title: this.extractTitleFromMetadata(result.metadata),
        text: result.text,
        similarity: result.similarity,
        rank: index + 1,
        metadata: {
          chunkIndex: result.chunkIndex,
          semanticSimilarity: result.similarity,
          ...this.extractMetadataFromChunk(result.metadata),
        },
      }));
    } catch (error) {
      this.logger.error(
        `Semantic search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return [];
    }
  }

  /**
   * Fuse results using Reciprocal Rank Fusion.
   *
   * RRF formula: score = weight / (k + rank + 1)
   *
   * When a result appears in both lists:
   * - Combined score = keyword_rrf + semantic_rrf
   * - Method becomes "both"
   */
  private reciprocalRankFusion(
    keywordResults: KeywordSearchResult[],
    semanticResults: SemanticSearchResultIntermediate[],
    keywordWeight: number,
    semanticWeight: number,
  ): FusionCandidate[] {
    const candidates = new Map<string, FusionCandidate>();

    // Process keyword results
    for (const result of keywordResults) {
      const rrfScore = keywordWeight / (this.RRF_K + result.rank + 1);
      const key = this.createResultKey(result.sourceType, result.sourceId);

      candidates.set(key, {
        id: result.id,
        sourceType: result.sourceType,
        sourceId: result.sourceId,
        title: result.title,
        text: result.text,
        keywordRank: result.rank,
        keywordScore: result.score,
        rrfScore,
        method: "keyword",
        metadata: result.metadata,
      });
    }

    // Process semantic results, merging with existing keyword results
    for (const result of semanticResults) {
      const rrfScore = semanticWeight / (this.RRF_K + result.rank + 1);
      const key = this.createResultKey(result.sourceType, result.sourceId);

      const existing = candidates.get(key);
      if (existing) {
        // Result appears in both - combine scores
        existing.semanticRank = result.rank;
        existing.semanticSimilarity = result.similarity;
        existing.rrfScore += rrfScore;
        existing.method = "both";
        // Prefer semantic text (actual chunk content)
        if (result.text && result.text.length > 0) {
          existing.text = result.text;
        }
        existing.metadata = {
          ...existing.metadata,
          ...result.metadata,
        };
      } else {
        // New semantic-only result
        candidates.set(key, {
          id: result.id,
          sourceType: result.sourceType,
          sourceId: result.sourceId,
          title: result.title,
          text: result.text,
          semanticRank: result.rank,
          semanticSimilarity: result.similarity,
          rrfScore,
          method: "semantic",
          metadata: result.metadata,
        });
      }
    }

    // Sort by RRF score (descending)
    return Array.from(candidates.values()).sort(
      (a, b) => b.rrfScore - a.rrfScore,
    );
  }

  /**
   * Create unique key for deduplication during fusion.
   */
  private createResultKey(
    sourceType: HybridSearchSourceType,
    sourceId: string,
  ): string {
    return `${sourceType}:${sourceId}`;
  }

  /**
   * Map HybridSearchSourceType to ES index names.
   */
  private getEsIndices(
    organizationId: string,
    sourceTypes: HybridSearchSourceType[],
  ): string[] {
    const indices: string[] = [];

    for (const type of sourceTypes) {
      switch (type) {
        case HybridSearchSourceType.POLICY:
          indices.push(
            this.indexingService.getIndexName(organizationId, "policies"),
          );
          break;
        case HybridSearchSourceType.CASE:
          indices.push(
            this.indexingService.getIndexName(organizationId, "cases"),
          );
          break;
        case HybridSearchSourceType.KNOWLEDGE_BASE:
          // Knowledge base may not have ES index, only pgvector
          // Include if index exists, otherwise skip
          indices.push(
            this.indexingService.getIndexName(organizationId, "knowledge_base"),
          );
          break;
        case HybridSearchSourceType.ALL:
          indices.push(
            this.indexingService.getIndexName(organizationId, "policies"),
          );
          indices.push(
            this.indexingService.getIndexName(organizationId, "cases"),
          );
          break;
      }
    }

    return [...new Set(indices)]; // Deduplicate
  }

  /**
   * Map HybridSearchSourceType to pgvector source types.
   */
  private mapToVectorSourceTypes(
    sourceTypes: HybridSearchSourceType[],
  ): string[] {
    const vectorTypes: string[] = [];

    for (const type of sourceTypes) {
      switch (type) {
        case HybridSearchSourceType.POLICY:
          vectorTypes.push("POLICY_VERSION");
          break;
        case HybridSearchSourceType.KNOWLEDGE_BASE:
          vectorTypes.push("KNOWLEDGE_BASE");
          break;
        case HybridSearchSourceType.CASE:
          // Cases may not be embedded yet
          vectorTypes.push("CASE");
          break;
        case HybridSearchSourceType.ALL:
          vectorTypes.push("POLICY_VERSION", "KNOWLEDGE_BASE");
          break;
      }
    }

    return [...new Set(vectorTypes)];
  }

  /**
   * Convert ES index name to HybridSearchSourceType.
   */
  private indexNameToSourceType(indexName: string): HybridSearchSourceType {
    if (indexName.includes("policies")) {
      return HybridSearchSourceType.POLICY;
    }
    if (indexName.includes("cases")) {
      return HybridSearchSourceType.CASE;
    }
    if (indexName.includes("knowledge_base")) {
      return HybridSearchSourceType.KNOWLEDGE_BASE;
    }
    return HybridSearchSourceType.POLICY; // Default
  }

  /**
   * Convert pgvector source type to HybridSearchSourceType.
   */
  private vectorSourceTypeToHybridType(
    sourceType: string,
  ): HybridSearchSourceType {
    switch (sourceType) {
      case "POLICY_VERSION":
        return HybridSearchSourceType.POLICY;
      case "KNOWLEDGE_BASE":
        return HybridSearchSourceType.KNOWLEDGE_BASE;
      case "CASE":
        return HybridSearchSourceType.CASE;
      default:
        return HybridSearchSourceType.POLICY;
    }
  }

  /**
   * Extract title from ES document based on source type.
   */
  private extractTitle(
    source: Record<string, unknown>,
    sourceType: HybridSearchSourceType,
  ): string {
    switch (sourceType) {
      case HybridSearchSourceType.POLICY:
        return (
          (source.title as string) ||
          (source.name as string) ||
          "Untitled Policy"
        );
      case HybridSearchSourceType.CASE:
        return (source.referenceNumber as string) || "Unknown Case";
      case HybridSearchSourceType.KNOWLEDGE_BASE:
        return (
          (source.title as string) ||
          (source.fileName as string) ||
          "Untitled Document"
        );
      default:
        return (source.title as string) || "Unknown";
    }
  }

  /**
   * Extract text/snippet from ES document, preferring highlights.
   */
  private extractText(
    source: Record<string, unknown>,
    highlight?: Record<string, string[]>,
  ): string {
    // Prefer highlighted content
    if (highlight) {
      const highlightFields = ["content", "details", "summary", "description"];
      for (const field of highlightFields) {
        if (highlight[field] && highlight[field].length > 0) {
          return highlight[field].join(" ... ");
        }
      }
    }

    // Fall back to source fields
    const textFields = [
      "summary",
      "aiSummary",
      "details",
      "content",
      "description",
    ];
    for (const field of textFields) {
      const value = source[field];
      if (value && typeof value === "string" && value.length > 0) {
        return value.substring(0, 500);
      }
    }

    return "";
  }

  /**
   * Extract metadata from ES document based on source type.
   */
  private extractMetadata(
    source: Record<string, unknown>,
    sourceType: HybridSearchSourceType,
    highlight?: Record<string, string[]>,
  ): HybridSearchResultMetadata {
    const metadata: HybridSearchResultMetadata = {};

    if (highlight) {
      metadata.highlights = highlight;
    }

    switch (sourceType) {
      case HybridSearchSourceType.POLICY:
        metadata.version = source.version as number;
        metadata.categoryName = source.categoryName as string;
        metadata.status = source.status as string;
        break;
      case HybridSearchSourceType.CASE:
        metadata.caseStatus = source.status as string;
        metadata.severity = source.severity as string;
        break;
      case HybridSearchSourceType.KNOWLEDGE_BASE:
        metadata.documentType = source.documentType as string;
        metadata.fileName = source.fileName as string;
        break;
    }

    return metadata;
  }

  /**
   * Extract title from chunk metadata.
   */
  private extractTitleFromMetadata(metadata: Record<string, unknown>): string {
    return (
      (metadata.title as string) ||
      (metadata.policyTitle as string) ||
      (metadata.fileName as string) ||
      "Unknown"
    );
  }

  /**
   * Extract displayable metadata from chunk metadata.
   */
  private extractMetadataFromChunk(
    chunkMetadata: Record<string, unknown>,
  ): Partial<HybridSearchResultMetadata> {
    return {
      version: chunkMetadata.version as number,
      categoryName: chunkMetadata.categoryName as string,
      status: chunkMetadata.status as string,
      documentType: chunkMetadata.documentType as string,
      fileName: chunkMetadata.fileName as string,
    };
  }
}
