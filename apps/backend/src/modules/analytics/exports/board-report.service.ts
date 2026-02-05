import { Injectable, Logger, Inject } from "@nestjs/common";
import Handlebars from "handlebars";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService, CreateAuditLogDto } from "../../audit/audit.service";
import { AiClientService } from "../../ai/services/ai-client.service";
import {
  StorageProvider,
  STORAGE_PROVIDER,
} from "../../storage/providers/storage-provider.interface";
import {
  PdfGeneratorService,
  PdfGenerationOptions,
} from "./pdf-generator.service";
import {
  PptxGeneratorService,
  BoardReportData,
  KpiItem,
  TrendData,
  CaseBreakdown,
  BreakdownItem,
} from "./pptx-generator.service";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";
import { nanoid } from "nanoid";

// ===========================================
// Board Report Configuration Types
// ===========================================

/**
 * Date range for report filtering.
 */
export interface DateRange {
  /** Start date (ISO string or Date) */
  start: Date | string;
  /** End date (ISO string or Date) */
  end: Date | string;
}

/**
 * Configuration for board report generation.
 */
export interface BoardReportConfig {
  /** Report title (defaults to "Compliance Board Report") */
  title?: string;
  /** Date range for the report data */
  dateRange: DateRange;
  /** Include PowerPoint format in addition to PDF */
  includePptx?: boolean;
  /** Filter by business units (optional) */
  businessUnitIds?: string[];
  /** Filter by locations (optional) */
  locationIds?: string[];
  /** Filter by categories (optional) */
  categoryIds?: string[];
  /** Custom sections to include (defaults to all) */
  sections?: BoardReportSection[];
  /** Theme for PDF generation */
  theme?: "light" | "dark";
}

/**
 * Sections that can be included in the board report.
 */
export type BoardReportSection =
  | "executive_summary"
  | "kpis"
  | "case_trends"
  | "case_breakdown"
  | "campaign_metrics"
  | "sla_metrics"
  | "risk_areas"
  | "recommendations";

/**
 * Result of board report generation.
 */
export interface BoardReportResult {
  /** URL to download the PDF */
  pdfUrl: string;
  /** URL to download the PPTX (if includePptx was true) */
  pptxUrl?: string;
  /** Size of the PDF in bytes */
  pdfSize: number;
  /** Size of the PPTX in bytes (if generated) */
  pptxSize?: number;
  /** Report generation metadata */
  metadata: {
    title: string;
    period: string;
    generatedAt: Date;
    expiresAt: Date;
    totalCases: number;
    totalRius: number;
  };
}

// ===========================================
// Internal Data Types
// ===========================================

interface ReportData {
  kpis: KpiItem[];
  trends: TrendData[];
  caseBreakdown: CaseBreakdown;
  slaMetrics: SlaMetrics;
  campaignMetrics: CampaignMetrics;
  riskAreas: RiskArea[];
}

interface SlaMetrics {
  compliance: number;
  atRisk: number;
  breached: number;
  avgDaysToClose: number;
  trend?: { value: number; direction: "up" | "down" | "flat" };
}

interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  completion: number;
  pending: number;
  overdue: number;
}

interface RiskArea {
  name: string;
  score: number;
  casesCount: number;
  trend: "increasing" | "decreasing" | "stable";
}

interface CaseCounts {
  total: number;
  open: number;
  closed: number;
  avgDaysToClose: number;
  substantiationRate: number;
  trend?: { value: number; direction: "up" | "down" | "flat" };
}

interface TrendDataPoints {
  labels: string[];
  casesOpened: number[];
  casesClosed: number[];
}

/**
 * BoardReportService
 *
 * Orchestrates the generation of board reports including:
 * - Data gathering from cases, RIUs, campaigns
 * - AI-generated executive summaries
 * - HTML template rendering with Handlebars
 * - PDF generation via PdfGeneratorService
 * - Optional PPTX generation via PptxGeneratorService
 * - Storage upload and audit logging
 *
 * Usage:
 * ```typescript
 * const result = await boardReportService.generateBoardReport(
 *   organizationId,
 *   userId,
 *   {
 *     title: 'Q1 2024 Compliance Report',
 *     dateRange: { start: '2024-01-01', end: '2024-03-31' },
 *     includePptx: true,
 *   }
 * );
 * console.log('PDF available at:', result.pdfUrl);
 * ```
 */
@Injectable()
export class BoardReportService {
  private readonly logger = new Logger(BoardReportService.name);

  /** URL expiration time for generated reports (24 hours) */
  private readonly REPORT_EXPIRATION_HOURS = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly pptxGenerator: PptxGeneratorService,
    private readonly aiClient: AiClientService,
    private readonly auditService: AuditService,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {
    // Register Handlebars helpers
    this.registerHandlebarsHelpers();
  }

  /**
   * Generate a board report with PDF and optional PPTX.
   *
   * @param orgId - Organization ID
   * @param userId - User ID generating the report
   * @param config - Report configuration
   * @returns URLs to download the generated reports
   */
  async generateBoardReport(
    orgId: string,
    userId: string,
    config: BoardReportConfig,
  ): Promise<BoardReportResult> {
    const startTime = Date.now();
    this.logger.log(
      `Generating board report for org ${orgId}: ${config.title || "Compliance Board Report"}`,
    );

    // Normalize date range
    const dateRange = this.normalizeDateRange(config.dateRange);
    const period = this.formatPeriod(dateRange);
    const title = config.title || "Compliance Board Report";

    // 1. Gather report data (parallel queries)
    const reportData = await this.gatherReportData(orgId, dateRange, config);

    // 2. Generate AI executive summary
    const executiveSummary = await this.generateExecutiveSummary(
      orgId,
      reportData,
      dateRange,
    );

    // 3. Render HTML template
    const html = this.renderBoardReportHtml({
      title,
      period,
      executiveSummary,
      ...reportData,
      generatedAt: new Date(),
      organizationName: await this.getOrganizationName(orgId),
    });

    // 4. Generate PDF
    const pdfOptions: PdfGenerationOptions = {
      format: "Letter",
      landscape: false,
      footerText: "Confidential - Board Report",
      theme: config.theme || "light",
    };
    const pdfBuffer = await this.pdfGenerator.generatePdf(html, pdfOptions);

    // 5. Upload PDF
    const timestamp = Date.now();
    const reportId = nanoid(10);
    const pdfKey = `reports/${orgId}/board-report-${reportId}-${timestamp}.pdf`;
    const pdfResult = await this.storageProvider.uploadFile({
      organizationId: orgId,
      path: pdfKey,
      content: pdfBuffer,
      contentType: "application/pdf",
      metadata: {
        reportType: "board_report",
        title,
        period,
        generatedBy: userId,
      },
    });

    // 6. Optionally generate and upload PPTX
    let pptxUrl: string | undefined;
    let pptxSize: number | undefined;

    if (config.includePptx) {
      const pptxData: BoardReportData = {
        title,
        period,
        executiveSummary,
        kpis: reportData.kpis,
        trends: reportData.trends,
        caseBreakdown: reportData.caseBreakdown,
        organizationName: await this.getOrganizationName(orgId),
      };

      const pptxBuffer =
        await this.pptxGenerator.generatePresentation(pptxData);
      const pptxKey = `reports/${orgId}/board-report-${reportId}-${timestamp}.pptx`;

      const pptxResult = await this.storageProvider.uploadFile({
        organizationId: orgId,
        path: pptxKey,
        content: pptxBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        metadata: {
          reportType: "board_report",
          title,
          period,
          generatedBy: userId,
        },
      });

      pptxUrl = await this.storageProvider.getSignedUrl({
        organizationId: orgId,
        path: pptxKey,
        expiresInMinutes: this.REPORT_EXPIRATION_HOURS * 60,
      });
      pptxSize = pptxResult.size;
    }

    // 7. Get signed URL for PDF
    const pdfUrl = await this.storageProvider.getSignedUrl({
      organizationId: orgId,
      path: pdfKey,
      expiresInMinutes: this.REPORT_EXPIRATION_HOURS * 60,
    });

    // 8. Log to audit
    await this.logAudit({
      organizationId: orgId,
      entityType: AuditEntityType.REPORT,
      entityId: reportId,
      action: "BOARD_REPORT_GENERATED",
      actionCategory: AuditActionCategory.ACCESS,
      actionDescription: `Board report "${title}" generated for ${period}`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: {
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
        pdfKey,
        pptxIncluded: !!config.includePptx,
        duration: Date.now() - startTime,
      },
    });

    const totalCases = reportData.kpis.find((k) => k.label === "Total Cases");
    const totalRius = reportData.kpis.find((k) => k.label === "Total RIUs");

    this.logger.log(
      `Board report generated in ${Date.now() - startTime}ms: ${pdfKey}`,
    );

    return {
      pdfUrl,
      pptxUrl,
      pdfSize: pdfResult.size,
      pptxSize,
      metadata: {
        title,
        period,
        generatedAt: new Date(),
        expiresAt: new Date(
          Date.now() + this.REPORT_EXPIRATION_HOURS * 60 * 60 * 1000,
        ),
        totalCases:
          typeof totalCases?.value === "number" ? totalCases.value : 0,
        totalRius: typeof totalRius?.value === "number" ? totalRius.value : 0,
      },
    };
  }

  // ===========================================
  // Data Gathering
  // ===========================================

  /**
   * Gather all report data in parallel.
   */
  private async gatherReportData(
    orgId: string,
    dateRange: { start: Date; end: Date },
    config: BoardReportConfig,
  ): Promise<ReportData> {
    const [
      caseCounts,
      categoryBreakdown,
      statusBreakdown,
      trends,
      slaMetrics,
      campaignMetrics,
      riskAreas,
    ] = await Promise.all([
      this.getCaseCounts(orgId, dateRange, config),
      this.getCategoryBreakdown(orgId, dateRange, config),
      this.getStatusBreakdown(orgId, dateRange, config),
      this.getTrends(orgId, dateRange),
      this.getSlaMetrics(orgId, dateRange, config),
      this.getCampaignMetrics(orgId, config),
      this.getRiskAreas(orgId, dateRange),
    ]);

    // Build KPIs
    const kpis: KpiItem[] = [
      {
        label: "Total Cases",
        value: caseCounts.total,
        trend: caseCounts.trend,
      },
      { label: "Open Cases", value: caseCounts.open },
      {
        label: "Avg Days to Close",
        value: Math.round(caseCounts.avgDaysToClose),
      },
      {
        label: "SLA Compliance",
        value: `${slaMetrics.compliance}%`,
        trend: slaMetrics.trend,
      },
      {
        label: "Campaign Completion",
        value: `${campaignMetrics.completion}%`,
      },
      {
        label: "Substantiation Rate",
        value: `${caseCounts.substantiationRate}%`,
      },
      {
        label: "Total RIUs",
        value: await this.getRiuCount(orgId, dateRange),
      },
      {
        label: "Active Campaigns",
        value: campaignMetrics.activeCampaigns,
      },
    ];

    return {
      kpis,
      trends: [
        {
          name: "Cases Opened",
          labels: trends.labels,
          values: trends.casesOpened,
          color: "3B82F6",
        },
        {
          name: "Cases Closed",
          labels: trends.labels,
          values: trends.casesClosed,
          color: "22C55E",
        },
      ],
      caseBreakdown: {
        byCategory: categoryBreakdown,
        byStatus: statusBreakdown,
      },
      slaMetrics,
      campaignMetrics,
      riskAreas,
    };
  }

  /**
   * Get case counts and statistics.
   */
  private async getCaseCounts(
    orgId: string,
    dateRange: { start: Date; end: Date },
    config: BoardReportConfig,
  ): Promise<CaseCounts> {
    const whereClause = {
      organizationId: orgId,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
      ...(config.businessUnitIds?.length && {
        businessUnitId: { in: config.businessUnitIds },
      }),
      ...(config.locationIds?.length && {
        locationName: { in: config.locationIds },
      }),
      ...(config.categoryIds?.length && {
        primaryCategoryId: { in: config.categoryIds },
      }),
    };

    const [total, open, closed, substantiated] = await Promise.all([
      this.prisma.case.count({ where: whereClause }),
      this.prisma.case.count({
        where: { ...whereClause, status: { not: "CLOSED" } },
      }),
      this.prisma.case.count({ where: { ...whereClause, status: "CLOSED" } }),
      this.prisma.case.count({
        where: { ...whereClause, outcome: "SUBSTANTIATED" },
      }),
    ]);

    // Calculate average days to close using outcomeAt (when outcome was set)
    const closedCases = await this.prisma.case.findMany({
      where: {
        ...whereClause,
        status: "CLOSED",
        outcomeAt: { not: null },
      },
      select: { createdAt: true, outcomeAt: true },
    });

    const avgDaysToClose =
      closedCases.length > 0
        ? closedCases.reduce((sum, c) => {
            const days =
              (c.outcomeAt!.getTime() - c.createdAt.getTime()) /
              (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / closedCases.length
        : 0;

    // Calculate trend vs previous period
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - periodLength);
    const previousEnd = dateRange.start;

    const previousTotal = await this.prisma.case.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: previousStart, lte: previousEnd },
      },
    });

    const trendValue =
      previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;

    return {
      total,
      open,
      closed,
      avgDaysToClose,
      substantiationRate:
        closed > 0 ? Math.round((substantiated / closed) * 100) : 0,
      trend: {
        value: Math.abs(Math.round(trendValue)),
        direction: trendValue > 0 ? "up" : trendValue < 0 ? "down" : "flat",
      },
    };
  }

  /**
   * Get case breakdown by category.
   */
  private async getCategoryBreakdown(
    orgId: string,
    dateRange: { start: Date; end: Date },
    _config: BoardReportConfig,
  ): Promise<BreakdownItem[]> {
    const cases = await this.prisma.case.groupBy({
      by: ["primaryCategoryId"],
      where: {
        organizationId: orgId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        primaryCategoryId: { not: null },
      },
      _count: { id: true },
    });

    // Get category names
    const categoryIds = cases
      .map((c) => c.primaryCategoryId)
      .filter((id): id is string => id !== null);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return cases
      .map((c) => ({
        name: categoryMap.get(c.primaryCategoryId!) || "Unknown",
        value: c._count.id,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  }

  /**
   * Get case breakdown by status.
   */
  private async getStatusBreakdown(
    orgId: string,
    dateRange: { start: Date; end: Date },
    _config: BoardReportConfig,
  ): Promise<BreakdownItem[]> {
    const statusColors: Record<string, string> = {
      OPEN: "3B82F6", // Blue
      IN_PROGRESS: "F59E0B", // Amber
      PENDING_REVIEW: "8B5CF6", // Purple
      CLOSED: "22C55E", // Green
    };

    const cases = await this.prisma.case.groupBy({
      by: ["status"],
      where: {
        organizationId: orgId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
    });

    return cases.map((c) => ({
      name: this.formatStatus(c.status),
      value: c._count.id,
      color: statusColors[c.status] || "64748B",
    }));
  }

  /**
   * Get case trends over time.
   */
  private async getTrends(
    orgId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<TrendDataPoints> {
    // Get weekly data points
    const weeks = this.getWeeksBetween(dateRange.start, dateRange.end);
    const labels: string[] = [];
    const casesOpened: number[] = [];
    const casesClosed: number[] = [];

    for (const week of weeks) {
      labels.push(this.formatWeekLabel(week.start));

      const [opened, closed] = await Promise.all([
        this.prisma.case.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: week.start, lte: week.end },
          },
        }),
        this.prisma.case.count({
          where: {
            organizationId: orgId,
            status: "CLOSED",
            outcomeAt: { gte: week.start, lte: week.end },
          },
        }),
      ]);

      casesOpened.push(opened);
      casesClosed.push(closed);
    }

    return { labels, casesOpened, casesClosed };
  }

  /**
   * Get SLA metrics.
   */
  private async getSlaMetrics(
    orgId: string,
    dateRange: { start: Date; end: Date },
    _config: BoardReportConfig,
  ): Promise<SlaMetrics> {
    const closedCases = await this.prisma.case.findMany({
      where: {
        organizationId: orgId,
        status: "CLOSED",
        outcomeAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: {
        id: true,
        createdAt: true,
        outcomeAt: true,
      },
    });

    let compliant = 0;
    let breached = 0;
    let totalDays = 0;

    // Simple SLA calculation: cases closed within 30 days are compliant
    const SLA_DAYS = 30;
    for (const c of closedCases) {
      if (c.outcomeAt) {
        const daysToClose =
          (c.outcomeAt.getTime() - c.createdAt.getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysToClose <= SLA_DAYS) {
          compliant++;
        } else {
          breached++;
        }
        totalDays += daysToClose;
      }
    }

    const total = closedCases.length;
    const compliance = total > 0 ? Math.round((compliant / total) * 100) : 100;

    // Count at-risk cases (open cases older than 20 days - approaching SLA)
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    const atRisk = await this.prisma.case.count({
      where: {
        organizationId: orgId,
        status: { not: "CLOSED" },
        createdAt: { lt: twentyDaysAgo },
      },
    });

    return {
      compliance,
      atRisk,
      breached,
      avgDaysToClose: total > 0 ? totalDays / total : 0,
    };
  }

  /**
   * Get campaign metrics.
   */
  private async getCampaignMetrics(
    orgId: string,
    _config: BoardReportConfig,
  ): Promise<CampaignMetrics> {
    const [totalCampaigns, activeCampaigns, assignments] = await Promise.all([
      this.prisma.campaign.count({ where: { organizationId: orgId } }),
      this.prisma.campaign.count({
        where: { organizationId: orgId, status: "ACTIVE" },
      }),
      this.prisma.campaignAssignment.groupBy({
        by: ["status"],
        where: {
          organizationId: orgId,
          campaign: { status: "ACTIVE" },
        },
        _count: { id: true },
      }),
    ]);

    const statusCounts = new Map(
      assignments.map((a) => [a.status, a._count.id]),
    );
    const completed = statusCounts.get("COMPLETED") || 0;
    const pending = statusCounts.get("PENDING") || 0;
    const overdue = statusCounts.get("OVERDUE") || 0;
    const total = completed + pending + overdue;

    return {
      totalCampaigns,
      activeCampaigns,
      completion: total > 0 ? Math.round((completed / total) * 100) : 0,
      pending,
      overdue,
    };
  }

  /**
   * Get risk areas based on case severity and trends.
   */
  private async getRiskAreas(
    orgId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<RiskArea[]> {
    // Group high-severity cases by category
    const highRiskCases = await this.prisma.case.groupBy({
      by: ["primaryCategoryId"],
      where: {
        organizationId: orgId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        severity: "HIGH",
        primaryCategoryId: { not: null },
      },
      _count: { id: true },
    });

    // Get category names
    const categoryIds = highRiskCases
      .map((c) => c.primaryCategoryId)
      .filter((id): id is string => id !== null);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return highRiskCases
      .map((c) => ({
        name: categoryMap.get(c.primaryCategoryId!) || "Unknown",
        score: Math.min(100, (c._count?.id ?? 0) * 20), // Simple risk score
        casesCount: c._count?.id ?? 0,
        trend: "stable" as const, // Would need historical comparison for real trend
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Get RIU count for the period.
   */
  private async getRiuCount(
    orgId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<number> {
    return this.prisma.riskIntelligenceUnit.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    });
  }

  // ===========================================
  // AI Executive Summary
  // ===========================================

  /**
   * Generate AI executive summary for the report.
   */
  private async generateExecutiveSummary(
    orgId: string,
    data: ReportData,
    dateRange: { start: Date; end: Date },
  ): Promise<string> {
    if (!this.aiClient.isConfigured()) {
      this.logger.warn(
        "AI service not configured - using fallback executive summary",
      );
      return this.generateFallbackSummary(data);
    }

    const prompt = this.buildSummaryPrompt(data, dateRange);

    try {
      const response = await this.aiClient.createChat({
        organizationId: orgId,
        message: prompt,
        systemPrompt: `You are a compliance reporting assistant. Generate concise, professional executive summaries for board reports. Use 3-4 bullet points maximum. Focus on:
1. Key metrics and trends
2. Areas of concern
3. Notable achievements
4. Recommended actions

Keep each bullet point to 1-2 sentences. Use clear, executive-friendly language.`,
      });

      return response.content;
    } catch (error) {
      this.logger.error(
        `Failed to generate AI summary: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return this.generateFallbackSummary(data);
    }
  }

  /**
   * Build prompt for AI summary generation.
   */
  private buildSummaryPrompt(
    data: ReportData,
    dateRange: { start: Date; end: Date },
  ): string {
    const period = this.formatPeriod(dateRange);
    const kpiSummary = data.kpis
      .map((k) => `${k.label}: ${k.value}`)
      .join(", ");

    return `Generate a brief executive summary for a compliance board report covering ${period}.

Key Metrics:
${kpiSummary}

SLA Compliance: ${data.slaMetrics.compliance}%
Cases at SLA Risk: ${data.slaMetrics.atRisk}
Campaign Completion: ${data.campaignMetrics.completion}%

Top Risk Areas:
${data.riskAreas.map((r) => `- ${r.name}: ${r.casesCount} high/critical cases`).join("\n")}

Provide 3-4 bullet points summarizing the compliance posture, notable trends, and recommended focus areas.`;
  }

  /**
   * Generate fallback summary when AI is unavailable.
   */
  private generateFallbackSummary(data: ReportData): string {
    const totalCases = data.kpis.find((k) => k.label === "Total Cases");
    const openCases = data.kpis.find((k) => k.label === "Open Cases");

    return `- ${totalCases?.value || 0} cases processed during the reporting period with ${openCases?.value || 0} currently open.
- SLA compliance rate stands at ${data.slaMetrics.compliance}% with ${data.slaMetrics.atRisk} cases at risk.
- Campaign completion rate is ${data.campaignMetrics.completion}% across ${data.campaignMetrics.activeCampaigns} active campaigns.
- ${data.riskAreas.length > 0 ? `Top risk area: ${data.riskAreas[0]?.name} with ${data.riskAreas[0]?.casesCount} high-severity cases.` : "No significant risk areas identified."}`;
  }

  // ===========================================
  // HTML Template Rendering
  // ===========================================

  /**
   * Render board report HTML using Handlebars template.
   */
  private renderBoardReportHtml(data: {
    title: string;
    period: string;
    executiveSummary: string;
    kpis: KpiItem[];
    trends: TrendData[];
    caseBreakdown: CaseBreakdown;
    slaMetrics: SlaMetrics;
    campaignMetrics: CampaignMetrics;
    riskAreas: RiskArea[];
    generatedAt: Date;
    organizationName?: string;
  }): string {
    const template = Handlebars.compile(this.getHtmlTemplate());
    return template(data);
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
   * Register Handlebars helpers.
   */
  private registerHandlebarsHelpers(): void {
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

    Handlebars.registerHelper("formatNumber", (num: number) =>
      typeof num === "number" ? num.toFixed(1) : "0",
    );

    Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);

    Handlebars.registerHelper("splitBullets", (text: string) => {
      if (!text) return [];
      // Split by newlines and filter out empty lines
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

    Handlebars.registerHelper("capitalCase", (str: string) => {
      if (!str) return "";
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Normalize date range to Date objects.
   */
  private normalizeDateRange(range: DateRange): { start: Date; end: Date } {
    return {
      start:
        typeof range.start === "string" ? new Date(range.start) : range.start,
      end: typeof range.end === "string" ? new Date(range.end) : range.end,
    };
  }

  /**
   * Format date range as period string.
   */
  private formatPeriod(range: { start: Date; end: Date }): string {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return `${range.start.toLocaleDateString("en-US", options)} - ${range.end.toLocaleDateString("en-US", options)}`;
  }

  /**
   * Format status for display.
   */
  private formatStatus(status: string): string {
    return status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Get weeks between two dates.
   */
  private getWeeksBetween(
    start: Date,
    end: Date,
  ): Array<{ start: Date; end: Date }> {
    const weeks: Array<{ start: Date; end: Date }> = [];
    const current = new Date(start);

    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);

      weeks.push({
        start: weekStart,
        end: weekEnd <= end ? weekEnd : end,
      });

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  /**
   * Format week label for charts.
   */
  private formatWeekLabel(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  /**
   * Get organization name.
   */
  private async getOrganizationName(
    orgId: string,
  ): Promise<string | undefined> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    return org?.name;
  }

  /**
   * Log audit entry with error handling.
   */
  private async logAudit(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.auditService.log(dto);
    } catch (error) {
      this.logger.warn(
        `Failed to log audit: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
