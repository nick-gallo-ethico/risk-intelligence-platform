import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InvestigationOutcome } from "@prisma/client";

/**
 * DTO for recording investigation findings.
 * Used when submitting final findings and outcome.
 */
export class InvestigationFindingsDto {
  @ApiProperty({
    description: "Summary of investigation findings",
    minLength: 10,
    maxLength: 5000,
    example:
      "Evidence gathered indicates that the reported policy violation did occur...",
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  findingsSummary: string;

  @ApiPropertyOptional({
    description: "Detailed findings documentation",
    example:
      "Comprehensive analysis of all evidence collected during the investigation...",
  })
  @IsString()
  @IsOptional()
  findingsDetail?: string;

  @ApiProperty({
    description: "Investigation outcome determination",
    enum: InvestigationOutcome,
    example: InvestigationOutcome.SUBSTANTIATED,
  })
  @IsEnum(InvestigationOutcome)
  outcome: InvestigationOutcome;

  @ApiPropertyOptional({
    description: "Root cause analysis of the issue",
    maxLength: 5000,
    example:
      "The root cause was insufficient oversight in the procurement process",
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  rootCause?: string;

  @ApiPropertyOptional({
    description: "Lessons learned from the investigation",
    maxLength: 5000,
    example:
      "Need to implement additional training and controls for vendor management",
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  lessonsLearned?: string;
}
