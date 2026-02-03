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
 * Input schema for note cleanup skill.
 * Validates content and style options.
 */
export const noteCleanupInputSchema = z.object({
  content: z
    .string()
    .min(1)
    .max(50000)
    .describe("The raw note content to clean up"),
  style: z
    .enum(["light", "full"])
    .optional()
    .default("light")
    .describe(
      "Light preserves voice and makes minimal changes; full rewrites completely",
    ),
  context: z
    .string()
    .optional()
    .describe(
      "Optional context about the note (e.g., interview notes, phone call summary)",
    ),
});

export type NoteCleanupInput = z.infer<typeof noteCleanupInputSchema>;

/**
 * Output from note cleanup skill.
 */
export interface NoteCleanupOutput {
  cleanedContent: string;
  changes: Array<{
    type: "grammar" | "formatting" | "clarity" | "structure";
    count: number;
  }>;
  originalLength: number;
  cleanedLength: number;
}

/**
 * Analyze changes between original and cleaned content.
 * Provides a breakdown of the types of changes made.
 *
 * @param original - Original text
 * @param cleaned - Cleaned text
 * @returns Array of change type counts
 */
function analyzeChanges(
  original: string,
  cleaned: string,
): Array<{ type: "grammar" | "formatting" | "clarity" | "structure"; count: number }> {
  const changes: Array<{
    type: "grammar" | "formatting" | "clarity" | "structure";
    count: number;
  }> = [];

  // Count bullet points removed (formatting change)
  const originalBullets = (original.match(/^[\s]*[-*]/gm) || []).length;
  const cleanedBullets = (cleaned.match(/^[\s]*[-*]/gm) || []).length;
  if (originalBullets > cleanedBullets) {
    changes.push({ type: "formatting", count: originalBullets - cleanedBullets });
  }

  // Estimate structural changes based on length difference
  const lengthDiff = Math.abs(cleaned.length - original.length);
  if (lengthDiff > original.length * 0.1) {
    changes.push({ type: "structure", count: 1 });
  }

  // Count sentence changes (rough estimate)
  const originalSentences = original.split(/[.!?]+/).length;
  const cleanedSentences = cleaned.split(/[.!?]+/).length;
  if (Math.abs(originalSentences - cleanedSentences) > 2) {
    changes.push({
      type: "clarity",
      count: Math.abs(originalSentences - cleanedSentences),
    });
  }

  if (changes.length === 0) {
    // Assume at least minor grammar fixes
    changes.push({ type: "grammar", count: 1 });
  }

  return changes;
}

/**
 * Create the note cleanup skill.
 * Transforms bullet points and rough notes into formal narrative prose.
 *
 * Style options:
 * - light: Preserves original voice, fixes grammar and clarity issues
 * - full: Complete rewrite into formal professional prose
 *
 * @param providerRegistry - AI provider registry for making API calls
 * @param rateLimiter - Rate limiter for quota management
 * @param promptService - Prompt template service
 * @returns Note cleanup skill definition
 */
export function noteCleanupSkill(
  providerRegistry: ProviderRegistryService,
  rateLimiter: AiRateLimiterService,
  promptService: PromptService,
): SkillDefinition<NoteCleanupInput, NoteCleanupOutput> {
  return {
    id: "note-cleanup",
    name: "Clean Up Notes",
    description:
      'Transform bullet points and rough notes into formal narrative prose while preserving key information. Use "light" style to preserve original voice, "full" for complete rewrite.',
    scope: SkillScope.PLATFORM,
    requiredPermissions: ["ai:skills:note-cleanup"],

    inputSchema: noteCleanupInputSchema,

    async execute(
      input: NoteCleanupInput,
      context: SkillContext,
    ): Promise<SkillResult<NoteCleanupOutput>> {
      const startTime = Date.now();

      // Estimate tokens (rough: 4 chars per token, input + output)
      const estimatedTokens = Math.ceil(input.content.length / 4) * 2;

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
        // Get provider
        const provider = providerRegistry.getDefaultProvider();

        // Render prompt
        const prompt = await promptService.render(
          "skills/note-cleanup",
          { content: input.content, style: input.style, context: input.context },
          context.organizationId,
        );

        // Call AI
        const response = await provider.createMessage({
          maxTokens: 4096,
          messages: [{ role: "user", content: prompt }],
        });

        const cleanedContent = response.content.trim();

        // Record usage
        await rateLimiter.recordUsage({
          organizationId: context.organizationId,
          userId: context.userId,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          model: provider.defaultModel,
          featureType: "note-cleanup",
          entityType: context.entityType,
          entityId: context.entityId,
          durationMs: Date.now() - startTime,
        });

        // Analyze changes (simplified - real implementation would diff)
        const changes = analyzeChanges(input.content, cleanedContent);

        return {
          success: true,
          data: {
            cleanedContent,
            changes,
            originalLength: input.content.length,
            cleanedLength: cleanedContent.length,
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
          error: error.message || "Note cleanup failed",
        };
      }
    },
  };
}
