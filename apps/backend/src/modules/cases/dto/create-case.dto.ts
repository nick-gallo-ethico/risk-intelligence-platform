import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  MinLength,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  SourceChannel,
  CaseType,
  ReporterType,
  ReporterRelationship,
  Severity,
} from "@prisma/client";

/**
 * DTO for creating a new case.
 * Required fields: sourceChannel, details
 * All other fields are optional with sensible defaults.
 */
export class CreateCaseDto {
  // Intake Information
  @ApiProperty({
    description: "Source channel of the case intake",
    enum: SourceChannel,
    example: SourceChannel.HOTLINE,
  })
  @IsEnum(SourceChannel)
  sourceChannel: SourceChannel;

  @ApiPropertyOptional({
    description: "Type of case",
    enum: CaseType,
    example: CaseType.REPORT,
  })
  @IsEnum(CaseType)
  @IsOptional()
  caseType?: CaseType;

  @ApiPropertyOptional({
    description: "ID of the operator who took the intake",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsString()
  @IsOptional()
  intakeOperatorId?: string;

  @ApiPropertyOptional({
    description: "Whether this is the reporter's first call",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  firstTimeCaller?: boolean;

  @ApiPropertyOptional({
    description: "How the reporter became aware of the hotline",
    maxLength: 500,
    example: "Company intranet",
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  awarenessSource?: string;

  @ApiPropertyOptional({
    description: "Whether an interpreter was used during intake",
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  interpreterUsed?: boolean;

  // Reporter Information
  @ApiPropertyOptional({
    description: "Type of reporter",
    enum: ReporterType,
    example: ReporterType.IDENTIFIED,
  })
  @IsEnum(ReporterType)
  @IsOptional()
  reporterType?: ReporterType;

  @ApiPropertyOptional({
    description: "Whether the reporter wishes to remain anonymous",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  reporterAnonymous?: boolean;

  @ApiPropertyOptional({
    description: "Reporter's name (if not anonymous)",
    maxLength: 255,
    example: "John Doe",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reporterName?: string;

  @ApiPropertyOptional({
    description: "Reporter's email address",
    maxLength: 255,
    example: "john.doe@example.com",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reporterEmail?: string;

  @ApiPropertyOptional({
    description: "Reporter's phone number",
    maxLength: 50,
    example: "+1-555-123-4567",
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  reporterPhone?: string;

  @ApiPropertyOptional({
    description: "Reporter's relationship to the organization",
    enum: ReporterRelationship,
    example: ReporterRelationship.EMPLOYEE,
  })
  @IsEnum(ReporterRelationship)
  @IsOptional()
  reporterRelationship?: ReporterRelationship;

  @ApiPropertyOptional({
    description:
      "ID of the proxy submitter (if submitted on behalf of someone)",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsString()
  @IsOptional()
  proxySubmitterId?: string;

  // Location Information
  @ApiPropertyOptional({
    description: "Name of the location where incident occurred",
    maxLength: 255,
    example: "Downtown Office",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  locationName?: string;

  @ApiPropertyOptional({
    description: "Street address of the incident location",
    maxLength: 500,
    example: "123 Main Street",
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  locationAddress?: string;

  @ApiPropertyOptional({
    description: "City of the incident location",
    maxLength: 100,
    example: "New York",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  locationCity?: string;

  @ApiPropertyOptional({
    description: "State/province of the incident location",
    maxLength: 100,
    example: "NY",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  locationState?: string;

  @ApiPropertyOptional({
    description: "Postal/ZIP code of the incident location",
    maxLength: 20,
    example: "10001",
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  locationZip?: string;

  @ApiPropertyOptional({
    description: "Country of the incident location",
    maxLength: 100,
    example: "United States",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  locationCountry?: string;

  @ApiPropertyOptional({
    description: "Whether the location was manually entered (vs. selected)",
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  locationManual?: boolean;

  // Report Content
  @ApiProperty({
    description: "Detailed description of the incident/concern",
    minLength: 10,
    example: "I witnessed a potential conflict of interest when...",
  })
  @IsString()
  @MinLength(10)
  details: string;

  @ApiPropertyOptional({
    description: "Brief summary of the case",
    maxLength: 2000,
    example: "Potential COI involving vendor relationship",
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  summary?: string;

  @ApiPropertyOptional({
    description: "Additional information added after initial report",
    maxLength: 5000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  addendum?: string;

  @ApiPropertyOptional({
    description: "Original language of the report (ISO 639-1 code)",
    maxLength: 10,
    example: "en",
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  originalLanguage?: string;

  // Classification
  @ApiPropertyOptional({
    description: "Primary category UUID",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @IsString()
  @IsOptional()
  primaryCategoryId?: string;

  @ApiPropertyOptional({
    description: "Secondary category UUID",
    example: "550e8400-e29b-41d4-a716-446655440003",
  })
  @IsString()
  @IsOptional()
  secondaryCategoryId?: string;

  @ApiPropertyOptional({
    description: "Severity level of the case",
    enum: Severity,
    example: Severity.MEDIUM,
  })
  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @ApiPropertyOptional({
    description: "Reason for the assigned severity level",
    maxLength: 1000,
    example:
      "Medium severity due to potential policy violation without immediate harm",
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  severityReason?: string;

  @ApiPropertyOptional({
    description: "Tags for categorization",
    example: ["compliance", "vendor"],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  // Custom Data
  @ApiPropertyOptional({
    description: "Custom field values (organization-specific)",
    example: { department: "Sales", region: "Northeast" },
  })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "Custom intake questions and answers",
    example: { q1: "Yes", q2: "No comment" },
  })
  @IsObject()
  @IsOptional()
  customQuestions?: Record<string, unknown>;

  // Migration Support (for data imports)
  @ApiPropertyOptional({
    description: "Source system for migrated data",
    maxLength: 50,
    example: "NAVEX",
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  sourceSystem?: string;

  @ApiPropertyOptional({
    description: "Original record ID from source system",
    maxLength: 255,
    example: "NAVEX-12345",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  sourceRecordId?: string;
}
