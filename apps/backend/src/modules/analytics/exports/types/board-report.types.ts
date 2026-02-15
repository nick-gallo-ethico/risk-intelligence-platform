/**
 * Board Report Type Definitions
 *
 * Extracted from BoardReportService to support clean architecture and
 * reusability across report-related services.
 *
 * Types defined:
 * - DateRange: Input date range (may be string or Date)
 * - BoardReportConfig: Configuration for report generation
 * - BoardReportSection: Available report sections
 * - BoardReportResult: Generation result with URLs and metadata
 * - BoardReportMetadata: Report metadata for tracking
 */

/**
 * Date range for report filtering.
 * Accepts both Date objects and ISO strings for flexibility.
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
  metadata: BoardReportMetadata;
}

/**
 * Report generation metadata.
 */
export interface BoardReportMetadata {
  /** Report title */
  title: string;
  /** Human-readable period string (e.g., "Jan 1, 2024 - Mar 31, 2024") */
  period: string;
  /** Timestamp when report was generated */
  generatedAt: Date;
  /** Timestamp when download URLs expire */
  expiresAt: Date;
  /** Total number of cases in the report period */
  totalCases: number;
  /** Total number of RIUs in the report period */
  totalRius: number;
}
