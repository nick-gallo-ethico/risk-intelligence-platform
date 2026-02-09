import { IsString, IsUUID, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CampaignType, CampaignStatus, Campaign } from "@prisma/client";

/**
 * DTO for creating a campaign translation (child campaign linked to parent).
 * Per RS.52: Full localization - content + UI with parent-child model (RS.26).
 */
export class CreateCampaignTranslationDto {
  @ApiProperty({
    description: "ID of the source (parent) campaign to translate",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  sourceCampaignId: string;

  @ApiProperty({
    description: "Target language ISO 639-1 code",
    example: "es",
  })
  @IsString()
  targetLanguage: string;

  @ApiProperty({
    description: "Translated campaign name",
    example: "Divulgación de COI Q1 2026",
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Translated campaign description",
    example:
      "Divulgación anual de conflictos de interés para todos los empleados",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "ID of the translated form template (if form-based campaign)",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  formTemplateId?: string;

  @ApiPropertyOptional({
    description: "ID of the translated disclosure form template",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @IsOptional()
  @IsUUID()
  disclosureFormTemplateId?: string;
}

/**
 * DTO for updating an existing campaign translation.
 */
export class UpdateCampaignTranslationDto {
  @ApiPropertyOptional({
    description: "Updated translated campaign name",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "Updated translated campaign description",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Updated translated form template ID",
  })
  @IsOptional()
  @IsUUID()
  formTemplateId?: string;

  @ApiPropertyOptional({
    description: "Updated translated disclosure form template ID",
  })
  @IsOptional()
  @IsUUID()
  disclosureFormTemplateId?: string;
}

/**
 * DTO representing the translation status of a single campaign translation.
 * Used for stale detection per RS.26: "stale detection: translation.masterVersion < master.currentVersion"
 */
export class TranslationStatusDto {
  @ApiProperty({
    description: "Translation campaign ID",
    example: "550e8400-e29b-41d4-a716-446655440003",
  })
  id: string;

  @ApiProperty({
    description: "Language code of this translation",
    example: "es",
  })
  language: string;

  @ApiProperty({
    description: "Campaign name in translated language",
    example: "Divulgación de COI Q1 2026",
  })
  name: string;

  @ApiProperty({
    description: "Version of parent campaign this translation was based on",
    example: 2,
  })
  basedOnVersion: number;

  @ApiProperty({
    description: "Current version of the parent campaign",
    example: 3,
  })
  currentParentVersion: number;

  @ApiProperty({
    description: "Whether this translation is stale (parent has been updated)",
    example: true,
  })
  isStale: boolean;

  @ApiPropertyOptional({
    description:
      "Fields that changed in parent since translation was created/updated",
    example: ["name", "description"],
    type: [String],
  })
  staleFields?: string[];

  @ApiProperty({
    description: "When the translation was last synchronized with parent",
  })
  lastSyncedAt: Date;

  @ApiProperty({
    description: "Translation campaign status",
    example: "DRAFT",
  })
  status: CampaignStatus;
}

/**
 * DTO representing a campaign with all its translations.
 * Used for the campaign detail view with translation management.
 */
export class CampaignWithTranslationsDto {
  @ApiProperty({
    description: "Parent campaign ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({
    description: "Campaign name (in source language)",
    example: "Q1 2026 COI Disclosure",
  })
  name: string;

  @ApiPropertyOptional({
    description: "Campaign description (in source language)",
    example: "Annual conflict of interest disclosure for all employees",
  })
  description?: string;

  @ApiProperty({
    description: "Campaign type",
    example: "DISCLOSURE",
  })
  type: CampaignType;

  @ApiProperty({
    description: "Campaign status",
    example: "DRAFT",
  })
  status: CampaignStatus;

  @ApiProperty({
    description: "Source language of the campaign",
    example: "en",
  })
  sourceLanguage: string;

  @ApiProperty({
    description: "Current version of the campaign (increments on update)",
    example: 3,
  })
  version: number;

  @ApiProperty({
    description: "All translations for this campaign",
    type: [TranslationStatusDto],
  })
  @Type(() => TranslationStatusDto)
  translations: TranslationStatusDto[];

  @ApiProperty({
    description: "List of available language codes (source + translations)",
    example: ["en", "es", "fr", "de"],
    type: [String],
  })
  availableLanguages: string[];

  @ApiProperty({
    description: "Count of stale translations requiring update",
    example: 1,
  })
  staleTranslationCount: number;
}

/**
 * DTO for employee language preference and fallback resolution.
 * Per RS.52: Employee's preferred language → org default → English
 */
export class LanguagePreferenceDto {
  @ApiProperty({
    description: "Person/Employee ID",
    example: "550e8400-e29b-41d4-a716-446655440010",
  })
  @IsUUID()
  personId: string;

  @ApiProperty({
    description: "Employee's preferred language (from profile)",
    example: "es",
  })
  @IsString()
  preferredLanguage: string;

  @ApiProperty({
    description: "Organization's default language (fallback)",
    example: "en",
  })
  @IsString()
  fallbackLanguage: string;
}

/**
 * DTO for resolving which campaign version an employee should receive.
 */
export class ResolvedCampaignLanguageDto {
  @ApiProperty({
    description: "Campaign ID that should be delivered to employee",
    example: "550e8400-e29b-41d4-a716-446655440003",
  })
  campaignId: string;

  @ApiProperty({
    description: "Language of the resolved campaign",
    example: "es",
  })
  language: string;

  @ApiProperty({
    description: "Whether this is the employee's preferred language",
    example: true,
  })
  isPreferredLanguage: boolean;

  @ApiProperty({
    description: "Resolution path: 'preferred' | 'org_default' | 'source'",
    example: "preferred",
  })
  resolutionPath: "preferred" | "org_default" | "source";
}

/**
 * DTO for stale translations dashboard/report.
 * Groups stale translations by campaign for compliance officer review.
 */
export class StaleCampaignTranslationsDto {
  @ApiProperty({
    description: "Parent campaign ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  campaignId: string;

  @ApiProperty({
    description: "Parent campaign name",
    example: "Q1 2026 COI Disclosure",
  })
  campaignName: string;

  @ApiProperty({
    description: "Campaign type",
    example: "DISCLOSURE",
  })
  type: CampaignType;

  @ApiProperty({
    description: "Languages with stale translations",
    example: ["de", "ja"],
    type: [String],
  })
  staleLanguages: string[];

  @ApiProperty({
    description: "When parent was last updated",
  })
  parentUpdatedAt: Date;

  @ApiProperty({
    description: "Current parent version",
    example: 3,
  })
  parentVersion: number;
}

/**
 * DTO for bulk stale translations report.
 */
export class StaleTranslationsReportDto {
  @ApiProperty({
    description: "Total count of campaigns with stale translations",
    example: 5,
  })
  totalCampaignsWithStale: number;

  @ApiProperty({
    description: "Total count of stale translations across all campaigns",
    example: 12,
  })
  totalStaleTranslations: number;

  @ApiProperty({
    description: "Campaigns with stale translations",
    type: [StaleCampaignTranslationsDto],
  })
  @Type(() => StaleCampaignTranslationsDto)
  campaigns: StaleCampaignTranslationsDto[];
}

/**
 * DTO for marking a translation as updated (synced with parent).
 */
export class MarkTranslationUpdatedDto {
  @ApiProperty({
    description: "Translation campaign ID to mark as updated",
    example: "550e8400-e29b-41d4-a716-446655440003",
  })
  @IsUUID()
  translationId: string;

  @ApiPropertyOptional({
    description: "Optional note about the update",
    example: "Reviewed and updated Spanish translation for form field changes",
  })
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * Internal type for language routing result.
 */
export interface LanguageRouteResult {
  /** The campaign to deliver (may be a translation) */
  campaign: Campaign;
  /** The language of the matched campaign */
  matchedLanguage: string;
  /** Whether this is a fallback (not employee's preferred) */
  wasFallback: boolean;
  /** Original campaign ID requested */
  originalCampaignId: string;
  /** The language that was requested (if fallback) */
  requestedLanguage?: string;
}
