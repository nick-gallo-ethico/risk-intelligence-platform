import { PartialType } from "@nestjs/swagger";
import { IsString, IsEnum, IsOptional, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { InvestigationStatus, InvestigationOutcome } from "@prisma/client";
import { CreateInvestigationDto } from "./create-investigation.dto";

/**
 * DTO for updating an investigation.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateInvestigationDto extends PartialType(
  CreateInvestigationDto,
) {
  @ApiPropertyOptional({
    description: "Investigation status",
    enum: InvestigationStatus,
    example: InvestigationStatus.INVESTIGATING,
  })
  @IsEnum(InvestigationStatus)
  @IsOptional()
  status?: InvestigationStatus;

  @ApiPropertyOptional({
    description: "Reason for the status change",
    maxLength: 1000,
    example: "Investigation started with initial interviews",
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  statusRationale?: string;

  // Findings fields
  @ApiPropertyOptional({
    description: "Summary of investigation findings",
    maxLength: 5000,
    example: "Initial review indicates policy violation occurred...",
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  findingsSummary?: string;

  @ApiPropertyOptional({
    description: "Detailed findings documentation",
    example: "Detailed analysis of the evidence collected...",
  })
  @IsString()
  @IsOptional()
  findingsDetail?: string;

  @ApiPropertyOptional({
    description: "Investigation outcome",
    enum: InvestigationOutcome,
    example: InvestigationOutcome.SUBSTANTIATED,
  })
  @IsEnum(InvestigationOutcome)
  @IsOptional()
  outcome?: InvestigationOutcome;

  @ApiPropertyOptional({
    description: "Root cause analysis",
    maxLength: 5000,
    example: "Lack of proper oversight in the vendor selection process",
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  rootCause?: string;

  @ApiPropertyOptional({
    description: "Lessons learned from the investigation",
    maxLength: 5000,
    example: "Need to implement additional controls for vendor relationships",
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  lessonsLearned?: string;

  @ApiPropertyOptional({
    description: "Notes about investigation closure",
    maxLength: 5000,
    example: "All remediation actions have been completed",
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  closureNotes?: string;
}
