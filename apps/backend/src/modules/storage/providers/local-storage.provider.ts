// =============================================================================
// LOCAL STORAGE PROVIDER - Development file storage
// =============================================================================
//
// This provider implements the StorageProvider interface using the local filesystem.
// Each organization gets its own directory for tenant isolation.
//
// DIRECTORY STRUCTURE:
// {basePath}/org-{organizationId}/{path}
//
// SIGNED URLs:
// For local development, returns direct file paths (no actual signing).
// Production should always use AzureBlobProvider.
// =============================================================================

import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as path from "path";
import {
  StorageProvider,
  UploadFileParams,
  UploadFileResult,
  GetSignedUrlParams,
  FileOperationParams,
} from "./storage-provider.interface";

@Injectable()
export class LocalStorageProvider implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private basePath: string = "./uploads";

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize local storage directory on module init.
   */
  async onModuleInit(): Promise<void> {
    this.basePath =
      this.configService.get<string>("storage.local.basePath") || "./uploads";

    // Ensure base directory exists
    await fs.mkdir(this.basePath, { recursive: true });
    this.logger.log(`Local Storage provider initialized at ${this.basePath}`);
  }

  /**
   * Get directory path for an organization.
   * Format: {basePath}/org-{organizationId}
   */
  private getOrgPath(organizationId: string): string {
    return path.join(this.basePath, `org-${organizationId}`);
  }

  /**
   * Get full filesystem path for a file.
   */
  private getFilePath(organizationId: string, filePath: string): string {
    return path.join(this.getOrgPath(organizationId), filePath);
  }

  /**
   * Upload a file to local storage.
   *
   * @param params - Upload parameters with tenant context
   * @returns Upload result with storage key and URL
   */
  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    const fullPath = this.getFilePath(params.organizationId, params.path);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file content
    await fs.writeFile(fullPath, params.content);

    // Store metadata in sidecar file if provided
    if (params.metadata) {
      const metadataPath = `${fullPath}.meta.json`;
      await fs.writeFile(
        metadataPath,
        JSON.stringify(
          {
            contentType: params.contentType,
            ...params.metadata,
            createdAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    }

    this.logger.debug(
      `File uploaded locally: ${params.path} (${params.content.length} bytes)`,
    );

    return {
      key: params.path,
      url: `/api/v1/storage/files/${params.organizationId}/${params.path}`,
      size: params.content.length,
    };
  }

  /**
   * Generate a URL for file download.
   * For local storage, returns a direct path (no actual signing).
   *
   * @param params - Signed URL parameters (expiresInMinutes ignored in local mode)
   * @returns URL path for download
   */
  async getSignedUrl(params: GetSignedUrlParams): Promise<string> {
    // Verify file exists
    const fullPath = this.getFilePath(params.organizationId, params.path);
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundException(`File not found: ${params.path}`);
    }

    // For local development, return direct path (no actual signing)
    // The API controller handles serving the file
    this.logger.debug(
      `Generated local URL for ${params.path} (expiry ignored: ${params.expiresInMinutes}m)`,
    );

    return `/api/v1/storage/files/${params.organizationId}/${params.path}`;
  }

  /**
   * Delete a file from local storage.
   *
   * @param params - File operation parameters
   */
  async deleteFile(params: FileOperationParams): Promise<void> {
    const fullPath = this.getFilePath(params.organizationId, params.path);

    try {
      // Delete main file
      await fs.unlink(fullPath);

      // Delete metadata sidecar if exists
      await fs.unlink(`${fullPath}.meta.json`).catch(() => {
        // Ignore if metadata file doesn't exist
      });

      // Clean up empty parent directories
      await this.cleanupEmptyDirectories(path.dirname(fullPath));

      this.logger.debug(`File deleted locally: ${params.path}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      // Ignore if file doesn't exist
    }
  }

  /**
   * Check if a file exists in local storage.
   *
   * @param params - File operation parameters
   * @returns true if file exists
   */
  async fileExists(params: FileOperationParams): Promise<boolean> {
    const fullPath = this.getFilePath(params.organizationId, params.path);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download file content from local storage.
   *
   * @param params - File operation parameters
   * @returns File content as Buffer
   */
  async downloadFile(params: FileOperationParams): Promise<Buffer> {
    const fullPath = this.getFilePath(params.organizationId, params.path);

    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new NotFoundException(`File not found: ${params.path}`);
      }
      throw error;
    }
  }

  /**
   * Clean up empty parent directories after file deletion.
   * Recursively removes empty directories up to the base path.
   */
  private async cleanupEmptyDirectories(directory: string): Promise<void> {
    try {
      // Don't delete above base path
      if (
        !directory.startsWith(this.basePath) ||
        directory === this.basePath
      ) {
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
