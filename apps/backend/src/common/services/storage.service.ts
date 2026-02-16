/**
 * STORAGE SERVICE - Main file storage service with validation
 *
 * This service wraps the storage adapter and provides:
 * 1. File validation (size, type)
 * 2. Tenant context enforcement
 * 3. Unified interface regardless of storage backend
 *
 * USAGE:
 * - Inject StorageService in your feature services
 * - Use LocalStorageAdapter for dev, AzureBlobAdapter for prod
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as path from "path";
import {
  StorageAdapter,
  FileInput,
  UploadOptions,
  UploadResult,
  DownloadResult,
} from "./storage.interface";

/**
 * Result of magic byte validation.
 */
export interface MagicByteValidationResult {
  /** Whether the file content matches the expected extension */
  valid: boolean;
  /** Detected MIME type from magic bytes (if detected) */
  detectedMime?: string;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Dangerous file extensions that should always be rejected.
 */
export const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".msi",
  ".dll",
  ".scr",
  ".com",
  ".vbs",
  ".js",
  ".jse",
  ".wsf",
  ".wsh",
];

/**
 * Allowed file extensions for upload.
 */
export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".pptx",
  ".doc",
  ".xls",
  ".ppt",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".txt",
  ".csv",
  ".json",
  ".xml",
  ".md",
  ".html",
  ".htm",
  ".zip",
  ".rar",
  ".7z",
];

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

  // UPLOAD - Validate and store file
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

    // Validate MIME type from header
    this.validateMimeType(file.mimetype);

    // Validate file extension against dangerous/allowed lists
    this.validateExtension(file.originalname);

    // Validate magic bytes match extension (PROD-01: prevent MIME spoofing)
    // Only perform magic byte validation if buffer is available
    // (files using disk storage will need validation in the adapter)
    if (file.buffer) {
      const ext = path.extname(file.originalname).toLowerCase();
      const magicValidation = await this.validateMagicBytes(file.buffer, ext);
      if (!magicValidation.valid) {
        throw new BadRequestException(
          `File validation failed: ${magicValidation.error}`,
        );
      }
    }

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

  // DOWNLOAD - Stream file from storage
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

  // DELETE - Remove file from storage
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

  // GET SIGNED URL - Generate time-limited access URL
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

  // EXISTS - Check if file exists
  /**
   * Check if a file exists in storage.
   *
   * @param key - Storage key to check
   * @returns true if file exists
   */
  async exists(key: string): Promise<boolean> {
    return this.adapter.exists(key);
  }

  // MAGIC BYTE VALIDATION - Detect actual file content type
  /**
   * Validates file content against expected type using magic bytes.
   * This prevents MIME type spoofing attacks where malicious files
   * are disguised with incorrect extensions.
   *
   * @param buffer - File content as Buffer
   * @param expectedExt - Expected file extension (e.g., '.pdf', '.docx')
   * @returns Validation result with detected MIME type
   */
  async validateMagicBytes(
    buffer: Buffer,
    expectedExt: string,
  ): Promise<MagicByteValidationResult> {
    try {
      // Dynamic import for ESM package in CommonJS context
      const { fileTypeFromBuffer } = await import("file-type");
      const detected = await fileTypeFromBuffer(buffer);

      // Plain text files have no magic bytes - allow if extension is text-based
      if (!detected) {
        const textExtensions = [
          ".txt",
          ".csv",
          ".json",
          ".xml",
          ".md",
          ".html",
          ".htm",
          ".svg",
        ];
        if (textExtensions.includes(expectedExt.toLowerCase())) {
          return { valid: true };
        }
        return {
          valid: false,
          error: "Could not detect file type from content",
        };
      }

      // Map extensions to allowed MIME types
      const extToMime: Record<string, string[]> = {
        ".pdf": ["application/pdf"],
        ".docx": [
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        ".doc": ["application/msword", "application/x-cfb"],
        ".xlsx": [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        ".xls": ["application/vnd.ms-excel", "application/x-cfb"],
        ".pptx": [
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ],
        ".ppt": ["application/vnd.ms-powerpoint", "application/x-cfb"],
        ".png": ["image/png"],
        ".jpg": ["image/jpeg"],
        ".jpeg": ["image/jpeg"],
        ".gif": ["image/gif"],
        ".webp": ["image/webp"],
        ".bmp": ["image/bmp"],
        ".zip": ["application/zip"],
        ".rar": ["application/x-rar-compressed", "application/vnd.rar"],
        ".7z": ["application/x-7z-compressed"],
      };

      const normalizedExt = expectedExt.toLowerCase();
      const allowedMimes = extToMime[normalizedExt];

      // If extension not in our map, check if file-type detected something safe
      if (!allowedMimes) {
        // For unmapped extensions, we're strict - reject unless it's text
        return {
          valid: false,
          detectedMime: detected.mime,
          error: `Extension ${expectedExt} not in validated list`,
        };
      }

      // Check if detected MIME matches expected
      if (allowedMimes.includes(detected.mime)) {
        return { valid: true, detectedMime: detected.mime };
      }

      return {
        valid: false,
        detectedMime: detected.mime,
        error: `File content (${detected.mime}) does not match extension (${expectedExt})`,
      };
    } catch (error) {
      this.logger.error(
        `Magic byte validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return { valid: false, error: "Magic byte validation failed" };
    }
  }

  /**
   * Validates file extension against allowed/dangerous lists.
   * Should be called before magic byte validation.
   *
   * @param filename - Original filename with extension
   * @throws BadRequestException if extension is dangerous or not allowed
   */
  validateExtension(filename: string): void {
    const ext = path.extname(filename).toLowerCase();

    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Dangerous file extension not allowed: ${ext}`,
      );
    }

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`File extension not allowed: ${ext}`);
    }
  }

  // VALIDATION - Multer file with validation
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
