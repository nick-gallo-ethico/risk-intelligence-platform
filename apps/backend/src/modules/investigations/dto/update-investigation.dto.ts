import { PartialType } from "@nestjs/mapped-types";
import { IsString, IsEnum, IsOptional, MaxLength } from "class-validator";
import { InvestigationStatus, InvestigationOutcome } from "@prisma/client";
import { CreateInvestigationDto } from "./create-investigation.dto";

/**
 * DTO for updating an investigation.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateInvestigationDto extends PartialType(
  CreateInvestigationDto,
) {
  @IsEnum(InvestigationStatus)
  @IsOptional()
  status?: InvestigationStatus;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  statusRationale?: string;

  // Findings fields
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  findingsSummary?: string;

  @IsString()
  @IsOptional()
  findingsDetail?: string;

  @IsEnum(InvestigationOutcome)
  @IsOptional()
  outcome?: InvestigationOutcome;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  rootCause?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  lessonsLearned?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  closureNotes?: string;
}
