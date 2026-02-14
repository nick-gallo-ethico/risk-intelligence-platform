import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import type {
  SearchResponse,
  SearchHit,
  QueryDslQueryContainer,
  SortCombinations,
} from "@elastic/elasticsearch/lib/api/types";
import CircuitBreaker from "opossum";
import { IndexingService } from "./indexing/indexing.service";
import {
  PermissionFilterService,
  PermissionContext,
} from "./query/permission-filter.service";
import { SearchQueryDto } from "./dto/search-query.dto";
import { SearchResultDto, SearchHitDto } from "./dto/search-result.dto";

/**
 * Circuit breaker fallback response when Elasticsearch is unavailable.
 */
interface CircuitBreakerFallbackResult {
  hits: [];
  total: 0;
  aggregations: Record<string, never>;
  took: number;
  circuitBreakerOpen: true;
  message: string;
}

/**
 * SearchService provides unified search across the platform.
 *
 * Features:
 * - Permission-filtered search (CRITICAL)
 * - Per-tenant indices
 * - Fuzzy matching with typo tolerance
 * - Highlighting of matched terms
 * - Faceted aggregations
 *
 * Per CONTEXT.md:
 * - Search responds within 500ms
 * - Permission filters injected at query time
 * - Fuzzy matching and compliance synonyms supported
 */
// Type alias for ES search params to improve readability
type EsSearchParams = Record<string, unknown>;
type EsSearchResponse = SearchResponse<Record<string, unknown>>;

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private searchCircuitBreaker!: CircuitBreaker<
    [EsSearchParams],
    EsSearchResponse
  >;

  constructor(
    private esService: ElasticsearchService,
    private indexingService: IndexingService,
    private permissionService: PermissionFilterService,
    private configService: ConfigService,
  ) {}

  /**
   * Initialize circuit breaker on module startup.
   * Circuit breaker wraps Elasticsearch calls to prevent cascade failures.
   */
  onModuleInit(): void {
    const cbConfig = this.configService.get("elasticsearch.circuitBreaker");
    const options: CircuitBreaker.Options = {
      timeout: cbConfig?.timeout ?? 5000,
      errorThresholdPercentage: cbConfig?.errorThresholdPercentage ?? 50,
      resetTimeout: cbConfig?.resetTimeout ?? 30000,
      volumeThreshold: cbConfig?.volumeThreshold ?? 5,
    };

    // Create circuit breaker wrapping the ES search call
    // Type assertion needed due to opossum's complex generic inference
    this.searchCircuitBreaker = new CircuitBreaker<
      [EsSearchParams],
      EsSearchResponse
    >(
      (params: EsSearchParams) =>
        this.esService.search(params) as Promise<EsSearchResponse>,
      options,
    );

    // Log circuit state changes for monitoring
    this.searchCircuitBreaker.on("open", () => {
      this.logger.warn(
        "Search circuit breaker OPENED - Elasticsearch appears unhealthy",
      );
    });

    this.searchCircuitBreaker.on("halfOpen", () => {
      this.logger.log(
        "Search circuit breaker HALF-OPEN - Testing Elasticsearch health",
      );
    });

    this.searchCircuitBreaker.on("close", () => {
      this.logger.log(
        "Search circuit breaker CLOSED - Elasticsearch recovered",
      );
    });

    this.searchCircuitBreaker.on("timeout", () => {
      this.logger.warn("Search request timed out");
    });

    this.searchCircuitBreaker.on("reject", () => {
      this.logger.debug("Search request rejected - circuit is open");
    });

    this.logger.log(
      `Search circuit breaker initialized (timeout=${options.timeout}ms, errorThreshold=${options.errorThresholdPercentage}%, resetTimeout=${options.resetTimeout}ms)`,
    );
  }

  /**
   * Create fallback response when circuit breaker is open.
   */
  private createFallbackResponse(
    startTime: number,
  ): CircuitBreakerFallbackResult {
    return {
      hits: [],
      total: 0,
      aggregations: {},
      took: Date.now() - startTime,
      circuitBreakerOpen: true,
      message:
        "Search temporarily unavailable. Please try again in a few moments.",
    };
  }

  /**
   * Execute a search with permission filtering.
   */
  async search(
    ctx: PermissionContext,
    query: SearchQueryDto,
  ): Promise<SearchResultDto> {
    const startTime = Date.now();

    // Determine which entity types to search
    const entityTypes = query.entityTypes || ["cases"];

    // Get index names for each entity type (per-tenant)
    const indices = entityTypes.map((t) =>
      this.indexingService.getIndexName(ctx.organizationId, t),
    );

    // Build permission filters for each entity type
    const permissionFilters: QueryDslQueryContainer[] = [];
    for (const entityType of entityTypes) {
      const filters = await this.permissionService.buildPermissionFilter(
        ctx,
        entityType,
      );
      permissionFilters.push(...(filters as QueryDslQueryContainer[]));
    }

    // Build main query
    const must: QueryDslQueryContainer[] = [];
    if (query.q) {
      must.push({
        multi_match: {
          query: query.q,
          fields: [
            "referenceNumber^10", // Exact reference number matches weighted highest
            "details^2",
            "summary^3",
            "aiSummary^2",
            "categoryName^2",
            "locationName",
            "locationCity",
            "tags^2",
            "*", // Search all other fields
          ],
          fuzziness: "AUTO", // Fuzzy matching with typo tolerance
          operator: "and",
          type: "best_fields",
        },
      });
    }

    // Build field filters from query params
    const filter: QueryDslQueryContainer[] = [...permissionFilters];
    if (query.filters) {
      for (const [field, value] of Object.entries(query.filters)) {
        if (Array.isArray(value)) {
          filter.push({ terms: { [field]: value } });
        } else {
          filter.push({ term: { [field]: { value } } });
        }
      }
    }

    // Build search params for ES
    const searchParams = {
      index: indices,
      timeout: "5s", // Matches circuit breaker timeout
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter: filter,
        },
      },
      highlight: {
        pre_tags: ["<mark>"],
        post_tags: ["</mark>"],
        fields: {
          details: { fragment_size: 150, number_of_fragments: 3 },
          summary: { fragment_size: 150, number_of_fragments: 2 },
          aiSummary: { fragment_size: 150, number_of_fragments: 2 },
        },
      },
      aggs: {
        by_status: { terms: { field: "status", size: 10 } },
        by_severity: { terms: { field: "severity", size: 5 } },
        by_category: { terms: { field: "categoryName", size: 20 } },
        by_source: { terms: { field: "sourceChannel", size: 10 } },
      },
      from: query.offset ?? 0,
      size: query.limit ?? 25,
      sort: this.buildSortClause(query),
      _source: {
        excludes: this.permissionService.buildFieldVisibilityFilter(
          ctx,
          entityTypes[0],
        ),
      },
    };

    try {
      // Execute search through circuit breaker
      // Circuit breaker provides graceful degradation when ES is unhealthy
      const response = await this.searchCircuitBreaker.fire(searchParams);

      const elapsed = Date.now() - startTime;
      this.logger.debug(
        `Search completed in ${elapsed}ms for org ${ctx.organizationId}`,
      );

      return this.transformResponse(response, elapsed);
    } catch (error) {
      // Check if circuit breaker is open (rejected the request)
      if (this.searchCircuitBreaker.opened) {
        this.logger.warn(
          `Search request rejected - circuit breaker is open for org ${ctx.organizationId}`,
        );
        return this.createFallbackResponse(startTime);
      }

      // Handle index not found (no data yet for this tenant)
      if (
        error &&
        typeof error === "object" &&
        "meta" in error &&
        (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
      ) {
        this.logger.debug(
          `Index not found for org ${ctx.organizationId} - returning empty results`,
        );
        return {
          hits: [],
          total: 0,
          aggregations: {},
          took: Date.now() - startTime,
        };
      }

      // Handle circuit breaker timeout
      if (error instanceof Error && error.message.includes("timed out")) {
        this.logger.warn(
          `Search timed out for org ${ctx.organizationId} - returning fallback`,
        );
        return this.createFallbackResponse(startTime);
      }

      this.logger.error(
        `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Build sort clause from query parameters.
   */
  private buildSortClause(query: SearchQueryDto): SortCombinations[] {
    if (query.sortBy) {
      return [{ [query.sortBy]: { order: query.sortOrder || "desc" } }];
    }

    // Default: relevance score first, then creation date
    return [{ _score: { order: "desc" } }, { createdAt: { order: "desc" } }];
  }

  /**
   * Transform Elasticsearch response to SearchResultDto.
   */
  private transformResponse(
    response: SearchResponse<Record<string, unknown>>,
    elapsed: number,
  ): SearchResultDto {
    const hits: SearchHitDto[] = response.hits.hits.map(
      (hit: SearchHit<Record<string, unknown>>) => ({
        id: hit._id ?? "",
        type: this.extractTypeFromIndex(hit._index),
        score: hit._score || 0,
        document: (hit._source as Record<string, unknown>) || {},
        highlight: hit.highlight as Record<string, string[]> | undefined,
      }),
    );

    const total =
      typeof response.hits.total === "number"
        ? response.hits.total
        : response.hits.total?.value || 0;

    return {
      hits,
      total,
      aggregations: response.aggregations as Record<
        string,
        { buckets: Array<{ key: string; doc_count: number }> }
      >,
      took: elapsed,
    };
  }

  /**
   * Extract entity type from index name.
   * Index format: org_{organizationId}_{entityType}
   */
  private extractTypeFromIndex(indexName: string): string {
    const parts = indexName.split("_");
    return parts[parts.length - 1] || "unknown";
  }

  /**
   * Get suggestions for search autocomplete.
   * Uses circuit breaker for graceful degradation.
   */
  async suggest(
    ctx: PermissionContext,
    prefix: string,
    entityTypes?: string[],
  ): Promise<string[]> {
    const types = entityTypes || ["cases"];
    const indices = types.map((t) =>
      this.indexingService.getIndexName(ctx.organizationId, t),
    );

    // Return empty if circuit breaker is open (fail fast)
    if (this.searchCircuitBreaker.opened) {
      this.logger.debug("Suggest request skipped - circuit breaker is open");
      return [];
    }

    try {
      // Use circuit breaker for suggest call
      const response = await this.searchCircuitBreaker.fire({
        index: indices,
        suggest: {
          text: prefix,
          reference_suggest: {
            prefix,
            completion: {
              field: "referenceNumber.suggest",
              size: 5,
              skip_duplicates: true,
            },
          },
        },
        size: 0,
      });

      // Extract suggestions from response
      type SuggestResponse = {
        reference_suggest?: Array<{ options: Array<{ text: string }> }>;
      };
      const suggestions =
        (
          response.suggest as SuggestResponse
        )?.reference_suggest?.[0]?.options?.map((opt) => opt.text) || [];

      return suggestions;
    } catch {
      // Return empty array if suggestion fails (graceful degradation)
      return [];
    }
  }

  /**
   * Check if the circuit breaker is currently open.
   * Useful for health checks and status monitoring.
   */
  isCircuitBreakerOpen(): boolean {
    return this.searchCircuitBreaker.opened;
  }

  /**
   * Get circuit breaker statistics for monitoring.
   */
  getCircuitBreakerStats(): {
    state: string;
    failures: number;
    successes: number;
    rejects: number;
    timeouts: number;
  } {
    const stats = this.searchCircuitBreaker.stats;
    return {
      state: this.searchCircuitBreaker.opened
        ? "open"
        : this.searchCircuitBreaker.halfOpen
          ? "half-open"
          : "closed",
      failures: stats.failures,
      successes: stats.successes,
      rejects: stats.rejects,
      timeouts: stats.timeouts,
    };
  }
}
