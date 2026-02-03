import { Injectable, Logger } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import { PrismaService } from "../../prisma/prisma.service";
import { PersonCaseLabel } from "@prisma/client";

/**
 * Summary of a person's involvement across all cases.
 * This is the "wow moment" data structure for demos per CONTEXT.md.
 */
export interface PersonInvolvementSummary {
  personId: string;
  personName: string;
  totalCases: number;
  byRole: Array<{
    label: string;
    count: number;
    byStatus?: Array<{ status: string; count: number }>;
  }>;
}

/**
 * Result from pattern search queries.
 */
export interface PatternSearchResult {
  cases: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    createdAt: string;
  }>;
  total: number;
}

/**
 * Data for the "X previous reports" badge in triage view.
 * Per CONTEXT.md: "3 previous reports from this person" badge visible in triage.
 */
export interface ReporterHistoryBadge {
  previousReportCount: number;
  showBadge: boolean;
  badgeText: string;
}

/**
 * Person criteria for multi-person queries.
 */
export interface PersonQueryCriteria {
  personId: string;
  labels?: PersonCaseLabel[];
}

/**
 * PatternDetectionService enables cross-case pattern detection using Elasticsearch.
 *
 * Per CONTEXT.md: "Association search is a wow moment in demos."
 * This service provides the queries that enable finding:
 * - All Cases where a Person appears (across different roles)
 * - Cases where multiple specific Persons are involved
 * - Repeat subjects/witnesses across cases
 * - Related cases via associations
 *
 * All queries use pre-indexed association data in Elasticsearch for sub-second response.
 */
@Injectable()
export class PatternDetectionService {
  private readonly logger = new Logger(PatternDetectionService.name);

  constructor(
    private readonly esService: ElasticsearchService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get index name for a tenant.
   * Per CONTEXT.md: org_{tenantId}_cases naming convention.
   */
  private getIndexName(organizationId: string): string {
    return `org_${organizationId}_cases`.toLowerCase();
  }

  /**
   * Find all Cases where a Person appears, grouped by role.
   *
   * This is THE "wow moment" query for demos - showing a person's full
   * involvement history across all cases with role breakdown.
   *
   * @param personId - The person to search for
   * @param organizationId - Tenant isolation
   * @returns Summary with total cases and breakdown by role
   *
   * @example
   * // "Show me all cases involving John Smith"
   * const summary = await service.getPersonInvolvementSummary(personId, orgId);
   * // Returns: { personName: "John Smith", totalCases: 12, byRole: [
   * //   { label: "SUBJECT", count: 5, byStatus: [{ status: "SUBSTANTIATED", count: 3 }] },
   * //   { label: "WITNESS", count: 4 },
   * //   { label: "REPORTER", count: 3 }
   * // ]}
   */
  async getPersonInvolvementSummary(
    personId: string,
    organizationId: string,
  ): Promise<PersonInvolvementSummary> {
    const indexName = this.getIndexName(organizationId);

    // Get person info for display
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    try {
      // ES v9 SDK uses flattened params (no body wrapper)
      const result = await this.esService.search({
        index: indexName,
        size: 0, // We only need aggregations
        query: {
          nested: {
            path: "associations.persons",
            query: {
              term: { "associations.persons.personId": personId },
            },
          },
        },
        aggs: {
          person_roles: {
            nested: { path: "associations.persons" },
            aggs: {
              matching_person: {
                filter: {
                  term: { "associations.persons.personId": personId },
                },
                aggs: {
                  by_label: {
                    terms: {
                      field: "associations.persons.label",
                      size: 20,
                    },
                    aggs: {
                      by_evidentiary_status: {
                        terms: {
                          field: "associations.persons.evidentiaryStatus",
                          size: 10,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Parse aggregations
      const aggs = result.aggregations as Record<string, unknown>;
      interface BucketItem {
        key: string;
        doc_count: number;
        by_evidentiary_status?: {
          buckets?: Array<{ key: string; doc_count: number }>;
        };
      }
      interface PersonRolesAgg {
        matching_person?: {
          by_label?: {
            buckets?: BucketItem[];
          };
        };
      }
      const personRoles = (aggs?.person_roles as PersonRolesAgg) || {};
      const buckets = personRoles?.matching_person?.by_label?.buckets || [];

      const totalHits = result.hits.total;
      const totalCases =
        typeof totalHits === "number"
          ? totalHits
          : (totalHits as { value: number })?.value || 0;

      return {
        personId,
        personName: person
          ? `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
            "Unknown"
          : "Unknown",
        totalCases,
        byRole: buckets.map((bucket: BucketItem) => ({
          label: bucket.key,
          count: bucket.doc_count,
          byStatus: bucket.by_evidentiary_status?.buckets?.map(
            (sb: { key: string; doc_count: number }) => ({
              status: sb.key,
              count: sb.doc_count,
            }),
          ),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get person involvement summary: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      // Return empty result rather than throwing
      return {
        personId,
        personName: person
          ? `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
            "Unknown"
          : "Unknown",
        totalCases: 0,
        byRole: [],
      };
    }
  }

  /**
   * Find Cases where multiple specific Persons are involved.
   *
   * Supports complex queries like "Cases where Person A was subject AND Person B was witness".
   * Uses nested queries to ensure each person criterion is evaluated within the same
   * association record.
   *
   * @param personCriteria - Array of person/label criteria (all must match)
   * @param organizationId - Tenant isolation
   * @param options - Pagination options
   * @returns Matching cases with total count
   *
   * @example
   * // "Cases where Alice was subject AND Bob was witness"
   * const result = await service.findCasesWithMultiplePersons([
   *   { personId: aliceId, labels: [PersonCaseLabel.SUBJECT] },
   *   { personId: bobId, labels: [PersonCaseLabel.WITNESS] }
   * ], orgId);
   */
  async findCasesWithMultiplePersons(
    personCriteria: PersonQueryCriteria[],
    organizationId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<PatternSearchResult> {
    const indexName = this.getIndexName(organizationId);
    const { limit = 20, offset = 0 } = options;

    // Build nested queries for each person criterion
    const nestedQueries = personCriteria.map((criteria) => ({
      nested: {
        path: "associations.persons",
        query: {
          bool: {
            must: [
              { term: { "associations.persons.personId": criteria.personId } },
              ...(criteria.labels && criteria.labels.length > 0
                ? [{ terms: { "associations.persons.label": criteria.labels } }]
                : []),
            ],
          },
        },
      },
    }));

    try {
      // ES v9 SDK uses flattened params (no body wrapper)
      const result = await this.esService.search({
        index: indexName,
        from: offset,
        size: limit,
        query: {
          bool: { must: nestedQueries },
        },
        sort: [{ createdAt: "desc" }],
      });

      interface CaseHit {
        _source: {
          id: string;
          referenceNumber: string;
          status: string;
          createdAt: string;
        };
      }

      const totalHits = result.hits.total;
      const total =
        typeof totalHits === "number"
          ? totalHits
          : (totalHits as { value: number })?.value || 0;

      return {
        cases: result.hits.hits.map((hit) => {
          const source = (hit as CaseHit)._source;
          return {
            id: source.id,
            referenceNumber: source.referenceNumber,
            status: source.status,
            createdAt: source.createdAt,
          };
        }),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find cases with multiple persons: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return { cases: [], total: 0 };
    }
  }

  /**
   * Generate "history alert" badge data for triage view.
   *
   * Per CONTEXT.md: "3 previous reports from this person" badge visible in triage.
   * This helps triagers identify repeat reporters quickly.
   *
   * @param personId - The reporter's person ID
   * @param excludeRiuId - Current RIU to exclude from count (optional)
   * @param organizationId - Tenant isolation
   * @returns Badge display data
   *
   * @example
   * const badge = await service.getReporterHistory(reporterId, currentRiuId, orgId);
   * // { previousReportCount: 3, showBadge: true, badgeText: "3 previous reports" }
   */
  async getReporterHistory(
    personId: string,
    excludeRiuId: string | null,
    organizationId: string,
  ): Promise<ReporterHistoryBadge> {
    // Count RIUs where this person is the reporter
    const count = await this.prisma.personRiuAssociation.count({
      where: {
        organizationId,
        personId,
        label: "REPORTER",
        ...(excludeRiuId && { riuId: { not: excludeRiuId } }),
      },
    });

    return {
      previousReportCount: count,
      showBadge: count > 0,
      badgeText: count === 1 ? "1 previous report" : `${count} previous reports`,
    };
  }

  /**
   * Find persons who appear in multiple cases with a specific role.
   *
   * Identifies repeat subjects, witnesses, or reporters for pattern detection.
   * Useful for compliance officers to identify concerning patterns.
   *
   * @param label - The role to search for (SUBJECT, WITNESS, REPORTER, etc.)
   * @param minCount - Minimum number of cases to be considered "repeat"
   * @param organizationId - Tenant isolation
   * @returns Persons with their case counts
   *
   * @example
   * // "Find people who have been subjects in 3+ cases"
   * const repeats = await service.findRepeatInvolvements(
   *   PersonCaseLabel.SUBJECT,
   *   3,
   *   orgId
   * );
   */
  async findRepeatInvolvements(
    label: PersonCaseLabel,
    minCount: number,
    organizationId: string,
  ): Promise<Array<{ personId: string; personName: string; caseCount: number }>> {
    const indexName = this.getIndexName(organizationId);

    try {
      // ES v9 SDK uses flattened params (no body wrapper)
      const result = await this.esService.search({
        index: indexName,
        size: 0,
        aggs: {
          persons_by_role: {
            nested: { path: "associations.persons" },
            aggs: {
              filtered_by_label: {
                filter: { term: { "associations.persons.label": label } },
                aggs: {
                  by_person: {
                    terms: {
                      field: "associations.persons.personId",
                      size: 1000,
                      min_doc_count: minCount,
                    },
                    aggs: {
                      person_name: {
                        terms: {
                          field: "associations.persons.personName.keyword",
                          size: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const aggs = result.aggregations as Record<string, unknown>;
      interface PersonBucket {
        key: string;
        doc_count: number;
        person_name?: {
          buckets?: Array<{ key: string }>;
        };
      }
      interface PersonsByRoleAgg {
        filtered_by_label?: {
          by_person?: {
            buckets?: PersonBucket[];
          };
        };
      }
      const personsByRole = (aggs?.persons_by_role as PersonsByRoleAgg) || {};
      const buckets =
        personsByRole?.filtered_by_label?.by_person?.buckets || [];

      return buckets.map((bucket: PersonBucket) => ({
        personId: bucket.key,
        personName: bucket.person_name?.buckets?.[0]?.key || "Unknown",
        caseCount: bucket.doc_count,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to find repeat involvements: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return [];
    }
  }

  /**
   * Get related cases for a given case (via associations).
   *
   * Returns all cases linked to the given case through CaseCaseAssociation,
   * including parent/child, splits, escalations, and related cases.
   *
   * @param caseId - The case to find related cases for
   * @param organizationId - Tenant isolation
   * @returns Related cases with relationship labels
   *
   * @example
   * const related = await service.getRelatedCases(caseId, orgId);
   * // [
   * //   { caseId: "...", referenceNumber: "CASE-2024-00123", label: "PARENT" },
   * //   { caseId: "...", referenceNumber: "CASE-2024-00125", label: "SPLIT_TO" }
   * // ]
   */
  async getRelatedCases(
    caseId: string,
    organizationId: string,
  ): Promise<Array<{ caseId: string; referenceNumber: string; label: string }>> {
    // Get case-case associations from database
    const associations = await this.prisma.caseCaseAssociation.findMany({
      where: {
        organizationId,
        OR: [{ sourceCaseId: caseId }, { targetCaseId: caseId }],
      },
      include: {
        sourceCase: { select: { id: true, referenceNumber: true } },
        targetCase: { select: { id: true, referenceNumber: true } },
      },
    });

    return associations.map((assoc) => {
      const isSource = assoc.sourceCaseId === caseId;
      const relatedCase = isSource ? assoc.targetCase : assoc.sourceCase;
      return {
        caseId: relatedCase.id,
        referenceNumber: relatedCase.referenceNumber,
        label: assoc.label,
      };
    });
  }

  /**
   * Find cases involving a person in any role (simple person-to-case search).
   *
   * @param personId - The person to search for
   * @param organizationId - Tenant isolation
   * @param options - Pagination options
   * @returns Matching cases
   */
  async findCasesByPerson(
    personId: string,
    organizationId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<PatternSearchResult> {
    const indexName = this.getIndexName(organizationId);
    const { limit = 20, offset = 0 } = options;

    try {
      // ES v9 SDK uses flattened params (no body wrapper)
      const result = await this.esService.search({
        index: indexName,
        from: offset,
        size: limit,
        query: {
          nested: {
            path: "associations.persons",
            query: {
              term: { "associations.persons.personId": personId },
            },
          },
        },
        sort: [{ createdAt: "desc" }],
      });

      interface CaseHit {
        _source: {
          id: string;
          referenceNumber: string;
          status: string;
          createdAt: string;
        };
      }

      const totalHits = result.hits.total;
      const total =
        typeof totalHits === "number"
          ? totalHits
          : (totalHits as { value: number })?.value || 0;

      return {
        cases: result.hits.hits.map((hit) => {
          const source = (hit as CaseHit)._source;
          return {
            id: source.id,
            referenceNumber: source.referenceNumber,
            status: source.status,
            createdAt: source.createdAt,
          };
        }),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find cases by person: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return { cases: [], total: 0 };
    }
  }
}
