// =============================================================================
// ATTACHMENTS CONTROLLER
// =============================================================================
//
// REST API controller for file attachments. Supports uploading files to Cases,
// Investigations, and Investigation Notes with secure download via signed URLs.
//
// ENDPOINTS:
// - POST   /api/v1/attachments           - Upload file attachment
// - GET    /api/v1/attachments           - List attachments (with filters)
// - GET    /api/v1/attachments/:id       - Get single attachment
// - GET    /api/v1/attachments/:id/download - Redirect to signed download URL
// - DELETE /api/v1/attachments/:id       - Delete attachment
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { AttachmentsService } from "./attachments.service";
import {
  CreateAttachmentDto,
  AttachmentResponseDto,
  AttachmentListResponseDto,
  AttachmentQueryDto,
} from "./dto";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";

/**
 * Maximum file size allowed for uploads (50 MB)
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Allowed MIME types for attachments
 */
const ALLOWED_MIME_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/rtf",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/tiff",
  // Audio/Video
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
  "video/webm",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
];

/**
 * REST API controller for file attachments.
 * All endpoints require authentication and are scoped to user's organization.
 */
@ApiTags("Attachments")
@ApiBearerAuth("JWT")
@Controller("attachments")
@UseGuards(JwtAuthGuard, TenantGuard)
export class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name);

  constructor(private readonly attachmentsService: AttachmentsService) {}

  // -------------------------------------------------------------------------
  // POST /api/v1/attachments - Upload file
  // -------------------------------------------------------------------------

  /**
   * Uploads a file attachment to a parent entity.
   * Files are stored securely with tenant isolation.
   */
  @Post()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `File type "${file.mimetype}" is not allowed. Allowed types: PDF, Word, Excel, PowerPoint, images, audio, video, and archives.`,
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiOperation({
    summary: "Upload file attachment",
    description:
      "Uploads a file attachment to a Case, Investigation, or Investigation Note. Returns the attachment metadata with a signed download URL.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "File upload with metadata",
    schema: {
      type: "object",
      required: ["file", "entityType", "entityId"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "File to upload (max 50 MB)",
        },
        entityType: {
          type: "string",
          enum: ["CASE", "INVESTIGATION", "INVESTIGATION_NOTE"],
          description: "Type of parent entity",
        },
        entityId: {
          type: "string",
          format: "uuid",
          description: "UUID of the parent entity",
        },
        description: {
          type: "string",
          maxLength: 500,
          description: "Optional description of the attachment",
        },
        isEvidence: {
          type: "boolean",
          description: "Flag to mark as investigation evidence",
          default: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "File uploaded successfully",
    type: AttachmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid file type or validation error",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Parent entity not found" })
  @ApiResponse({ status: 413, description: "File too large" })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateAttachmentDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<AttachmentResponseDto> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    this.logger.debug(
      `User ${user.id} uploading file "${file.originalname}" to ${dto.entityType}:${dto.entityId}`,
    );

    return this.attachmentsService.create(
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      dto,
      user.id,
      organizationId,
    );
  }

  // -------------------------------------------------------------------------
  // GET /api/v1/attachments - List attachments
  // -------------------------------------------------------------------------

  /**
   * Returns paginated list of attachments with optional filters.
   */
  @Get()
  @ApiOperation({
    summary: "List attachments",
    description:
      "Returns paginated list of attachments. Filter by entityType and entityId to get attachments for a specific entity.",
  })
  @ApiResponse({
    status: 200,
    description: "List of attachments with pagination",
    type: AttachmentListResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @Query() query: AttachmentQueryDto,
    @TenantId() organizationId: string,
  ): Promise<AttachmentListResponseDto> {
    return this.attachmentsService.findAll(organizationId, query);
  }

  // -------------------------------------------------------------------------
  // GET /api/v1/attachments/:id - Get single attachment
  // -------------------------------------------------------------------------

  /**
   * Returns a single attachment by ID with download URL.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get attachment by ID",
    description:
      "Returns a single attachment with its metadata and a signed download URL.",
  })
  @ApiParam({ name: "id", description: "Attachment UUID" })
  @ApiResponse({
    status: 200,
    description: "Attachment found",
    type: AttachmentResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Attachment not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.findOne(id, organizationId);
  }

  // -------------------------------------------------------------------------
  // GET /api/v1/attachments/:id/download - Download file
  // -------------------------------------------------------------------------

  /**
   * Redirects to signed download URL for the attachment.
   * The signed URL provides time-limited secure access to the file.
   */
  @Get(":id/download")
  @ApiOperation({
    summary: "Download attachment",
    description:
      "Redirects to a signed URL for secure file download. The URL is time-limited (1 hour).",
  })
  @ApiParam({ name: "id", description: "Attachment UUID" })
  @ApiResponse({
    status: 302,
    description: "Redirect to signed download URL",
    headers: {
      Location: {
        description: "Signed URL for file download",
        schema: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Attachment not found" })
  async download(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
    @Res() res: Response,
  ): Promise<void> {
    const attachment = await this.attachmentsService.findOne(
      id,
      organizationId,
    );
    res.redirect(attachment.downloadUrl);
  }

  // -------------------------------------------------------------------------
  // DELETE /api/v1/attachments/:id - Delete attachment
  // -------------------------------------------------------------------------

  /**
   * Deletes an attachment and its file from storage.
   */
  @Delete(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete attachment",
    description: "Deletes an attachment and removes the file from storage.",
  })
  @ApiParam({ name: "id", description: "Attachment UUID" })
  @ApiResponse({ status: 204, description: "Attachment deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Attachment not found" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<void> {
    this.logger.debug(`User ${user.id} deleting attachment ${id}`);
    return this.attachmentsService.delete(id, user.id, organizationId);
  }
}
