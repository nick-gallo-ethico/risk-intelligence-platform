import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { SchemaIntrospectionService } from "../../ai/schema-introspection.service";
import { ProviderRegistryService } from "../../ai/services/provider-registry.service";
import { AiRateLimiterService } from "../../ai/services/rate-limiter.service";
import { ConflictQueryDto } from "../dto/conflict.dto";
import { DisclosureQueryDto } from "../dto/disclosure-submission.dto";

/**
 * Supported entity types for AI triage.
 */
export type TriageEntityType = "disclosure" | "conflict";

/**
 * Actions that can be performed via AI triage.
 */
export type TriageAction =
  | "approve"
  | "reject"
  | "request_info"
  | "dismiss"
  | "escalate"
  | "resolve";

/**
 * Result of AI interpreting a natural language query.
 */
export interface TriageInterpretation {
  /** Natural language query that was interpreted */
  originalQuery: string;
  /** Entity type being triaged */
  entityType: TriageEntityType;
  /** Parsed filter conditions */
  filters: ConflictQueryDto | DisclosureQueryDto;
  /** Intended action to perform */
  action: TriageAction;
  /** AI confidence in interpretation (0-1) */
  confidence: number;
  /** Human-readable explanation of the interpretation */
  explanation: string;
  /** Any warnings about the interpretation */
  warnings: string[];
}

/**
 * Input for AI query interpretation.
 */
export interface InterpretQueryInput {
  query: string;
  entityType: TriageEntityType;
}

/**
 * AI prompt template for triage interpretation.
 */
const TRIAGE_INTERPRETATION_PROMPT = `You are an AI assistant helping with compliance disclosure triage.

Given a natural language query, interpret it as a structured filter and action for bulk processing.

SCHEMA:
{schema}

VALID ACTIONS:
{actions}

EXAMPLES:
- "approve all disclosures under $100 where manager approved" ->
  entityType: disclosure, action: approve, filters: { disclosureValue_lt: 100, ... }
- "dismiss low severity vendor matches" ->
  entityType: conflict, action: dismiss, filters: { severity: "LOW", conflictType: "VENDOR_MATCH" }
- "reject all pending disclosures older than 30 days" ->
  entityType: disclosure, action: reject, filters: { status: "SUBMITTED", createdAt_lt: "..." }

USER QUERY: {query}
ENTITY TYPE: {entityType}

Respond with a JSON object containing:
{{
  "filters": {{ ... }},
  "action": "approve|reject|dismiss|escalate|...",
  "confidence": 0.0-1.0,
  "explanation": "Human-readable explanation of interpretation",
  "warnings": ["Any concerns about this interpretation"]
}}

IMPORTANT:
- Only use fields that exist in the schema
- Only use actions valid for the entity type
- If the query is ambiguous, set confidence below 0.7
- Add warnings if the query could affect many records
- Dates should be in ISO 8601 format`;

/**
 * TriageInterpreterService handles AI-powered interpretation of natural language
 * triage queries into structured filters and actions.
 *
 * Responsibilities:
 * - Parse natural language queries using AI
 * - Build structured filters from AI response
 * - Validate actions against entity type
 * - Enforce rate limits on AI calls
 * - Record AI usage for billing/analytics
 */
@Injectable()
export class TriageInterpreterService {
  private readonly logger = new Logger(TriageInterpreterService.name);

  constructor(
    private readonly schemaService: SchemaIntrospectionService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly rateLimiter: AiRateLimiterService,
  ) {}

  /**
   * Interpret a natural language query into structured filters and action.
   *
   * @param input - Query and entity type
   * @param organizationId - Organization context
   * @returns Interpretation with filters, action, confidence
   */
  async interpretQuery(
    input: InterpretQueryInput,
    organizationId: string,
  ): Promise<TriageInterpretation> {
    this.logger.log(
      `Interpreting triage query: "${input.query}" for ${input.entityType}`,
    );

    // Get schema for the entity type
    const schema = this.schemaService.getSchemaForPrompt(
      [input.entityType],
      organizationId,
    );

    // Get valid actions for the entity type
    const validActions = this.schemaService.getValidActions(input.entityType);

    // Build prompt
    const prompt = this.buildPrompt(input, schema, validActions);

    // Check rate limit
    const estimatedTokens = Math.ceil(prompt.length / 4) + 500;
    const rateLimitResult = await this.rateLimiter.checkAndConsume({
      organizationId,
      estimatedTokens,
    });

    if (!rateLimitResult.allowed) {
      throw new BadRequestException(
        `Rate limit exceeded. Retry after ${Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000)} seconds.`,
      );
    }

    const startTime = Date.now();

    try {
      // Call AI provider
      const provider = this.providerRegistry.getDefaultProvider();
      const response = await provider.createMessage({
        maxTokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Parse AI response
      const parsed = this.parseAiResponse(response.content.trim());

      // Validate the action
      if (!validActions.includes(parsed.action)) {
        throw new BadRequestException(
          `Invalid action "${parsed.action}" for ${input.entityType}. Valid: ${validActions.join(", ")}`,
        );
      }

      // Validate filters against schema
      const validationResult = this.schemaService.validateFilter(
        input.entityType,
        parsed.filters,
        organizationId,
      );

      if (!validationResult.valid) {
        // Add validation errors as warnings but don't fail
        parsed.warnings = [
          ...(parsed.warnings || []),
          ...validationResult.errors,
        ];
        parsed.confidence = Math.min(parsed.confidence, 0.5);
      }

      // Record AI usage
      await this.rateLimiter.recordUsage({
        organizationId,
        userId: "system", // Will be set in execute
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        model: provider.defaultModel,
        featureType: "triage_interpret",
        durationMs: Date.now() - startTime,
      });

      return {
        originalQuery: input.query,
        entityType: input.entityType,
        filters: parsed.filters as ConflictQueryDto | DisclosureQueryDto,
        action: parsed.action as TriageAction,
        confidence: parsed.confidence,
        explanation: parsed.explanation,
        warnings: parsed.warnings || [],
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const err = error as Error;
      this.logger.error(`AI interpretation failed: ${err.message}`, err.stack);
      throw new BadRequestException(
        "Failed to interpret query. Please try again.",
      );
    }
  }

  /**
   * Build the AI prompt from input and schema context.
   */
  private buildPrompt(
    input: InterpretQueryInput,
    schema: string,
    validActions: string[],
  ): string {
    return TRIAGE_INTERPRETATION_PROMPT.replace("{schema}", schema)
      .replace("{actions}", validActions.join(", "))
      .replace("{query}", input.query)
      .replace("{entityType}", input.entityType);
  }

  /**
   * Parse the AI response into structured data.
   */
  private parseAiResponse(content: string): {
    filters: Record<string, unknown>;
    action: string;
    confidence: number;
    explanation: string;
    warnings: string[];
  } {
    try {
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch =
        content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
        content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      return JSON.parse(content);
    } catch {
      this.logger.error(`Failed to parse AI response: ${content}`);
      throw new BadRequestException(
        "Failed to interpret query. Please try rephrasing.",
      );
    }
  }
}
