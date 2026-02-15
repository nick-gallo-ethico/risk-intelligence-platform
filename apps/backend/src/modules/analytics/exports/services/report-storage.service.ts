/**
 * ReportStorageService - File storage operations for reports
 *
 * Extracted from BoardReportService to handle all file upload and
 * URL generation concerns. This service provides a consistent interface
 * for storing generated reports and obtaining signed download URLs.
 *
 * Features:
 * - Per-tenant isolated storage (uses organizationId)
 * - Signed URL generation with configurable expiration
 * - Metadata attachment for tracking and audit
 *
 * Usage:
 * ```typescript
 * const result = await reportStorageService.uploadReport(
 *   organizationId,
 *   'reports/board-report-123.pdf',
 *   pdfBuffer,
 *   'application/pdf',
 *   { reportType: 'board_report' }
 * );
 * const url = await reportStorageService.getSignedUrl(organizationId, path);
 * ```
 */

import { Injectable, Inject, Logger } from "@nestjs/common";
import {
  StorageProvider,
  STORAGE_PROVIDER,
  UploadFileResult,
} from "../../../storage/providers/storage-provider.interface";

/**
 * ReportStorageService handles file upload and URL generation for reports.
 *
 * This service is injected into report generation services to abstract
 * storage operations and provide consistent expiration handling.
 */
@Injectable()
export class ReportStorageService {
  private readonly logger = new Logger(ReportStorageService.name);

  /** URL expiration time for generated reports (24 hours) */
  private readonly REPORT_EXPIRATION_HOURS = 24;

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  /**
   * Upload a report file to storage.
   *
   * @param organizationId - Tenant ID for storage isolation
   * @param path - Storage path (e.g., 'reports/org-123/board-report-abc.pdf')
   * @param content - File content as Buffer
   * @param contentType - MIME type of the file
   * @param metadata - Optional metadata to store with the file
   * @returns Upload result with size information
   */
  async uploadReport(
    organizationId: string,
    path: string,
    content: Buffer,
    contentType: string,
    metadata: Record<string, string> = {},
  ): Promise<UploadFileResult> {
    this.logger.debug(`Uploading report: ${path} (${content.length} bytes)`);

    const result = await this.storageProvider.uploadFile({
      organizationId,
      path,
      content,
      contentType,
      metadata,
    });

    this.logger.debug(`Report uploaded successfully: ${path}`);
    return result;
  }

  /**
   * Get a signed URL for a report file.
   *
   * The URL will expire after REPORT_EXPIRATION_HOURS (default: 24 hours).
   *
   * @param organizationId - Tenant ID for storage isolation
   * @param path - Storage path of the file
   * @returns Time-limited signed URL for download
   */
  async getSignedUrl(organizationId: string, path: string): Promise<string> {
    return this.storageProvider.getSignedUrl({
      organizationId,
      path,
      expiresInMinutes: this.REPORT_EXPIRATION_HOURS * 60,
    });
  }

  /**
   * Get expiration time for reports.
   *
   * @returns Date when report URLs will expire
   */
  getExpirationDate(): Date {
    return new Date(Date.now() + this.REPORT_EXPIRATION_HOURS * 60 * 60 * 1000);
  }

  /**
   * Get the configured expiration hours.
   *
   * @returns Number of hours until report URLs expire
   */
  getExpirationHours(): number {
    return this.REPORT_EXPIRATION_HOURS;
  }
}
