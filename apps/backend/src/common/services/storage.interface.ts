// =============================================================================
// STORAGE INTERFACE - Contract for file storage providers
// =============================================================================
//
// This interface defines the contract for file storage implementations.
// Currently supports LocalStorageAdapter (dev) with AzureBlobAdapter planned.
//
// KEY DESIGN DECISIONS:
// 1. All operations use storage key (not full path) for portability
// 2. Keys include tenantId for multi-tenant isolation
// 3. Signed URLs support expiration for security
// 4. Stream-based download for memory efficiency with large files
// =============================================================================

import { Readable } from "stream";

/**
 * Result of a file upload operation.
 */
export interface UploadResult {
  /** Storage key for retrieving the file later */
  key: string;

  /** Public or signed URL to access the file */
  url: string;

  /** Size of uploaded file in bytes */
  size: number;

  /** MIME type of the file */
  mimeType: string;

  /** Original filename (sanitized) */
  filename: string;
}

/**
 * Result of a file download operation.
 */
export interface DownloadResult {
  /** Readable stream of file contents */
  stream: Readable;

  /** MIME type of the file */
  mimeType: string;

  /** Size of file in bytes */
  size: number;

  /** Original filename */
  filename: string;
}

/**
 * Options for file upload.
 */
export interface UploadOptions {
  /** Custom filename (optional, uses original if not provided) */
  filename?: string;

  /** Subdirectory within tenant folder (e.g., 'attachments', 'avatars') */
  subdirectory?: string;
}

/**
 * File metadata from the uploaded file (e.g., from multer).
 */
export interface FileInput {
  /** Original filename */
  originalname: string;

  /** MIME type */
  mimetype: string;

  /** File size in bytes */
  size: number;

  /** File buffer (for memory storage) */
  buffer?: Buffer;

  /** Path to temporary file (for disk storage) */
  path?: string;
}

/**
 * Interface for storage adapters.
 *
 * Implementations:
 * - LocalStorageAdapter: File system storage for development
 * - AzureBlobAdapter: Azure Blob Storage for production (planned)
 *
 * @example
 * ```typescript
 * const result = await adapter.upload(file, 'tenant-123', {
 *   subdirectory: 'attachments'
 * });
 * console.log(result.key); // 'tenant-123/attachments/uuid/filename.pdf'
 * ```
 */
export interface StorageAdapter {
  /**
   * Upload a file to storage.
   *
   * @param file - The file to upload (from multer)
   * @param tenantId - Tenant ID for isolation
   * @param options - Upload options
   * @returns Upload result with key and URL
   */
  upload(
    file: FileInput,
    tenantId: string,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * Download a file from storage.
   *
   * @param key - Storage key from upload result
   * @returns Download result with stream and metadata
   * @throws NotFoundException if file doesn't exist
   */
  download(key: string): Promise<DownloadResult>;

  /**
   * Delete a file from storage.
   *
   * @param key - Storage key from upload result
   * @throws NotFoundException if file doesn't exist
   */
  delete(key: string): Promise<void>;

  /**
   * Generate a signed URL for secure file access.
   *
   * @param key - Storage key from upload result
   * @param expiresInSeconds - URL expiration time (default: 3600 = 1 hour)
   * @returns Signed URL for file access
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Check if a file exists in storage.
   *
   * @param key - Storage key to check
   * @returns true if file exists
   */
  exists(key: string): Promise<boolean>;
}

/**
 * Storage configuration interface.
 */
export interface StorageConfig {
  /** Storage type: 'local' or 'azure' */
  type: "local" | "azure";

  /** Base path for local storage */
  localPath: string;

  /** Maximum file size in bytes */
  maxFileSize: number;

  /** Allowed MIME types (supports wildcards like 'image/*') */
  allowedMimeTypes: string[];

  /** Azure Blob Storage connection string (for azure type) */
  azureConnectionString?: string;

  /** Azure Blob Storage container name (for azure type) */
  azureContainerName?: string;
}
