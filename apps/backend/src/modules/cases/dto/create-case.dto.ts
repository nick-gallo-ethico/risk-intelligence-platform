import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  MinLength,
  IsObject,
} from 'class-validator';
import {
  SourceChannel,
  CaseType,
  ReporterType,
  ReporterRelationship,
  Severity,
} from '@prisma/client';

/**
 * DTO for creating a new case.
 * Required fields: sourceChannel, details
 * All other fields are optional with sensible defaults.
 */
export class CreateCaseDto {
  // Intake Information
  @IsEnum(SourceChannel)
  sourceChannel: SourceChannel;

  @IsEnum(CaseType)
  @IsOptional()
  caseType?: CaseType;

  @IsString()
  @IsOptional()
  intakeOperatorId?: string;

  @IsBoolean()
  @IsOptional()
  firstTimeCaller?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  awarenessSource?: string;

  @IsBoolean()
  @IsOptional()
  interpreterUsed?: boolean;

  // Reporter Information
  @IsEnum(ReporterType)
  @IsOptional()
  reporterType?: ReporterType;

  @IsBoolean()
  @IsOptional()
  reporterAnonymous?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  reporterName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  reporterEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  reporterPhone?: string;

  @IsEnum(ReporterRelationship)
  @IsOptional()
  reporterRelationship?: ReporterRelationship;

  @IsString()
  @IsOptional()
  proxySubmitterId?: string;

  // Location Information
  @IsString()
  @IsOptional()
  @MaxLength(255)
  locationName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  locationAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  locationCity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  locationState?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  locationZip?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  locationCountry?: string;

  @IsBoolean()
  @IsOptional()
  locationManual?: boolean;

  // Report Content
  @IsString()
  @MinLength(10)
  details: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  summary?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  addendum?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  originalLanguage?: string;

  // Classification
  @IsString()
  @IsOptional()
  primaryCategoryId?: string;

  @IsString()
  @IsOptional()
  secondaryCategoryId?: string;

  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  severityReason?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  // Custom Data
  @IsObject()
  @IsOptional()
  customFields?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  customQuestions?: Record<string, unknown>;

  // Migration Support (for data imports)
  @IsString()
  @IsOptional()
  @MaxLength(50)
  sourceSystem?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  sourceRecordId?: string;
}
