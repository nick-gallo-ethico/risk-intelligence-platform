import { z } from "zod";
import {
  SkillDefinition,
  SkillScope,
  SkillContext,
  SkillResult,
} from "../skill.types";
import { ProviderRegistryService } from "../../services/provider-registry.service";
import { FaqService } from "../../../chatbot/services/faq.service";
import { VectorStoreService } from "../../../embeddings/services/vector-store.service";
import { EmbeddingService } from "../../../embeddings/services/embedding.service";
import { ConfidenceTier } from "./faq-match.skill";
import { getErrorMessage } from "@common/utils";

/**
 * Policy citation with relevance score.
 */
export interface PolicyCitation {
  policyId: string;
  policyTitle: string;
  section: string;
  excerpt: string;
  relevanceScore: number;
}

/**
 * Input schema for policy search skill.
 */
export const policySearchInputSchema = z.object({
  query: z.string().min(1).max(1000).describe("The policy question to answer"),
  includeRelated: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include related policy sections"),
  maxChunks: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .describe("Maximum number of policy chunks to retrieve"),
});

export type PolicySearchInput = z.infer<typeof policySearchInputSchema>;

/**
 * Output from policy search skill.
 */
export interface PolicySearchOutput {
  /** Generated answer based on policy context */
  answer: string;
  /** Confidence tier derived from score */
  confidence: ConfidenceTier;
  /** Raw confidence score between 0 and 1 */
  confidenceScore: number;
  /** Policy citations supporting the answer */
  citations: PolicyCitation[];
  /** Clarifying questions for medium confidence responses */
  clarifyingQuestions?: string[];
  /** Whether to suggest escalation to compliance team */
  suggestEscalation: boolean;
  /** Source of the answer: faq, rag, or fallback */
  source: "faq" | "rag" | "fallback";
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
 * Calculate confidence score based on semantic search results.
 * Uses average similarity of top results weighted by position.
 *
 * @param similarities - Array of similarity scores from semantic search
 * @returns Combined confidence score between 0 and 1
 */
function calculateRAGConfidence(similarities: number[]): number {
  if (similarities.length === 0) return 0;

  // Weight top results more heavily
  const weights = similarities.map((_, i) => 1 / (i + 1));
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const weightedSum = similarities.reduce(
    (sum, sim, i) => sum + sim * weights[i],
    0,
  );

  return weightedSum / weightSum;
}

/**
 * Create the policy search skill.
 * Uses FAQ-first, then RAG search for policy questions.
 *
 * Search strategy:
 * 1. Try FAQ match first (FaqService) - curated answers take priority
 * 2. If no FAQ match, use RAG search (VectorStoreService from Phase 43)
 * 3. Generate answer using Claude with retrieved policy context
 *
 * @param faqService - FAQ service for priority matching
 * @param vectorStore - Vector store for semantic search (Phase 43)
 * @param embeddingService - Service to embed query (Phase 43)
 * @param providerRegistry - AI provider for answer generation
 * @returns PolicySearch skill definition
 */
export function policySearchSkill(
  faqService: FaqService,
  vectorStore: VectorStoreService,
  embeddingService: EmbeddingService,
  providerRegistry: ProviderRegistryService,
): SkillDefinition<PolicySearchInput, PolicySearchOutput> {
  return {
    id: "policy-search",
    name: "Search Policy Knowledge Base",
    description:
      "Answer policy questions using FAQ and RAG-based policy search. Returns answer with confidence tier and citations.",
    scope: SkillScope.PLATFORM,
    requiredPermissions: [], // Available to all chatbot users
    entityTypes: ["chatbot", "employee-chatbot"],

    inputSchema: policySearchInputSchema,

    async execute(
      input: PolicySearchInput,
      context: SkillContext,
    ): Promise<SkillResult<PolicySearchOutput>> {
      const startTime = Date.now();

      try {
        // Step 1: Try FAQ match first (priority)
        const faqResult = await faqService.findMatch(
          input.query,
          context.organizationId,
        );

        if (
          faqResult.matched &&
          faqResult.confidence >= 0.85 &&
          faqResult.entry
        ) {
          // High confidence FAQ match - return directly
          return {
            success: true,
            data: {
              answer: faqResult.entry.answer,
              confidence: ConfidenceTier.HIGH,
              confidenceScore: faqResult.confidence,
              citations:
                faqResult.entry.relatedPolicies?.map((p) => ({
                  policyId: p.policyId,
                  policyTitle: p.title,
                  section: p.section || "",
                  excerpt: "",
                  relevanceScore: 1.0,
                })) || [],
              suggestEscalation: false,
              source: "faq",
            },
            metadata: {
              durationMs: Date.now() - startTime,
            },
          };
        }

        // Step 2: RAG search using VectorStoreService (Phase 43)
        // Check if embedding service is ready
        if (!embeddingService.isReady()) {
          // Fallback to AI-only response without RAG
          return generateFallbackResponse(
            input,
            context,
            faqResult,
            providerRegistry,
            startTime,
          );
        }

        // Embed the query for semantic search
        const queryEmbedding = await embeddingService.embedQuery(input.query);

        // Search for relevant policy chunks
        const searchResults = await vectorStore.semanticSearch(
          context.organizationId,
          queryEmbedding,
          {
            limit: input.maxChunks,
            sourceTypes: ["POLICY_VERSION", "KNOWLEDGE_BASE"],
            minSimilarity: 0.3, // Low threshold, confidence derives from results
          },
        );

        if (searchResults.length === 0) {
          // No RAG results, use fallback
          return generateFallbackResponse(
            input,
            context,
            faqResult,
            providerRegistry,
            startTime,
          );
        }

        // Calculate RAG confidence from semantic similarities
        const similarities = searchResults.map((r) => r.similarity);
        const ragConfidence = calculateRAGConfidence(similarities);
        const tier = deriveConfidenceTier(ragConfidence);

        // Build context from retrieved chunks
        const policyContext = searchResults
          .map((r, i) => {
            const meta = r.metadata as Record<string, unknown>;
            const title = (meta.policyTitle as string) || "Policy";
            const section = (meta.section as string) || "";
            return `[${i + 1}] ${title}${section ? ` - ${section}` : ""}\n${r.text}`;
          })
          .join("\n\n");

        // Step 3: Generate answer with AI using retrieved context
        const provider = providerRegistry.getDefaultProvider();
        const prompt = buildRAGPrompt(input.query, policyContext, tier);

        const response = await provider.createMessage({
          maxTokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        // Extract citations from search results
        const citations: PolicyCitation[] = searchResults.map((r) => {
          const meta = r.metadata as Record<string, unknown>;
          return {
            policyId: r.sourceId,
            policyTitle:
              (meta.policyTitle as string) ||
              (meta.title as string) ||
              "Policy",
            section: (meta.section as string) || "",
            excerpt:
              r.text.substring(0, 200) + (r.text.length > 200 ? "..." : ""),
            relevanceScore: r.similarity,
          };
        });

        // Generate clarifying questions for medium confidence
        const clarifyingQuestions =
          tier === ConfidenceTier.MEDIUM
            ? generateClarifyingQuestions(input.query)
            : undefined;

        return {
          success: true,
          data: {
            answer: response.content.trim(),
            confidence: tier,
            confidenceScore: ragConfidence,
            citations,
            clarifyingQuestions,
            suggestEscalation: tier === ConfidenceTier.LOW,
            source: "rag",
          },
          metadata: {
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            durationMs: Date.now() - startTime,
            model: provider.defaultModel,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: getErrorMessage(error) || "Policy search failed",
        };
      }
    },
  };
}

/**
 * Build prompt for RAG-based policy answer generation.
 *
 * @param query - User's question
 * @param context - Retrieved policy chunks
 * @param tier - Confidence tier to guide response style
 * @returns Formatted prompt for AI
 */
function buildRAGPrompt(
  query: string,
  context: string,
  tier: ConfidenceTier,
): string {
  let confidenceGuidance = "";

  switch (tier) {
    case ConfidenceTier.HIGH:
      confidenceGuidance =
        "The retrieved policy content appears highly relevant. Provide a direct, confident answer based on the policy information.";
      break;
    case ConfidenceTier.MEDIUM:
      confidenceGuidance =
        "The retrieved policy content is somewhat relevant. Provide a balanced answer but acknowledge any areas of uncertainty.";
      break;
    case ConfidenceTier.LOW:
      confidenceGuidance =
        "The retrieved policy content has limited relevance. Provide general guidance and strongly recommend consulting with the compliance team for a definitive answer.";
      break;
  }

  return `You are a helpful compliance assistant answering questions about company policies.

USER QUESTION: "${query}"

RELEVANT POLICY CONTENT:
${context}

GUIDANCE: ${confidenceGuidance}

Instructions:
1. Answer the question using ONLY the provided policy content
2. Do NOT make up policy details not found in the content
3. If the content doesn't directly answer the question, say so clearly
4. Use specific quotes and section references when applicable
5. Keep the answer concise but comprehensive
6. If recommending escalation, be helpful about next steps

Provide your answer:`;
}

/**
 * Generate fallback response when RAG is unavailable.
 * Uses FAQ alternates and general AI response.
 */
async function generateFallbackResponse(
  input: PolicySearchInput,
  context: SkillContext,
  faqResult: { alternates?: Array<{ question: string; answer: string }> },
  providerRegistry: ProviderRegistryService,
  startTime: number,
): Promise<SkillResult<PolicySearchOutput>> {
  const provider = providerRegistry.getDefaultProvider();

  let prompt = `You are a helpful compliance assistant. A user has asked the following question about company policies:

"${input.query}"

`;

  // Include any partial FAQ matches as context
  if (faqResult.alternates && faqResult.alternates.length > 0) {
    prompt += `Here are some related FAQ entries that may help:

`;
    for (const alt of faqResult.alternates.slice(0, 3)) {
      prompt += `Q: ${alt.question}
A: ${alt.answer}

`;
    }
  }

  prompt += `Please provide a helpful response. If you're not certain about the answer:
1. Acknowledge the uncertainty
2. Provide general guidance based on common compliance practices
3. Suggest the user consult with the compliance team for a definitive answer

Do not make up specific policy details. If no relevant information is available, offer to escalate to the compliance team.`;

  const response = await provider.createMessage({
    maxTokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const tier = ConfidenceTier.LOW;

  return {
    success: true,
    data: {
      answer: response.content.trim(),
      confidence: tier,
      confidenceScore: 0.4, // Low confidence for fallback
      citations: [], // No citations in fallback mode
      clarifyingQuestions: generateClarifyingQuestions(input.query),
      suggestEscalation: true,
      source: "fallback",
    },
    metadata: {
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      durationMs: Date.now() - startTime,
      model: provider.defaultModel,
    },
  };
}

/**
 * Generate clarifying questions for medium-confidence responses.
 * Helps narrow down the user's specific situation.
 *
 * @param query - User's original question
 * @returns Array of clarifying questions (max 2)
 */
function generateClarifyingQuestions(query: string): string[] {
  const questions: string[] = [];
  const lowerQuery = query.toLowerCase();

  // Topic-specific clarifying questions
  if (lowerQuery.includes("gift")) {
    questions.push("What is the approximate value of the gift?");
    questions.push("Who is the gift from (vendor, client, colleague)?");
  } else if (lowerQuery.includes("conflict") || lowerQuery.includes("coi")) {
    questions.push("What is your relationship to the other party?");
    questions.push("Does this involve a financial interest?");
  } else if (
    lowerQuery.includes("disclose") ||
    lowerQuery.includes("disclosure")
  ) {
    questions.push(
      "What type of relationship or activity needs to be disclosed?",
    );
    questions.push("Is this a new situation or an existing arrangement?");
  } else if (lowerQuery.includes("travel") || lowerQuery.includes("expense")) {
    questions.push("Is this for domestic or international travel?");
    questions.push("Who is funding the travel (company, vendor, personal)?");
  } else if (
    lowerQuery.includes("vendor") ||
    lowerQuery.includes("contractor")
  ) {
    questions.push("What services is the vendor providing?");
    questions.push("Is there an existing contract in place?");
  }

  // Generic clarifying questions if no specific match
  if (questions.length === 0) {
    questions.push(
      "Could you provide more details about your specific situation?",
    );
    questions.push("What department or business unit does this relate to?");
  }

  return questions.slice(0, 2);
}
