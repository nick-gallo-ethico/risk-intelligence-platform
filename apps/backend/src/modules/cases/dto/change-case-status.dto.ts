import {
  IsEnum,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { CaseStatus } from "@prisma/client";

/**
 * DTO for changing case status.
 * Requires a rationale for audit trail purposes.
 */
export class ChangeCaseStatusDto {
  @ApiProperty({
    description: "New status for the case",
    enum: CaseStatus,
    example: CaseStatus.OPEN,
  })
  @IsEnum(CaseStatus)
  status: CaseStatus;

  @ApiProperty({
    description: "Reason for the status change (required for audit trail)",
    minLength: 10,
    maxLength: 500,
    example:
      "Moving to in-progress as initial triage is complete and investigation assigned.",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  rationale: string;
}
