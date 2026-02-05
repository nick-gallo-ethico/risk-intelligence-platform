/**
 * Elasticsearch mapping for Policy documents.
 *
 * This mapping defines the structure for indexing Policy entities
 * to enable full-text search across policy content including translations,
 * with compliance-specific synonyms and multilingual support.
 *
 * Per CONTEXT.md: Search responds within 500ms.
 * Per tenant pattern: org_{organizationId}_policies
 */
export const POLICY_INDEX_MAPPING = {
  mappings: {
    properties: {
      // Identity
      id: { type: "keyword" },
      organizationId: { type: "keyword" },
      slug: { type: "keyword" },

      // Core fields (searchable)
      title: {
        type: "text",
        analyzer: "compliance_analyzer",
        fields: { keyword: { type: "keyword" } },
      },
      policyType: { type: "keyword" },
      category: { type: "keyword" },
      status: { type: "keyword" },

      // Content (main searchable text)
      content: {
        type: "text",
        analyzer: "compliance_analyzer",
      },
      plainText: {
        type: "text",
        analyzer: "compliance_analyzer",
      },
      summary: {
        type: "text",
        analyzer: "compliance_analyzer",
      },

      // Version tracking
      currentVersion: { type: "integer" },
      versionLabel: { type: "keyword" },
      latestVersionId: { type: "keyword" },

      // Dates
      effectiveDate: { type: "date" },
      reviewDate: { type: "date" },
      publishedAt: { type: "date" },
      createdAt: { type: "date" },
      updatedAt: { type: "date" },

      // Ownership
      ownerId: { type: "keyword" },
      ownerName: {
        type: "text",
        fields: { keyword: { type: "keyword" } },
      },
      ownerEmail: { type: "keyword" },

      // Translations (denormalized for search)
      translationLanguages: { type: "keyword" }, // Array: ['es', 'fr', 'de']
      translatedContent: {
        type: "text",
        analyzer: "multilingual_analyzer",
      },

      // Statistics (denormalized)
      hasActiveAttestationCampaign: { type: "boolean" },
      linkedCaseCount: { type: "integer" },
      attestationCompletionRate: { type: "float" },

      // Approval status
      approvalStatus: { type: "keyword" }, // null, PENDING, APPROVED
      workflowInstanceId: { type: "keyword" },
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
        multilingual_analyzer: {
          type: "custom",
          tokenizer: "standard",
          filter: ["lowercase", "asciifolding"],
        },
      },
      filter: {
        compliance_synonyms: {
          type: "synonym",
          synonyms: [
            "policy, procedure, guideline, standard",
            "conduct, behavior, behaviour",
            "harassment, bullying, discrimination, hostile",
            "bribery, corruption, kickback, payoff",
            "privacy, confidentiality, data protection, pii",
            "whistleblower, speak up, report, hotline",
            "ethics, integrity, compliance",
            "code of conduct, coc, employee handbook",
            "anti-corruption, fcpa, uk bribery act",
            "conflict of interest, coi, dual interest",
            "information security, infosec, data security",
            "acceptable use, aup, it policy",
          ],
        },
      },
    },
  },
};

/**
 * TypeScript type for Policy documents indexed in Elasticsearch.
 * Mirrors the POLICY_INDEX_MAPPING structure for type safety.
 */
export interface PolicyDocument {
  // Identity
  id: string;
  organizationId: string;
  slug: string;

  // Core fields
  title: string;
  policyType: string;
  category?: string;
  status: string;

  // Content
  content?: string;
  plainText?: string;
  summary?: string;

  // Version tracking
  currentVersion: number;
  versionLabel?: string;
  latestVersionId?: string;

  // Dates
  effectiveDate?: string;
  reviewDate?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Ownership
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;

  // Translations
  translationLanguages: string[];
  translatedContent?: string;

  // Statistics
  hasActiveAttestationCampaign: boolean;
  linkedCaseCount: number;
  attestationCompletionRate?: number;

  // Approval status
  approvalStatus?: string;
  workflowInstanceId?: string;
}

export const POLICY_INDEX_NAME = "policies";
