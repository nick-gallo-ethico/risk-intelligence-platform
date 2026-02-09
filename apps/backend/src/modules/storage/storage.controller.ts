// =============================================================================
// STORAGE CONTROLLER - REST API for file storage operations
// =============================================================================
//
// This controller provides endpoints for:
// 1. File upload with multipart form data
// 2. Download URL generation (signed URLs)
// 3. Attachment metadata retrieval
// 4. Attachment listing and deletion
//
// SECURITY:
// - All endpoints require JWT authentication
// - Tenant isolation via TenantGuard
// - File size limits enforced (50MB default)
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  ParseEnumPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { ModuleStorageService } from "./storage.service";
import { AttachmentEntityType } from "@prisma/client";
import {
  UploadResponseDto,
  DownloadUrlResponseDto,
  AttachmentMetadataDto,
  AttachmentListResponseDto,
} from "./dto";

/**
 * User payload from JWT token.
 */
interface JwtUser {
  id: string;
  organizationId: string;
}

@Controller("storage")
@UseGuards(JwtAuthGuard, TenantGuard)
export class StorageController {
  constructor(private readonly storageService: ModuleStorageService) {}

  /**
   * Upload a file and create an Attachment record.
   *
   * @param file - Uploaded file (multipart form data)
   * @param orgId - Organization ID from tenant context
   * @param user - Current user from JWT
   * @param entityType - Type of parent entity (CASE, INVESTIGATION, INVESTIGATION_NOTE)
   * @param entityId - ID of parent entity
   * @param isEvidence - Optional: mark as evidence (for investigations)
   * @param description - Optional: file description
   * @returns Upload result with attachment ID and URL
   */
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @TenantId() orgId: string,
    @CurrentUser() user: JwtUser,
    @Query("entityType", new ParseEnumPipe(AttachmentEntityType))
    entityType: AttachmentEntityType,
    @Query("entityId") entityId: string,
    @Query("isEvidence") isEvidence?: string,
    @Query("description") description?: string,
  ): Promise<UploadResponseDto> {
    // Validate file exists
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    // Validate required parameters
    if (!entityId) {
      throw new BadRequestException("entityId is required");
    }

    const result = await this.storageService.uploadFile({
      organizationId: orgId,
      entityType,
      entityId,
      fileName: file.originalname,
      content: file.buffer,
      contentType: file.mimetype,
      uploadedById: user.id,
      isEvidence: isEvidence === "true",
      description,
    });

    return {
      attachmentId: result.attachmentId,
      url: result.url,
      size: result.size,
      fileKey: result.fileKey,
    };
  }

  /**
   * Get a signed download URL for an attachment.
   *
   * @param orgId - Organization ID from tenant context
   * @param attachmentId - Attachment UUID
   * @param expiresInMinutes - Optional: URL expiration time (default: 15)
   * @returns Signed download URL
   */
  @Get("attachments/:id/download")
  async getDownloadUrl(
    @TenantId() orgId: string,
    @Param("id") attachmentId: string,
    @Query("expiresInMinutes") expiresInMinutes?: string,
  ): Promise<DownloadUrlResponseDto> {
    const expiry = expiresInMinutes ? parseInt(expiresInMinutes, 10) : 15;

    if (isNaN(expiry) || expiry < 1 || expiry > 60) {
      throw new BadRequestException(
        "expiresInMinutes must be between 1 and 60",
      );
    }

    const url = await this.storageService.getDownloadUrl(
      orgId,
      attachmentId,
      expiry,
    );

    return {
      url,
      expiresInMinutes: expiry,
    };
  }

  /**
   * Get attachment metadata by ID.
   *
   * @param orgId - Organization ID from tenant context
   * @param attachmentId - Attachment UUID
   * @returns Attachment metadata
   */
  @Get("attachments/:id")
  async getAttachment(
    @TenantId() orgId: string,
    @Param("id") attachmentId: string,
  ): Promise<AttachmentMetadataDto> {
    const attachment = await this.storageService.getAttachment(
      orgId,
      attachmentId,
    );

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    return {
      id: attachment.id,
      organizationId: attachment.organizationId,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      description: attachment.description ?? undefined,
      isEvidence: attachment.isEvidence,
      uploadedById: attachment.uploadedById,
      createdAt: attachment.createdAt,
      updatedAt: attachment.updatedAt,
    };
  }

  /**
   * List attachments for a specific entity.
   *
   * @param orgId - Organization ID from tenant context
   * @param entityType - Type of parent entity
   * @param entityId - ID of parent entity
   * @returns List of attachments
   */
  @Get("entity/:entityType/:entityId")
  async listAttachments(
    @TenantId() orgId: string,
    @Param("entityType", new ParseEnumPipe(AttachmentEntityType))
    entityType: AttachmentEntityType,
    @Param("entityId") entityId: string,
  ): Promise<AttachmentListResponseDto> {
    const attachments = await this.storageService.listAttachments(
      orgId,
      entityType,
      entityId,
    );

    return {
      items: attachments.map((a) => ({
        id: a.id,
        organizationId: a.organizationId,
        entityType: a.entityType,
        entityId: a.entityId,
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        description: a.description ?? undefined,
        isEvidence: a.isEvidence,
        uploadedById: a.uploadedById,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      total: attachments.length,
    };
  }

  /**
   * Delete an attachment.
   *
   * @param orgId - Organization ID from tenant context
   * @param attachmentId - Attachment UUID
   * @returns Success confirmation
   */
  @Delete("attachments/:id")
  async deleteAttachment(
    @TenantId() orgId: string,
    @Param("id") attachmentId: string,
  ): Promise<{ success: boolean }> {
    await this.storageService.deleteFile(orgId, attachmentId);
    return { success: true };
  }
}
