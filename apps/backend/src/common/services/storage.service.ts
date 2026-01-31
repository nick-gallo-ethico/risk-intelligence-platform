// =============================================================================
// STORAGE SERVICE - Main file storage service with validation
// =============================================================================
//
// This service wraps the storage adapter and provides:
// 1. File validation (size, type)
// 2. Tenant context enforcement
// 3. Unified interface regardless of storage backend
//
// USAGE:
// - Inject StorageService in your feature services
// - Use LocalStorageAdapter for dev, AzureBlobAdapter for prod
// =============================================================================

import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  StorageAdapter,
  FileInput,
  UploadOptions,
  UploadResult,
  DownloadResult,
} from "./storage.interface";

/**
 * Storage adapter injection token.
 */
export const STORAGE_ADAPTER = Symbol("STORAGE_ADAPTER");

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    @Inject(STORAGE_ADAPTER)
    private readonly adapter: StorageAdapter,
    private readonly configService: ConfigService,
  ) {
    this.maxFileSize = this.configService.get<number>(
      "storage.maxFileSize",
      10 * 1024 * 1024, // 10MB default
    );

    this.allowedMimeTypes = this.configService.get<string[]>(
      "storage.allowedMimeTypes",
      [
        "image/*",
        "application/pdf",
        "text/*",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.*",
        "application/vnd.ms-excel",
        "application/vnd.ms-powerpoint",
      ],
    );

    this.logger.log(
      `Storage service initialized (maxSize: ${this.formatBytes(this.maxFileSize)}, types: ${this.allowedMimeTypes.length} patterns)`,
    );
  }

  // -------------------------------------------------------------------------
  // UPLOAD - Validate and store file
  // -------------------------------------------------------------------------

  /**
   * Upload a file with validation.
   *
   * @param file - File from multer (Express.Multer.File compatible)
   * @param tenantId - Tenant ID for isolation (from JWT)
   * @param options - Upload options
   * @returns Upload result with storage key and URL
   * @throws BadRequestException if validation fails
   */
  async upload(
    file: FileInput,
    tenantId: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    // Validate tenant ID
    if (!tenantId) {
      throw new BadRequestException("Tenant ID is required");
    }

    // Validate file exists
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    // Validate file size
    this.validateFileSize(file.size);

    // Validate MIME type
    this.validateMimeType(file.mimetype);

    this.logger.debug(
      `Uploading file: ${file.originalname} (${this.formatBytes(file.size)}) for tenant ${tenantId}`,
    );

    // Delegate to adapter
    const result = await this.adapter.upload(file, tenantId, options);

    this.logger.log(
      `File uploaded successfully: ${result.key} (${this.formatBytes(result.size)})`,
    );

    return result;
  }

  // -------------------------------------------------------------------------
  // DOWNLOAD - Stream file from storage
  // -------------------------------------------------------------------------

  /**
   * Download a file by storage key.
   *
   * @param key - Storage key from upload result
   * @returns Download result with stream and metadata
   * @throws NotFoundException if file doesn't exist
   */
  async download(key: string): Promise<DownloadResult> {
    this.logger.debug(`Downloading file: ${key}`);
    return this.adapter.download(key);
  }

  // -------------------------------------------------------------------------
  // DELETE - Remove file from storage
  // -------------------------------------------------------------------------

  /**
   * Delete a file by storage key.
   *
   * @param key - Storage key from upload result
   * @throws NotFoundException if file doesn't exist
   */
  async delete(key: string): Promise<void> {
    this.logger.debug(`Deleting file: ${key}`);
    await this.adapter.delete(key);
    this.logger.log(`File deleted: ${key}`);
  }

  // -------------------------------------------------------------------------
  // GET SIGNED URL - Generate time-limited access URL
  // -------------------------------------------------------------------------

  /**
   * Generate a signed URL for secure file access.
   *
   * @param key - Storage key from upload result
   * @param expiresInSeconds - URL expiration time (default: 3600)
   * @returns Signed URL
   */
  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return this.adapter.getSignedUrl(key, expiresInSeconds);
  }

  // -------------------------------------------------------------------------
  // EXISTS - Check if file exists
  // -------------------------------------------------------------------------

  /**
   * Check if a file exists in storage.
   *
   * @param key - Storage key to check
   * @returns true if file exists
   */
  async exists(key: string): Promise<boolean> {
    return this.adapter.exists(key);
  }

  // -------------------------------------------------------------------------
  // VALIDATION - Multer file with validation
  // -------------------------------------------------------------------------

  /**
   * Validates file size against configured maximum.
   */
  private validateFileSize(size: number): void {
    if (size > this.maxFileSize) {
      throw new BadRequestException(
        `File size (${this.formatBytes(size)}) exceeds maximum allowed (${this.formatBytes(this.maxFileSize)})`,
      );
    }
  }

  /**
   * Validates MIME type against configured allowlist.
   */
  private validateMimeType(mimeType: string): void {
    const isAllowed = this.allowedMimeTypes.some((pattern) => {
      if (pattern.endsWith("/*")) {
        // Wildcard pattern (e.g., 'image/*')
        const prefix = pattern.slice(0, -2);
        return mimeType.startsWith(prefix);
      } else if (pattern.includes("*")) {
        // Pattern with wildcard in middle (e.g., 'application/vnd.openxmlformats-officedocument.*')
        const regex = new RegExp(
          "^" + pattern.replace(/\*/g, ".*").replace(/\//g, "\\/") + "$",
        );
        return regex.test(mimeType);
      }
      // Exact match
      return mimeType === pattern;
    });

    if (!isAllowed) {
      throw new BadRequestException(
        `File type "${mimeType}" is not allowed. Allowed types: ${this.allowedMimeTypes.join(", ")}`,
      );
    }
  }

  /**
   * Format bytes to human readable string.
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
