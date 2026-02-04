import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import type {
  SearchResponse,
  SearchHit,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { UserRole } from '@prisma/client';
import { IndexingService } from './indexing/indexing.service';
import {
  PermissionFilterService,
  PermissionContext,
} from './query/permission-filter.service';

/**
 * Supported entity types for unified search.
 */
export type UnifiedSearchEntityType =
  | 'cases'
  | 'rius'
  | 'investigations'
  | 'persons';

/**
 * Options for unified search query.
 */
export interface UnifiedSearchOptions {
  /** Entity types to include in search. Defaults to all. */
  entityTypes?: UnifiedSearchEntityType[];
  /** Max results per entity type. Defaults to 10. */
  limit?: number;
  /** Include custom fields in search. Defaults to true. */
  includeCustomFields?: boolean;
}

/**
 * A single hit in unified search results.
 */
export interface UnifiedSearchHit {
  id: string;
  entityType: string;
  score: number;
  document: Record<string, unknown>;
  highlight?: Record<string, string[]>;
}

/**
 * Results grouped by entity type.
 */
export interface EntityTypeResult {
  entityType: string;
  count: number;
  hits: UnifiedSearchHit[];
}

/**
 * Complete unified search result.
 */
export interface UnifiedSearchResult {
  query: string;
  totalHits: number;
  results: EntityTypeResult[];
  took: number;
}

/**
 * UnifiedSearchService provides cross-entity search across the platform.
 *
 * Features:
 * - Single query searches Cases, RIUs, Investigations, Persons
 * - Role-based permission filtering per entity type
 * - Custom fields included in search
 * - Results grouped by entity type with counts
 * - Highlighting of matched terms
 *
 * Per CONTEXT.md: Users need to find information quickly without knowing
 * which entity type contains it. Unified search reduces context switching.
 */
@Injectable()
export class UnifiedSearchService {
  private readonly logger = new Logger(UnifiedSearchService.name);

  /** All supported entity types */
  private readonly ALL_ENTITY_TYPES: UnifiedSearchEntityType[] = [
    'cases',
    'rius',
    'investigations',
    'persons',
  ];

  /** Default results per entity type */
  private readonly DEFAULT_LIMIT = 10;

  constructor(
    private readonly esService: ElasticsearchService,
    private readonly indexingService: IndexingService,
    private readonly permissionService: PermissionFilterService,
  ) {}

  /**
   * Execute unified search across multiple entity types.
   *
   * @param organizationId - Tenant ID for index naming
   * @param userId - Current user ID for permission filtering
   * @param userRole - Current user's role for permission filtering
   * @param query - Search query string
   * @param options - Optional search configuration
   * @returns Grouped search results with counts
   */
  async search(
    organizationId: string,
    userId: string,
    userRole: UserRole,
    query: string,
    options?: UnifiedSearchOptions,
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();

    // Determine which entity types to search
    const entityTypes = options?.entityTypes || this.ALL_ENTITY_TYPES;
    const limit = options?.limit || this.DEFAULT_LIMIT;
    const includeCustomFields = options?.includeCustomFields !== false;

    // Build permission context
    const ctx: PermissionContext = {
      organizationId,
      userId,
      role: userRole,
    };

    // Execute parallel searches for each entity type
    const searchPromises = entityTypes.map((entityType) =>
      this.searchEntityType(ctx, entityType, query, limit, includeCustomFields),
    );

    const entityResults = await Promise.all(searchPromises);

    // Calculate total hits across all entity types
    const totalHits = entityResults.reduce((sum, r) => sum + r.count, 0);

    const elapsed = Date.now() - startTime;
    this.logger.debug(
      `Unified search completed in ${elapsed}ms for org ${organizationId}: ${totalHits} total hits`,
    );

    return {
      query,
      totalHits,
      results: entityResults,
      took: elapsed,
    };
  }

  /**
   * Search a single entity type with permission filtering.
   */
  private async searchEntityType(
    ctx: PermissionContext,
    entityType: UnifiedSearchEntityType,
    query: string,
    limit: number,
    includeCustomFields: boolean,
  ): Promise<EntityTypeResult> {
    const indexName = this.indexingService.getIndexName(
      ctx.organizationId,
      entityType,
    );

    try {
      // Build permission filters for this entity type
      const permissionFilters = await this.permissionService.buildPermissionFilter(
        ctx,
        entityType,
      );

      // Build search fields based on entity type
      const searchFields = this.getSearchFieldsForType(
        entityType,
        includeCustomFields,
      );

      // Build the query
      const must: QueryDslQueryContainer[] = [];
      if (query && query.trim()) {
        must.push({
          multi_match: {
            query: query.trim(),
            fields: searchFields,
            fuzziness: 'AUTO',
            operator: 'and',
            type: 'best_fields',
          },
        });
      }

      // Execute search with timeout
      const response: SearchResponse<Record<string, unknown>> =
        await this.esService.search({
          index: indexName,
          timeout: '500ms',
          query: {
            bool: {
              must: must.length > 0 ? must : [{ match_all: {} }],
              filter: permissionFilters as QueryDslQueryContainer[],
            },
          },
          highlight: {
            pre_tags: ['<mark>'],
            post_tags: ['</mark>'],
            fields: {
              details: { fragment_size: 150, number_of_fragments: 2 },
              summary: { fragment_size: 150, number_of_fragments: 2 },
              aiSummary: { fragment_size: 150, number_of_fragments: 2 },
              description: { fragment_size: 150, number_of_fragments: 2 },
              notes: { fragment_size: 150, number_of_fragments: 2 },
              'customFields.*': { fragment_size: 100, number_of_fragments: 1 },
            },
          },
          from: 0,
          size: limit,
          sort: [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }],
          _source: {
            excludes: this.permissionService.buildFieldVisibilityFilter(
              ctx,
              entityType,
            ),
          },
        });

      // Transform response
      const hits = this.transformHits(response, entityType);
      const total = this.getTotalHits(response);

      return {
        entityType,
        count: total,
        hits,
      };
    } catch (error) {
      // Handle index not found (no data yet for this tenant/type)
      if (this.isIndexNotFoundError(error)) {
        this.logger.debug(
          `Index ${indexName} not found - returning empty results`,
        );
        return { entityType, count: 0, hits: [] };
      }

      this.logger.error(
        `Unified search failed for ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Return empty results rather than failing the entire search
      return { entityType, count: 0, hits: [] };
    }
  }

  /**
   * Get search fields based on entity type.
   * Each entity type has different fields to search.
   */
  private getSearchFieldsForType(
    entityType: UnifiedSearchEntityType,
    includeCustomFields: boolean,
  ): string[] {
    const baseFields = {
      cases: [
        'referenceNumber^10',
        'details^2',
        'summary^3',
        'aiSummary^2',
        'categoryName^2',
        'primaryCategoryName^2',
        'locationName',
        'locationCity',
        'assigneeName',
        'createdByName',
      ],
      rius: [
        'referenceNumber^10',
        'details^2',
        'summary^3',
        'aiSummary^2',
        'categoryName^2',
        'locationName',
        'locationCity',
        'createdByName',
      ],
      investigations: [
        'referenceNumber^10',
        'title^3',
        'description^2',
        'findings^2',
        'notes',
        'primaryInvestigatorName',
      ],
      persons: [
        'firstName^3',
        'lastName^3',
        'email^2',
        'employeeId^5',
        'jobTitle',
        'department',
        'businessUnitName',
        'locationName',
      ],
    };

    const fields = baseFields[entityType] || ['*'];

    // Add custom fields to search if enabled
    if (includeCustomFields) {
      fields.push('customFields.*');
    }

    return fields;
  }

  /**
   * Transform Elasticsearch hits to UnifiedSearchHit format.
   */
  private transformHits(
    response: SearchResponse<Record<string, unknown>>,
    entityType: string,
  ): UnifiedSearchHit[] {
    return response.hits.hits.map(
      (hit: SearchHit<Record<string, unknown>>) => ({
        id: hit._id ?? '',
        entityType,
        score: hit._score || 0,
        document: (hit._source as Record<string, unknown>) || {},
        highlight: hit.highlight as Record<string, string[]> | undefined,
      }),
    );
  }

  /**
   * Extract total hit count from response.
   */
  private getTotalHits(response: SearchResponse<Record<string, unknown>>): number {
    return typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value || 0;
  }

  /**
   * Check if error is an index not found error.
   */
  private isIndexNotFoundError(error: unknown): boolean {
    if (
      error &&
      typeof error === 'object' &&
      'meta' in error
    ) {
      const meta = (error as { meta?: { statusCode?: number } }).meta;
      return meta?.statusCode === 404;
    }
    return false;
  }
}
