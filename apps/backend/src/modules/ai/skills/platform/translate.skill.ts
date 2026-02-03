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
import { AIProvider } from "../../interfaces/ai-provider.interface";

/**
 * Input schema for translation skill.
 * Validates content and language options.
 */
export const translateInputSchema = z.object({
  content: z
    .string()
    .min(1)
    .max(50000)
    .describe("Content to translate"),
  sourceLanguage: z
    .string()
    .default("auto")
    .describe('Source language (or "auto" to detect)'),
  targetLanguage: z
    .string()
    .describe("Target language for translation"),
  preserveFormatting: z
    .boolean()
    .optional()
    .default(true)
    .describe("Preserve original formatting"),
});

export type TranslateInput = z.infer<typeof translateInputSchema>;

/**
 * Output from translation skill.
 */
export interface TranslateOutput {
  original: string;
  translated: string;
  sourceLanguage: string;
  targetLanguage: string;
  detectedLanguage?: string;
  confidence?: number;
}

/**
 * Detect the language of text using AI.
 *
 * @param provider - AI provider
 * @param text - Text to detect language of
 * @returns Detected language and confidence
 */
async function detectLanguage(
  provider: AIProvider,
  text: string,
): Promise<{ language: string; confidence: number }> {
  // Use first 500 chars for detection to minimize tokens
  const sample = text.slice(0, 500);

  const response = await provider.createMessage({
    maxTokens: 50,
    messages: [
      {
        role: "user",
        content: `What language is the following text? Reply with just the language name in English (e.g., "English", "Spanish", "German").\n\nText: ${sample}`,
      },
    ],
  });

  const language = response.content.trim().replace(/[."']/g, "");

  return {
    language: language || "English",
    confidence: 0.9,
  };
}

/**
 * Create the translation skill.
 * Translates content between languages while preserving the original
 * alongside the translation.
 *
 * This skill enables:
 * - Multi-language compliance operations
 * - Side-by-side original and translated content
 * - Automatic source language detection
 *
 * Key features:
 * - Preserves formatting (paragraphs, lists, headers)
 * - Maintains technical/legal terminology
 * - Keeps proper nouns unchanged
 * - Stores both original and translated content
 *
 * @param providerRegistry - AI provider registry for making API calls
 * @param rateLimiter - Rate limiter for quota management
 * @param promptService - Prompt template service
 * @returns Translation skill definition
 */
export function translateSkill(
  providerRegistry: ProviderRegistryService,
  rateLimiter: AiRateLimiterService,
  promptService: PromptService,
): SkillDefinition<TranslateInput, TranslateOutput> {
  return {
    id: "translate",
    name: "Translate Content",
    description:
      "Translate content between languages while preserving the original. Supports auto-detection of source language.",
    scope: SkillScope.PLATFORM,
    requiredPermissions: ["ai:skills:translate"],

    inputSchema: translateInputSchema,

    async execute(
      input: TranslateInput,
      context: SkillContext,
    ): Promise<SkillResult<TranslateOutput>> {
      const startTime = Date.now();

      // Translation typically outputs similar length to input
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

        // Detect language if set to auto
        let sourceLanguage = input.sourceLanguage;
        let detectedLanguage: string | undefined;

        if (sourceLanguage === "auto") {
          const detectionResult = await detectLanguage(
            provider,
            input.content,
          );
          sourceLanguage = detectionResult.language;
          detectedLanguage = detectionResult.language;
        }

        // Render prompt
        const prompt = await promptService.render(
          "skills/translate",
          {
            content: input.content,
            sourceLanguage,
            targetLanguage: input.targetLanguage,
            preserveFormatting: input.preserveFormatting,
          },
          context.organizationId,
        );

        // Call AI
        const response = await provider.createMessage({
          maxTokens: 4096,
          messages: [{ role: "user", content: prompt }],
        });

        const translated = response.content.trim();

        // Record usage
        await rateLimiter.recordUsage({
          organizationId: context.organizationId,
          userId: context.userId,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          model: provider.defaultModel,
          featureType: "translate",
          entityType: context.entityType,
          entityId: context.entityId,
          durationMs: Date.now() - startTime,
        });

        return {
          success: true,
          data: {
            original: input.content,
            translated,
            sourceLanguage,
            targetLanguage: input.targetLanguage,
            detectedLanguage,
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
          error: error.message || "Translation failed",
        };
      }
    },
  };
}
