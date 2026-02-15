import { Injectable, Logger, Inject } from "@nestjs/common";
import { AuditService, CreateAuditLogDto } from "../../audit/audit.service";
import {
  StorageProvider,
  STORAGE_PROVIDER,
} from "../../storage/providers/storage-provider.interface";
import { PdfGenerationOptions } from "./pdf-generator.service";
import {
  PptxGeneratorService,
  BoardReportData,
} from "./pptx-generator.service";
import {
  ReportDataFetcherService,
  ReportData,
  DateRange as NormalizedDateRange,
} from "./services/report-data-fetcher.service";
import {
  ReportPdfBuilderService,
  BoardReportHtmlData,
} from "./services/report-pdf-builder.service";
import { ReportAiSummaryService } from "./services/report-ai-summary.service";
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

/**
 * BoardReportService - Thin Coordinator
 *
 * Orchestrates board report generation by delegating to focused sub-services:
 * - ReportDataFetcherService: Database queries and data aggregation
 * - ReportPdfBuilderService: HTML/PDF template rendering
 * - ReportAiSummaryService: AI-powered executive summary generation
 *
 * This service maintains the public API but delegates all implementation
 * details to the sub-services, following the thin coordinator pattern.
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
    private readonly reportDataFetcherService: ReportDataFetcherService,
    private readonly reportPdfBuilderService: ReportPdfBuilderService,
    private readonly reportAiSummaryService: ReportAiSummaryService,
    private readonly pptxGenerator: PptxGeneratorService,
    private readonly auditService: AuditService,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

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
    const title = config.title || "Compliance Board Report";

    this.logger.log(`Generating board report for org ${orgId}: ${title}`);

    // Normalize date range
    const dateRange = this.normalizeDateRange(config.dateRange);
    const period = this.formatPeriod(dateRange);

    // 1. Fetch report data via sub-service
    const reportData = await this.reportDataFetcherService.fetchReportData(
      orgId,
      dateRange,
      {
        businessUnitIds: config.businessUnitIds,
        locationIds: config.locationIds,
        categoryIds: config.categoryIds,
      },
    );

    // 2. Generate AI executive summary via sub-service
    let executiveSummary = "";
    if (!config.sections || config.sections.includes("executive_summary")) {
      const summaryResult =
        await this.reportAiSummaryService.generateExecutiveSummary(
          orgId,
          reportData,
          dateRange,
        );
      executiveSummary = summaryResult.summary;
    }

    // 3. Get organization name
    const organizationName =
      await this.reportDataFetcherService.getOrganizationName(orgId);

    // 4. Build HTML and generate PDF via sub-service
    const htmlData: BoardReportHtmlData = {
      title,
      period,
      executiveSummary,
      kpis: reportData.kpis,
      trends: reportData.trends,
      caseBreakdown: reportData.caseBreakdown,
      slaMetrics: reportData.slaMetrics,
      campaignMetrics: reportData.campaignMetrics,
      riskAreas: reportData.riskAreas,
      generatedAt: new Date(),
      organizationName,
    };

    const pdfOptions: PdfGenerationOptions = {
      format: "Letter",
      landscape: false,
      footerText: "Confidential - Board Report",
      theme: config.theme || "light",
    };

    const pdfBuffer = await this.reportPdfBuilderService.buildAndGeneratePdf(
      htmlData,
      pdfOptions,
    );

    // 5. Upload PDF to storage
    const timestamp = Date.now();
    const reportId = nanoid(10);
    const pdfKey = `reports/${orgId}/board-report-${reportId}-${timestamp}.pdf`;

    const pdfResult = await this.uploadToStorage(
      orgId,
      pdfKey,
      pdfBuffer,
      "application/pdf",
      { reportType: "board_report", title, period, generatedBy: userId },
    );

    // 6. Optionally generate and upload PPTX
    let pptxUrl: string | undefined;
    let pptxSize: number | undefined;

    if (config.includePptx) {
      const pptxResult = await this.generateAndUploadPptx(
        orgId,
        userId,
        reportId,
        timestamp,
        title,
        period,
        executiveSummary,
        reportData,
        organizationName,
      );
      pptxUrl = pptxResult.url;
      pptxSize = pptxResult.size;
    }

    // 7. Get signed URL for PDF
    const pdfUrl = await this.storageProvider.getSignedUrl({
      organizationId: orgId,
      path: pdfKey,
      expiresInMinutes: this.REPORT_EXPIRATION_HOURS * 60,
    });

    // 8. Log to audit
    await this.auditGeneration(
      orgId,
      userId,
      reportId,
      title,
      period,
      dateRange,
      pdfKey,
      !!config.includePptx,
      Date.now() - startTime,
    );

    // 9. Build result metadata
    const metadata = this.buildMetadata(title, period, reportData);

    this.logger.log(
      `Board report generated in ${Date.now() - startTime}ms: ${pdfKey}`,
    );

    return {
      pdfUrl,
      pptxUrl,
      pdfSize: pdfResult.size,
      pptxSize,
      metadata,
    };
  }

  // ===========================================
  // Private Helper Methods
  // ===========================================

  /**
   * Upload a file to storage.
   */
  private async uploadToStorage(
    orgId: string,
    path: string,
    content: Buffer,
    contentType: string,
    metadata: Record<string, string>,
  ): Promise<{ size: number }> {
    return this.storageProvider.uploadFile({
      organizationId: orgId,
      path,
      content,
      contentType,
      metadata,
    });
  }

  /**
   * Generate and upload PPTX presentation.
   */
  private async generateAndUploadPptx(
    orgId: string,
    userId: string,
    reportId: string,
    timestamp: number,
    title: string,
    period: string,
    executiveSummary: string,
    reportData: ReportData,
    organizationName?: string,
  ): Promise<{ url: string; size: number }> {
    const pptxData: BoardReportData = {
      title,
      period,
      executiveSummary,
      kpis: reportData.kpis,
      trends: reportData.trends,
      caseBreakdown: reportData.caseBreakdown,
      organizationName,
    };

    const pptxBuffer = await this.pptxGenerator.generatePresentation(pptxData);
    const pptxKey = `reports/${orgId}/board-report-${reportId}-${timestamp}.pptx`;

    const pptxResult = await this.uploadToStorage(
      orgId,
      pptxKey,
      pptxBuffer,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      {
        reportType: "board_report",
        title,
        period,
        generatedBy: userId,
      },
    );

    const pptxUrl = await this.storageProvider.getSignedUrl({
      organizationId: orgId,
      path: pptxKey,
      expiresInMinutes: this.REPORT_EXPIRATION_HOURS * 60,
    });

    return { url: pptxUrl, size: pptxResult.size };
  }

  /**
   * Build result metadata from report data.
   */
  private buildMetadata(
    title: string,
    period: string,
    reportData: ReportData,
  ): BoardReportResult["metadata"] {
    const totalCases = reportData.kpis.find((k) => k.label === "Total Cases");
    const totalRius = reportData.kpis.find((k) => k.label === "Total RIUs");

    return {
      title,
      period,
      generatedAt: new Date(),
      expiresAt: new Date(
        Date.now() + this.REPORT_EXPIRATION_HOURS * 60 * 60 * 1000,
      ),
      totalCases: typeof totalCases?.value === "number" ? totalCases.value : 0,
      totalRius: typeof totalRius?.value === "number" ? totalRius.value : 0,
    };
  }

  /**
   * Log audit entry for report generation.
   */
  private async auditGeneration(
    orgId: string,
    userId: string,
    reportId: string,
    title: string,
    period: string,
    dateRange: NormalizedDateRange,
    pdfKey: string,
    pptxIncluded: boolean,
    durationMs: number,
  ): Promise<void> {
    const dto: CreateAuditLogDto = {
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
        pptxIncluded,
        duration: durationMs,
      },
    };

    try {
      await this.auditService.log(dto);
    } catch (error) {
      this.logger.warn(
        `Failed to log audit: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Normalize date range to Date objects.
   */
  private normalizeDateRange(range: DateRange): NormalizedDateRange {
    return {
      start:
        typeof range.start === "string" ? new Date(range.start) : range.start,
      end: typeof range.end === "string" ? new Date(range.end) : range.end,
    };
  }

  /**
   * Format date range as period string.
   */
  private formatPeriod(range: NormalizedDateRange): string {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return `${range.start.toLocaleDateString("en-US", options)} - ${range.end.toLocaleDateString("en-US", options)}`;
  }
}
