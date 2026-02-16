import { Injectable, Logger } from "@nestjs/common";
import Handlebars from "handlebars";
import {
  PdfGeneratorService,
  PdfGenerationOptions,
} from "../pdf-generator.service";
import { KpiItem, TrendData, CaseBreakdown } from "../pptx-generator.service";
import {
  SlaMetrics,
  CampaignMetrics,
  RiskArea,
} from "./report-data-fetcher.service";

// ===========================================
// Report Rendering Types
// ===========================================

/**
 * Data structure for rendering board report HTML.
 */
export interface BoardReportHtmlData {
  /** Report title */
  title: string;
  /** Formatted period string (e.g., "Jan 1, 2024 - Mar 31, 2024") */
  period: string;
  /** Executive summary text (bullet points) */
  executiveSummary: string;
  /** Key performance indicators */
  kpis: KpiItem[];
  /** Trend data for charts */
  trends: TrendData[];
  /** Case breakdown by category and status */
  caseBreakdown: CaseBreakdown;
  /** SLA compliance metrics */
  slaMetrics: SlaMetrics;
  /** Campaign metrics */
  campaignMetrics: CampaignMetrics;
  /** Risk areas */
  riskAreas: RiskArea[];
  /** Generation timestamp */
  generatedAt: Date;
  /** Organization name for branding */
  organizationName?: string;
}

/**
 * ReportPdfBuilderService
 *
 * Handles HTML template rendering and PDF generation for board reports.
 * Extracts templating logic from BoardReportService to provide a focused,
 * testable service for report rendering.
 *
 * Features:
 * - Handlebars template rendering with custom helpers
 * - KPI grid rendering with trend indicators
 * - Case breakdown tables
 * - SLA and campaign metrics sections
 * - Risk areas table
 * - Light/dark theme support
 *
 * Usage:
 * ```typescript
 * const html = await reportPdfBuilderService.buildHtmlReport({
 *   title: 'Q1 Board Report',
 *   period: 'Jan 1 - Mar 31, 2024',
 *   kpis: [...],
 *   ...
 * });
 * const pdfBuffer = await reportPdfBuilderService.generatePdf(html, { format: 'Letter' });
 * ```
 */
@Injectable()
export class ReportPdfBuilderService {
  private readonly logger = new Logger(ReportPdfBuilderService.name);
  private helpersRegistered = false;

  constructor(private readonly pdfGenerator: PdfGeneratorService) {
    // Defer helper registration until first use to avoid race conditions
  }

  /**
   * Build HTML report from data.
   *
   * @param data - Report data for rendering
   * @returns Rendered HTML string
   */
  buildHtmlReport(data: BoardReportHtmlData): string {
    this.ensureHelpersRegistered();

    const template = Handlebars.compile(this.getHtmlTemplate());
    return template(data);
  }

  /**
   * Generate PDF from HTML content.
   *
   * @param html - HTML content to convert
   * @param options - PDF generation options
   * @returns PDF buffer
   */
  async generatePdf(
    html: string,
    options?: PdfGenerationOptions,
  ): Promise<Buffer> {
    return this.pdfGenerator.generatePdf(html, options);
  }

  /**
   * Build HTML and generate PDF in one call.
   *
   * @param data - Report data for rendering
   * @param options - PDF generation options
   * @returns PDF buffer
   */
  async buildAndGeneratePdf(
    data: BoardReportHtmlData,
    options?: PdfGenerationOptions,
  ): Promise<Buffer> {
    const html = this.buildHtmlReport(data);
    return this.generatePdf(html, options);
  }

  /**
   * Format a KPI value for display.
   *
   * @param value - Raw value (number or string)
   * @param type - Value type for formatting
   * @returns Formatted value string
   */
  formatKpiValue(
    value: number | string,
    type?: "number" | "percentage" | "currency" | "days",
  ): string {
    if (typeof value === "string") {
      return value;
    }

    switch (type) {
      case "percentage":
        return `${Math.round(value)}%`;
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
        }).format(value);
      case "days":
        return `${Math.round(value)} days`;
      case "number":
      default:
        return new Intl.NumberFormat("en-US").format(value);
    }
  }

  /**
   * Format trend indicator for display.
   *
   * @param trend - Trend data
   * @returns Formatted trend string
   */
  formatTrendIndicator(trend?: {
    value: number;
    direction: "up" | "down" | "flat";
  }): string {
    if (!trend) {
      return "";
    }

    const prefix =
      trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : "";
    return `${prefix}${trend.value}%`;
  }

  // ===========================================
  // Private Methods
  // ===========================================

  /**
   * Ensure Handlebars helpers are registered.
   */
  private ensureHelpersRegistered(): void {
    if (this.helpersRegistered) {
      return;
    }

    this.registerHandlebarsHelpers();
    this.helpersRegistered = true;
  }

  /**
   * Register Handlebars helpers for template rendering.
   */
  private registerHandlebarsHelpers(): void {
    // Format date helper
    Handlebars.registerHelper(
      "formatDate",
      (date: Date) =>
        date?.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) || "",
    );

    // Format number helper
    Handlebars.registerHelper("formatNumber", (num: number) =>
      typeof num === "number" ? num.toFixed(1) : "0",
    );

    // Equality helper
    Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);

    // Split bullet points helper
    Handlebars.registerHelper("splitBullets", (text: string) => {
      if (!text) return [];
      return text
        .split(/\n+/)
        .map((line) =>
          line
            .replace(/^[-*]\s*/, "")
            .replace(/^\d+[.)]\s*/, "")
            .trim(),
        )
        .filter((line) => line.length > 0);
    });

    // Capital case helper
    Handlebars.registerHelper("capitalCase", (str: string) => {
      if (!str) return "";
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });
  }

  /**
   * Get the Handlebars HTML template for board reports.
   */
  private getHtmlTemplate(): string {
    return `
<div class="report-header">
  <div class="logo">Ethico</div>
  <div class="date">Generated: {{formatDate generatedAt}}</div>
</div>

<h1>{{title}}</h1>
<p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">{{period}}{{#if organizationName}} | {{organizationName}}{{/if}}</p>

<div class="executive-summary">
  <h3>Executive Summary</h3>
  {{#each (splitBullets executiveSummary)}}
  <p>{{this}}</p>
  {{/each}}
</div>

<h2>Key Metrics</h2>
<div class="kpi-grid">
  {{#each kpis}}
  <div class="kpi-card no-break">
    <div class="kpi-label">{{label}}</div>
    <div class="kpi-value">{{value}}</div>
    {{#if trend}}
    <div class="kpi-trend {{trend.direction}}">
      {{#if (eq trend.direction "up")}}+{{/if}}{{trend.value}}% vs previous period
    </div>
    {{/if}}
  </div>
  {{/each}}
</div>

<div class="page-break"></div>

<h2>Case Breakdown</h2>
<div style="display: flex; gap: 24px; margin-bottom: 24px;">
  <div style="flex: 1;">
    <h3>By Category</h3>
    <table>
      <thead>
        <tr><th>Category</th><th style="text-align: right;">Count</th></tr>
      </thead>
      <tbody>
        {{#each caseBreakdown.byCategory}}
        <tr>
          <td>{{name}}</td>
          <td style="text-align: right;">{{value}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>
  <div style="flex: 1;">
    <h3>By Status</h3>
    <table>
      <thead>
        <tr><th>Status</th><th style="text-align: right;">Count</th></tr>
      </thead>
      <tbody>
        {{#each caseBreakdown.byStatus}}
        <tr>
          <td>{{name}}</td>
          <td style="text-align: right;">{{value}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>
</div>

<h2>SLA Performance</h2>
<div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
  <div class="kpi-card no-break">
    <div class="kpi-label">Compliance Rate</div>
    <div class="kpi-value">{{slaMetrics.compliance}}%</div>
  </div>
  <div class="kpi-card no-break">
    <div class="kpi-label">At Risk</div>
    <div class="kpi-value" style="color: #f59e0b;">{{slaMetrics.atRisk}}</div>
  </div>
  <div class="kpi-card no-break">
    <div class="kpi-label">Breached</div>
    <div class="kpi-value" style="color: #ef4444;">{{slaMetrics.breached}}</div>
  </div>
  <div class="kpi-card no-break">
    <div class="kpi-label">Avg Days to Close</div>
    <div class="kpi-value">{{formatNumber slaMetrics.avgDaysToClose}}</div>
  </div>
</div>

<h2>Campaign Metrics</h2>
<div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
  <div class="kpi-card no-break">
    <div class="kpi-label">Active Campaigns</div>
    <div class="kpi-value">{{campaignMetrics.activeCampaigns}}</div>
  </div>
  <div class="kpi-card no-break">
    <div class="kpi-label">Completion Rate</div>
    <div class="kpi-value">{{campaignMetrics.completion}}%</div>
  </div>
  <div class="kpi-card no-break">
    <div class="kpi-label">Pending</div>
    <div class="kpi-value">{{campaignMetrics.pending}}</div>
  </div>
  <div class="kpi-card no-break">
    <div class="kpi-label">Overdue</div>
    <div class="kpi-value" style="color: #ef4444;">{{campaignMetrics.overdue}}</div>
  </div>
</div>

{{#if riskAreas.length}}
<div class="page-break"></div>

<h2>Risk Areas</h2>
<table>
  <thead>
    <tr>
      <th>Area</th>
      <th style="text-align: right;">High/Critical Cases</th>
      <th style="text-align: right;">Risk Score</th>
      <th>Trend</th>
    </tr>
  </thead>
  <tbody>
    {{#each riskAreas}}
    <tr>
      <td>{{name}}</td>
      <td style="text-align: right;">{{casesCount}}</td>
      <td style="text-align: right;">{{score}}</td>
      <td>{{capitalCase trend}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{/if}}

<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8;">
  <p>This report was generated automatically by the Ethico Risk Intelligence Platform.</p>
  <p>For questions, contact your compliance team administrator.</p>
</div>
`;
  }

  /**
   * Render a specific section of the report.
   *
   * @param sectionName - Section to render
   * @param data - Section data
   * @returns Rendered HTML for the section
   */
  renderSection(
    sectionName:
      | "kpis"
      | "breakdown"
      | "sla"
      | "campaigns"
      | "risks"
      | "summary",
    data: Partial<BoardReportHtmlData>,
  ): string {
    this.ensureHelpersRegistered();

    const templates: Record<string, string> = {
      kpis: `
<div class="kpi-grid">
  {{#each kpis}}
  <div class="kpi-card no-break">
    <div class="kpi-label">{{label}}</div>
    <div class="kpi-value">{{value}}</div>
  </div>
  {{/each}}
</div>`,
      breakdown: `
<div style="display: flex; gap: 24px;">
  <div style="flex: 1;">
    <h3>By Category</h3>
    <table>
      <tbody>
        {{#each caseBreakdown.byCategory}}
        <tr><td>{{name}}</td><td style="text-align: right;">{{value}}</td></tr>
        {{/each}}
      </tbody>
    </table>
  </div>
  <div style="flex: 1;">
    <h3>By Status</h3>
    <table>
      <tbody>
        {{#each caseBreakdown.byStatus}}
        <tr><td>{{name}}</td><td style="text-align: right;">{{value}}</td></tr>
        {{/each}}
      </tbody>
    </table>
  </div>
</div>`,
      sla: `
<div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
  <div class="kpi-card"><div class="kpi-label">Compliance</div><div class="kpi-value">{{slaMetrics.compliance}}%</div></div>
  <div class="kpi-card"><div class="kpi-label">At Risk</div><div class="kpi-value">{{slaMetrics.atRisk}}</div></div>
  <div class="kpi-card"><div class="kpi-label">Breached</div><div class="kpi-value">{{slaMetrics.breached}}</div></div>
  <div class="kpi-card"><div class="kpi-label">Avg Days</div><div class="kpi-value">{{formatNumber slaMetrics.avgDaysToClose}}</div></div>
</div>`,
      campaigns: `
<div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
  <div class="kpi-card"><div class="kpi-label">Active</div><div class="kpi-value">{{campaignMetrics.activeCampaigns}}</div></div>
  <div class="kpi-card"><div class="kpi-label">Completion</div><div class="kpi-value">{{campaignMetrics.completion}}%</div></div>
  <div class="kpi-card"><div class="kpi-label">Pending</div><div class="kpi-value">{{campaignMetrics.pending}}</div></div>
  <div class="kpi-card"><div class="kpi-label">Overdue</div><div class="kpi-value">{{campaignMetrics.overdue}}</div></div>
</div>`,
      risks: `
<table>
  <thead><tr><th>Area</th><th>Cases</th><th>Score</th><th>Trend</th></tr></thead>
  <tbody>
    {{#each riskAreas}}
    <tr><td>{{name}}</td><td>{{casesCount}}</td><td>{{score}}</td><td>{{capitalCase trend}}</td></tr>
    {{/each}}
  </tbody>
</table>`,
      summary: `
<div class="executive-summary">
  {{#each (splitBullets executiveSummary)}}
  <p>{{this}}</p>
  {{/each}}
</div>`,
    };

    const template = Handlebars.compile(templates[sectionName] || "");
    return template(data);
  }
}
