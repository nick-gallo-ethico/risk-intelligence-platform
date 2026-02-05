import puppeteer, { Browser, PDFOptions } from "puppeteer";
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";

/**
 * Options for PDF generation.
 */
export interface PdfGenerationOptions {
  /** Page format: A4 (default), Letter, or Legal */
  format?: "A4" | "Letter" | "Legal";
  /** Landscape orientation (default: false) */
  landscape?: boolean;
  /** Page margins */
  margin?: { top: string; right: string; bottom: string; left: string };
  /** Show page numbers in footer (default: true) */
  showPageNumbers?: boolean;
  /** Custom header HTML template */
  headerHtml?: string;
  /** Footer text (e.g., "Confidential") */
  footerText?: string;
  /** Theme: light (default) or dark */
  theme?: "light" | "dark";
  /** Custom CSS to inject */
  customCss?: string;
  /** Wait timeout for chart rendering in ms (default: 10000) */
  chartWaitTimeout?: number;
}

/**
 * PdfGeneratorService
 *
 * Service for generating PDF documents from HTML content using Puppeteer.
 *
 * Features:
 * - Single browser instance, reused across requests for efficiency
 * - Concurrent page limit (3) to prevent memory issues
 * - Chart rendering support (waits for Recharts/SVG to complete)
 * - Configurable page format, margins, headers/footers
 * - Theme support (light/dark)
 * - Professional styling with Inter font
 *
 * Usage:
 * ```typescript
 * const html = '<h1>Report Title</h1><div class="recharts-wrapper">...</div>';
 * const pdf = await pdfGenerator.generatePdf(html, { format: 'Letter' });
 * ```
 *
 * Note: If Puppeteer fails to initialize (e.g., in Docker without Chrome),
 * the service logs a warning and PDF generation returns an error at runtime.
 */
@Injectable()
export class PdfGeneratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private browser: Browser | null = null;

  /** Maximum concurrent PDF pages to prevent memory exhaustion */
  private readonly MAX_CONCURRENT_PAGES = 3;
  private activePagesCount = 0;

  /** Queue for pending PDF requests when at capacity */
  private readonly pendingQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  /**
   * Initialize Puppeteer browser on module startup.
   * Uses headless mode with memory-optimized settings.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--disable-dev-shm-usage", // Overcome limited /dev/shm in containers
          "--no-sandbox", // Required for running as root in Docker
          "--disable-setuid-sandbox",
          "--disable-gpu", // Disable GPU hardware acceleration
          "--disable-extensions", // No extensions needed
          "--disable-background-timer-throttling", // Consistent timing
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--single-process", // Single process mode for memory efficiency
        ],
      });
      this.logger.log("Puppeteer browser initialized successfully");
    } catch (error) {
      this.logger.error(
        `Failed to initialize Puppeteer browser: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Allow service to start without browser - PDF generation will fail at runtime
      // This allows the rest of the application to function
    }
  }

  /**
   * Close browser instance on module shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.logger.log("Puppeteer browser closed");
      } catch (error) {
        this.logger.warn(
          `Error closing Puppeteer browser: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
  }

  /**
   * Check if the PDF service is available.
   * @returns true if Puppeteer browser is initialized
   */
  isAvailable(): boolean {
    return !!this.browser;
  }

  /**
   * Generate a PDF from HTML content.
   *
   * @param html - HTML content to render
   * @param options - PDF generation options
   * @returns PDF as Buffer
   * @throws Error if Puppeteer is not initialized or generation fails
   */
  async generatePdf(
    html: string,
    options?: PdfGenerationOptions,
  ): Promise<Buffer> {
    if (!this.browser) {
      throw new Error(
        "PDF generation not available: Puppeteer not initialized",
      );
    }

    // Wait for available slot (respect concurrent page limit)
    await this.acquireSlot();

    let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;

    try {
      page = await this.browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 2, // High DPI for quality
      });

      // Set content with base styles wrapper
      const wrappedHtml = this.wrapWithStyles(
        html,
        options?.theme,
        options?.customCss,
      );

      await page.setContent(wrappedHtml, {
        waitUntil: "networkidle0", // Wait for all network requests to complete
      });

      // Wait for charts to render (Recharts uses SVG)
      await this.waitForCharts(page, options?.chartWaitTimeout ?? 10000);

      // Build PDF options
      const pdfOptions = this.buildPdfOptions(options);

      // Generate PDF
      const pdfBuffer = await page.pdf(pdfOptions);

      this.logger.debug(
        `Generated PDF: ${Math.round(pdfBuffer.length / 1024)}KB, format: ${options?.format || "A4"}`,
      );

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(
        `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    } finally {
      // Always close the page and release the slot
      if (page) {
        try {
          await page.close();
        } catch {
          // Ignore close errors
        }
      }
      this.releaseSlot();
    }
  }

  /**
   * Generate multiple PDFs in parallel (respecting concurrency limits).
   *
   * @param items - Array of { html, options } objects
   * @returns Array of PDF buffers
   */
  async generateMultiplePdfs(
    items: Array<{ html: string; options?: PdfGenerationOptions }>,
  ): Promise<Buffer[]> {
    // Process in parallel but respect MAX_CONCURRENT_PAGES
    const results: Buffer[] = [];
    const chunks: Array<
      Array<{ html: string; options?: PdfGenerationOptions }>
    > = [];

    // Split into chunks of MAX_CONCURRENT_PAGES
    for (let i = 0; i < items.length; i += this.MAX_CONCURRENT_PAGES) {
      chunks.push(items.slice(i, i + this.MAX_CONCURRENT_PAGES));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(({ html, options }) => this.generatePdf(html, options)),
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Acquire a slot for PDF generation.
   * Waits if at capacity.
   */
  private async acquireSlot(): Promise<void> {
    if (this.activePagesCount < this.MAX_CONCURRENT_PAGES) {
      this.activePagesCount++;
      return;
    }

    // At capacity - wait in queue
    return new Promise((resolve, reject) => {
      this.pendingQueue.push({ resolve, reject });
    });
  }

  /**
   * Release a slot after PDF generation completes.
   */
  private releaseSlot(): void {
    this.activePagesCount--;

    // Process next item in queue if any
    const next = this.pendingQueue.shift();
    if (next) {
      this.activePagesCount++;
      next.resolve();
    }
  }

  /**
   * Wait for chart elements to finish rendering.
   * Specifically handles Recharts which uses SVG.
   */
  private async waitForCharts(
    page: Awaited<ReturnType<Browser["newPage"]>>,
    timeout: number,
  ): Promise<void> {
    try {
      await page.waitForFunction(
        () => {
          // Check for Recharts wrapper elements
          const charts = document.querySelectorAll(".recharts-wrapper");
          if (charts.length === 0) {
            return true; // No charts to wait for
          }

          // All Recharts wrappers should have SVG content
          return Array.from(charts).every((chart) =>
            chart.querySelector("svg"),
          );
        },
        { timeout },
      );
    } catch (error) {
      // Don't fail on chart wait timeout - proceed with PDF generation
      this.logger.warn(
        `Chart rendering wait timed out after ${timeout}ms - proceeding with PDF generation`,
      );
    }
  }

  /**
   * Build Puppeteer PDF options from our configuration.
   */
  private buildPdfOptions(options?: PdfGenerationOptions): PDFOptions {
    return {
      format: options?.format || "A4",
      landscape: options?.landscape || false,
      margin: options?.margin || {
        top: "0.75in",
        right: "0.5in",
        bottom: "0.75in",
        left: "0.5in",
      },
      printBackground: true,
      displayHeaderFooter: options?.showPageNumbers ?? true,
      headerTemplate:
        options?.headerHtml ||
        '<div style="width: 100%; font-size: 8px; padding: 0 20px;"></div>',
      footerTemplate: this.buildFooterTemplate(
        options?.footerText,
        options?.showPageNumbers,
      ),
    };
  }

  /**
   * Build the footer template with optional page numbers.
   */
  private buildFooterTemplate(
    footerText?: string,
    showPageNumbers?: boolean,
  ): string {
    const text = footerText || "Confidential";
    const pageNumbers =
      showPageNumbers !== false
        ? '<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>'
        : "";

    return `
      <div style="width: 100%; font-size: 9px; color: #666; padding: 0 20px; display: flex; justify-content: space-between; font-family: sans-serif;">
        <span>${text}</span>
        ${pageNumbers}
      </div>
    `;
  }

  /**
   * Wrap HTML content with base styles for consistent rendering.
   */
  private wrapWithStyles(
    html: string,
    theme?: "light" | "dark",
    customCss?: string,
  ): string {
    const isDark = theme === "dark";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

          * {
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            color: ${isDark ? "#e5e5e5" : "#1a1a1a"};
            background: ${isDark ? "#1a1a1a" : "#ffffff"};
            font-size: 12px;
            line-height: 1.5;
          }

          h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 16px 0;
            color: ${isDark ? "#ffffff" : "#0f172a"};
          }

          h2 {
            font-size: 18px;
            font-weight: 600;
            margin: 24px 0 12px 0;
            color: ${isDark ? "#ffffff" : "#0f172a"};
          }

          h3 {
            font-size: 14px;
            font-weight: 600;
            margin: 16px 0 8px 0;
            color: ${isDark ? "#ffffff" : "#334155"};
          }

          p {
            margin: 0 0 12px 0;
          }

          .page-break {
            page-break-after: always;
          }

          .no-break {
            page-break-inside: avoid;
          }

          /* Tables */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
          }

          th, td {
            border: 1px solid ${isDark ? "#374151" : "#e5e7eb"};
            padding: 8px 12px;
            text-align: left;
          }

          th {
            background: ${isDark ? "#374151" : "#f3f4f6"};
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          tr:nth-child(even) {
            background: ${isDark ? "#1f2937" : "#f9fafb"};
          }

          /* KPI Cards */
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin: 16px 0;
          }

          .kpi-card {
            background: ${isDark ? "#1f2937" : "#f8fafc"};
            border: 1px solid ${isDark ? "#374151" : "#e2e8f0"};
            border-radius: 8px;
            padding: 16px;
          }

          .kpi-label {
            font-size: 11px;
            color: ${isDark ? "#9ca3af" : "#64748b"};
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
          }

          .kpi-value {
            font-size: 28px;
            font-weight: 700;
            color: ${isDark ? "#ffffff" : "#0f172a"};
          }

          .kpi-trend {
            font-size: 12px;
            margin-top: 4px;
          }

          .kpi-trend.up { color: #22c55e; }
          .kpi-trend.down { color: #ef4444; }
          .kpi-trend.flat { color: #64748b; }

          /* Chart Container */
          .chart-container {
            margin: 24px 0;
            padding: 16px;
            background: ${isDark ? "#1f2937" : "#ffffff"};
            border: 1px solid ${isDark ? "#374151" : "#e2e8f0"};
            border-radius: 8px;
          }

          .chart-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: ${isDark ? "#ffffff" : "#0f172a"};
          }

          /* Executive Summary */
          .executive-summary {
            background: ${isDark ? "#1f2937" : "#f0f9ff"};
            border-left: 4px solid ${isDark ? "#3b82f6" : "#0ea5e9"};
            padding: 16px 20px;
            margin: 16px 0;
          }

          .executive-summary h3 {
            margin-top: 0;
            color: ${isDark ? "#60a5fa" : "#0369a1"};
          }

          /* Lists */
          ul, ol {
            margin: 0 0 12px 0;
            padding-left: 24px;
          }

          li {
            margin-bottom: 4px;
          }

          /* Branding */
          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid ${isDark ? "#374151" : "#e2e8f0"};
          }

          .report-header .logo {
            font-size: 20px;
            font-weight: 700;
            color: ${isDark ? "#60a5fa" : "#0f172a"};
          }

          .report-header .date {
            color: ${isDark ? "#9ca3af" : "#64748b"};
            font-size: 11px;
          }

          /* Custom CSS */
          ${customCss || ""}
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;
  }
}
