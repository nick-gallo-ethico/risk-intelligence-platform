import { Injectable, Logger } from "@nestjs/common";
import {
  VisualizationType,
  QueryIntent,
  QueryEntityType,
  ParsedQuery,
  QueryResultData,
  QuerySuggestion,
} from "../dto/ai-query.dto";

/**
 * ResultFormatterService handles query result formatting and presentation.
 *
 * Responsibilities:
 * - Generate human-readable summaries
 * - Select appropriate visualization types
 * - Generate follow-up query suggestions
 *
 * This service formats raw query results into user-friendly output.
 */
@Injectable()
export class ResultFormatterService {
  private readonly logger = new Logger(ResultFormatterService.name);

  /**
   * Select visualization type based on query result.
   *
   * @param parsedQuery - Original parsed query
   * @param data - Query result data
   * @returns Appropriate visualization type
   */
  selectVisualization(
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
   *
   * @param parsedQuery - Original parsed query
   * @param data - Query result data
   * @returns Human-readable summary string
   */
  generateSummary(parsedQuery: ParsedQuery, data: QueryResultData): string {
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
   *
   * @param parsedQuery - Original parsed query
   * @param data - Query result data (unused but available for context)
   * @returns Array of query suggestions
   */
  generateSuggestions(
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
    this.addEntitySpecificSuggestions(suggestions, parsedQuery);

    return suggestions.slice(0, 3);
  }

  /**
   * Add entity-specific suggestions based on entity type.
   */
  private addEntitySpecificSuggestions(
    suggestions: QuerySuggestion[],
    parsedQuery: ParsedQuery,
  ): void {
    switch (parsedQuery.entityType) {
      case QueryEntityType.CASE:
        suggestions.push({
          text: "Show me high severity cases",
          description: "Filter by severity",
        });
        suggestions.push({
          text: "Which cases are overdue?",
          description: "Find cases past SLA",
        });
        break;

      case QueryEntityType.RIU:
        suggestions.push({
          text: "Show anonymous RIUs",
          description: "Filter by reporter type",
        });
        suggestions.push({
          text: "RIUs by source channel",
          description: "Distribution by intake channel",
        });
        break;

      case QueryEntityType.INVESTIGATION:
        suggestions.push({
          text: "Open investigations",
          description: "Filter by status",
        });
        suggestions.push({
          text: "Investigations by assignee",
          description: "See workload distribution",
        });
        break;

      case QueryEntityType.CAMPAIGN:
        suggestions.push({
          text: "Active campaigns",
          description: "Filter by status",
        });
        suggestions.push({
          text: "Campaign completion rates",
          description: "See response rates",
        });
        break;

      case QueryEntityType.DISCLOSURE:
        suggestions.push({
          text: "Pending disclosures",
          description: "Filter by review status",
        });
        suggestions.push({
          text: "Disclosures with conflicts",
          description: "Find flagged items",
        });
        break;

      case QueryEntityType.PERSON:
        suggestions.push({
          text: "Persons by department",
          description: "Distribution by business unit",
        });
        break;
    }
  }

  /**
   * Format field name as human-readable label.
   *
   * @param field - Field name in camelCase
   * @returns Formatted label
   */
  formatFieldLabel(field: string): string {
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/Id$/, "")
      .trim();
  }
}
