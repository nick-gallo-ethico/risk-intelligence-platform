// =============================================================================
// STORAGE DTOs - Request/Response types for storage operations
// =============================================================================

import { AttachmentEntityType } from "@prisma/client";

/**
 * Response DTO for file upload operations.
 */
export class UploadResponseDto {
  /** Created Attachment ID */
  attachmentId: string;

  /** URL for accessing the file (may be signed) */
  url: string;

  /** File size in bytes */
  size: number;

  /** Storage key for the file */
  fileKey: string;
}

/**
 * Response DTO for download URL operations.
 */
export class DownloadUrlResponseDto {
  /** Signed URL for download (time-limited) */
  url: string;

  /** Expiration time in minutes */
  expiresInMinutes: number;
}

/**
 * Response DTO for attachment metadata.
 */
export class AttachmentMetadataDto {
  /** Attachment UUID */
  id: string;

  /** Organization ID */
  organizationId: string;

  /** Type of parent entity */
  entityType: AttachmentEntityType;

  /** ID of parent entity */
  entityId: string;

  /** Original file name */
  fileName: string;

  /** MIME type */
  mimeType: string;

  /** File size in bytes */
  fileSize: number;

  /** Optional description */
  description?: string;

  /** Whether marked as evidence */
  isEvidence: boolean;

  /** User who uploaded the file */
  uploadedById: string;

  /** Upload timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Response DTO for listing attachments.
 */
export class AttachmentListResponseDto {
  /** List of attachment metadata */
  items: AttachmentMetadataDto[];

  /** Total count */
  total: number;
}
