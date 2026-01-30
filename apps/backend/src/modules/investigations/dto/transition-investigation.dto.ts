import { IsString, IsEnum, MinLength, MaxLength } from "class-validator";
import { InvestigationStatus } from "@prisma/client";

/**
 * DTO for transitioning investigation status.
 * Requires a rationale for audit trail purposes.
 */
export class TransitionInvestigationDto {
  @IsEnum(InvestigationStatus)
  status: InvestigationStatus;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  rationale: string;
}
