import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  Max,
  IsUUID,
  Matches,
  IsObject,
  MinLength,
  MaxLength,
} from "class-validator";
import { QaMode } from "@prisma/client";
import { Transform, Type } from "class-transformer";

/**
 * DTO for creating a new hotline number for a client.
 *
 * Phone numbers must be in E.164 format (e.g., "+18005551234").
 * Multiple hotline numbers can map to the same organization.
 */
export class CreateHotlineNumberDto {
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: "Phone number must be in E.164 format (e.g., +18005551234)",
  })
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;
}

/**
 * DTO for updating QA configuration for a client.
 *
 * QA configuration determines how incoming reports are routed for review:
 * - ALL: Every report goes through QA
 * - RISK_BASED: Only high-risk categories go to QA
 * - SAMPLE: Random percentage-based sampling
 * - NONE: No QA required, reports auto-release
 */
export class UpdateQaConfigDto {
  @IsOptional()
  @IsEnum(QaMode)
  defaultMode?: QaMode;

  /**
   * Percentage of reports to sample for QA (1-100).
   * Only used when defaultMode is SAMPLE.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  samplePercentage?: number;

  /**
   * Category IDs that always go to QA regardless of mode.
   * These are considered high-risk categories.
   */
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  highRiskCategories?: string[];

  /**
   * Keywords that trigger QA review regardless of mode (except NONE).
   * Case-insensitive matching against report content.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywordTriggers?: string[];

  /**
   * Per-category QA mode overrides.
   * Keys are category IDs, values are QaMode enum values.
   * Example: { "cat-123": "ALL", "cat-456": "NONE" }
   */
  @IsOptional()
  @IsObject()
  categoryOverrides?: Record<string, QaMode>;
}

/**
 * Query parameters for listing clients.
 */
export class ListClientsQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

/**
 * DTO for phone number lookup.
 * Supports various formats that will be normalized to E.164.
 */
export class PhoneLookupParamDto {
  /**
   * Phone number in any common format.
   * Will be normalized to E.164 format for lookup.
   *
   * Supported formats:
   * - E.164: +18005551234
   * - US with parens: (800) 555-1234
   * - US with dashes: 800-555-1234
   * - US plain: 8005551234
   */
  @IsString()
  phoneNumber: string;
}
