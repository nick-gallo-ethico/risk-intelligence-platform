// =============================================================================
// CREATE ATTACHMENT DTO
// =============================================================================
//
// Input DTO for creating file attachments. The file itself comes from
// multipart upload (Express.Multer.File), not from this DTO.
//
// KEY NOTES:
// - entityType: Which entity this attachment belongs to (CASE, INVESTIGATION, etc.)
// - entityId: UUID of the parent entity
// - description: Optional user-provided description
// - isEvidence: Flag for investigation evidence marking
// =============================================================================

import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AttachmentEntityType } from "@prisma/client";

export class CreateAttachmentDto {
  @ApiProperty({
    description: "Type of entity this attachment belongs to",
    enum: AttachmentEntityType,
    example: AttachmentEntityType.CASE,
  })
  @IsEnum(AttachmentEntityType)
  entityType: AttachmentEntityType;

  @ApiProperty({
    description: "UUID of the parent entity",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  entityId: string;

  @ApiPropertyOptional({
    description: "User-provided description of the attachment",
    example: "Signed complaint form from reporter",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: "Flag to mark this attachment as investigation evidence",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isEvidence?: boolean;
}
