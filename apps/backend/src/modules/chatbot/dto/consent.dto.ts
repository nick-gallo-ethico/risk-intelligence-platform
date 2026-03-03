import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ConsentType } from "../entities/chatbot-consent.entity";

/**
 * DTO for recording consent.
 */
export class RecordConsentDto {
  @ApiProperty({ description: "Session ID for the chatbot conversation" })
  @IsString()
  @MaxLength(255)
  sessionId: string;

  @ApiProperty({ description: "Type of consent being recorded" })
  @IsString()
  @MaxLength(50)
  consentType: string;

  @ApiProperty({ description: "Version of the consent text" })
  @IsString()
  @MaxLength(20)
  consentVersion: string;

  @ApiProperty({ description: "Full text that was shown to the user" })
  @IsString()
  @MaxLength(5000)
  consentTextShown: string;

  @ApiProperty({ description: "Whether user accepted or declined" })
  @IsBoolean()
  consentGiven: boolean;

  @ApiPropertyOptional({ description: "IP address for audit purposes" })
  @IsString()
  @IsOptional()
  @MaxLength(45)
  ipAddress?: string;

  @ApiPropertyOptional({ description: "User agent for audit purposes" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  userAgent?: string;
}

/**
 * DTO for checking consent status.
 */
export class CheckConsentDto {
  @ApiProperty({ description: "Session ID to check" })
  @IsString()
  @MaxLength(255)
  sessionId: string;

  @ApiPropertyOptional({
    description: "Specific consent types to check",
    enum: ConsentType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(ConsentType, { each: true })
  @IsOptional()
  consentTypes?: ConsentType[];
}

/**
 * Response for consent status check.
 */
export interface ConsentStatusResponse {
  sessionId: string;
  /** Consents that have been given */
  givenConsents: string[];
  /** Whether all required consents have been given */
  allRequiredConsentsGiven: boolean;
  /** Last consent capture timestamp */
  lastConsentAt?: Date;
  /** Missing required consent types */
  missingConsents?: string[];
}

/**
 * DTO for consent configuration (stored in org settings).
 */
export class ConsentConfigDto {
  @ApiProperty({ description: "Current version of consent text" })
  @IsString()
  @MaxLength(20)
  version: string;

  @ApiProperty({ description: "Whether consent is required before chat" })
  @IsBoolean()
  requiredBeforeChat: boolean;

  @ApiProperty({
    description: "Types of consent required",
    enum: ConsentType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(ConsentType, { each: true })
  requiredTypes: ConsentType[];
}

/**
 * Response for consent log audit query.
 */
export interface ConsentLogResponse {
  id: string;
  organizationId: string;
  sessionId: string;
  consentType: string;
  consentVersion: string;
  consentTextShown: string;
  consentGiven: boolean;
  ipAddress?: string;
  userAgent?: string;
  capturedAt: Date;
}

/**
 * DTO for querying consent logs (audit).
 */
export class ConsentLogQueryDto {
  @ApiPropertyOptional({ description: "Filter by session ID" })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ description: "Filter by consent type" })
  @IsString()
  @IsOptional()
  consentType?: string;

  @ApiPropertyOptional({ description: "Start date for range" })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date for range" })
  @IsString()
  @IsOptional()
  endDate?: string;
}
