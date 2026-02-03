/**
 * Elasticsearch mapping for RIU (Risk Intelligence Unit) documents.
 *
 * RIUs are immutable intake records. This mapping mirrors the Case mapping
 * with fields specific to RIU entity structure.
 */
export const RIU_INDEX_MAPPING = {
  mappings: {
    properties: {
      // Identifiers
      referenceNumber: { type: "keyword" },
      id: { type: "keyword" },

      // Type and Source
      type: { type: "keyword" },
      sourceChannel: { type: "keyword" },
      status: { type: "keyword" },

      // Classification
      categoryId: { type: "keyword" },
      categoryName: { type: "keyword" },
      severity: { type: "keyword" },

      // Searchable text fields
      details: { type: "text", analyzer: "compliance_analyzer" },
      summary: { type: "text", analyzer: "compliance_analyzer" },
      aiSummary: { type: "text", analyzer: "compliance_analyzer" },
      aiTranslation: { type: "text", analyzer: "standard" },

      // Reporter information
      reporterType: { type: "keyword" },

      // Location
      locationName: { type: "text" },
      locationCity: { type: "keyword" },
      locationState: { type: "keyword" },
      locationCountry: { type: "keyword" },
      locationAddress: { type: "text" },

      // Campaign linkage
      campaignId: { type: "keyword" },

      // AI enrichment
      aiRiskScore: { type: "float" },
      aiLanguageDetected: { type: "keyword" },
      aiConfidenceScore: { type: "integer" },

      // Metadata
      createdById: { type: "keyword" },
      createdByName: { type: "text" },

      // Timestamps
      createdAt: { type: "date" },
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
