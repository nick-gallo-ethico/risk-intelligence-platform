/**
 * Ethics Portal DTOs
 *
 * Data Transfer Objects for Ethics Portal public API.
 * These DTOs are used for report submission, attachment handling,
 * and anonymous messaging.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
  MinLength,
  Length,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RiuReporterType } from "@prisma/client";

/**
 * DTO for submitting a new report via Ethics Portal.
 */
export class SubmitReportDto {
  @ApiProperty({ description: "Category UUID for the report" })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: "Report content/narrative", maxLength: 50000 })
  @IsString()
  @MinLength(10, { message: "Report must be at least 10 characters long" })
  @MaxLength(50000)
  content: string;

  @ApiProperty({
    enum: RiuReporterType,
    description: "Anonymity tier: ANONYMOUS, CONFIDENTIAL, or OPEN",
  })
  @IsEnum(RiuReporterType)
  anonymityTier: RiuReporterType;

  @ApiPropertyOptional({
    description:
      "Reporter contact information (required for CONFIDENTIAL/OPEN)",
  })
  @IsOptional()
  @IsObject()
  reporterContact?: {
    name?: string;
    email?: string;
    phone?: string;
    preferredContactMethod?: "email" | "phone";
  };

  @ApiPropertyOptional({
    description: "Temporary attachment IDs from prior upload calls",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];

  @ApiPropertyOptional({
    description: "Demographic information for the report",
  })
  @IsOptional()
  @IsObject()
  demographics?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "Form responses from category-specific form",
  })
  @IsOptional()
  @IsObject()
  formResponses?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Mark report as urgent" })
  @IsOptional()
  @IsBoolean()
  urgencyFlag?: boolean;

  @ApiPropertyOptional({ description: "Optional summary of the report" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @ApiPropertyOptional({ description: "Location where incident occurred" })
  @IsOptional()
  @IsObject()
  incidentLocation?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

/**
 * DTO for attachment upload metadata.
 */
export class AttachmentUploadDto {
  @ApiPropertyOptional({
    description: "Mark file as containing sensitive information",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;
}

/**
 * DTO for saving a draft report.
 */
export class SaveDraftDto {
  @ApiPropertyOptional({ description: "Category UUID" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: "Report content" })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  content?: string;

  @ApiPropertyOptional({
    enum: RiuReporterType,
    description: "Anonymity tier",
  })
  @IsOptional()
  @IsEnum(RiuReporterType)
  anonymityTier?: RiuReporterType;

  @ApiPropertyOptional({ description: "Demographics" })
  @IsOptional()
  @IsObject()
  demographics?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Form responses" })
  @IsOptional()
  @IsObject()
  formResponses?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Attachment IDs" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}

/**
 * DTO for access code validation.
 */
export class AccessCodeParamDto {
  @ApiProperty({
    description: "12-character access code",
    example: "A2B3C4D5E6F7",
  })
  @IsString()
  @Length(12, 20)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: "Access code must contain only letters and numbers",
  })
  code: string;
}

/**
 * DTO for tenant slug parameter.
 */
export class TenantSlugParamDto {
  @ApiProperty({
    description: "Organization slug",
    example: "acme-corp",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      "Tenant slug must contain only lowercase letters, numbers, and hyphens",
  })
  tenantSlug: string;
}

/**
 * DTO for sending a message via access code.
 */
export class SendMessageDto {
  @ApiProperty({
    description: "Message content",
    maxLength: 10000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({ description: "Attachment IDs to include" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}

/**
 * DTO for draft code parameter.
 */
export class DraftCodeParamDto {
  @ApiProperty({
    description: "Draft code for resume",
    example: "DRAFT-ABC123XYZ",
  })
  @IsString()
  @MinLength(10)
  @MaxLength(50)
  draftCode: string;
}

/**
 * DTO for category ID parameter.
 */
export class CategoryIdParamDto {
  @ApiProperty({ description: "Category UUID" })
  @IsUUID()
  categoryId: string;
}
