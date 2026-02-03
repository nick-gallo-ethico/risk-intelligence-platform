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
 * Input schema for category suggestion skill.
 * Validates content and optional categories list.
 */
export const categorySuggestInputSchema = z.object({
  content: z
    .string()
    .min(10)
    .max(50000)
    .describe("Content to categorize (report text, intake notes, etc.)"),
  categories: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional()
    .describe(
      "Available categories. If not provided, uses organization defaults.",
    ),
});

export type CategorySuggestInput = z.infer<typeof categorySuggestInputSchema>;

/**
 * A single category suggestion with confidence and reasoning.
 */
export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
}

/**
 * Output from category suggestion skill.
 */
export interface CategorySuggestOutput {
  suggestions: CategorySuggestion[];
  indicators: string[];
  topSuggestion?: CategorySuggestion;
}

/**
 * Create the category suggestion skill.
 * Analyzes content and suggests appropriate compliance categories with
 * confidence scores and reasoning.
 *
 * This skill enables:
 * - Real-time categorization during intake
 * - Bulk re-categorization of existing reports
 * - Validation of human-assigned categories
 *
 * @param providerRegistry - AI provider registry for making API calls
 * @param rateLimiter - Rate limiter for quota management
 * @param promptService - Prompt template service
 * @returns Category suggestion skill definition
 */
export function categorySuggestSkill(
  providerRegistry: ProviderRegistryService,
  rateLimiter: AiRateLimiterService,
  promptService: PromptService,
): SkillDefinition<CategorySuggestInput, CategorySuggestOutput> {
  return {
    id: "category-suggest",
    name: "Suggest Category",
    description:
      "Analyze content and suggest appropriate compliance categories with confidence scores and reasoning.",
    scope: SkillScope.PLATFORM,
    requiredPermissions: ["ai:skills:category-suggest"],

    inputSchema: categorySuggestInputSchema,

    async execute(
      input: CategorySuggestInput,
      context: SkillContext,
    ): Promise<SkillResult<CategorySuggestOutput>> {
      const startTime = Date.now();

      // Estimate tokens (input content + prompt + expected output)
      const estimatedTokens = Math.ceil(input.content.length / 4) + 500;

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
          "skills/category-suggest",
          { content: input.content, categories: input.categories },
          context.organizationId,
        );

        // Call AI
        const response = await provider.createMessage({
          maxTokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        // Parse JSON response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Invalid response format from AI");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Record usage
        await rateLimiter.recordUsage({
          organizationId: context.organizationId,
          userId: context.userId,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          model: provider.defaultModel,
          featureType: "category-suggest",
          entityType: context.entityType,
          entityId: context.entityId,
          durationMs: Date.now() - startTime,
        });

        const suggestions: CategorySuggestion[] = parsed.suggestions || [];
        const topSuggestion =
          suggestions.length > 0 ? suggestions[0] : undefined;

        return {
          success: true,
          data: {
            suggestions,
            indicators: parsed.indicators || [],
            topSuggestion,
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
          error: error.message || "Category suggestion failed",
        };
      }
    },
  };
}
