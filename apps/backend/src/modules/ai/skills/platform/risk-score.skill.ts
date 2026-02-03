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
 * Input schema for risk scoring skill.
 * Validates content and optional entity context.
 */
export const riskScoreInputSchema = z.object({
  content: z
    .string()
    .min(10)
    .max(100000)
    .describe("Content to assess for risk"),
  entityType: z
    .string()
    .optional()
    .describe("Type of entity (case, investigation, riu)"),
  category: z
    .string()
    .optional()
    .describe("Category of the matter"),
  additionalContext: z
    .string()
    .optional()
    .describe("Additional context for assessment"),
});

export type RiskScoreInput = z.infer<typeof riskScoreInputSchema>;

/**
 * A single risk factor with score and notes.
 */
export interface RiskFactor {
  score: number;
  notes: string;
}

/**
 * Output from risk scoring skill.
 */
export interface RiskScoreOutput {
  overallScore: number;
  factors: {
    severity: RiskFactor;
    scope: RiskFactor;
    legalExposure: RiskFactor;
    reputationRisk: RiskFactor;
    recurrence: RiskFactor;
    evidence: RiskFactor;
    urgency: RiskFactor;
  };
  keyConcerns: string[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
  confidence?: number;
}

/**
 * Create the risk scoring skill.
 * Generates comprehensive risk assessments with factor breakdown
 * and priority recommendations.
 *
 * This skill enables:
 * - Automated risk triage during intake
 * - Consistent risk assessment methodology
 * - Priority-based case routing
 *
 * Risk factors assessed:
 * - Severity: Seriousness of alleged behavior
 * - Scope: Number of affected people/departments
 * - Legal Exposure: Regulatory and legal consequences
 * - Reputation Risk: Organization reputation impact
 * - Recurrence: Pattern vs isolated incident
 * - Evidence: Quality and clarity of evidence
 * - Urgency: Time sensitivity of response
 *
 * @param providerRegistry - AI provider registry for making API calls
 * @param rateLimiter - Rate limiter for quota management
 * @param promptService - Prompt template service
 * @returns Risk scoring skill definition
 */
export function riskScoreSkill(
  providerRegistry: ProviderRegistryService,
  rateLimiter: AiRateLimiterService,
  promptService: PromptService,
): SkillDefinition<RiskScoreInput, RiskScoreOutput> {
  return {
    id: "risk-score",
    name: "Assess Risk",
    description:
      "Generate a comprehensive risk assessment with factor breakdown and priority recommendation.",
    scope: SkillScope.PLATFORM,
    requiredPermissions: ["ai:skills:risk-score"],
    entityTypes: ["case", "investigation", "riu"],

    inputSchema: riskScoreInputSchema,

    async execute(
      input: RiskScoreInput,
      context: SkillContext,
    ): Promise<SkillResult<RiskScoreOutput>> {
      const startTime = Date.now();

      // Estimate tokens (input content + prompt + expected output ~800 tokens)
      const estimatedTokens = Math.ceil(input.content.length / 4) + 800;

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
          "skills/risk-score",
          {
            content: input.content,
            entity: {
              type: input.entityType,
              category: input.category,
            },
          },
          context.organizationId,
        );

        // Call AI
        const response = await provider.createMessage({
          maxTokens: 1500,
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
          featureType: "risk-score",
          entityType: context.entityType,
          entityId: context.entityId,
          durationMs: Date.now() - startTime,
        });

        // Calculate confidence based on evidence score
        // Lower evidence score = lower confidence in the assessment
        const evidenceScore = parsed.factors?.evidence?.score || 5;
        const confidence =
          evidenceScore >= 7 ? undefined : evidenceScore / 10;

        return {
          success: true,
          data: {
            overallScore: parsed.overallScore,
            factors: parsed.factors,
            keyConcerns: parsed.keyConcerns || [],
            priority: parsed.priority,
            summary: parsed.summary,
            confidence,
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
          error: error.message || "Risk assessment failed",
        };
      }
    },
  };
}
