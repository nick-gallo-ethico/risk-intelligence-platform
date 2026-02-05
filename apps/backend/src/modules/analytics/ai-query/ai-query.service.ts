import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../prisma/prisma.service";
import { ClaudeProvider } from "../../ai/providers/claude.provider";
import { AiRateLimiterService } from "../../ai/services/rate-limiter.service";
import { QueryToPrismaService } from "./query-to-prisma.service";
import {
  AiQueryRequestDto,
  AiQueryResponseDto,
  VisualizationType,
  QueryIntent,
  QueryEntityType,
  ParsedQuery,
  QueryResultData,
  KpiResultData,
  TableResultData,
  ChartResultData,
  QuerySuggestion,
} from "./dto/ai-query.dto";

/**
 * AiQueryService handles natural language queries for dashboard analytics.
 *
 * Flow:
 * 1. User submits natural language query
 * 2. AI parses query into structured ParsedQuery
 * 3. QueryToPrismaService validates and builds safe Prisma query
 * 4. Execute query against database
 * 5. Format results and select appropriate visualization
 * 6. Return response with interpreted query for transparency
 *
 * SECURITY:
 * - All queries are scoped by organizationId (tenant isolation)
 * - Field whitelisting prevents access to sensitive data
 * - Rate limiting prevents abuse
 */
@Injectable()
export class AiQueryService {
  private readonly logger = new Logger(AiQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claudeProvider: ClaudeProvider,
    private readonly rateLimiter: AiRateLimiterService,
    private readonly queryToPrisma: QueryToPrismaService,
  ) {}

  /**
   * Execute a natural language query.
   */
  async executeQuery(
    request: AiQueryRequestDto,
    userId: string,
    organizationId: string,
  ): Promise<AiQueryResponseDto> {
    const requestId = uuidv4();
    const startTime = Date.now();

    this.logger.log(
      `Processing AI query: requestId=${requestId}, org=${organizationId}, query="${request.query.substring(0, 100)}..."`,
    );

    // Check rate limits
    const rateLimitResult = await this.rateLimiter.checkAndConsume({
      organizationId,
      estimatedTokens: this.estimateQueryTokens(request.query),
    });

    if (!rateLimitResult.allowed) {
      throw new BadRequestException(
        `Rate limit exceeded: ${rateLimitResult.reason}. Retry after ${Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000)}s`,
      );
    }

    try {
      // Parse query with AI
      const parsedQuery = await this.parseQueryWithAi(
        request.query,
        request.dateRange,
        organizationId,
      );

      // Execute the query
      const { data, visualizationType } = await this.executeQueryByIntent(
        parsedQuery,
        organizationId,
        request.limit,
      );

      // Generate summary
      const summary = this.generateSummary(parsedQuery, data);

      // Generate suggestions if requested
      const suggestions = request.includeSuggestions
        ? this.generateSuggestions(parsedQuery, data)
        : undefined;

      const processingTimeMs = Date.now() - startTime;

      // Log query for history
      await this.logQuery({
        requestId,
        organizationId,
        userId,
        query: request.query,
        parsedQuery,
        visualizationType,
        resultSummary: summary,
        processingTimeMs,
      });

      return {
        requestId,
        interpretedQuery: parsedQuery.interpretation,
        summary,
        visualizationType,
        data,
        suggestions,
        parsedQuery,
        processingTimeMs,
      };
    } catch (error) {
      this.logger.error(
        `AI query failed: requestId=${requestId}, error=${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Parse natural language query using Claude structured output.
   */
  private async parseQueryWithAi(
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
        throw new Error(`Invalid entity type: ${parsed.entityType}`);
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
   */
  private buildEntitySchemaContext(): string {
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
   */
  private fallbackParse(
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
   * Execute query based on intent type.
   */
  private async executeQueryByIntent(
    parsedQuery: ParsedQuery,
    organizationId: string,
    limit?: number,
  ): Promise<{ data: QueryResultData; visualizationType: VisualizationType }> {
    const modelName = this.queryToPrisma.getPrismaModelName(
      parsedQuery.entityType,
    );
    const queryArgs = this.queryToPrisma.buildPrismaQueryArgs(
      parsedQuery,
      organizationId,
    );

    switch (parsedQuery.intent) {
      case QueryIntent.COUNT:
        return this.executeCountQuery(modelName, queryArgs, parsedQuery);

      case QueryIntent.LIST:
        return this.executeListQuery(
          modelName,
          queryArgs,
          parsedQuery,
          limit || parsedQuery.limit || 50,
        );

      case QueryIntent.DISTRIBUTION:
        return this.executeDistributionQuery(
          modelName,
          queryArgs,
          parsedQuery,
          organizationId,
        );

      case QueryIntent.TREND:
        return this.executeTrendQuery(
          modelName,
          queryArgs,
          parsedQuery,
          organizationId,
        );

      case QueryIntent.AGGREGATE:
        return this.executeAggregateQuery(modelName, queryArgs, parsedQuery);

      case QueryIntent.COMPARISON:
        return this.executeComparisonQuery(
          modelName,
          queryArgs,
          parsedQuery,
          organizationId,
        );

      default:
        return this.executeListQuery(
          modelName,
          queryArgs,
          parsedQuery,
          limit || 50,
        );
    }
  }

  /**
   * Execute COUNT query - returns single number.
   */
  private async executeCountQuery(
    modelName: string,
    queryArgs: { where: Record<string, unknown> },
    parsedQuery: ParsedQuery,
  ): Promise<{ data: KpiResultData; visualizationType: VisualizationType }> {
    const count = await (this.prisma as any)[modelName].count({
      where: queryArgs.where,
    });

    // Get previous period count for comparison if date range specified
    let previousValue: number | undefined;
    let changePercent: number | undefined;
    let changeDirection: "up" | "down" | "unchanged" | undefined;

    if (parsedQuery.dateRange) {
      const start = new Date(parsedQuery.dateRange.start);
      const end = new Date(parsedQuery.dateRange.end);
      const duration = end.getTime() - start.getTime();

      const previousWhere = {
        ...queryArgs.where,
        [parsedQuery.dateRange.field]: {
          gte: new Date(start.getTime() - duration),
          lt: start,
        },
      };

      previousValue = await (this.prisma as any)[modelName].count({
        where: previousWhere,
      });

      if (previousValue !== undefined && previousValue > 0) {
        changePercent = ((count - previousValue) / previousValue) * 100;
        changeDirection =
          changePercent > 0 ? "up" : changePercent < 0 ? "down" : "unchanged";
      }
    }

    return {
      data: {
        type: "kpi",
        value: count,
        label: `Total ${parsedQuery.entityType}s`,
        previousValue,
        changePercent: changePercent
          ? Math.round(changePercent * 10) / 10
          : undefined,
        changeDirection,
        format: "number",
      },
      visualizationType: VisualizationType.KPI,
    };
  }

  /**
   * Execute LIST query - returns table of records.
   */
  private async executeListQuery(
    modelName: string,
    queryArgs: {
      where: Record<string, unknown>;
      orderBy?: Array<Record<string, "asc" | "desc">>;
    },
    parsedQuery: ParsedQuery,
    limit: number,
  ): Promise<{ data: TableResultData; visualizationType: VisualizationType }> {
    const [records, totalCount] = await Promise.all([
      (this.prisma as any)[modelName].findMany({
        where: queryArgs.where,
        orderBy: queryArgs.orderBy || [{ createdAt: "desc" }],
        take: Math.min(limit, 1000),
      }),
      (this.prisma as any)[modelName].count({
        where: queryArgs.where,
      }),
    ]);

    // Build columns from select fields or all available fields
    const fields =
      parsedQuery.selectFields ||
      this.queryToPrisma.getAllowedFields(parsedQuery.entityType).slice(0, 8);

    const columns = fields.map((field) => ({
      key: field,
      label: this.formatFieldLabel(field),
      dataType: this.inferDataType(field) as
        | "string"
        | "number"
        | "date"
        | "boolean",
      sortable: true,
    }));

    // Filter records to only include allowed fields
    const rows = records.map((record: Record<string, unknown>) => {
      const row: Record<string, unknown> = {};
      for (const field of fields) {
        row[field] = record[field];
      }
      return row;
    });

    return {
      data: {
        type: "table",
        columns,
        rows,
        totalCount,
        pageSize: limit,
      },
      visualizationType: VisualizationType.TABLE,
    };
  }

  /**
   * Execute DISTRIBUTION query - returns grouped counts.
   */
  private async executeDistributionQuery(
    modelName: string,
    queryArgs: { where: Record<string, unknown> },
    parsedQuery: ParsedQuery,
    _organizationId: string,
  ): Promise<{ data: ChartResultData; visualizationType: VisualizationType }> {
    const groupField = parsedQuery.groupBy?.[0]?.field || "status";

    // Use Prisma groupBy for distribution
    const results = await (this.prisma as any)[modelName].groupBy({
      by: [groupField],
      where: queryArgs.where,
      _count: true,
      orderBy: {
        _count: {
          [groupField]: "desc",
        },
      },
    });

    const data: ChartResultData = {
      type: "chart",
      chartType: "pie",
      title: `${this.formatFieldLabel(parsedQuery.entityType)} by ${this.formatFieldLabel(groupField)}`,
      series: [
        {
          name: this.formatFieldLabel(groupField),
          data: results.map(
            (r: Record<string, unknown> & { _count: number }) => ({
              label: String(r[groupField] || "Unknown"),
              value: r._count,
            }),
          ),
        },
      ],
    };

    // Use bar chart for many categories, pie for few
    const visualizationType =
      results.length > 6
        ? VisualizationType.BAR_CHART
        : VisualizationType.PIE_CHART;

    return { data, visualizationType };
  }

  /**
   * Execute TREND query - returns time series data.
   */
  private async executeTrendQuery(
    modelName: string,
    queryArgs: { where: Record<string, unknown> },
    parsedQuery: ParsedQuery,
    _organizationId: string,
  ): Promise<{ data: ChartResultData; visualizationType: VisualizationType }> {
    // For trend queries, we need to group by time periods
    // This is a simplified version - in production, use raw SQL for date truncation
    const dateField = parsedQuery.dateRange?.field || "createdAt";
    const dateTrunc = parsedQuery.groupBy?.[0]?.dateTrunc || "month";

    const results = await (this.prisma as any)[modelName].findMany({
      where: queryArgs.where,
      select: {
        [dateField]: true,
      },
      orderBy: {
        [dateField]: "asc",
      },
    });

    // Group by time period
    const groupedData = this.groupByTimePeriod(results, dateField, dateTrunc);

    return {
      data: {
        type: "chart",
        chartType: "line",
        title: `${this.formatFieldLabel(parsedQuery.entityType)} trend`,
        series: [
          {
            name: `${this.formatFieldLabel(parsedQuery.entityType)}s`,
            data: groupedData,
          },
        ],
        xAxisLabel: "Date",
        yAxisLabel: "Count",
      },
      visualizationType: VisualizationType.LINE_CHART,
    };
  }

  /**
   * Execute AGGREGATE query - returns computed values.
   */
  private async executeAggregateQuery(
    modelName: string,
    queryArgs: { where: Record<string, unknown> },
    parsedQuery: ParsedQuery,
  ): Promise<{ data: KpiResultData; visualizationType: VisualizationType }> {
    const aggregation = parsedQuery.aggregations?.[0];
    if (!aggregation) {
      // Default to count
      return this.executeCountQuery(modelName, queryArgs, parsedQuery);
    }

    // Build aggregation query
    switch (aggregation.function) {
      case "count":
        const count = await (this.prisma as any)[modelName].count({
          where: queryArgs.where,
        });
        return {
          data: {
            type: "kpi",
            value: count,
            label: aggregation.alias || "Count",
            format: "number",
          },
          visualizationType: VisualizationType.KPI,
        };

      case "avg":
      case "sum":
      case "min":
      case "max":
        if (!aggregation.field) {
          throw new BadRequestException(
            `Aggregation ${aggregation.function} requires a field`,
          );
        }
        const result = await (this.prisma as any)[modelName].aggregate({
          where: queryArgs.where,
          [`_${aggregation.function}`]: {
            [aggregation.field]: true,
          },
        });
        const value =
          result[`_${aggregation.function}`]?.[aggregation.field] || 0;
        return {
          data: {
            type: "kpi",
            value,
            label:
              aggregation.alias ||
              `${aggregation.function}(${aggregation.field})`,
            format: "number",
          },
          visualizationType: VisualizationType.KPI,
        };

      default:
        return this.executeCountQuery(modelName, queryArgs, parsedQuery);
    }
  }

  /**
   * Execute COMPARISON query - compares multiple groups.
   */
  private async executeComparisonQuery(
    modelName: string,
    queryArgs: { where: Record<string, unknown> },
    parsedQuery: ParsedQuery,
    organizationId: string,
  ): Promise<{ data: ChartResultData; visualizationType: VisualizationType }> {
    // Similar to distribution but formatted for comparison
    const result = await this.executeDistributionQuery(
      modelName,
      queryArgs,
      parsedQuery,
      organizationId,
    );

    // Force bar chart for comparisons
    return {
      data: { ...result.data, chartType: "bar" },
      visualizationType: VisualizationType.BAR_CHART,
    };
  }

  /**
   * Select visualization type based on query result.
   */
  private selectVisualization(
    parsedQuery: ParsedQuery,
    data: QueryResultData,
  ): VisualizationType {
    // Already determined during query execution
    switch (data.type) {
      case "kpi":
        return VisualizationType.KPI;
      case "table":
        return VisualizationType.TABLE;
      case "chart":
        if (data.chartType === "line") return VisualizationType.LINE_CHART;
        if (data.chartType === "bar") return VisualizationType.BAR_CHART;
        return VisualizationType.PIE_CHART;
      case "text":
        return VisualizationType.TEXT;
      default:
        return VisualizationType.TABLE;
    }
  }

  /**
   * Generate human-readable summary of results.
   */
  private generateSummary(
    parsedQuery: ParsedQuery,
    data: QueryResultData,
  ): string {
    switch (data.type) {
      case "kpi":
        let summary = `Found ${data.value.toLocaleString()} ${parsedQuery.entityType}(s)`;
        if (data.changePercent !== undefined) {
          const direction =
            data.changeDirection === "up" ? "increase" : "decrease";
          summary += ` (${Math.abs(data.changePercent)}% ${direction} from previous period)`;
        }
        return summary;

      case "table":
        return `Showing ${data.rows.length} of ${data.totalCount.toLocaleString()} ${parsedQuery.entityType}(s)`;

      case "chart":
        const totalDataPoints = data.series.reduce(
          (sum, s) => sum + s.data.length,
          0,
        );
        return `${data.title || "Chart"} with ${totalDataPoints} data points`;

      case "text":
        return data.content.substring(0, 100) + "...";

      default:
        return "Query completed";
    }
  }

  /**
   * Generate suggested follow-up queries.
   */
  private generateSuggestions(
    parsedQuery: ParsedQuery,
    _data: QueryResultData,
  ): QuerySuggestion[] {
    const suggestions: QuerySuggestion[] = [];

    // Suggest drill-down based on current query
    if (parsedQuery.intent === QueryIntent.COUNT) {
      suggestions.push({
        text: `Show me the list of these ${parsedQuery.entityType}s`,
        description: "View detailed records",
      });
      suggestions.push({
        text: `Break down ${parsedQuery.entityType}s by status`,
        description: "See distribution by status",
      });
    }

    if (parsedQuery.intent === QueryIntent.LIST) {
      suggestions.push({
        text: `How many ${parsedQuery.entityType}s are there?`,
        description: "Get total count",
      });
    }

    if (parsedQuery.intent === QueryIntent.DISTRIBUTION) {
      suggestions.push({
        text: `Show me ${parsedQuery.entityType}s over time`,
        description: "View trend analysis",
      });
    }

    // Add entity-specific suggestions
    if (parsedQuery.entityType === QueryEntityType.CASE) {
      suggestions.push({
        text: "Show me high severity cases",
        description: "Filter by severity",
      });
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Log query for history and analytics.
   */
  private async logQuery(entry: {
    requestId: string;
    organizationId: string;
    userId: string;
    query: string;
    parsedQuery: ParsedQuery;
    visualizationType: VisualizationType;
    resultSummary: string;
    processingTimeMs: number;
  }): Promise<void> {
    try {
      // Note: aiQueryHistory model added in this plan - requires prisma generate
      await (this.prisma as any).aiQueryHistory.create({
        data: {
          id: entry.requestId,
          organizationId: entry.organizationId,
          userId: entry.userId,
          query: entry.query,
          parsedQuery: entry.parsedQuery as unknown as Record<string, unknown>,
          visualizationType: entry.visualizationType,
          resultSummary: entry.resultSummary,
          processingTimeMs: entry.processingTimeMs,
        },
      });
    } catch (error) {
      // Non-critical - log but don't fail the request
      this.logger.warn(
        `Failed to log query history: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Estimate tokens for rate limiting.
   */
  private estimateQueryTokens(query: string): number {
    // Query parsing typically uses ~500-1500 tokens
    return Math.ceil(query.length / 4) + 800;
  }

  /**
   * Group records by time period for trend analysis.
   */
  private groupByTimePeriod(
    records: Array<Record<string, unknown>>,
    dateField: string,
    period: "day" | "week" | "month" | "quarter" | "year",
  ): Array<{ label: string; value: number }> {
    const groups = new Map<string, number>();

    for (const record of records) {
      const date = new Date(record[dateField] as string);
      const key = this.formatDateForPeriod(date, period);
      groups.set(key, (groups.get(key) || 0) + 1);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));
  }

  /**
   * Format date for grouping period.
   */
  private formatDateForPeriod(
    date: Date,
    period: "day" | "week" | "month" | "quarter" | "year",
  ): string {
    const year = date.getFullYear();
    const month = date.getMonth();

    switch (period) {
      case "day":
        return date.toISOString().slice(0, 10);
      case "week":
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return `Week of ${startOfWeek.toISOString().slice(0, 10)}`;
      case "month":
        return `${year}-${String(month + 1).padStart(2, "0")}`;
      case "quarter":
        return `${year} Q${Math.floor(month / 3) + 1}`;
      case "year":
        return String(year);
      default:
        return date.toISOString().slice(0, 10);
    }
  }

  /**
   * Format field name as label.
   */
  private formatFieldLabel(field: string): string {
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/Id$/, "")
      .trim();
  }

  /**
   * Infer data type from field name.
   */
  private inferDataType(field: string): string {
    if (field.endsWith("At") || field.includes("Date")) {
      return "date";
    }
    if (field.endsWith("Count") || field === "value") {
      return "number";
    }
    if (field.startsWith("is") || field.startsWith("has")) {
      return "boolean";
    }
    return "string";
  }
}
