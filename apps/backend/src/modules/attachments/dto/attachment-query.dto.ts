// =============================================================================
// ATTACHMENT QUERY DTO
// =============================================================================
//
// Query parameters for listing/filtering attachments. Supports pagination
// and filtering by entity type, entity ID, and evidence flag.
// =============================================================================

import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { AttachmentEntityType } from "@prisma/client";

export class AttachmentQueryDto {
  @ApiPropertyOptional({
    description: "Filter by entity type",
    enum: AttachmentEntityType,
  })
  @IsOptional()
  @IsEnum(AttachmentEntityType)
  entityType?: AttachmentEntityType;

  @ApiPropertyOptional({
    description: "Filter by entity ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: "Filter by evidence flag",
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  isEvidence?: boolean;

  @ApiPropertyOptional({
    description: "Page number",
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
