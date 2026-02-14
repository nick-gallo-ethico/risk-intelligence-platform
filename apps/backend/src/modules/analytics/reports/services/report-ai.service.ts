/**
 * ReportAiService - AI-powered report generation
 *
 * Handles:
 * - Natural language to report configuration conversion
 * - AI query execution and result transformation
 * - Visualization type mapping
 *
 * Extracted from ReportController to maintain thin controller pattern.
 */

import { Injectable } from "@nestjs/common";
import { AiQueryService } from "../../ai-query/ai-query.service";
import { QueryEntityType } from "../../ai-query/dto/ai-query.dto";
import { CreateReportDto } from "../dto/report.dto";
import { ReportEntityType } from "../entities/saved-report.entity";

/**
 * AI report generation result
 */
export interface AiReportGenerationResult {
  report: Partial<CreateReportDto>;
  results: unknown;
  interpretation: string;
}

/**
 * Map AI query entity type to report entity type.
 * AI uses singular (case), reports use plural (cases).
 */
const AI_TO_REPORT_ENTITY_MAP: Record<string, ReportEntityType> = {
  [QueryEntityType.CASE]: "cases",
  [QueryEntityType.RIU]: "rius",
  [QueryEntityType.CAMPAIGN]: "campaigns",
  [QueryEntityType.PERSON]: "persons",
  [QueryEntityType.DISCLOSURE]: "disclosures",
  [QueryEntityType.INVESTIGATION]: "investigations",
};

/**
 * Report visualization types
 */
type ReportVisualization =
  | "table"
  | "bar"
  | "line"
  | "pie"
  | "kpi"
  | "funnel"
  | "stacked_bar";

/**
 * Map AI visualization type to report visualization type
 */
const VISUALIZATION_MAP: Record<string, ReportVisualization> = {
  TABLE: "table",
  BAR_CHART: "bar",
  LINE_CHART: "line",
  PIE_CHART: "pie",
  KPI: "kpi",
  FUNNEL: "funnel",
  TEXT: "table",
};

@Injectable()
export class ReportAiService {
  constructor(private readonly aiQueryService: AiQueryService) {}

  /**
   * Generate report configuration from natural language query.
   *
   * @param query - Natural language query
   * @param userId - User ID for context
   * @param organizationId - Organization ID for tenant isolation
   * @returns Report configuration, results, and interpretation
   */
  async generateFromNaturalLanguage(
    query: string,
    userId: string,
    organizationId: string,
  ): Promise<AiReportGenerationResult> {
    // Execute the AI query to get parsed query and results
    const aiResult = await this.aiQueryService.executeQuery(
      { query, includeSuggestions: true },
      userId,
      organizationId,
    );

    // Convert AI query result to report configuration
    const aiEntityType = aiResult.parsedQuery?.entityType;
    const reportEntityType: ReportEntityType = aiEntityType
      ? AI_TO_REPORT_ENTITY_MAP[aiEntityType] || "cases"
      : "cases";

    const reportConfig: Partial<CreateReportDto> = {
      name: this.generateReportName(query),
      description: aiResult.interpretedQuery,
      entityType: reportEntityType,
      columns: aiResult.parsedQuery?.selectFields || [
        "referenceNumber",
        "status",
        "createdAt",
      ],
      filters: aiResult.parsedQuery?.filters || [],
      groupBy: aiResult.parsedQuery?.groupBy?.map((g) => g.field),
      visualization: this.mapVisualizationType(aiResult.visualizationType),
      sortBy: aiResult.parsedQuery?.orderBy?.[0]?.field,
      sortOrder: aiResult.parsedQuery?.orderBy?.[0]?.direction as
        | "asc"
        | "desc"
        | undefined,
    };

    return {
      report: reportConfig,
      results: aiResult.data,
      interpretation: aiResult.interpretedQuery,
    };
  }

  /**
   * Generate a report name from the natural language query.
   * Truncates to 50 chars with ellipsis if needed.
   */
  private generateReportName(query: string): string {
    const truncated = query.substring(0, 50);
    const suffix = query.length > 50 ? "..." : "";
    return `Report: ${truncated}${suffix}`;
  }

  /**
   * Map AI visualization type to report visualization type.
   */
  private mapVisualizationType(aiVizType: string): ReportVisualization {
    return VISUALIZATION_MAP[aiVizType] || "table";
  }
}
