import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsObject,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  RiuType,
  RiuSourceChannel,
  RiuReporterType,
  Severity,
} from "@prisma/client";

/**
 * DTO for creating a new Risk Intelligence Unit (RIU).
 * All fields set here become IMMUTABLE after creation - corrections go on the Case.
 */
export class CreateRiuDto {
  // Type Classification
  @ApiProperty({
    enum: RiuType,
    description: "Type of RIU (hotline_report, web_form_submission, etc.)",
  })
  @IsEnum(RiuType)
  type: RiuType;

  @ApiProperty({
    enum: RiuSourceChannel,
    description: "Channel through which the report was received",
  })
  @IsEnum(RiuSourceChannel)
  sourceChannel: RiuSourceChannel;

  // Core Content (IMMUTABLE)
  @ApiProperty({ description: "Reporter's narrative (rich text)" })
  @IsString()
  @MaxLength(50000)
  details: string;

  @ApiPropertyOptional({ description: "Brief summary of the report" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  // Reporter Information (IMMUTABLE)
  @ApiProperty({
    enum: RiuReporterType,
    description: "Type of reporter (anonymous, confidential, identified)",
  })
  @IsEnum(RiuReporterType)
  reporterType: RiuReporterType;

  @ApiPropertyOptional({
    description: "Access code for anonymous status checks",
  })
  @IsOptional()
  @IsString()
  anonymousAccessCode?: string;

  @ApiPropertyOptional({
    description: "Reporter name (encrypted if identified)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reporterName?: string;

  @ApiPropertyOptional({
    description: "Reporter email (encrypted if identified)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reporterEmail?: string;

  @ApiPropertyOptional({
    description: "Reporter phone (encrypted if identified)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reporterPhone?: string;

  // Classification (as captured at intake)
  @ApiPropertyOptional({ description: "Category ID for classification" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    enum: Severity,
    description: "Severity level",
    default: "MEDIUM",
  })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  // Location Information
  @ApiPropertyOptional({ description: "Location name" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationName?: string;

  @ApiPropertyOptional({ description: "Location address" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationAddress?: string;

  @ApiPropertyOptional({ description: "Location city" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationCity?: string;

  @ApiPropertyOptional({ description: "Location state/province" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationState?: string;

  @ApiPropertyOptional({ description: "Location postal/zip code" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  locationZip?: string;

  @ApiPropertyOptional({ description: "Location country" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationCountry?: string;

  // Campaign linkage
  @ApiPropertyOptional({
    description: "Campaign ID for disclosure/attestation responses",
  })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ description: "Campaign assignment ID" })
  @IsOptional()
  @IsUUID()
  campaignAssignmentId?: string;

  // Custom Data
  @ApiPropertyOptional({ description: "Custom fields (JSONB)" })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Form responses (JSONB)" })
  @IsOptional()
  @IsObject()
  formResponses?: Record<string, unknown>;

  // Migration Support
  @ApiPropertyOptional({ description: "Source system for migration" })
  @IsOptional()
  @IsString()
  sourceSystem?: string;

  @ApiPropertyOptional({ description: "Source record ID for migration" })
  @IsOptional()
  @IsString()
  sourceRecordId?: string;

  // Language (auto-detected at creation, can be updated later)
  @ApiPropertyOptional({ description: "Auto-detected language from content" })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  languageDetected?: string;

  @ApiPropertyOptional({ description: "Manual language override" })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  languageConfirmed?: string;

  // Demo support
  @ApiPropertyOptional({ description: "Demo user session ID" })
  @IsOptional()
  @IsUUID()
  demoUserSessionId?: string;

  @ApiPropertyOptional({
    description: "Whether this is immutable base data",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isBaseData?: boolean;
}
