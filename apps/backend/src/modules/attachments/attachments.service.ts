// =============================================================================
// ATTACHMENTS SERVICE
// =============================================================================
//
// Service for managing file attachments across multiple entity types (Cases,
// Investigations, Investigation Notes). Handles file storage, metadata tracking,
// and secure download URLs.
//
// KEY REQUIREMENTS:
// 1. All queries filter by organizationId (tenant isolation)
// 2. All mutations log to ActivityService
// 3. Entity validation before attachment creation
// 4. Secure signed URLs for downloads
// =============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../../common/services/storage.service";
import { ActivityService } from "../../common/services/activity.service";
import {
  CreateAttachmentDto,
  AttachmentResponseDto,
  AttachmentQueryDto,
  AttachmentListResponseDto,
} from "./dto";
import {
  Attachment,
  AttachmentEntityType,
  AuditEntityType,
  Prisma,
} from "@prisma/client";
import { FileInput } from "../../common/services/storage.interface";

/**
 * Service for managing file attachments.
 * All queries are scoped to the user's organization via RLS + explicit filters.
 */
@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  /** Default URL expiration time in seconds (1 hour) */
  private readonly URL_EXPIRATION_SECONDS = 3600;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly activityService: ActivityService,
  ) {}

  // -------------------------------------------------------------------------
  // CREATE - Upload file and create attachment record
  // -------------------------------------------------------------------------

  /**
   * Creates a new attachment by uploading file to storage and creating DB record.
   *
   * @param file - File input from multipart upload
   * @param dto - Attachment metadata (entityType, entityId, description, isEvidence)
   * @param userId - ID of user uploading the file
   * @param organizationId - Organization ID (from JWT)
   * @returns Created attachment with download URL
   * @throws NotFoundException if parent entity doesn't exist
   * @throws BadRequestException if file upload fails
   */
  async create(
    file: FileInput,
    dto: CreateAttachmentDto,
    userId: string,
    organizationId: string,
  ): Promise<AttachmentResponseDto> {
    this.logger.debug(
      `Creating attachment for ${dto.entityType}:${dto.entityId} in org ${organizationId}`,
    );

    // 1. Validate parent entity exists and belongs to org
    const entityInfo = await this.validateEntityExists(
      dto.entityType,
      dto.entityId,
      organizationId,
    );

    // 2. Upload file to storage
    const uploadResult = await this.storageService.upload(
      file,
      organizationId,
      {
        subdirectory: this.getStorageFolder(dto.entityType, dto.entityId),
      },
    );

    // 3. Create attachment record
    const attachment = await this.prisma.attachment.create({
      data: {
        organizationId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        fileName: file.originalname,
        fileKey: uploadResult.key,
        mimeType: file.mimetype,
        fileSize: file.size,
        description: dto.description,
        isEvidence: dto.isEvidence ?? false,
        uploadedById: userId,
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // 4. Log activity
    await this.activityService.log({
      entityType: AuditEntityType.ATTACHMENT,
      entityId: attachment.id,
      action: "created",
      actionDescription: `Uploaded attachment "${file.originalname}" to ${this.formatEntityType(dto.entityType)} ${entityInfo.identifier}`,
      actorUserId: userId,
      organizationId,
      metadata: {
        parentEntityType: dto.entityType,
        parentEntityId: dto.entityId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });

    // 5. Also log on the parent entity for its timeline
    await this.activityService.log({
      entityType: this.mapToAuditEntityType(dto.entityType),
      entityId: dto.entityId,
      action: "attachment_added",
      actionDescription: `Attachment "${file.originalname}" was added`,
      actorUserId: userId,
      organizationId,
      metadata: {
        attachmentId: attachment.id,
        fileName: file.originalname,
      },
    });

    // 6. Generate signed URL and return response
    const downloadUrl = await this.storageService.getSignedUrl(
      uploadResult.key,
      this.URL_EXPIRATION_SECONDS,
    );

    return this.mapToResponseDto(attachment, downloadUrl);
  }

  // -------------------------------------------------------------------------
  // FIND BY ENTITY - List attachments for a specific entity
  // -------------------------------------------------------------------------

  /**
   * Returns paginated list of attachments for a specific entity.
   *
   * @param entityType - Type of parent entity
   * @param entityId - ID of parent entity
   * @param organizationId - Organization ID (from JWT)
   * @param query - Pagination and filter options
   * @returns Paginated attachment list
   */
  async findByEntity(
    entityType: AttachmentEntityType,
    entityId: string,
    organizationId: string,
    query?: Pick<AttachmentQueryDto, "page" | "limit" | "isEvidence">,
  ): Promise<AttachmentListResponseDto> {
    const { page = 1, limit = 20, isEvidence } = query || {};
    const skip = (page - 1) * limit;

    // Build where clause - ALWAYS includes organizationId
    const where: Prisma.AttachmentWhereInput = {
      organizationId, // CRITICAL: Tenant isolation
      entityType,
      entityId,
    };

    if (isEvidence !== undefined) {
      where.isEvidence = isEvidence;
    }

    // Parallel query for data and count
    const [items, total] = await Promise.all([
      this.prisma.attachment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.attachment.count({ where }),
    ]);

    // Generate signed URLs for all attachments
    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        const downloadUrl = await this.storageService.getSignedUrl(
          item.fileKey,
          this.URL_EXPIRATION_SECONDS,
        );
        return this.mapToResponseDto(item, downloadUrl);
      }),
    );

    return {
      items: itemsWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -------------------------------------------------------------------------
  // FIND ALL - List attachments with flexible filters
  // -------------------------------------------------------------------------

  /**
   * Returns paginated list of attachments with optional filters.
   *
   * @param organizationId - Organization ID (from JWT)
   * @param query - Query filters and pagination
   * @returns Paginated attachment list
   */
  async findAll(
    organizationId: string,
    query?: AttachmentQueryDto,
  ): Promise<AttachmentListResponseDto> {
    const {
      page = 1,
      limit = 20,
      entityType,
      entityId,
      isEvidence,
    } = query || {};
    const skip = (page - 1) * limit;

    // Build where clause - ALWAYS includes organizationId
    const where: Prisma.AttachmentWhereInput = {
      organizationId, // CRITICAL: Tenant isolation
    };

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (isEvidence !== undefined) {
      where.isEvidence = isEvidence;
    }

    // Parallel query for data and count
    const [items, total] = await Promise.all([
      this.prisma.attachment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.attachment.count({ where }),
    ]);

    // Generate signed URLs for all attachments
    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        const downloadUrl = await this.storageService.getSignedUrl(
          item.fileKey,
          this.URL_EXPIRATION_SECONDS,
        );
        return this.mapToResponseDto(item, downloadUrl);
      }),
    );

    return {
      items: itemsWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -------------------------------------------------------------------------
  // FIND ONE - Get single attachment by ID
  // -------------------------------------------------------------------------

  /**
   * Returns a single attachment by ID.
   * Throws NotFoundException if not found or belongs to different org.
   *
   * @param id - Attachment UUID
   * @param organizationId - Organization ID (from JWT)
   * @returns Attachment with download URL
   * @throws NotFoundException if attachment doesn't exist
   */
  async findOne(
    id: string,
    organizationId: string,
  ): Promise<AttachmentResponseDto> {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id,
        organizationId, // CRITICAL: Tenant isolation - prevent cross-tenant access
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Return 404 for both "not found" AND "wrong org" to prevent enumeration
    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    const downloadUrl = await this.storageService.getSignedUrl(
      attachment.fileKey,
      this.URL_EXPIRATION_SECONDS,
    );

    return this.mapToResponseDto(attachment, downloadUrl);
  }

  // -------------------------------------------------------------------------
  // DELETE - Remove attachment and file from storage
  // -------------------------------------------------------------------------

  /**
   * Deletes an attachment: removes file from storage and record from DB.
   *
   * @param id - Attachment UUID
   * @param userId - ID of user performing deletion
   * @param organizationId - Organization ID (from JWT)
   * @throws NotFoundException if attachment doesn't exist
   */
  async delete(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    // 1. Find attachment and verify ownership
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id,
        organizationId, // CRITICAL: Tenant isolation
      },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    // 2. Delete file from storage
    try {
      await this.storageService.delete(attachment.fileKey);
    } catch (error) {
      // Log but don't fail - file might already be deleted
      this.logger.warn(
        `Failed to delete file from storage: ${attachment.fileKey}`,
        error,
      );
    }

    // 3. Delete attachment record
    await this.prisma.attachment.delete({
      where: { id },
    });

    // 4. Log activity on attachment
    await this.activityService.log({
      entityType: AuditEntityType.ATTACHMENT,
      entityId: id,
      action: "deleted",
      actionDescription: `Deleted attachment "${attachment.fileName}"`,
      actorUserId: userId,
      organizationId,
      metadata: {
        parentEntityType: attachment.entityType,
        parentEntityId: attachment.entityId,
        fileName: attachment.fileName,
      },
    });

    // 5. Log on parent entity for its timeline
    await this.activityService.log({
      entityType: this.mapToAuditEntityType(attachment.entityType),
      entityId: attachment.entityId,
      action: "attachment_removed",
      actionDescription: `Attachment "${attachment.fileName}" was removed`,
      actorUserId: userId,
      organizationId,
      metadata: {
        attachmentId: id,
        fileName: attachment.fileName,
      },
    });

    this.logger.log(
      `Deleted attachment ${id} (${attachment.fileName}) from ${attachment.entityType}:${attachment.entityId}`,
    );
  }

  // -------------------------------------------------------------------------
  // HELPERS - Entity validation
  // -------------------------------------------------------------------------

  /**
   * Validates that the parent entity exists and belongs to the organization.
   * Returns entity info for activity logging.
   */
  private async validateEntityExists(
    entityType: AttachmentEntityType,
    entityId: string,
    organizationId: string,
  ): Promise<{ identifier: string }> {
    switch (entityType) {
      case AttachmentEntityType.CASE: {
        const caseRecord = await this.prisma.case.findFirst({
          where: { id: entityId, organizationId },
          select: { id: true, referenceNumber: true },
        });
        if (!caseRecord) {
          throw new NotFoundException("Case not found");
        }
        return { identifier: caseRecord.referenceNumber };
      }

      case AttachmentEntityType.INVESTIGATION: {
        const investigation = await this.prisma.investigation.findFirst({
          where: { id: entityId, organizationId },
          select: { id: true, investigationNumber: true },
        });
        if (!investigation) {
          throw new NotFoundException("Investigation not found");
        }
        return { identifier: `#${investigation.investigationNumber}` };
      }

      case AttachmentEntityType.INVESTIGATION_NOTE: {
        const note = await this.prisma.investigationNote.findFirst({
          where: { id: entityId, organizationId },
          select: { id: true },
        });
        if (!note) {
          throw new NotFoundException("Investigation note not found");
        }
        return { identifier: note.id.slice(0, 8) }; // Short ID for logging
      }

      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Gets entity identifier for activity logging (doesn't throw on not found).
   */
  private async getEntityIdentifier(
    entityType: AttachmentEntityType,
    entityId: string,
    organizationId: string,
  ): Promise<string> {
    try {
      const info = await this.validateEntityExists(
        entityType,
        entityId,
        organizationId,
      );
      return info.identifier;
    } catch {
      return entityId.slice(0, 8); // Fallback to short ID
    }
  }

  // -------------------------------------------------------------------------
  // HELPERS - Storage organization
  // -------------------------------------------------------------------------

  /**
   * Generates storage folder path for organizing files by entity.
   */
  private getStorageFolder(
    entityType: AttachmentEntityType,
    entityId: string,
  ): string {
    const typeFolder = entityType.toLowerCase().replace("_", "-");
    return `${typeFolder}/${entityId}`;
  }

  // -------------------------------------------------------------------------
  // HELPERS - Type mapping
  // -------------------------------------------------------------------------

  /**
   * Maps AttachmentEntityType to AuditEntityType for activity logging.
   */
  private mapToAuditEntityType(
    entityType: AttachmentEntityType,
  ): AuditEntityType {
    switch (entityType) {
      case AttachmentEntityType.CASE:
        return AuditEntityType.CASE;
      case AttachmentEntityType.INVESTIGATION:
        return AuditEntityType.INVESTIGATION;
      case AttachmentEntityType.INVESTIGATION_NOTE:
        // Notes don't have their own audit type, log to investigation
        return AuditEntityType.INVESTIGATION;
      default:
        return AuditEntityType.ATTACHMENT;
    }
  }

  /**
   * Formats entity type for human-readable descriptions.
   */
  private formatEntityType(entityType: AttachmentEntityType): string {
    switch (entityType) {
      case AttachmentEntityType.CASE:
        return "Case";
      case AttachmentEntityType.INVESTIGATION:
        return "Investigation";
      case AttachmentEntityType.INVESTIGATION_NOTE:
        return "Investigation Note";
      default:
        return entityType;
    }
  }

  // -------------------------------------------------------------------------
  // HELPERS - Response mapping
  // -------------------------------------------------------------------------

  /**
   * Maps Prisma attachment model to response DTO.
   */
  private mapToResponseDto(
    attachment: Attachment & {
      uploadedBy: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    },
    downloadUrl: string,
  ): AttachmentResponseDto {
    return {
      id: attachment.id,
      organizationId: attachment.organizationId,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      uploadedBy: {
        id: attachment.uploadedBy.id,
        name: `${attachment.uploadedBy.firstName} ${attachment.uploadedBy.lastName}`.trim(),
        email: attachment.uploadedBy.email,
      },
      description: attachment.description ?? undefined,
      isEvidence: attachment.isEvidence,
      downloadUrl,
      createdAt: attachment.createdAt,
    };
  }
}
