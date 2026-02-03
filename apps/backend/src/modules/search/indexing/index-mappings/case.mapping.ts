/**
 * Elasticsearch mapping for Case documents.
 *
 * This mapping defines the structure for indexing Case entities
 * to enable full-text search with fuzzy matching, compliance synonyms,
 * and highlighting.
 */
export const CASE_INDEX_MAPPING = {
  mappings: {
    properties: {
      // Identifiers
      referenceNumber: { type: "keyword" },
      id: { type: "keyword" },

      // Status and Classification
      status: { type: "keyword" },
      severity: { type: "keyword" },
      caseType: { type: "keyword" },
      categoryName: { type: "keyword" },
      categoryId: { type: "keyword" },
      primaryCategoryId: { type: "keyword" },
      secondaryCategoryId: { type: "keyword" },

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
