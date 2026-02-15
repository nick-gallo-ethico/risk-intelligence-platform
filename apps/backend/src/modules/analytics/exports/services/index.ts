/**
 * Board Report Sub-Services
 *
 * These services are extracted from BoardReportService to follow
 * the thin coordinator pattern. Each service handles a specific
 * domain of responsibility:
 *
 * - ReportDataFetcherService: Database queries and data aggregation
 * - ReportPdfBuilderService: HTML/PDF template rendering
 * - ReportAiSummaryService: AI-powered executive summary generation
 */

export * from "./report-data-fetcher.service";
export * from "./report-pdf-builder.service";
export * from "./report-ai-summary.service";
