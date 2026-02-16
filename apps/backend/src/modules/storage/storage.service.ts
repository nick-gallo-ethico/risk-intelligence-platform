// =============================================================================
// STORAGE SERVICE - Unified file storage with Attachment tracking
// =============================================================================
//
// This service provides a unified API for file storage operations with:
// 1. Per-tenant container isolation (organizationId-based)
// 2. Attachment record tracking in the database
// 3. Event emission for search indexing
// 4. Signed URL generation for secure downloads
//
// USAGE:
// - Inject StorageService in feature services
// - Provider (Azure/Local) is auto-configured based on environment
// =============================================================================

import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as path from "path";
import { PrismaService } from "../prisma/prisma.service";
import { AttachmentEntityType, Attachment } from "@prisma/client";
import {
  StorageProvider,
  STORAGE_PROVIDER,
} from "./providers/storage-provider.interface";
import { DocumentProcessingService } from "./document-processing.service";
import {
  DANGEROUS_EXTENSIONS,
  ALLOWED_EXTENSIONS,
  MagicByteValidationResult,
} from "../../common/services/storage.service";
import { nanoid } from "nanoid";

/**
 * Parameters for uploading a file with Attachment tracking.
 */
export interface UploadFileParams {
  /** Organization ID for tenant isolation */
  organizationId: string;

  /** Type of parent entity (CASE, INVESTIGATION, etc.) */
  entityType: AttachmentEntityType;

  /** ID of parent entity */
  entityId: string;

  /** Original file name */
  fileName: string;

  /** File content as Buffer */
  content: Buffer;

  /** MIME type of the file */
  contentType: string;

  /** User ID who is uploading */
  uploadedById: string;

  /** Mark as evidence (for investigations) */
  isEvidence?: boolean;

  /** Optional description */
  description?: string;
}

/**
 * Result of a file upload operation.
 */
export interface UploadFileResult {
  /** Created Attachment ID */
  attachmentId: string;

  /** URL for accessing the file */
  url: string;

  /** File size in bytes */
  size: number;

  /** Storage key for the file */
  fileKey: string;
}

/**
 * Service for file storage operations with Attachment tracking.
 *
 * This service wraps the storage provider and integrates with:
 * - Prisma for Attachment records
 * - EventEmitter for search indexing
 * - DocumentProcessingService for text extraction
 */
@Injectable()
export class ModuleStorageService {
  private readonly logger = new Logger(ModuleStorageService.name);

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private readonly prisma: PrismaService,
    private readonly documentProcessing: DocumentProcessingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Upload a file and create an Attachment record.
   *
   * This method:
   * 1. Generates a unique file key
   * 2. Uploads to storage provider
   * 3. Creates Attachment record in database
   * 4. Emits 'file.uploaded' event for search indexing
   *
   * @param params - Upload parameters with tenant context
   * @returns Upload result with attachment ID and URL
   */
  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    // Validate file extension (PROD-02: block dangerous files)
    this.validateExtension(params.fileName);

    // Validate magic bytes (PROD-01: prevent MIME spoofing)
    const ext = path.extname(params.fileName).toLowerCase();
    const magicValidation = await this.validateMagicBytes(params.content, ext);
    if (!magicValidation.valid) {
      throw new BadRequestException(
        `File validation failed: ${magicValidation.error}`,
      );
    }

    // Generate unique file key: {entityType}/{entityId}/{nanoid}-{filename}
    const fileKey = this.generateFileKey(
      params.entityType,
      params.entityId,
      params.fileName,
    );

    this.logger.debug(
      `Uploading file: ${params.fileName} (${params.content.length} bytes) for ${params.entityType}:${params.entityId}`,
    );

    // Upload to storage provider
    const uploadResult = await this.storageProvider.uploadFile({
      organizationId: params.organizationId,
      path: fileKey,
      content: params.content,
      contentType: params.contentType,
      metadata: {
        entityType: params.entityType,
        entityId: params.entityId,
        originalFileName: params.fileName,
        uploadedById: params.uploadedById,
      },
    });

    // Create Attachment record
    const attachment = await this.prisma.attachment.create({
      data: {
        organizationId: params.organizationId,
        entityType: params.entityType,
        entityId: params.entityId,
        fileName: params.fileName,
        fileKey: fileKey,
        mimeType: params.contentType,
        fileSize: uploadResult.size,
        description: params.description,
        isEvidence: params.isEvidence ?? false,
        uploadedById: params.uploadedById,
      },
    });

    // Emit event for searchable documents (fire-and-forget)
    if (this.documentProcessing.isExtractable(params.contentType)) {
      try {
        this.eventEmitter.emit("file.uploaded", {
          organizationId: params.organizationId,
          attachmentId: attachment.id,
          fileKey: fileKey,
          contentType: params.contentType,
          fileName: params.fileName,
        });
      } catch (error) {
        // Don't fail upload if event emission fails
        this.logger.warn(
          `Failed to emit file.uploaded event for ${attachment.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    this.logger.log(
      `File uploaded: ${attachment.id} (${params.fileName}, ${uploadResult.size} bytes)`,
    );

    return {
      attachmentId: attachment.id,
      url: uploadResult.url,
      size: uploadResult.size,
      fileKey: fileKey,
    };
  }

  /**
   * Get a signed URL for secure file download.
   *
   * @param organizationId - Organization ID for tenant isolation
   * @param attachmentId - Attachment UUID
   * @param expiresInMinutes - URL expiration time (default: 15)
   * @returns Signed URL for download
   * @throws NotFoundException if attachment doesn't exist
   */
  async getDownloadUrl(
    organizationId: string,
    attachmentId: string,
    expiresInMinutes = 15,
  ): Promise<string> {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        organizationId, // CRITICAL: Tenant isolation
      },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    return this.storageProvider.getSignedUrl({
      organizationId,
      path: attachment.fileKey,
      expiresInMinutes,
    });
  }

  /**
   * Delete a file and its Attachment record.
   *
   * @param organizationId - Organization ID for tenant isolation
   * @param attachmentId - Attachment UUID
   * @throws NotFoundException if attachment doesn't exist
   */
  async deleteFile(
    organizationId: string,
    attachmentId: string,
  ): Promise<void> {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        organizationId, // CRITICAL: Tenant isolation
      },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    // Delete from storage (ignore errors - file might already be deleted)
    try {
      await this.storageProvider.deleteFile({
        organizationId,
        path: attachment.fileKey,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to delete file from storage: ${attachment.fileKey}`,
        error,
      );
    }

    // Delete Attachment record
    await this.prisma.attachment.delete({
      where: { id: attachmentId },
    });

    this.logger.log(`File deleted: ${attachmentId} (${attachment.fileName})`);
  }

  /**
   * Get a single Attachment by ID.
   *
   * @param organizationId - Organization ID for tenant isolation
   * @param attachmentId - Attachment UUID
   * @returns Attachment record or null if not found
   */
  async getAttachment(
    organizationId: string,
    attachmentId: string,
  ): Promise<Attachment | null> {
    return this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        organizationId, // CRITICAL: Tenant isolation
      },
    });
  }

  /**
   * List Attachments for a specific entity.
   *
   * @param organizationId - Organization ID for tenant isolation
   * @param entityType - Type of parent entity
   * @param entityId - ID of parent entity
   * @returns List of Attachment records
   */
  async listAttachments(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
  ): Promise<Attachment[]> {
    return this.prisma.attachment.findMany({
      where: {
        organizationId, // CRITICAL: Tenant isolation
        entityType,
        entityId,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Download file content directly.
   *
   * @param organizationId - Organization ID for tenant isolation
   * @param attachmentId - Attachment UUID
   * @returns File content as Buffer
   * @throws NotFoundException if attachment doesn't exist
   */
  async downloadFile(
    organizationId: string,
    attachmentId: string,
  ): Promise<{ content: Buffer; attachment: Attachment }> {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        organizationId, // CRITICAL: Tenant isolation
      },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    const content = await this.storageProvider.downloadFile({
      organizationId,
      path: attachment.fileKey,
    });

    return { content, attachment };
  }

  /**
   * Check if a file exists in storage.
   *
   * @param organizationId - Organization ID for tenant isolation
   * @param attachmentId - Attachment UUID
   * @returns true if file exists
   */
  async fileExists(
    organizationId: string,
    attachmentId: string,
  ): Promise<boolean> {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        organizationId, // CRITICAL: Tenant isolation
      },
    });

    if (!attachment) {
      return false;
    }

    return this.storageProvider.fileExists({
      organizationId,
      path: attachment.fileKey,
    });
  }

  /**
   * Generate a unique file key for storage.
   * Format: {entityType}/{entityId}/{nanoid}-{filename}
   */
  private generateFileKey(
    entityType: AttachmentEntityType,
    entityId: string,
    fileName: string,
  ): string {
    const sanitizedFileName = this.sanitizeFileName(fileName);
    const uniqueId = nanoid(10);
    const typeFolder = entityType.toLowerCase().replace("_", "-");
    return `${typeFolder}/${entityId}/${uniqueId}-${sanitizedFileName}`;
  }

  /**
   * Sanitize file name for storage.
   * Removes path traversal attempts and special characters.
   */
  private sanitizeFileName(fileName: string): string {
    // Remove path components
    let sanitized = fileName.split(/[/\\]/).pop() || fileName;

    // Remove special characters except dots, hyphens, underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Ensure not empty
    if (!sanitized || sanitized === "_") {
      sanitized = "file";
    }

    // Limit length
    if (sanitized.length > 200) {
      const ext = sanitized.lastIndexOf(".");
      if (ext > 0) {
        const extension = sanitized.substring(ext);
        sanitized = sanitized.substring(0, 200 - extension.length) + extension;
      } else {
        sanitized = sanitized.substring(0, 200);
      }
    }

    return sanitized;
  }

  /**
   * Validates file extension against allowed/dangerous lists.
   * PROD-02: Block dangerous file extensions.
   *
   * @param filename - Original filename with extension
   * @throws BadRequestException if extension is dangerous or not allowed
   */
  private validateExtension(filename: string): void {
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

  /**
   * Validates file content against expected type using magic bytes.
   * PROD-01: Prevent MIME type spoofing attacks.
   *
   * @param buffer - File content as Buffer
   * @param expectedExt - Expected file extension (e.g., '.pdf', '.docx')
   * @returns Validation result with detected MIME type
   */
  private async validateMagicBytes(
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
}
