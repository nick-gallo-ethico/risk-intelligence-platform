import { IsString, IsEnum, IsOptional, MinLength } from "class-validator";
import { InvestigationOutcome } from "@prisma/client";

/**
 * DTO for closing an investigation.
 * Requires findings summary and outcome; closure notes are optional.
 */
export class CloseInvestigationDto {
  @IsString()
  @MinLength(10, { message: "Findings summary must be at least 10 characters" })
  findingsSummary: string;

  @IsEnum(InvestigationOutcome)
  outcome: InvestigationOutcome;

  @IsString()
  @IsOptional()
  closureNotes?: string;
}
