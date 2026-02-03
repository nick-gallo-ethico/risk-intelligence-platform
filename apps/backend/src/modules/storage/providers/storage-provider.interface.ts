// =============================================================================
// STORAGE PROVIDER INTERFACE - Contract for file storage backends
// =============================================================================
//
// This interface defines the contract for storage providers.
// Implementations: AzureBlobProvider (production), LocalStorageProvider (dev)
//
// KEY DESIGN DECISIONS:
// 1. Per-tenant container isolation (organizationId in all operations)
// 2. Signed URLs with expiration for secure downloads
// 3. Stream-based download for memory efficiency
// 4. Metadata support for file tracking
// =============================================================================

/**
 * Parameters for uploading a file.
 */
export interface UploadFileParams {
  /** Organization ID for tenant isolation */
  organizationId: string;

  /** Storage path within tenant container (e.g., 'case/abc123/file.pdf') */
  path: string;

  /** File content as Buffer */
  content: Buffer;

  /** MIME type of the file */
  contentType: string;

  /** Optional metadata to store with the file */
  metadata?: Record<string, string>;
}

/**
 * Result of a file upload operation.
 */
export interface UploadFileResult {
  /** Storage key for retrieving the file later */
  key: string;

  /** URL to access the file (may be unsigned for local, signed for Azure) */
  url: string;

  /** Size of uploaded file in bytes */
  size: number;
}

/**
 * Parameters for getting a signed URL.
 */
export interface GetSignedUrlParams {
  /** Organization ID for tenant isolation */
  organizationId: string;

  /** Storage path within tenant container */
  path: string;

  /** URL expiration time in minutes (default: 15) */
  expiresInMinutes?: number;
}

/**
 * Parameters for file operations (delete, exists, download).
 */
export interface FileOperationParams {
  /** Organization ID for tenant isolation */
  organizationId: string;

  /** Storage path within tenant container */
  path: string;
}

/**
 * Interface for storage providers.
 *
 * Implementations must handle per-tenant isolation using organizationId.
 * Each organization's files are stored in separate containers/directories.
 *
 * @example
 * ```typescript
 * const result = await provider.uploadFile({
 *   organizationId: 'org-123',
 *   path: 'case/case-456/document.pdf',
 *   content: fileBuffer,
 *   contentType: 'application/pdf',
 * });
 * ```
 */
export interface StorageProvider {
  /**
   * Upload a file to storage.
   *
   * @param params - Upload parameters including tenant context
   * @returns Upload result with storage key and URL
   */
  uploadFile(params: UploadFileParams): Promise<UploadFileResult>;

  /**
   * Get a signed URL for secure file download.
   * The URL will expire after the specified time.
   *
   * @param params - Signed URL parameters
   * @returns Time-limited signed URL for download
   */
  getSignedUrl(params: GetSignedUrlParams): Promise<string>;

  /**
   * Delete a file from storage.
   *
   * @param params - File operation parameters
   */
  deleteFile(params: FileOperationParams): Promise<void>;

  /**
   * Check if a file exists in storage.
   *
   * @param params - File operation parameters
   * @returns true if file exists
   */
  fileExists(params: FileOperationParams): Promise<boolean>;

  /**
   * Download file content as a Buffer.
   *
   * @param params - File operation parameters
   * @returns File content as Buffer
   * @throws NotFoundException if file doesn't exist
   */
  downloadFile(params: FileOperationParams): Promise<Buffer>;
}

/**
 * Injection token for the StorageProvider.
 * Use with @Inject(STORAGE_PROVIDER) to inject the configured provider.
 */
export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");
