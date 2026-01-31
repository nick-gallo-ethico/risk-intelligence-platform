// =============================================================================
// ATTACHMENT RESPONSE DTO
// =============================================================================
//
// Output DTO for attachment responses. Includes file metadata, uploader info,
// and a signed download URL for secure access.
//
// KEY NOTES:
// - downloadUrl: Time-limited signed URL for secure download
// - uploadedBy: Denormalized user info for display efficiency
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AttachmentEntityType } from "@prisma/client";

/**
 * User summary for attachment uploader
 */
export class AttachmentUploaderDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "John Doe" })
  name: string;

  @ApiProperty({ example: "john.doe@example.com" })
  email: string;
}

/**
 * Full attachment response with all metadata and download URL
 */
export class AttachmentResponseDto {
  @ApiProperty({
    description: "Attachment UUID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({
    description: "Organization ID (tenant)",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  organizationId: string;

  @ApiProperty({
    description: "Type of parent entity",
    enum: AttachmentEntityType,
    example: AttachmentEntityType.CASE,
  })
  entityType: AttachmentEntityType;

  @ApiProperty({
    description: "UUID of the parent entity",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  entityId: string;

  @ApiProperty({
    description: "Original filename",
    example: "complaint-form.pdf",
  })
  fileName: string;

  @ApiProperty({
    description: "MIME type of the file",
    example: "application/pdf",
  })
  mimeType: string;

  @ApiProperty({
    description: "File size in bytes",
    example: 1048576,
  })
  fileSize: number;

  @ApiProperty({
    description: "User who uploaded this file",
    type: AttachmentUploaderDto,
  })
  uploadedBy: AttachmentUploaderDto;

  @ApiPropertyOptional({
    description: "User-provided description",
    example: "Signed complaint form from reporter",
  })
  description?: string;

  @ApiProperty({
    description: "Whether this attachment is marked as investigation evidence",
    example: false,
  })
  isEvidence: boolean;

  @ApiProperty({
    description: "Signed URL for secure download (time-limited)",
    example: "https://storage.example.com/tenant-123/files/abc.pdf?sig=...",
  })
  downloadUrl: string;

  @ApiProperty({
    description: "When the attachment was created",
    example: "2026-01-30T12:00:00Z",
  })
  createdAt: Date;
}

/**
 * Paginated list response for attachments
 */
export class AttachmentListResponseDto {
  @ApiProperty({ type: [AttachmentResponseDto] })
  items: AttachmentResponseDto[];

  @ApiProperty({
    description: "Pagination metadata",
    example: { page: 1, limit: 20, total: 100, totalPages: 5 },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
