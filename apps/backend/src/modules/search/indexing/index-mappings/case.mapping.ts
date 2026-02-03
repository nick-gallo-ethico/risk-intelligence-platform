/**
 * Elasticsearch mapping for Case documents.
 *
 * This mapping defines the structure for indexing Case entities
 * to enable full-text search with fuzzy matching, compliance synonyms,
 * highlighting, and pattern detection via denormalized associations.
 *
 * Association Denormalization Strategy:
 * - associations.persons: Nested for complex queries ("Person X as SUBJECT AND Person Y as WITNESS")
 * - associations.rius: Nested for RIU-to-Case link queries
 * - associations.linkedCases: Nested for case-to-case relationship queries
 * - Flattened arrays (personIds, subjectPersonIds, etc.): For simple faceting and aggregations
 *
 * Per CONTEXT.md: "Association search is a wow moment in demos" - pre-indexed for instant results.
 */
export const CASE_INDEX_MAPPING = {
  mappings: {
    properties: {
      // Identifiers
      referenceNumber: { type: "keyword" },
      id: { type: "keyword" },
      organizationId: { type: "keyword" },

      // Status and Classification
      status: { type: "keyword" },
      severity: { type: "keyword" },
      caseType: { type: "keyword" },
      categoryName: { type: "keyword" },
      categoryId: { type: "keyword" },
      primaryCategoryId: { type: "keyword" },
      primaryCategoryName: {
        type: "text",
        fields: { keyword: { type: "keyword" } },
      },
      secondaryCategoryId: { type: "keyword" },

      // Pipeline
      pipelineStage: { type: "keyword" },
      outcome: { type: "keyword" },

      // Searchable text fields
      details: { type: "text", analyzer: "compliance_analyzer" },
      summary: { type: "text", analyzer: "compliance_analyzer" },
      aiSummary: { type: "text", analyzer: "compliance_analyzer" },
      addendum: { type: "text", analyzer: "standard" },

      // Reporter information
      reporterType: { type: "keyword" },
      reporterRelationship: { type: "keyword" },

      // Location
      locationName: { type: "text" },
      locationCity: { type: "keyword" },
      locationState: { type: "keyword" },
      locationCountry: { type: "keyword" },
      locationAddress: { type: "text" },

      // Source
      sourceChannel: { type: "keyword" },

      // Assignment
      assigneeId: { type: "keyword" },
      assigneeName: { type: "text" },
      intakeOperatorId: { type: "keyword" },

      // Organization scope
      businessUnitId: { type: "keyword" },

      // Metadata
      tags: { type: "keyword" },
      createdById: { type: "keyword" },
      createdByName: { type: "text" },

      // Timestamps
      createdAt: { type: "date" },
      updatedAt: { type: "date" },
      intakeTimestamp: { type: "date" },
      releasedAt: { type: "date" },

      // ===========================================
      // DENORMALIZED ASSOCIATIONS for Pattern Detection
      // ===========================================
      // Nested types enable complex boolean queries like:
      // "Cases where Person A was SUBJECT AND Person B was WITNESS"

      associations: {
        properties: {
          // Person-to-Case associations (nested for complex queries)
          persons: {
            type: "nested",
            properties: {
              personId: { type: "keyword" },
              personName: {
                type: "text",
                fields: { keyword: { type: "keyword" } },
              },
              personEmail: { type: "keyword" },
              label: { type: "keyword" }, // REPORTER, SUBJECT, WITNESS, ASSIGNED_INVESTIGATOR, etc.
              evidentiaryStatus: { type: "keyword" }, // ACTIVE, CLEARED, SUBSTANTIATED, WITHDRAWN
              isActive: { type: "boolean" },
            },
          },

          // RIU-to-Case associations (nested for RIU type filtering)
          rius: {
            type: "nested",
            properties: {
              riuId: { type: "keyword" },
              riuReferenceNumber: { type: "keyword" },
              associationType: { type: "keyword" }, // PRIMARY, RELATED, MERGED_FROM
              riuType: { type: "keyword" }, // HOTLINE_REPORT, WEB_FORM_SUBMISSION, etc.
            },
          },

          // Case-to-Case associations (nested for relationship queries)
          linkedCases: {
            type: "nested",
            properties: {
              caseId: { type: "keyword" },
              caseReferenceNumber: { type: "keyword" },
              label: { type: "keyword" }, // PARENT, CHILD, SPLIT_FROM, MERGED_INTO, RELATED, etc.
            },
          },
        },
      },

      // ===========================================
      // FLATTENED ARRAYS for Simple Faceting
      // ===========================================
      // Duplicates nested data for efficient aggregations and simple filters.
      // Use these for "show all cases with this person" style queries.

      personIds: { type: "keyword" },
      subjectPersonIds: { type: "keyword" },
      witnessPersonIds: { type: "keyword" },
      reporterPersonIds: { type: "keyword" },
      investigatorPersonIds: { type: "keyword" },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0, // Dev setting - increase in prod
    analysis: {
      analyzer: {
        compliance_analyzer: {
          type: "custom",
          tokenizer: "standard",
          filter: ["lowercase", "asciifolding", "compliance_synonyms"],
        },
      },
      filter: {
        compliance_synonyms: {
          type: "synonym",
          synonyms: [
            "harassment, bullying, hostile work environment",
            "theft, stealing, embezzlement, misappropriation",
            "fraud, deception, misrepresentation, falsification",
            "discrimination, bias, prejudice, unfair treatment",
            "retaliation, retribution, revenge, reprisal",
            "bribery, kickback, payoff, corruption",
            "conflict of interest, coi, dual interest",
            "hipaa, patient privacy, phi, protected health information",
            "whistleblower, reporter, complainant",
            "investigation, inquiry, examination, review",
            "termination, firing, dismissal, layoff",
            "promotion, advancement, raise, salary increase",
          ],
        },
      },
    },
  },
};

/**
 * TypeScript type for Case documents indexed in Elasticsearch.
 * Mirrors the CASE_INDEX_MAPPING structure for type safety.
 */
export interface CaseDocument {
  // Identifiers
  id: string;
  organizationId: string;
  referenceNumber: string;

  // Status and Classification
  status: string;
  severity: string;
  caseType?: string;
  categoryId?: string;
  categoryName?: string;
  primaryCategoryId?: string;
  primaryCategoryName?: string;
  secondaryCategoryId?: string;

  // Pipeline
  pipelineStage?: string;
  outcome?: string;

  // Content
  details: string;
  summary?: string;
  aiSummary?: string;
  addendum?: string;

  // Reporter
  reporterType?: string;
  reporterRelationship?: string;

  // Location
  locationName?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  locationAddress?: string;

  // Source
  sourceChannel?: string;

  // Assignment
  assigneeId?: string;
  assigneeName?: string;
  intakeOperatorId?: string;

  // Organization scope
  businessUnitId?: string;

  // Metadata
  tags?: string[];
  createdById?: string;
  createdByName?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  intakeTimestamp?: string;
  releasedAt?: string;

  // Denormalized Associations
  associations: {
    persons: Array<{
      personId: string;
      personName: string;
      personEmail?: string;
      label: string;
      evidentiaryStatus?: string;
      isActive: boolean;
    }>;
    rius: Array<{
      riuId: string;
      riuReferenceNumber: string;
      associationType: string;
      riuType: string;
    }>;
    linkedCases: Array<{
      caseId: string;
      caseReferenceNumber: string;
      label: string;
    }>;
  };

  // Flattened arrays for faceting
  personIds: string[];
  subjectPersonIds: string[];
  witnessPersonIds: string[];
  reporterPersonIds: string[];
  investigatorPersonIds: string[];
}
