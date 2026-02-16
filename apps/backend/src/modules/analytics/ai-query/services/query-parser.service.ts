import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ClaudeProvider } from "../../../ai/providers/claude.provider";
import { QueryToPrismaService } from "../query-to-prisma.service";
import {
  AiQueryRequestDto,
  QueryIntent,
  QueryEntityType,
  ParsedQuery,
} from "../dto/ai-query.dto";

/**
 * QueryParserService handles natural language query parsing for AI-powered analytics.
 *
 * Responsibilities:
 * - Build entity schema context for AI prompts
 * - Parse natural language queries using Claude API
 * - Provide fallback parsing when AI is unavailable
 * - Extract query intent, entity type, and filters from text
 *
 * SECURITY:
 * - Uses structured output format to constrain AI responses
 * - Validates entity types against allowed enum values
 * - Low temperature (0.1) for consistent, predictable output
 */
@Injectable()
export class QueryParserService {
  private readonly logger = new Logger(QueryParserService.name);

  constructor(
    private readonly claudeProvider: ClaudeProvider,
    private readonly queryToPrisma: QueryToPrismaService,
  ) {}

  /**
   * Parse natural language query using Claude structured output.
   *
   * @param query - Natural language query from user
   * @param dateRange - Optional date range context
   * @param organizationId - Tenant organization ID
   * @returns Structured ParsedQuery object
   */
  async parseQueryWithAi(
    query: string,
    dateRange: AiQueryRequestDto["dateRange"],
    _organizationId: string,
  ): Promise<ParsedQuery> {
    // Build schema context for AI
    const entitySchemas = this.buildEntitySchemaContext();

    const systemPrompt = `You are a query parser for a compliance management system. Your job is to understand natural language queries and convert them into structured query objects.

Available entity types and their fields:
${entitySchemas}

Guidelines:
1. Identify the primary entity type being queried (case, riu, campaign, person, disclosure, investigation)
2. Extract filters from natural language conditions
3. Determine the query intent (COUNT, LIST, AGGREGATE, TREND, DISTRIBUTION, COMPARISON)
4. For time-based queries, use the appropriate date field for the entity
5. Be conservative with confidence - if the query is ambiguous, note it in the interpretation
6. Always provide a clear, human-readable interpretation of what you understood

Date range context (use if query references time):
${dateRange?.preset ? `Preset: ${dateRange.preset}` : ""}
${dateRange?.start ? `Start: ${dateRange.start}` : ""}
${dateRange?.end ? `End: ${dateRange.end}` : ""}`;

    const userPrompt = `Parse this compliance data query and return a structured query object:

"${query}"

Return a JSON object with the following structure:
{
  "intent": "COUNT" | "LIST" | "AGGREGATE" | "TREND" | "DISTRIBUTION" | "COMPARISON",
  "entityType": "case" | "riu" | "campaign" | "person" | "disclosure" | "investigation",
  "filters": [{ "field": "fieldName", "operator": "eq|neq|gt|gte|lt|lte|contains|startsWith|endsWith|in|notIn|isNull|isNotNull|between", "value": "value", "valueTo": "optionalForBetween" }],
  "orderBy": [{ "field": "fieldName", "direction": "asc|desc" }],
  "groupBy": [{ "field": "fieldName", "dateTrunc": "day|week|month|quarter|year" }],
  "aggregations": [{ "function": "count|sum|avg|min|max", "field": "optionalFieldName", "alias": "optionalAlias" }],
  "dateRange": { "field": "dateFieldName", "start": "ISO date", "end": "ISO date" },
  "limit": 100,
  "selectFields": ["field1", "field2"],
  "confidence": 0.95,
  "interpretation": "Human readable description of what this query will return"
}`;

    if (!this.claudeProvider.isReady()) {
      // Fallback to simple pattern matching if AI not available
      return this.fallbackParse(query, dateRange);
    }

    const response = await this.claudeProvider.createMessage({
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 1024,
      temperature: 0.1, // Low temperature for structured output
    });

    // Extract JSON from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.warn(
        "AI response did not contain valid JSON, using fallback",
      );
      return this.fallbackParse(query, dateRange);
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as ParsedQuery;

      // Validate entity type
      if (!Object.values(QueryEntityType).includes(parsed.entityType)) {
        throw new BadRequestException(
          `Invalid entity type: ${parsed.entityType}`,
        );
      }

      return parsed;
    } catch (parseError) {
      this.logger.warn(
        `Failed to parse AI response: ${(parseError as Error).message}`,
      );
      return this.fallbackParse(query, dateRange);
    }
  }

  /**
   * Build entity schema context for AI prompt.
   * Provides field descriptions for each entity type to guide AI parsing.
   */
  buildEntitySchemaContext(): string {
    const entities: QueryEntityType[] = [
      QueryEntityType.CASE,
      QueryEntityType.RIU,
      QueryEntityType.CAMPAIGN,
      QueryEntityType.PERSON,
      QueryEntityType.DISCLOSURE,
      QueryEntityType.INVESTIGATION,
    ];

    return entities
      .map((entity) => {
        const fields = this.queryToPrisma.getFieldMetadata(entity);
        const fieldDescriptions = fields
          .map((f) => {
            let desc = `  - ${f.field} (${f.type})`;
            if (f.enumValues) {
              desc += `: ${f.enumValues.join(", ")}`;
            }
            return desc;
          })
          .join("\n");
        return `${entity}:\n${fieldDescriptions}`;
      })
      .join("\n\n");
  }

  /**
   * Fallback parser when AI is unavailable.
   * Uses simple pattern matching to extract query components.
   *
   * @param query - Natural language query
   * @param dateRange - Optional date range
   * @returns Basic ParsedQuery with reduced confidence
   */
  fallbackParse(
    query: string,
    dateRange?: AiQueryRequestDto["dateRange"],
  ): ParsedQuery {
    const lowerQuery = query.toLowerCase();

    // Detect entity type
    let entityType = QueryEntityType.CASE;
    if (lowerQuery.includes("riu") || lowerQuery.includes("report")) {
      entityType = QueryEntityType.RIU;
    } else if (lowerQuery.includes("campaign")) {
      entityType = QueryEntityType.CAMPAIGN;
    } else if (
      lowerQuery.includes("person") ||
      lowerQuery.includes("employee")
    ) {
      entityType = QueryEntityType.PERSON;
    } else if (lowerQuery.includes("disclosure")) {
      entityType = QueryEntityType.DISCLOSURE;
    } else if (lowerQuery.includes("investigation")) {
      entityType = QueryEntityType.INVESTIGATION;
    }

    // Detect intent
    let intent = QueryIntent.LIST;
    if (
      lowerQuery.includes("how many") ||
      lowerQuery.includes("count") ||
      lowerQuery.includes("total")
    ) {
      intent = QueryIntent.COUNT;
    } else if (
      lowerQuery.includes("trend") ||
      lowerQuery.includes("over time")
    ) {
      intent = QueryIntent.TREND;
    } else if (
      lowerQuery.includes("by category") ||
      lowerQuery.includes("by status") ||
      lowerQuery.includes("distribution") ||
      lowerQuery.includes("breakdown")
    ) {
      intent = QueryIntent.DISTRIBUTION;
    }

    // Parse date range
    let parsedDateRange: ParsedQuery["dateRange"] | undefined;
    if (dateRange?.preset) {
      const timeRange = this.queryToPrisma.parseTimeRange(
        dateRange.preset,
        dateRange.start,
        dateRange.end,
      );
      if (timeRange) {
        parsedDateRange = {
          field: "createdAt",
          start: timeRange.start.toISOString(),
          end: timeRange.end.toISOString(),
        };
      }
    }

    return {
      intent,
      entityType,
      filters: [],
      confidence: 0.5,
      interpretation: `Showing ${intent.toLowerCase()} of ${entityType}s${
        parsedDateRange ? " for the specified time period" : ""
      }`,
      dateRange: parsedDateRange,
      limit: 100,
    };
  }

  /**
   * Estimate tokens for rate limiting.
   * Query parsing typically uses ~500-1500 tokens.
   */
  estimateQueryTokens(query: string): number {
    return Math.ceil(query.length / 4) + 800;
  }
}
