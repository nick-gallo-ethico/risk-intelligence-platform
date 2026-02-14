/**
 * Elasticsearch mapping for Investigation documents.
 *
 * Investigations are linked to Cases and contain the detailed
 * work product of compliance investigations.
 */
export const INVESTIGATION_INDEX_MAPPING = {
  mappings: {
    properties: {
      // Identifiers
      id: { type: "keyword" },
      organizationId: { type: "keyword" },
      referenceNumber: { type: "keyword" },
      caseId: { type: "keyword" },

      // Status and Classification
      status: { type: "keyword" },
      outcome: { type: "keyword" },

      // Searchable text fields
      title: { type: "text", analyzer: "compliance_analyzer" },
      description: { type: "text", analyzer: "compliance_analyzer" },
      findings: { type: "text", analyzer: "compliance_analyzer" },
      notes: { type: "text", analyzer: "standard" },

      // Assignment
      primaryInvestigatorId: { type: "keyword" },
      primaryInvestigatorName: { type: "text" },

      // Template
      templateId: { type: "keyword" },
      templateName: { type: "keyword" },

      // Progress
      checklistProgress: { type: "float" },
      completedItems: { type: "integer" },
      totalItems: { type: "integer" },

      // Metadata
      createdById: { type: "keyword" },
      createdByName: { type: "text" },

      // Timestamps
      createdAt: { type: "date" },
      updatedAt: { type: "date" },
      startedAt: { type: "date" },
      closedAt: { type: "date" },

      // ===========================================
      // CUSTOM FIELDS (Dynamic Object)
      // ===========================================
      customFields: {
        type: "object",
        dynamic: true,
        properties: {},
      },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
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
 * TypeScript type for Investigation documents indexed in Elasticsearch.
 */
export interface InvestigationDocument {
  id: string;
  organizationId: string;
  referenceNumber?: string;
  caseId: string;

  status: string;
  outcome?: string;

  title?: string;
  description?: string;
  findings?: string;
  notes?: string;

  primaryInvestigatorId?: string;
  primaryInvestigatorName?: string;

  templateId?: string;
  templateName?: string;

  checklistProgress?: number;
  completedItems?: number;
  totalItems?: number;

  createdById?: string;
  createdByName?: string;

  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  closedAt?: string;

  customFields?: Record<string, unknown>;
}
