import { Injectable, Logger } from "@nestjs/common";
import { AiClientService } from "../../../ai/services/ai-client.service";
import {
  ReportData,
  SlaMetrics,
  CampaignMetrics,
  RiskArea,
} from "./report-data-fetcher.service";

// ===========================================
// AI Summary Configuration
// ===========================================

/**
 * Configuration for executive summary generation.
 */
export interface SummaryConfig {
  /** Maximum bullet points to include */
  maxBulletPoints?: number;
  /** Focus areas for the summary */
  focusAreas?: ("metrics" | "trends" | "risks" | "recommendations")[];
  /** Custom prompt additions */
  customPromptAdditions?: string;
}

/**
 * Result of AI summary generation.
 */
export interface AiSummaryResult {
  /** Generated executive summary text */
  summary: string;
  /** Whether AI was used (false = fallback) */
  aiGenerated: boolean;
  /** Model used for generation (if AI was used) */
  model?: string;
  /** Token usage (if AI was used) */
  tokens?: {
    input: number;
    output: number;
  };
}

/**
 * ReportAiSummaryService
 *
 * Handles AI-powered executive summary generation for board reports.
 * Extracts AI logic from BoardReportService to provide a focused,
 * testable service for summary generation.
 *
 * Features:
 * - AI-generated executive summaries with Claude
 * - Fallback summary when AI is unavailable
 * - Customizable summary focus areas
 * - Token tracking for cost management
 *
 * Usage:
 * ```typescript
 * const result = await reportAiSummaryService.generateExecutiveSummary(
 *   organizationId,
 *   reportData,
 *   { start: new Date('2024-01-01'), end: new Date('2024-03-31') }
 * );
 * console.log(result.summary);
 * ```
 */
@Injectable()
export class ReportAiSummaryService {
  private readonly logger = new Logger(ReportAiSummaryService.name);

  /** System prompt for executive summary generation */
  private readonly SUMMARY_SYSTEM_PROMPT = `You are a compliance reporting assistant. Generate concise, professional executive summaries for board reports. Use 3-4 bullet points maximum. Focus on:
1. Key metrics and trends
2. Areas of concern
3. Notable achievements
4. Recommended actions

Keep each bullet point to 1-2 sentences. Use clear, executive-friendly language.`;

  constructor(private readonly aiClient: AiClientService) {}

  /**
   * Generate an executive summary for the report.
   *
   * @param orgId - Organization ID
   * @param data - Report data to summarize
   * @param dateRange - Report date range
   * @param config - Optional summary configuration
   * @returns Summary result with AI status
   */
  async generateExecutiveSummary(
    orgId: string,
    data: ReportData,
    dateRange: { start: Date; end: Date },
    config?: SummaryConfig,
  ): Promise<AiSummaryResult> {
    if (!this.aiClient.isConfigured()) {
      this.logger.warn(
        "AI service not configured - using fallback executive summary",
      );
      return {
        summary: this.generateFallbackSummary(data),
        aiGenerated: false,
      };
    }

    const prompt = this.buildSummaryPrompt(data, dateRange, config);

    try {
      const response = await this.aiClient.createChat({
        organizationId: orgId,
        message: prompt,
        systemPrompt: this.SUMMARY_SYSTEM_PROMPT,
      });

      return {
        summary: response.content,
        aiGenerated: true,
        tokens: {
          input: response.inputTokens,
          output: response.outputTokens,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate AI summary: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return {
        summary: this.generateFallbackSummary(data),
        aiGenerated: false,
      };
    }
  }

  /**
   * Generate recommendations based on report data.
   *
   * @param orgId - Organization ID
   * @param data - Report data to analyze
   * @returns List of AI-generated recommendations
   */
  async generateRecommendations(
    orgId: string,
    data: ReportData,
  ): Promise<string[]> {
    if (!this.aiClient.isConfigured()) {
      return this.generateFallbackRecommendations(data);
    }

    const prompt = this.buildRecommendationsPrompt(data);

    try {
      const response = await this.aiClient.createChat({
        organizationId: orgId,
        message: prompt,
        systemPrompt:
          "You are a compliance advisor. Generate 3-5 specific, actionable recommendations based on the metrics provided. Each recommendation should be one sentence.",
      });

      return this.parseRecommendations(response.content);
    } catch (error) {
      this.logger.error(
        `Failed to generate recommendations: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return this.generateFallbackRecommendations(data);
    }
  }

  /**
   * Check if AI summary generation is available.
   *
   * @returns True if AI service is configured and ready
   */
  isAvailable(): boolean {
    return this.aiClient.isConfigured();
  }

  // ===========================================
  // Prompt Building
  // ===========================================

  /**
   * Build the prompt for executive summary generation.
   */
  buildSummaryPrompt(
    data: ReportData,
    dateRange: { start: Date; end: Date },
    config?: SummaryConfig,
  ): string {
    const period = this.formatDateRange(dateRange);
    const kpiSummary = data.kpis
      .map((k) => `${k.label}: ${k.value}`)
      .join(", ");

    let prompt = `Generate a brief executive summary for a compliance board report covering ${period}.

Key Metrics:
${kpiSummary}

SLA Compliance: ${data.slaMetrics.compliance}%
Cases at SLA Risk: ${data.slaMetrics.atRisk}
Campaign Completion: ${data.campaignMetrics.completion}%

Top Risk Areas:
${data.riskAreas.map((r) => `- ${r.name}: ${r.casesCount} high/critical cases`).join("\n")}

Provide 3-4 bullet points summarizing the compliance posture, notable trends, and recommended focus areas.`;

    if (config?.customPromptAdditions) {
      prompt += `\n\nAdditional context: ${config.customPromptAdditions}`;
    }

    return prompt;
  }

  /**
   * Build prompt for recommendations generation.
   */
  private buildRecommendationsPrompt(data: ReportData): string {
    return `Based on these compliance metrics, provide recommendations:

SLA Compliance: ${data.slaMetrics.compliance}% (${data.slaMetrics.atRisk} at risk, ${data.slaMetrics.breached} breached)
Campaign Completion: ${data.campaignMetrics.completion}% (${data.campaignMetrics.overdue} overdue)
Average Days to Close: ${Math.round(data.slaMetrics.avgDaysToClose)}

Risk Areas:
${data.riskAreas.map((r) => `- ${r.name}: Score ${r.score}, ${r.casesCount} cases, trend: ${r.trend}`).join("\n")}

Generate 3-5 specific, actionable recommendations to improve compliance posture.`;
  }

  // ===========================================
  // Fallback Generation
  // ===========================================

  /**
   * Generate a fallback summary when AI is unavailable.
   */
  generateFallbackSummary(data: ReportData): string {
    const totalCases = data.kpis.find((k) => k.label === "Total Cases");
    const openCases = data.kpis.find((k) => k.label === "Open Cases");

    const lines = [
      `- ${totalCases?.value || 0} cases processed during the reporting period with ${openCases?.value || 0} currently open.`,
      `- SLA compliance rate stands at ${data.slaMetrics.compliance}% with ${data.slaMetrics.atRisk} cases at risk.`,
      `- Campaign completion rate is ${data.campaignMetrics.completion}% across ${data.campaignMetrics.activeCampaigns} active campaigns.`,
    ];

    if (data.riskAreas.length > 0) {
      lines.push(
        `- Top risk area: ${data.riskAreas[0].name} with ${data.riskAreas[0].casesCount} high-severity cases.`,
      );
    } else {
      lines.push("- No significant risk areas identified.");
    }

    return lines.join("\n");
  }

  /**
   * Generate fallback recommendations when AI is unavailable.
   */
  private generateFallbackRecommendations(data: ReportData): string[] {
    const recommendations: string[] = [];

    // SLA-based recommendations
    if (data.slaMetrics.compliance < 90) {
      recommendations.push(
        "Review SLA compliance processes to improve the current rate below 90%.",
      );
    }
    if (data.slaMetrics.atRisk > 10) {
      recommendations.push(
        `Prioritize the ${data.slaMetrics.atRisk} cases at SLA risk to prevent breaches.`,
      );
    }

    // Campaign-based recommendations
    if (data.campaignMetrics.overdue > 0) {
      recommendations.push(
        `Follow up on ${data.campaignMetrics.overdue} overdue campaign assignments.`,
      );
    }

    // Risk-based recommendations
    if (data.riskAreas.length > 0 && data.riskAreas[0].score > 50) {
      recommendations.push(
        `Investigate increased activity in ${data.riskAreas[0].name} category.`,
      );
    }

    // Default recommendation if none generated
    if (recommendations.length === 0) {
      recommendations.push(
        "Continue monitoring compliance metrics and maintain current processes.",
      );
    }

    return recommendations;
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Format date range as a readable string.
   */
  private formatDateRange(dateRange: { start: Date; end: Date }): string {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return `${dateRange.start.toLocaleDateString("en-US", options)} - ${dateRange.end.toLocaleDateString("en-US", options)}`;
  }

  /**
   * Parse AI response into individual recommendations.
   */
  private parseRecommendations(content: string): string[] {
    return content
      .split(/\n+/)
      .map((line) =>
        line
          .replace(/^[-*\d.)\s]+/, "")
          .trim(),
      )
      .filter((line) => line.length > 10); // Filter out too-short items
  }

  /**
   * Format AI response for display (clean up formatting).
   */
  formatAiResponse(response: string): string {
    return response
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");
  }
}
