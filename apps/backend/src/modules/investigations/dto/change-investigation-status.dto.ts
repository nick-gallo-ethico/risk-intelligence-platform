import {
  IsEnum,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { InvestigationStatus } from "@prisma/client";

/**
 * DTO for changing investigation status.
 * Requires a rationale for audit trail purposes.
 *
 * Note: This is functionally similar to TransitionInvestigationDto but with
 * proper Swagger documentation. Consider using this for new endpoints.
 */
export class ChangeInvestigationStatusDto {
  @ApiProperty({
    description: "New status for the investigation",
    enum: InvestigationStatus,
    example: InvestigationStatus.INVESTIGATING,
  })
  @IsEnum(InvestigationStatus)
  status: InvestigationStatus;

  @ApiProperty({
    description: "Reason for the status change (required for audit trail)",
    minLength: 10,
    maxLength: 500,
    example:
      "Moving to in-progress as investigator has started gathering evidence.",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  rationale: string;
}
