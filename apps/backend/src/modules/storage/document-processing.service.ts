// =============================================================================
// DOCUMENT PROCESSING SERVICE - Text extraction for search indexing
// =============================================================================
//
// This service handles text extraction from various document types to enable
// full-text search indexing. Currently provides a placeholder implementation
// with support for plain text files.
//
// FUTURE ENHANCEMENTS:
// - PDF text extraction (pdf-parse)
// - DOCX/Word extraction (mammoth)
// - Spreadsheet extraction (xlsx)
// - OCR for scanned documents
// =============================================================================

import { Injectable, Logger } from "@nestjs/common";

/**
 * Result of text extraction from a document.
 */
export interface TextExtractionResult {
  /** Extracted text content */
  text: string | null;

  /** Number of characters extracted */
  charCount: number;

  /** Whether extraction was successful */
  success: boolean;

  /** Error message if extraction failed */
  error?: string;
}

/**
 * Service for extracting text from documents for search indexing.
 *
 * This is a placeholder implementation that will be enhanced with
 * actual document parsing libraries (pdf-parse, mammoth, etc.) in
 * a future iteration.
 */
@Injectable()
export class DocumentProcessingService {
  private readonly logger = new Logger(DocumentProcessingService.name);

  /**
   * MIME types that support text extraction.
   * These are document types from which we can extract searchable text.
   */
  private readonly EXTRACTABLE_TYPES = new Set([
    // Plain text
    "text/plain",
    "text/html",
    "text/csv",
    "text/markdown",
    "application/json",
    "application/xml",

    // PDF
    "application/pdf",

    // Microsoft Office
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    // OpenDocument formats
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",

    // Rich text
    "application/rtf",
  ]);

  /**
   * Text-based MIME types that can be read directly as UTF-8.
   */
  private readonly TEXT_BASED_TYPES = new Set([
    "text/plain",
    "text/html",
    "text/csv",
    "text/markdown",
    "application/json",
    "application/xml",
  ]);

  /**
   * Checks if a document type supports text extraction.
   *
   * @param contentType - MIME type of the document
   * @returns true if text can be extracted from this document type
   */
  isExtractable(contentType: string): boolean {
    // Normalize content type (remove charset, parameters)
    const normalizedType = contentType.split(";")[0].trim().toLowerCase();
    return this.EXTRACTABLE_TYPES.has(normalizedType);
  }

  /**
   * Extracts text from a document for search indexing.
   *
   * Currently supports:
   * - Plain text files (text/plain, text/html, etc.)
   *
   * Future support (placeholder):
   * - PDF (application/pdf)
   * - Word documents (DOCX, DOC)
   * - Spreadsheets (XLSX, XLS)
   *
   * @param content - Document content as Buffer
   * @param contentType - MIME type of the document
   * @returns Extraction result with text and metadata
   */
  async extractText(
    content: Buffer,
    contentType: string,
  ): Promise<TextExtractionResult> {
    const normalizedType = contentType.split(";")[0].trim().toLowerCase();

    // Check if type is extractable
    if (!this.EXTRACTABLE_TYPES.has(normalizedType)) {
      return {
        text: null,
        charCount: 0,
        success: false,
        error: `Unsupported content type: ${contentType}`,
      };
    }

    try {
      // Text-based files can be read directly
      if (this.TEXT_BASED_TYPES.has(normalizedType)) {
        const text = content.toString("utf-8");
        return {
          text,
          charCount: text.length,
          success: true,
        };
      }

      // PDF extraction (placeholder)
      if (normalizedType === "application/pdf") {
        this.logger.debug("PDF extraction requested - using placeholder");
        // TODO: Implement with pdf-parse library
        // const pdfParse = require('pdf-parse');
        // const data = await pdfParse(content);
        // return { text: data.text, charCount: data.text.length, success: true };
        return {
          text: null,
          charCount: 0,
          success: false,
          error: "PDF extraction not yet implemented",
        };
      }

      // Word/Office extraction (placeholder)
      if (
        normalizedType.includes("msword") ||
        normalizedType.includes("officedocument")
      ) {
        this.logger.debug(
          "Office document extraction requested - using placeholder",
        );
        // TODO: Implement with mammoth for DOCX
        // const mammoth = require('mammoth');
        // const result = await mammoth.extractRawText({ buffer: content });
        // return { text: result.value, charCount: result.value.length, success: true };
        return {
          text: null,
          charCount: 0,
          success: false,
          error: "Office document extraction not yet implemented",
        };
      }

      // RTF extraction (placeholder)
      if (normalizedType === "application/rtf") {
        this.logger.debug("RTF extraction requested - using placeholder");
        return {
          text: null,
          charCount: 0,
          success: false,
          error: "RTF extraction not yet implemented",
        };
      }

      // OpenDocument extraction (placeholder)
      if (normalizedType.includes("opendocument")) {
        this.logger.debug(
          "OpenDocument extraction requested - using placeholder",
        );
        return {
          text: null,
          charCount: 0,
          success: false,
          error: "OpenDocument extraction not yet implemented",
        };
      }

      // Unknown extractable type
      return {
        text: null,
        charCount: 0,
        success: false,
        error: `No extraction handler for: ${contentType}`,
      };
    } catch (error) {
      this.logger.error(
        `Text extraction failed for ${contentType}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return {
        text: null,
        charCount: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Extracts text and truncates to a maximum length.
   * Useful for storing extracted text in database columns with size limits.
   *
   * @param content - Document content as Buffer
   * @param contentType - MIME type of the document
   * @param maxLength - Maximum text length (default: 100000)
   * @returns Truncated extraction result
   */
  async extractTextTruncated(
    content: Buffer,
    contentType: string,
    maxLength = 100000,
  ): Promise<TextExtractionResult> {
    const result = await this.extractText(content, contentType);

    if (result.text && result.text.length > maxLength) {
      return {
        text: result.text.substring(0, maxLength),
        charCount: maxLength,
        success: result.success,
        error: result.error,
      };
    }

    return result;
  }

  /**
   * Gets the list of supported extractable MIME types.
   * Useful for UI to show which file types support search indexing.
   */
  getSupportedTypes(): string[] {
    return Array.from(this.EXTRACTABLE_TYPES);
  }
}
