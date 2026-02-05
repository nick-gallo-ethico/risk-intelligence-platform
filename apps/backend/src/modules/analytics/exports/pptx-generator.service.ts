import PptxGenJS from "pptxgenjs";
import { Injectable, Logger } from "@nestjs/common";

// ===========================================
// PPTX Data Types
// ===========================================

/**
 * Key Performance Indicator item for slides.
 */
export interface KpiItem {
  /** Label text (e.g., "Total Cases") */
  label: string;
  /** KPI value (number or formatted string like "85%") */
  value: number | string;
  /** Optional trend indicator */
  trend?: {
    /** Percentage change value */
    value: number;
    /** Trend direction */
    direction: "up" | "down" | "flat";
  };
}

/**
 * Trend data for line charts.
 */
export interface TrendData {
  /** Series name (e.g., "Cases Opened") */
  name: string;
  /** X-axis labels (e.g., months: ["Jan", "Feb", "Mar"]) */
  labels: string[];
  /** Data values for each label */
  values: number[];
  /** Optional series color (hex without #) */
  color?: string;
}

/**
 * Breakdown data for pie/bar charts.
 */
export interface BreakdownItem {
  /** Category/segment name */
  name: string;
  /** Value */
  value: number;
  /** Optional color (hex without #) */
  color?: string;
}

/**
 * Case breakdown data for the breakdown slide.
 */
export interface CaseBreakdown {
  /** Distribution by category */
  byCategory: BreakdownItem[];
  /** Distribution by status */
  byStatus: BreakdownItem[];
}

/**
 * Complete data for generating a board report presentation.
 */
export interface BoardReportData {
  /** Report title */
  title: string;
  /** Reporting period (e.g., "Q1 2024" or "Jan 1 - Mar 31, 2024") */
  period: string;
  /** AI-generated executive summary (bullet points) */
  executiveSummary?: string;
  /** Key performance indicators */
  kpis?: KpiItem[];
  /** Trend data for line charts */
  trends?: TrendData[];
  /** Case breakdown data for pie/bar charts */
  caseBreakdown?: CaseBreakdown;
  /** Optional organization name for branding */
  organizationName?: string;
}

/**
 * Options for presentation generation.
 */
export interface PptxGenerationOptions {
  /** Theme colors override */
  theme?: {
    primary: string; // Hex without #
    secondary: string;
    accent: string;
  };
  /** Include notes for presenter */
  includeNotes?: boolean;
}

// ===========================================
// Color Constants
// ===========================================

const COLORS = {
  primary: "0F172A", // Slate 900
  secondary: "334155", // Slate 700
  muted: "64748B", // Slate 500
  light: "94A3B8", // Slate 400
  white: "FFFFFF",
  background: "F8FAFC", // Slate 50
  border: "E2E8F0", // Slate 200

  // Status colors
  success: "22C55E", // Green 500
  warning: "F59E0B", // Amber 500
  error: "EF4444", // Red 500

  // Chart colors
  chartColors: [
    "3B82F6", // Blue
    "10B981", // Emerald
    "F59E0B", // Amber
    "EF4444", // Red
    "8B5CF6", // Violet
    "EC4899", // Pink
    "06B6D4", // Cyan
    "84CC16", // Lime
  ],
};

/**
 * PptxGeneratorService
 *
 * Service for generating PowerPoint presentations using pptxgenjs.
 *
 * Features:
 * - Master slide with Ethico branding
 * - Title slide with report title and period
 * - Executive summary slide with AI-generated content
 * - KPIs slide with metric cards
 * - Trend charts slide with line charts
 * - Case breakdown slide with pie and bar charts
 *
 * Usage:
 * ```typescript
 * const data: BoardReportData = {
 *   title: 'Q1 2024 Compliance Report',
 *   period: 'January - March 2024',
 *   executiveSummary: 'Key highlights from the quarter...',
 *   kpis: [...],
 *   trends: [...],
 *   caseBreakdown: {...}
 * };
 * const buffer = await pptxGenerator.generatePresentation(data);
 * ```
 */
@Injectable()
export class PptxGeneratorService {
  private readonly logger = new Logger(PptxGeneratorService.name);

  /**
   * Generate a board report PowerPoint presentation.
   *
   * @param data - Report data including title, KPIs, trends, etc.
   * @param options - Optional generation settings
   * @returns PowerPoint file as Buffer
   */
  async generatePresentation(
    data: BoardReportData,
    options?: PptxGenerationOptions,
  ): Promise<Buffer> {
    const pptx = new PptxGenJS();

    // Set presentation metadata
    pptx.author = "Ethico Risk Intelligence Platform";
    pptx.title = data.title;
    pptx.subject = "Board Report";
    pptx.company = data.organizationName || "Ethico";
    pptx.layout = "LAYOUT_16x9";

    // Define master slide with branding
    this.defineMasterSlide(pptx, options?.theme);

    // Add slides in order
    this.addTitleSlide(pptx, data);

    if (data.executiveSummary) {
      this.addExecutiveSummarySlide(pptx, data.executiveSummary, options);
    }

    if (data.kpis && data.kpis.length > 0) {
      this.addKpisSlide(pptx, data.kpis);
    }

    if (data.trends && data.trends.length > 0) {
      this.addTrendChartsSlide(pptx, data.trends);
    }

    if (data.caseBreakdown) {
      this.addCaseBreakdownSlide(pptx, data.caseBreakdown);
    }

    // Generate buffer
    const buffer = await pptx.write({ outputType: "nodebuffer" });

    this.logger.debug(`Generated PPTX presentation: ${data.title}`);

    return buffer as Buffer;
  }

  /**
   * Define the master slide template with Ethico branding.
   */
  private defineMasterSlide(
    pptx: PptxGenJS,
    theme?: PptxGenerationOptions["theme"],
  ): void {
    const primaryColor = theme?.primary || COLORS.primary;

    pptx.defineSlideMaster({
      title: "ETHICO_MASTER",
      background: { color: COLORS.white },
      objects: [
        // Top bar
        {
          rect: {
            x: 0,
            y: 0,
            w: "100%",
            h: 0.5,
            fill: { color: primaryColor },
          },
        },
        // Ethico logo/text in top bar
        {
          text: {
            text: "Ethico",
            options: {
              x: 0.3,
              y: 0.1,
              w: 2,
              h: 0.3,
              color: COLORS.white,
              fontSize: 14,
              bold: true,
              fontFace: "Arial",
            },
          },
        },
      ],
    });
  }

  /**
   * Add the title slide.
   */
  private addTitleSlide(pptx: PptxGenJS, data: BoardReportData): void {
    const slide = pptx.addSlide({ masterName: "ETHICO_MASTER" });

    // Report title
    slide.addText(data.title, {
      x: 0.5,
      y: 1.8,
      w: 9,
      h: 1,
      fontSize: 36,
      bold: true,
      color: COLORS.primary,
      fontFace: "Arial",
    });

    // Reporting period
    slide.addText(data.period, {
      x: 0.5,
      y: 2.8,
      w: 9,
      h: 0.5,
      fontSize: 18,
      color: COLORS.muted,
      fontFace: "Arial",
    });

    // Generation date
    const generatedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    slide.addText(`Generated: ${generatedDate}`, {
      x: 0.5,
      y: 4.2,
      w: 9,
      h: 0.3,
      fontSize: 12,
      color: COLORS.light,
      fontFace: "Arial",
    });

    // Organization name if provided
    if (data.organizationName) {
      slide.addText(data.organizationName, {
        x: 0.5,
        y: 3.5,
        w: 9,
        h: 0.4,
        fontSize: 16,
        color: COLORS.secondary,
        fontFace: "Arial",
      });
    }
  }

  /**
   * Add the executive summary slide with AI-generated content.
   */
  private addExecutiveSummarySlide(
    pptx: PptxGenJS,
    summary: string,
    options?: PptxGenerationOptions,
  ): void {
    const slide = pptx.addSlide({ masterName: "ETHICO_MASTER" });

    // Slide title
    slide.addText("Executive Summary", {
      x: 0.5,
      y: 0.7,
      w: 9,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: COLORS.primary,
      fontFace: "Arial",
    });

    // Summary content with bullet formatting
    // Split by newlines or bullet points
    const bulletPoints = this.parseBulletPoints(summary);

    slide.addText(
      bulletPoints.map((point) => ({
        text: point,
        options: { bullet: { type: "bullet" } },
      })),
      {
        x: 0.5,
        y: 1.4,
        w: 9,
        h: 3.5,
        fontSize: 14,
        color: COLORS.secondary,
        fontFace: "Arial",
        valign: "top",
        lineSpacing: 28,
      },
    );

    // Add presenter notes if enabled
    if (options?.includeNotes) {
      slide.addNotes(
        "This executive summary was AI-generated based on the report data. " +
          "Review and customize as needed before presenting.",
      );
    }
  }

  /**
   * Add the KPIs slide with metric cards.
   */
  private addKpisSlide(pptx: PptxGenJS, kpis: KpiItem[]): void {
    const slide = pptx.addSlide({ masterName: "ETHICO_MASTER" });

    // Slide title
    slide.addText("Key Metrics", {
      x: 0.5,
      y: 0.7,
      w: 9,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: COLORS.primary,
      fontFace: "Arial",
    });

    // Display up to 6 KPIs in a 3x2 grid
    const displayKpis = kpis.slice(0, 6);

    displayKpis.forEach((kpi, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 0.5 + col * 3.1;
      const y = 1.5 + row * 1.8;

      // KPI card background
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: 2.9,
        h: 1.5,
        fill: { color: COLORS.background },
        line: { color: COLORS.border, width: 1 },
        rectRadius: 0.05,
      });

      // KPI label
      slide.addText(kpi.label, {
        x,
        y: y + 0.15,
        w: 2.9,
        h: 0.3,
        fontSize: 11,
        color: COLORS.muted,
        fontFace: "Arial",
        align: "center",
      });

      // KPI value
      slide.addText(String(kpi.value), {
        x,
        y: y + 0.45,
        w: 2.9,
        h: 0.5,
        fontSize: 28,
        bold: true,
        color: COLORS.primary,
        fontFace: "Arial",
        align: "center",
      });

      // Trend indicator
      if (kpi.trend) {
        const trendColor =
          kpi.trend.direction === "up"
            ? COLORS.success
            : kpi.trend.direction === "down"
              ? COLORS.error
              : COLORS.muted;
        const trendSymbol =
          kpi.trend.direction === "up"
            ? "+"
            : kpi.trend.direction === "down"
              ? ""
              : "";
        const trendText = `${trendSymbol}${kpi.trend.value}%`;

        slide.addText(trendText, {
          x,
          y: y + 1.0,
          w: 2.9,
          h: 0.3,
          fontSize: 12,
          color: trendColor,
          fontFace: "Arial",
          align: "center",
        });
      }
    });
  }

  /**
   * Add the trend charts slide with line chart.
   */
  private addTrendChartsSlide(pptx: PptxGenJS, trends: TrendData[]): void {
    const slide = pptx.addSlide({ masterName: "ETHICO_MASTER" });

    // Slide title
    slide.addText("Trends", {
      x: 0.5,
      y: 0.7,
      w: 9,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: COLORS.primary,
      fontFace: "Arial",
    });

    // Build chart data
    const chartData: Array<{
      name: string;
      labels: string[];
      values: number[];
    }> = trends.map((trend) => ({
      name: trend.name,
      labels: trend.labels,
      values: trend.values,
    }));

    // Add line chart
    slide.addChart(pptx.ChartType.line, chartData, {
      x: 0.5,
      y: 1.4,
      w: 9,
      h: 3.5,
      showLegend: true,
      legendPos: "b",
      lineDataSymbol: "circle",
      lineDataSymbolSize: 8,
      lineSmooth: true,
      showTitle: false,
      catAxisTitle: "",
      valAxisTitle: "",
      chartColors: trends.map(
        (t, i) => t.color || COLORS.chartColors[i % COLORS.chartColors.length],
      ),
    });
  }

  /**
   * Add the case breakdown slide with pie and bar charts.
   */
  private addCaseBreakdownSlide(
    pptx: PptxGenJS,
    breakdown: CaseBreakdown,
  ): void {
    const slide = pptx.addSlide({ masterName: "ETHICO_MASTER" });

    // Slide title
    slide.addText("Case Breakdown", {
      x: 0.5,
      y: 0.7,
      w: 9,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: COLORS.primary,
      fontFace: "Arial",
    });

    // By Category - Pie Chart (left side)
    if (breakdown.byCategory && breakdown.byCategory.length > 0) {
      slide.addText("By Category", {
        x: 0.5,
        y: 1.2,
        w: 4.5,
        h: 0.3,
        fontSize: 14,
        bold: true,
        color: COLORS.secondary,
        fontFace: "Arial",
      });

      const categoryData = [
        {
          name: "Category",
          labels: breakdown.byCategory.map((c) => c.name),
          values: breakdown.byCategory.map((c) => c.value),
        },
      ];

      slide.addChart(pptx.ChartType.pie, categoryData, {
        x: 0.5,
        y: 1.5,
        w: 4.5,
        h: 3.3,
        showLegend: true,
        legendPos: "r",
        showPercent: true,
        showTitle: false,
        chartColors: breakdown.byCategory.map(
          (c, i) =>
            c.color || COLORS.chartColors[i % COLORS.chartColors.length],
        ),
      });
    }

    // By Status - Bar Chart (right side)
    if (breakdown.byStatus && breakdown.byStatus.length > 0) {
      slide.addText("By Status", {
        x: 5.5,
        y: 1.2,
        w: 4.5,
        h: 0.3,
        fontSize: 14,
        bold: true,
        color: COLORS.secondary,
        fontFace: "Arial",
      });

      const statusData = [
        {
          name: "Status",
          labels: breakdown.byStatus.map((s) => s.name),
          values: breakdown.byStatus.map((s) => s.value),
        },
      ];

      slide.addChart(pptx.ChartType.bar, statusData, {
        x: 5.5,
        y: 1.5,
        w: 4.2,
        h: 3.3,
        showLegend: false,
        showTitle: false,
        barDir: "bar",
        chartColors: breakdown.byStatus.map(
          (s, i) =>
            s.color || COLORS.chartColors[i % COLORS.chartColors.length],
        ),
        valAxisMaxVal:
          Math.max(...breakdown.byStatus.map((s) => s.value)) * 1.2,
      });
    }
  }

  /**
   * Parse text into bullet points.
   * Handles various input formats:
   * - Already bulleted (- or *)
   * - Numbered (1. or 1))
   * - Newline separated
   */
  private parseBulletPoints(text: string): string[] {
    // Split by newlines first
    const lines = text.split(/\n+/).filter((line) => line.trim());

    return lines.map((line) => {
      // Remove existing bullet markers or numbers
      return line
        .replace(/^[\s]*[-*]\s*/, "") // Remove - or * bullets
        .replace(/^[\s]*\d+[.)]\s*/, "") // Remove numbered items
        .trim();
    });
  }

  /**
   * Generate a simple single-slide summary.
   * Useful for quick exports or thumbnails.
   */
  async generateSummarySlide(title: string, kpis: KpiItem[]): Promise<Buffer> {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_16x9";

    const slide = pptx.addSlide();

    // Title
    slide.addText(title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: COLORS.primary,
      fontFace: "Arial",
    });

    // KPIs in a row
    kpis.slice(0, 4).forEach((kpi, index) => {
      const x = 0.5 + index * 2.4;

      slide.addText(kpi.label, {
        x,
        y: 1.5,
        w: 2.2,
        h: 0.3,
        fontSize: 11,
        color: COLORS.muted,
        fontFace: "Arial",
      });

      slide.addText(String(kpi.value), {
        x,
        y: 1.9,
        w: 2.2,
        h: 0.5,
        fontSize: 28,
        bold: true,
        color: COLORS.primary,
        fontFace: "Arial",
      });
    });

    const buffer = await pptx.write({ outputType: "nodebuffer" });
    return buffer as Buffer;
  }
}
