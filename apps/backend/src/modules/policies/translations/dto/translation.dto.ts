import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsUUID,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TranslationReviewStatus } from "@prisma/client";

// =============================================================================
// Language Constants
// =============================================================================

/**
 * Supported languages for policy translation.
 * Maps ISO 639-1 codes to human-readable names.
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
  ko: "Korean",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
};

/**
 * Get language display name from code.
 * Returns the code itself if not found in the map.
 */
export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

/**
 * Get list of supported language codes.
 */
export function getSupportedLanguageCodes(): string[] {
  return Object.keys(LANGUAGE_NAMES);
}

// =============================================================================
// Create Translation DTO
// =============================================================================

/**
 * DTO for creating a policy translation.
 * Supports both AI-generated translations (useAI: true) and manual translations.
 */
export class CreateTranslationDto {
  @ApiProperty({
    description: "Policy version ID to translate",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("4", { message: "policyVersionId must be a valid UUID" })
  policyVersionId: string;

  @ApiProperty({
    description: "Target language code (ISO 639-1)",
    example: "es",
    minLength: 2,
    maxLength: 5,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  languageCode: string;

  @ApiPropertyOptional({
    description:
      "Use AI for translation (default: true). Set to false for manual.",
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  useAI?: boolean = true;

  @ApiPropertyOptional({
    description: "Translated content (HTML) - required if useAI is false",
    example: "<h1>Codigo de Conducta</h1><p>Esta politica describe...</p>",
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: "Translated title - required if useAI is false",
    example: "Codigo de Conducta",
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;
}

// =============================================================================
// Update Translation DTO
// =============================================================================

/**
 * DTO for updating an existing translation.
 * Used for human editing of AI-generated or manual translations.
 */
export class UpdateTranslationDto {
  @ApiPropertyOptional({
    description: "Updated translated title",
    example: "Codigo de Conducta Actualizado",
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @ApiProperty({
    description: "Updated translated content (HTML)",
    example: "<h1>Codigo de Conducta</h1><p>Contenido actualizado...</p>",
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: "Notes about the update",
    example: "Fixed terminology in section 3.2",
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  reviewNotes?: string;
}

// =============================================================================
// Review Translation DTO
// =============================================================================

/**
 * Review status options for translations.
 * Using const object for compile-time independence from Prisma.
 */
export const ReviewStatusValues = {
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  NEEDS_REVISION: "NEEDS_REVISION",
  PUBLISHED: "PUBLISHED",
} as const;

export type ReviewStatusType =
  (typeof ReviewStatusValues)[keyof typeof ReviewStatusValues];

/**
 * DTO for reviewing a translation.
 * Changes review status and optionally adds review notes.
 */
export class ReviewTranslationDto {
  @ApiProperty({
    description: "New review status",
    enum: ReviewStatusValues,
    example: "APPROVED",
  })
  @IsEnum(TranslationReviewStatus, {
    message:
      "status must be PENDING_REVIEW, APPROVED, NEEDS_REVISION, or PUBLISHED",
  })
  status: TranslationReviewStatus;

  @ApiPropertyOptional({
    description: "Review notes or feedback",
    example: "Translation approved after terminology verification",
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  reviewNotes?: string;
}

// =============================================================================
// Translation Query DTO
// =============================================================================

/**
 * DTO for querying translations with filtering and pagination.
 */
export class TranslationQueryDto {
  @ApiPropertyOptional({
    description: "Filter by policy version ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("4", { message: "policyVersionId must be a valid UUID" })
  @IsOptional()
  policyVersionId?: string;

  @ApiPropertyOptional({
    description: "Filter by language code",
    example: "es",
  })
  @IsString()
  @IsOptional()
  languageCode?: string;

  @ApiPropertyOptional({
    description: "Filter by review status",
    enum: TranslationReviewStatus,
    example: "PENDING_REVIEW",
  })
  @IsEnum(TranslationReviewStatus)
  @IsOptional()
  reviewStatus?: TranslationReviewStatus;

  @ApiPropertyOptional({
    description: "Filter by staleness (true = stale only, false = fresh only)",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  isStale?: boolean;

  @ApiPropertyOptional({
    description: "Page number (1-indexed)",
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;
}
