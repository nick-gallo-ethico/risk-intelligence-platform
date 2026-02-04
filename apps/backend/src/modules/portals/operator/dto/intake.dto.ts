/**
 * Intake DTOs for Operator Console
 *
 * DTOs for hotline call intake workflow where operators create RIUs.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RiuReporterType, Severity } from "@prisma/client";
import { RiuTypeFromCall, FollowUpDisposition } from "../types/intake.types";

/**
 * DTO for creating an RIU from a hotline call.
 */
export class CreateIntakeDto {
  @ApiProperty({ description: "Client organization ID" })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    enum: RiuTypeFromCall,
    description: "Type of call: REPORT, REQUEST_FOR_INFO, or WRONG_NUMBER",
  })
  @IsEnum(RiuTypeFromCall)
  riuType: RiuTypeFromCall;

  @ApiProperty({ description: "Call content/details from reporter" })
  @IsString()
  @MaxLength(50000)
  content: string;

  @ApiPropertyOptional({ description: "Category ID if classified during call" })
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

  @ApiProperty({
    enum: RiuReporterType,
    description: "Reporter anonymity tier",
    default: "ANONYMOUS",
  })
  @IsEnum(RiuReporterType)
  anonymityTier: RiuReporterType;

  @ApiPropertyOptional({ description: "Caller phone number for callback" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  callerPhoneNumber?: string;

  @ApiPropertyOptional({ description: "Person ID if subject is identified" })
  @IsOptional()
  @IsUUID()
  subjectPersonId?: string;

  @ApiProperty({ description: "Call duration in seconds" })
  @IsInt()
  @Min(0)
  @Max(86400) // Max 24 hours
  callDuration: number;

  @ApiPropertyOptional({ description: "Flag call as urgent" })
  @IsOptional()
  @IsBoolean()
  urgencyFlag?: boolean;

  @ApiPropertyOptional({ description: "Operator notes (internal)" })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  operatorNotes?: string;

  @ApiPropertyOptional({ description: "Whether interpreter was used" })
  @IsOptional()
  @IsBoolean()
  interpreterUsed?: boolean;

  @ApiPropertyOptional({ description: "Interpreter language if used" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  interpreterLanguage?: string;

  @ApiPropertyOptional({ description: "Caller demeanor notes" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  callerDemeanor?: string;

  @ApiPropertyOptional({ description: "Whether callback was requested" })
  @IsOptional()
  @IsBoolean()
  callbackRequested?: boolean;

  // Reporter contact info (for non-anonymous)
  @ApiPropertyOptional({ description: "Reporter name (non-anonymous only)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reporterName?: string;

  @ApiPropertyOptional({ description: "Reporter email (non-anonymous only)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reporterEmail?: string;

  @ApiPropertyOptional({ description: "Reporter phone (non-anonymous only)" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reporterPhone?: string;
}

/**
 * DTO for updating an in-progress intake.
 * Only allowed before QA submission.
 */
export class UpdateIntakeDto {
  @ApiPropertyOptional({
    enum: RiuTypeFromCall,
    description: "Type of call",
  })
  @IsOptional()
  @IsEnum(RiuTypeFromCall)
  riuType?: RiuTypeFromCall;

  @ApiPropertyOptional({ description: "Call content/details" })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  content?: string;

  @ApiPropertyOptional({ description: "Category ID" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: Severity, description: "Severity level" })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @ApiPropertyOptional({ description: "Caller phone number" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  callerPhoneNumber?: string;

  @ApiPropertyOptional({ description: "Call duration in seconds" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  callDuration?: number;

  @ApiPropertyOptional({ description: "Flag call as urgent" })
  @IsOptional()
  @IsBoolean()
  urgencyFlag?: boolean;

  @ApiPropertyOptional({ description: "Operator notes" })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  operatorNotes?: string;

  @ApiPropertyOptional({ description: "Interpreter used" })
  @IsOptional()
  @IsBoolean()
  interpreterUsed?: boolean;

  @ApiPropertyOptional({ description: "Interpreter language" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  interpreterLanguage?: string;

  @ApiPropertyOptional({ description: "Caller demeanor" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  callerDemeanor?: string;

  @ApiPropertyOptional({ description: "Callback requested" })
  @IsOptional()
  @IsBoolean()
  callbackRequested?: boolean;
}

/**
 * DTO for adding a follow-up note during a callback.
 * OPER-08: Support operators handling follow-up calls.
 */
export class FollowUpNoteDto {
  @ApiProperty({ description: "Note content" })
  @IsString()
  @MaxLength(10000)
  content: string;

  @ApiProperty({ description: "Call duration in seconds" })
  @IsInt()
  @Min(0)
  @Max(86400)
  callDuration: number;

  @ApiProperty({
    enum: FollowUpDisposition,
    description: "Disposition of the follow-up call",
  })
  @IsEnum(FollowUpDisposition)
  disposition: FollowUpDisposition;
}
