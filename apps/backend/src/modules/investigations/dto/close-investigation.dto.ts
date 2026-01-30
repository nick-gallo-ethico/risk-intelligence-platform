import { IsString, IsEnum, IsOptional, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InvestigationOutcome } from "@prisma/client";

/**
 * DTO for closing an investigation.
 * Requires findings summary and outcome; closure notes are optional.
 */
export class CloseInvestigationDto {
  @ApiProperty({
    description: "Summary of investigation findings",
    minLength: 10,
    example: "Investigation determined that the reported conduct did occur...",
  })
  @IsString()
  @MinLength(10, { message: "Findings summary must be at least 10 characters" })
  findingsSummary: string;

  @ApiProperty({
    description: "Investigation outcome determination",
    enum: InvestigationOutcome,
    example: InvestigationOutcome.SUBSTANTIATED,
  })
  @IsEnum(InvestigationOutcome)
  outcome: InvestigationOutcome;

  @ApiPropertyOptional({
    description: "Additional notes about the investigation closure",
    example: "All remediation actions have been implemented and verified",
  })
  @IsString()
  @IsOptional()
  closureNotes?: string;
}
