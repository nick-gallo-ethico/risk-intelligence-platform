import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from "class-validator";
import { InvestigationOutcome } from "@prisma/client";

/**
 * DTO for recording investigation findings.
 * Used when submitting final findings and outcome.
 */
export class InvestigationFindingsDto {
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  findingsSummary: string;

  @IsString()
  @IsOptional()
  findingsDetail?: string;

  @IsEnum(InvestigationOutcome)
  outcome: InvestigationOutcome;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  rootCause?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  lessonsLearned?: string;
}
