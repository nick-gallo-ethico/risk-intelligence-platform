import { PartialType } from "@nestjs/swagger";
import { IsString, IsEnum, IsOptional, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CaseStatus } from "@prisma/client";
import { CreateCaseDto } from "./create-case.dto";

/**
 * DTO for updating a case.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateCaseDto extends PartialType(CreateCaseDto) {
  @ApiPropertyOptional({
    description: "Case status",
    enum: CaseStatus,
    example: CaseStatus.OPEN,
  })
  @IsEnum(CaseStatus)
  @IsOptional()
  status?: CaseStatus;

  @ApiPropertyOptional({
    description: "Reason for the status change",
    maxLength: 1000,
    example: "Case moved to investigation phase",
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  statusRationale?: string;

  // QA fields
  @ApiPropertyOptional({
    description: "QA notes from operator review",
    maxLength: 5000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  qaNotes?: string;
}
