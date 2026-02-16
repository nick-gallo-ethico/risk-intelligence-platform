import { Injectable, Logger } from "@nestjs/common";
import { MigrationSourceType } from "@prisma/client";

/**
 * Source type indicator patterns.
 * Maps system names to their distinctive field patterns.
 */
export interface SourceTypeIndicators {
  name: MigrationSourceType;
  patterns: string[];
  minMatches: number;
}

/**
 * FormatDetectorService handles file format and source type detection.
 *
 * Responsibilities:
 * - Detect CSV delimiter from content
 * - Detect file encoding from buffer
 * - Identify source system type (NAVEX, EQS, Legacy Ethico, Generic CSV)
 * - Analyze headers to determine data origin
 *
 * This service extracts format detection logic from MigrationParserService
 * to follow the thin coordinator pattern.
 */
@Injectable()
export class FormatDetectorService {
  private readonly logger = new Logger(FormatDetectorService.name);

  /**
   * Source type indicators for detecting data origin.
   */
  private readonly SOURCE_INDICATORS: SourceTypeIndicators[] = [
    {
      name: MigrationSourceType.NAVEX,
      patterns: [
        "case_number",
        "case_id",
        "incident_type",
        "navex",
        "report_id",
      ],
      minMatches: 2,
    },
    {
      name: MigrationSourceType.EQS,
      patterns: [
        "report_id",
        "ref_number",
        "category_name",
        "eqs",
        "conversant",
      ],
      minMatches: 2,
    },
    {
      name: MigrationSourceType.LEGACY_ETHICO,
      patterns: ["case_num", "riu_num", "call_details", "site_code"],
      minMatches: 2,
    },
  ];

  /**
   * Common CSV delimiters in priority order.
   */
  private readonly DELIMITERS = [",", ";", "\t", "|"];

  /**
   * Detect source type from headers and sample data.
   * Analyzes field names to determine if data is from NAVEX, EQS, or generic CSV.
   *
   * @param headers - Array of column headers
   * @param sampleRows - Sample rows for analysis (optional, for future enhancement)
   * @returns Detected source type
   */
  detectSourceType(
    headers: string[],
    _sampleRows?: Record<string, unknown>[],
  ): MigrationSourceType {
    const normalizedHeaders = headers.map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    );

    // Check each source type's indicators
    for (const indicator of this.SOURCE_INDICATORS) {
      const matches = normalizedHeaders.filter((h) =>
        indicator.patterns.some((pattern) => h.includes(pattern)),
      ).length;

      if (matches >= indicator.minMatches) {
        this.logger.debug(
          `Detected source type ${indicator.name} with ${matches} matching patterns`,
        );
        return indicator.name;
      }
    }

    return MigrationSourceType.GENERIC_CSV;
  }

  /**
   * Detect CSV delimiter from content.
   * Analyzes the first line to find the most common delimiter.
   *
   * @param content - Raw CSV content string
   * @returns Detected delimiter character
   */
  detectDelimiter(content: string): string {
    const firstLine = content.split("\n")[0] || "";

    // Count occurrences of common delimiters
    const counts = this.DELIMITERS.map((d) => ({
      delimiter: d,
      count: (firstLine.match(new RegExp(`\\${d}`, "g")) || []).length,
    }));

    // Return the delimiter with highest count
    const sorted = counts.sort((a, b) => b.count - a.count);
    const detected = sorted[0]?.count > 0 ? sorted[0].delimiter : ",";

    this.logger.debug(
      `Detected delimiter: "${detected}" (count: ${sorted[0]?.count})`,
    );
    return detected;
  }

  /**
   * Detect file encoding from buffer.
   * Checks for BOM markers and validates UTF-8.
   *
   * @param buffer - File buffer
   * @returns Detected encoding name
   */
  detectEncoding(buffer: Buffer): string {
    // Check for BOM markers
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return "utf-8-bom";
    }
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return "utf-16le";
    }
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      return "utf-16be";
    }

    // Check if valid UTF-8
    try {
      const text = buffer.toString("utf-8");
      if (text.includes("\uFFFD")) {
        return "latin1"; // Contains replacement characters
      }
      return "utf-8";
    } catch {
      return "latin1";
    }
  }

  /**
   * Extract headers from CSV content.
   *
   * @param content - Raw CSV content
   * @param delimiter - CSV delimiter
   * @returns Array of header names
   */
  extractHeaders(content: string, delimiter?: string): string[] {
    const actualDelimiter = delimiter || this.detectDelimiter(content);
    const firstLine = content.split("\n")[0] || "";

    // Parse headers, handling quoted fields
    const headers: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of firstLine) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === actualDelimiter && !inQuotes) {
        headers.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    // Add last field
    if (current) {
      headers.push(current.trim());
    }

    return headers;
  }

  /**
   * Sample rows from CSV content for preview.
   *
   * @param content - Raw CSV content
   * @param count - Number of rows to sample (default 5)
   * @param delimiter - CSV delimiter
   * @returns Array of sample row objects
   */
  sampleRows(
    content: string,
    count: number = 5,
    delimiter?: string,
  ): Record<string, unknown>[] {
    const actualDelimiter = delimiter || this.detectDelimiter(content);
    const lines = content.split("\n").filter((l) => l.trim());

    if (lines.length < 2) {
      return [];
    }

    const headers = this.extractHeaders(lines[0], actualDelimiter);
    const rows: Record<string, unknown>[] = [];

    for (let i = 1; i <= count && i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], actualDelimiter);
      const row: Record<string, unknown> = {};

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || "";
      }

      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse a single CSV line, handling quoted fields.
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    // Add last value
    values.push(current.trim());

    return values;
  }

  /**
   * Detect file format from magic bytes.
   *
   * @param buffer - File buffer
   * @returns Detected file format
   */
  detectFileFormat(
    buffer: Buffer,
  ): "csv" | "xlsx" | "json" | "xml" | "unknown" {
    // Check for XLSX (ZIP archive)
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      return "xlsx";
    }

    // Check for JSON (starts with { or [)
    const text = buffer
      .toString("utf-8", 0, Math.min(100, buffer.length))
      .trim();
    if (text.startsWith("{") || text.startsWith("[")) {
      return "json";
    }

    // Check for XML
    if (text.startsWith("<?xml") || text.startsWith("<")) {
      return "xml";
    }

    // Default to CSV
    return "csv";
  }
}
