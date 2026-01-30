import { IsEnum, IsOptional, IsUUID, IsDateString } from "class-validator";
import { InvestigationType, InvestigationDepartment } from "@prisma/client";

/**
 * DTO for creating a new investigation.
 * Note: caseId and organizationId are set from route params/context, not user input.
 */
export class CreateInvestigationDto {
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(InvestigationType)
  investigationType: InvestigationType;

  @IsEnum(InvestigationDepartment)
  @IsOptional()
  department?: InvestigationDepartment;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  templateId?: string;
}
