/**
 * FAQ Entry entity interfaces matching Prisma FaqEntry model.
 * Used for chatbot priority matching - FAQs are checked before RAG search.
 */

/**
 * Status of an FAQ entry.
 */
export enum FaqStatus {
  ACTIVE = "ACTIVE",
  DRAFT = "DRAFT",
  ARCHIVED = "ARCHIVED",
}

/**
 * Reference to a related policy with summary info.
 */
export interface RelatedPolicy {
  /** Policy ID */
  policyId: string;
  /** Policy title for display */
  title: string;
  /** Specific section reference if applicable */
  section?: string;
  /** Version number of the policy */
  version?: number;
}

/**
 * FAQ entry for chatbot priority matching.
 * FAQs are matched first before falling back to RAG search.
 */
export interface FaqEntry {
  id: string;
  organizationId: string;
  question: string;
  /** Vector embedding of the question for similarity search */
  questionVector?: number[];
  answer: string;
  /** Related policies that support this FAQ answer */
  relatedPolicies?: RelatedPolicy[];
  category?: string;
  tags: string[];
  /** Higher priority = matched first (0 = normal) */
  priority: number;
  status: FaqStatus;
  /** Number of times this FAQ was viewed */
  viewCount: number;
  /** Number of times users marked this as helpful */
  helpfulCount: number;
  createdById: string;
  updatedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * FAQ entry with computed fields for API responses.
 */
export interface FaqEntryWithMetrics extends FaqEntry {
  /** Helpfulness ratio (helpfulCount / viewCount) */
  helpfulnessRatio?: number;
  /** Similarity score when returned from vector search */
  similarityScore?: number;
}
