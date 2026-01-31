// =============================================================================
// LOCAL STORAGE ADAPTER - File system storage for development
// =============================================================================
//
// This adapter stores files on the local file system. It's intended for
// development and testing. Production should use AzureBlobAdapter.
//
// STORAGE STRUCTURE:
// ./uploads/{tenantId}/{subdirectory}/{uuid}/{filename}
//
// KEY FEATURES:
// 1. Tenant-isolated directory structure
// 2. UUID-based subdirectories prevent filename collisions
// 3. Sanitized filenames for security
// 4. Stream-based operations for memory efficiency
// =============================================================================

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import {
  StorageAdapter,
  FileInput,
  UploadOptions,
  UploadResult,
  DownloadResult,
} from "./storage.interface";

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    this.basePath = this.configService.get<string>(
      "storage.localPath",
      "./uploads",
    );
    this.ensureBaseDirectoryExists();
  }

  // -------------------------------------------------------------------------
  // UPLOAD - Store file in tenant-isolated directory
  // -------------------------------------------------------------------------

  async upload(
    file: FileInput,
    tenantId: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const fileId = uuidv4();
    const sanitizedFilename = this.sanitizeFilename(
      options?.filename || file.originalname,
    );

    // Build storage key: tenantId/subdirectory/uuid/filename
    const subdirectory = options?.subdirectory || "files";
    const storageKey = this.buildKey(
      tenantId,
      subdirectory,
      fileId,
      sanitizedFilename,
    );

    // Create full path and ensure directory exists
    const fullPath = this.getFullPath(storageKey);
    const directory = path.dirname(fullPath);

    await fs.mkdir(directory, { recursive: true });

    // Write file
    if (file.buffer) {
      await fs.writeFile(fullPath, file.buffer);
    } else if (file.path) {
      // Move from temp location
      await fs.copyFile(file.path, fullPath);
      // Clean up temp file
      await fs.unlink(file.path).catch(() => {
        // Ignore errors on cleanup
      });
    } else {
      throw new Error("File must have either buffer or path");
    }

    this.logger.debug(`File uploaded: ${storageKey}`);

    return {
      key: storageKey,
      url: this.buildUrl(storageKey),
      size: file.size,
      mimeType: file.mimetype,
      filename: sanitizedFilename,
    };
  }

  // -------------------------------------------------------------------------
  // DOWNLOAD - Stream file from storage
  // -------------------------------------------------------------------------

  async download(key: string): Promise<DownloadResult> {
    const fullPath = this.getFullPath(key);

    // Check if file exists
    if (!(await this.exists(key))) {
      throw new NotFoundException(`File not found: ${key}`);
    }

    // Get file stats
    const stats = await fs.stat(fullPath);

    // Create read stream
    const stream = fsSync.createReadStream(fullPath);

    // Extract filename and mime type from key
    const filename = path.basename(key);
    const mimeType = this.getMimeType(filename);

    return {
      stream: stream as unknown as Readable,
      mimeType,
      size: stats.size,
      filename,
    };
  }

  // -------------------------------------------------------------------------
  // DELETE - Remove file from storage
  // -------------------------------------------------------------------------

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);

    if (!(await this.exists(key))) {
      throw new NotFoundException(`File not found: ${key}`);
    }

    await fs.unlink(fullPath);

    // Try to clean up empty parent directories
    await this.cleanupEmptyDirectories(path.dirname(fullPath));

    this.logger.debug(`File deleted: ${key}`);
  }

  // -------------------------------------------------------------------------
  // GET SIGNED URL - For local storage, return relative path
  // -------------------------------------------------------------------------

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    // For local storage, we don't have real signed URLs
    // Return a path that can be served by static file middleware
    // In production, Azure Blob would generate actual SAS tokens

    if (!(await this.exists(key))) {
      throw new NotFoundException(`File not found: ${key}`);
    }

    // For local dev, just return the URL path
    // The expiresInSeconds is ignored for local storage
    this.logger.debug(
      `Generated URL for ${key} (expires ignored for local: ${expiresInSeconds}s)`,
    );

    return this.buildUrl(key);
  }

  // -------------------------------------------------------------------------
  // EXISTS - Check if file exists
  // -------------------------------------------------------------------------

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // HELPER METHODS
  // -------------------------------------------------------------------------

  /**
   * Ensures the base uploads directory exists.
   */
  private ensureBaseDirectoryExists(): void {
    try {
      fsSync.mkdirSync(this.basePath, { recursive: true });
      this.logger.log(`Storage base path initialized: ${this.basePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to create storage directory: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Builds a storage key from components.
   */
  private buildKey(
    tenantId: string,
    subdirectory: string,
    fileId: string,
    filename: string,
  ): string {
    return `${tenantId}/${subdirectory}/${fileId}/${filename}`;
  }

  /**
   * Gets the full filesystem path for a storage key.
   */
  private getFullPath(key: string): string {
    return path.join(this.basePath, key);
  }

  /**
   * Builds a URL path for a storage key.
   */
  private buildUrl(key: string): string {
    // For local development, return a path that can be served
    // by Express static middleware
    return `/uploads/${key}`;
  }

  /**
   * Sanitizes a filename to remove dangerous characters.
   */
  private sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = path.basename(filename);

    // Remove special characters except dots, hyphens, underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Ensure filename isn't empty
    if (!sanitized || sanitized === "_") {
      sanitized = "file";
    }

    // Limit length
    if (sanitized.length > 255) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      sanitized = name.substring(0, 255 - ext.length) + ext;
    }

    return sanitized;
  }

  /**
   * Gets MIME type from filename extension.
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".json": "application/json",
      ".xml": "application/xml",
      ".html": "text/html",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".zip": "application/zip",
      ".rar": "application/x-rar-compressed",
      ".7z": "application/x-7z-compressed",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Cleans up empty parent directories after file deletion.
   */
  private async cleanupEmptyDirectories(directory: string): Promise<void> {
    try {
      // Don't delete above base path
      if (!directory.startsWith(this.basePath) || directory === this.basePath) {
        return;
      }

      const files = await fs.readdir(directory);
      if (files.length === 0) {
        await fs.rmdir(directory);
        // Recursively check parent
        await this.cleanupEmptyDirectories(path.dirname(directory));
      }
    } catch {
      // Ignore errors during cleanup
    }
  }
}
