import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsDate,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RiuStatus } from '@prisma/client';

/**
 * DTO for updating a Risk Intelligence Unit (RIU).
 *
 * IMPORTANT: Only mutable fields are allowed.
 * Attempts to update immutable fields will be rejected by the service.
 * RIU content (details, reporter info, etc.) is frozen at intake.
 * Corrections should go on the linked Case, not the RIU.
 */
export class UpdateRiuDto {
  // Status workflow (mutable)
  @ApiPropertyOptional({
    enum: RiuStatus,
    description: 'RIU status (PENDING_QA, IN_QA, QA_REJECTED, RELEASED, LINKED, CLOSED, RECEIVED, COMPLETED)',
  })
  @IsOptional()
  @IsEnum(RiuStatus)
  status?: RiuStatus;

  // Language handling (mutable)
  @ApiPropertyOptional({ description: 'Auto-detected language from content' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  languageDetected?: string;

  @ApiPropertyOptional({ description: 'Manual language override by user' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  languageConfirmed?: string;

  // AI Enrichment (mutable - can be regenerated)
  @ApiPropertyOptional({ description: 'AI-generated summary' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  aiSummary?: string;

  @ApiPropertyOptional({
    description: 'AI-calculated risk score (0.00 to 1.00)',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1)
  aiRiskScore?: number;

  @ApiPropertyOptional({ description: 'AI-generated translation' })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  aiTranslation?: string;

  @ApiPropertyOptional({ description: 'Language detected by AI' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  aiLanguageDetected?: string;

  @ApiPropertyOptional({ description: 'AI model version used' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  aiModelVersion?: string;

  @ApiPropertyOptional({ description: 'When AI enrichment was generated' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  aiGeneratedAt?: Date;

  @ApiPropertyOptional({
    description: 'AI confidence score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  aiConfidenceScore?: number;
}
