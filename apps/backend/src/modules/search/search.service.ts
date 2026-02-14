import { Injectable, Logger } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import type {
  SearchResponse,
  SearchHit,
  QueryDslQueryContainer,
  SortCombinations,
} from "@elastic/elasticsearch/lib/api/types";
import { IndexingService } from "./indexing/indexing.service";
import {
  PermissionFilterService,
  PermissionContext,
} from "./query/permission-filter.service";
import { SearchQueryDto } from "./dto/search-query.dto";
import { SearchResultDto, SearchHitDto } from "./dto/search-result.dto";

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
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private esService: ElasticsearchService,
    private indexingService: IndexingService,
    private permissionService: PermissionFilterService,
  ) {}

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

    try {
      // Execute search with timeout
      // ES v9 SDK uses flattened params (no body wrapper)
      const response: SearchResponse<Record<string, unknown>> =
        await this.esService.search({
          index: indices,
          timeout: "500ms", // Per CONTEXT.md: Search responds within 500ms
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
        });

      const elapsed = Date.now() - startTime;
      this.logger.debug(
        `Search completed in ${elapsed}ms for org ${ctx.organizationId}`,
      );

      return this.transformResponse(response, elapsed);
    } catch (error) {
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

    try {
      // ES v9 SDK uses flattened params
      const response = await this.esService.search({
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
      // Return empty array if suggestion fails
      return [];
    }
  }
}
