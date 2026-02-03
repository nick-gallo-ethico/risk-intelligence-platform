import { z } from "zod";
import {
  SkillDefinition,
  SkillScope,
  SkillContext,
  SkillResult,
} from "../skill.types";
import { ProviderRegistryService } from "../../services/provider-registry.service";
import { AiRateLimiterService } from "../../services/rate-limiter.service";
import { PromptService } from "../../services/prompt.service";

/**
 * Input schema for summarize skill.
 * Validates content and style options.
 */
export const summarizeInputSchema = z.object({
  content: z
    .string()
    .min(1)
    .max(100000)
    .describe("The content to summarize"),
  style: z
    .enum(["brief", "comprehensive"])
    .optional()
    .default("brief")
    .describe(
      "Brief: 1-2 paragraphs. Comprehensive: full structured summary with sections.",
    ),
  entityType: z
    .string()
    .optional()
    .describe(
      "Type of entity being summarized (case, investigation, campaign)",
    ),
  additionalContext: z
    .string()
    .optional()
    .describe("Additional context to inform the summary"),
});

export type SummarizeInput = z.infer<typeof summarizeInputSchema>;

/**
 * Output from summarize skill.
 */
export interface SummarizeOutput {
  summary: string;
  style: "brief" | "comprehensive";
  wordCount: number;
  keyPoints?: string[];
  confidence?: number; // 0-1, only shown if < 0.8
}

/**
 * Extract key points from a comprehensive summary.
 * Looks for bullet points, numbered items, or section first sentences.
 *
 * @param summary - The generated summary text
 * @returns Array of key point strings (max 5)
 */
function extractKeyPoints(summary: string): string[] {
  const points: string[] = [];

  // Look for bullet points
  const bulletMatches = summary.match(/^[\s]*[-*]\s*(.+)$/gm);
  if (bulletMatches) {
    points.push(
      ...bulletMatches.map((m) => m.replace(/^[\s]*[-*]\s*/, "").trim()),
    );
  }

  // Look for numbered items
  const numberedMatches = summary.match(/^\d+\.\s*(.+)$/gm);
  if (numberedMatches) {
    points.push(
      ...numberedMatches.map((m) => m.replace(/^\d+\.\s*/, "").trim()),
    );
  }

  // If no explicit points found, extract first sentence of each section
  if (points.length === 0) {
    const sections = summary.split(/##\s+/);
    for (const section of sections) {
      const firstSentence = section.match(/^[A-Z][^.!?]*[.!?]/);
      if (firstSentence) {
        points.push(firstSentence[0].trim());
      }
    }
  }

  return points.slice(0, 5); // Max 5 key points
}

/**
 * Calculate confidence score for a summary.
 * Based on compression ratio and content overlap.
 *
 * @param original - Original content
 * @param summary - Generated summary
 * @returns Confidence score between 0 and 1
 */
function calculateConfidence(original: string, summary: string): number {
  // Simple heuristic based on compression ratio and content overlap
  const compressionRatio = summary.length / original.length;

  // Very short summaries of long content might miss important details
  if (compressionRatio < 0.05 && original.length > 5000) {
    return 0.6;
  }

  // Check if key terms from original appear in summary
  const originalWords = new Set(
    original.toLowerCase().match(/\b\w{4,}\b/g) || [],
  );
  const summaryWords = new Set(
    summary.toLowerCase().match(/\b\w{4,}\b/g) || [],
  );

  let overlap = 0;
  for (const word of summaryWords) {
    if (originalWords.has(word)) {
      overlap++;
    }
  }

  const overlapRatio = summaryWords.size > 0 ? overlap / summaryWords.size : 0;

  // Confidence based on overlap (0.7 base + 0.3 from overlap)
  return Math.min(0.7 + overlapRatio * 0.3, 1);
}

/**
 * Create the summarize skill.
 * Generates brief or comprehensive summaries of content.
 *
 * Style options:
 * - brief: 1-2 paragraph overview focused on key points
 * - comprehensive: Full structured summary with sections (Background, Key Facts, etc.)
 *
 * @param providerRegistry - AI provider registry for making API calls
 * @param rateLimiter - Rate limiter for quota management
 * @param promptService - Prompt template service
 * @returns Summarize skill definition
 */
export function summarizeSkill(
  providerRegistry: ProviderRegistryService,
  rateLimiter: AiRateLimiterService,
  promptService: PromptService,
): SkillDefinition<SummarizeInput, SummarizeOutput> {
  return {
    id: "summarize",
    name: "Generate Summary",
    description:
      "Generate a brief or comprehensive summary of content. Brief summaries are 1-2 paragraphs. Comprehensive summaries include structured sections.",
    scope: SkillScope.PLATFORM,
    requiredPermissions: ["ai:skills:summarize"],

    inputSchema: summarizeInputSchema,

    async execute(
      input: SummarizeInput,
      context: SkillContext,
    ): Promise<SkillResult<SummarizeOutput>> {
      const startTime = Date.now();

      // Estimate tokens
      const estimatedTokens =
        Math.ceil(input.content.length / 4) +
        (input.style === "comprehensive" ? 1000 : 300);

      // Check rate limit
      const rateLimitResult = await rateLimiter.checkAndConsume({
        organizationId: context.organizationId,
        estimatedTokens,
      });

      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded. Retry after ${Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000)} seconds.`,
        };
      }

      try {
        const provider = providerRegistry.getDefaultProvider();

        // Render prompt
        const prompt = await promptService.render(
          "skills/summarize",
          {
            content: input.content,
            style: input.style,
            entity: input.entityType ? { type: input.entityType } : undefined,
            additionalContext: input.additionalContext,
          },
          context.organizationId,
        );

        // Call AI
        const response = await provider.createMessage({
          maxTokens: input.style === "comprehensive" ? 2048 : 512,
          messages: [{ role: "user", content: prompt }],
        });

        const summary = response.content.trim();

        // Record usage
        await rateLimiter.recordUsage({
          organizationId: context.organizationId,
          userId: context.userId,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          model: provider.defaultModel,
          featureType: "summarize",
          entityType: context.entityType,
          entityId: context.entityId,
          durationMs: Date.now() - startTime,
        });

        // Extract key points for comprehensive summaries
        const keyPoints =
          input.style === "comprehensive"
            ? extractKeyPoints(summary)
            : undefined;

        // Calculate confidence (simplified - would be model-based in production)
        const confidence = calculateConfidence(input.content, summary);

        return {
          success: true,
          data: {
            summary,
            style: input.style || "brief",
            wordCount: summary.split(/\s+/).length,
            keyPoints,
            confidence: confidence < 0.8 ? confidence : undefined, // Only show if low
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
          error: error.message || "Summarization failed",
        };
      }
    },
  };
}
