import { Injectable, Logger } from "@nestjs/common";
import { AuditService, CreateAuditLogDto } from "../../audit/audit.service";
import { PdfGenerationOptions } from "./pdf-generator.service";
import {
  PptxGeneratorService,
  BoardReportData,
} from "./pptx-generator.service";
import {
  ReportDataFetcherService,
  ReportPdfBuilderService,
  ReportAiSummaryService,
  ReportStorageService,
  ReportData,
  DateRange as NormalizedDateRange,
  BoardReportHtmlData,
} from "./services";
import {
  DateRange,
  BoardReportConfig,
  BoardReportResult,
  BoardReportMetadata,
} from "./types/board-report.types";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";
import { nanoid } from "nanoid";

/**
 * BoardReportService - Thin Coordinator for board report generation.
 * Delegates to: ReportDataFetcherService, ReportPdfBuilderService,
 * ReportAiSummaryService, ReportStorageService.
 */
@Injectable()
export class BoardReportService {
  private readonly logger = new Logger(BoardReportService.name);

  constructor(
    private readonly reportDataFetcherService: ReportDataFetcherService,
    private readonly reportPdfBuilderService: ReportPdfBuilderService,
    private readonly reportAiSummaryService: ReportAiSummaryService,
    private readonly reportStorageService: ReportStorageService,
    private readonly pptxGenerator: PptxGeneratorService,
    private readonly auditService: AuditService,
  ) {}

  /** Generate a board report with PDF and optional PPTX. */
  async generateBoardReport(
    orgId: string,
    userId: string,
    config: BoardReportConfig,
  ): Promise<BoardReportResult> {
    const startTime = Date.now();
    const title = config.title || "Compliance Board Report";
    this.logger.log(`Generating board report for org ${orgId}: ${title}`);

    const dateRange = this.normalizeDateRange(config.dateRange);
    const period = this.formatPeriod(dateRange);

    // 1. Fetch report data
    const reportData = await this.reportDataFetcherService.fetchReportData(
      orgId,
      dateRange,
      {
        businessUnitIds: config.businessUnitIds,
        locationIds: config.locationIds,
        categoryIds: config.categoryIds,
      },
    );

    // 2. Generate AI executive summary
    let executiveSummary = "";
    if (!config.sections || config.sections.includes("executive_summary")) {
      const result = await this.reportAiSummaryService.generateExecutiveSummary(
        orgId,
        reportData,
        dateRange,
      );
      executiveSummary = result.summary;
    }

    // 3. Get organization name
    const organizationName =
      await this.reportDataFetcherService.getOrganizationName(orgId);

    // 4. Build HTML and generate PDF
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
    const pdfResult = await this.reportStorageService.uploadReport(
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
    const pdfUrl = await this.reportStorageService.getSignedUrl(orgId, pdfKey);

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

    // 9. Build result
    const metadata = this.buildMetadata(title, period, reportData);
    this.logger.log(
      `Board report generated in ${Date.now() - startTime}ms: ${pdfKey}`,
    );

    return { pdfUrl, pptxUrl, pdfSize: pdfResult.size, pptxSize, metadata };
  }

  /** Generate and upload PPTX presentation. */
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

    const pptxResult = await this.reportStorageService.uploadReport(
      orgId,
      pptxKey,
      pptxBuffer,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      { reportType: "board_report", title, period, generatedBy: userId },
    );
    const pptxUrl = await this.reportStorageService.getSignedUrl(
      orgId,
      pptxKey,
    );
    return { url: pptxUrl, size: pptxResult.size };
  }

  /** Build result metadata from report data. */
  private buildMetadata(
    title: string,
    period: string,
    reportData: ReportData,
  ): BoardReportMetadata {
    const totalCases = reportData.kpis.find((k) => k.label === "Total Cases");
    const totalRius = reportData.kpis.find((k) => k.label === "Total RIUs");
    return {
      title,
      period,
      generatedAt: new Date(),
      expiresAt: this.reportStorageService.getExpirationDate(),
      totalCases: typeof totalCases?.value === "number" ? totalCases.value : 0,
      totalRius: typeof totalRius?.value === "number" ? totalRius.value : 0,
    };
  }

  /** Log audit entry for report generation. */
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

  /** Normalize date range to Date objects. */
  private normalizeDateRange(range: DateRange): NormalizedDateRange {
    return {
      start:
        typeof range.start === "string" ? new Date(range.start) : range.start,
      end: typeof range.end === "string" ? new Date(range.end) : range.end,
    };
  }

  /** Format date range as period string. */
  private formatPeriod(range: NormalizedDateRange): string {
    const opts: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return `${range.start.toLocaleDateString("en-US", opts)} - ${range.end.toLocaleDateString("en-US", opts)}`;
  }
}

// Re-export types for backward compatibility
export {
  DateRange,
  BoardReportConfig,
  BoardReportSection,
  BoardReportResult,
  BoardReportMetadata,
} from "./types/board-report.types";
