import { z } from "zod";
import {
  SkillDefinition,
  SkillScope,
  SkillContext,
  SkillResult,
} from "../skill.types";
import {
  FaqService,
  FaqMatchResult,
} from "../../../chatbot/services/faq.service";

/**
 * Confidence tier for chatbot responses.
 * Maps to UI treatment per PRD requirements:
 * - HIGH (>85%): Direct answer with source
 * - MEDIUM (50-85%): Answer with clarifying questions
 * - LOW (<50%): Offer escalation to compliance team
 */
export enum ConfidenceTier {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * Input schema for FAQ match skill.
 */
export const faqMatchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(1000)
    .describe("The question to match against FAQ entries"),
  includeAlternates: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include alternate FAQ matches"),
});

export type FaqMatchInput = z.infer<typeof faqMatchInputSchema>;

/**
 * Output from FAQ match skill.
 */
export interface FaqMatchOutput {
  /** Whether a high-confidence match was found */
  matched: boolean;
  /** Confidence tier derived from score */
  confidence: ConfidenceTier;
  /** Raw confidence score between 0 and 1 */
  confidenceScore: number;
  /** The answer text if matched */
  answer?: string;
  /** Policy citations supporting the answer */
  citations?: Array<{
    policyId: string;
    policyTitle: string;
    section?: string;
    excerpt?: string;
  }>;
  /** Alternative FAQ matches below the primary */
  alternates?: Array<{
    question: string;
    answer: string;
    confidence: number;
  }>;
  /** Whether to suggest escalation to compliance team */
  suggestEscalation: boolean;
}

/**
 * Derive confidence tier from numeric score.
 * Thresholds per PRD:
 * - HIGH: >= 85%
 * - MEDIUM: >= 50%
 * - LOW: < 50%
 *
 * @param score - Confidence score between 0 and 1
 * @returns Derived confidence tier
 */
function deriveConfidenceTier(score: number): ConfidenceTier {
  const percentage = score * 100;
  if (percentage >= 85) return ConfidenceTier.HIGH;
  if (percentage >= 50) return ConfidenceTier.MEDIUM;
  return ConfidenceTier.LOW;
}

/**
 * Create the FAQ match skill.
 * Searches curated FAQ entries first before RAG fallback.
 *
 * This is the PRIORITY skill for policy questions - always try FAQ first
 * to ensure curated answers take precedence over AI-generated responses.
 *
 * FAQ matching uses PostgreSQL full-text search with priority boost:
 * - to_tsvector/plainto_tsquery for text matching
 * - ts_rank for relevance scoring
 * - Priority field adds 0.1 per priority level to score
 *
 * @param faqService - FAQ service for full-text search matching
 * @returns FaqMatch skill definition
 */
export function faqMatchSkill(
  faqService: FaqService,
): SkillDefinition<FaqMatchInput, FaqMatchOutput> {
  return {
    id: "faq-match",
    name: "Match FAQ Entry",
    description:
      "Search curated FAQ entries for policy questions. Returns matched FAQ answer with confidence tier.",
    scope: SkillScope.PLATFORM,
    requiredPermissions: [], // Available to all chatbot users
    entityTypes: ["chatbot", "employee-chatbot"],

    inputSchema: faqMatchInputSchema,

    async execute(
      input: FaqMatchInput,
      context: SkillContext,
    ): Promise<SkillResult<FaqMatchOutput>> {
      try {
        const result: FaqMatchResult = await faqService.findMatch(
          input.query,
          context.organizationId,
        );

        const tier = deriveConfidenceTier(result.confidence);

        // Mark FAQ as helpful if matched with high confidence
        // This tracks successful matches for analytics
        if (result.matched && result.entry && tier === ConfidenceTier.HIGH) {
          // Fire and forget - don't block on this
          faqService
            .markHelpful(result.entry.id, context.organizationId)
            .catch(() => {
              // Swallow errors - helpful count is non-critical
            });
        }

        return {
          success: true,
          data: {
            matched: result.matched && tier === ConfidenceTier.HIGH,
            confidence: tier,
            confidenceScore: result.confidence,
            answer: result.entry?.answer,
            citations: result.entry?.relatedPolicies?.map((p) => ({
              policyId: p.policyId,
              policyTitle: p.title,
              section: p.section,
              excerpt: undefined, // Not stored in FAQ entry
            })),
            alternates: input.includeAlternates
              ? result.alternates?.map((alt) => ({
                  question: alt.question,
                  answer: alt.answer,
                  confidence: 0.5, // Lower confidence for alternates
                }))
              : undefined,
            suggestEscalation: tier === ConfidenceTier.LOW,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message || "FAQ match failed",
        };
      }
    },
  };
}
