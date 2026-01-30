import { IsEnum, IsOptional, IsUUID, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InvestigationType, InvestigationDepartment } from "@prisma/client";

/**
 * DTO for creating a new investigation.
 * Note: caseId and organizationId are set from route params/context, not user input.
 */
export class CreateInvestigationDto {
  @ApiPropertyOptional({
    description: "Category UUID for the investigation",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    description: "Type of investigation",
    enum: InvestigationType,
    example: InvestigationType.FULL,
  })
  @IsEnum(InvestigationType)
  investigationType: InvestigationType;

  @ApiPropertyOptional({
    description: "Department responsible for the investigation",
    enum: InvestigationDepartment,
    example: InvestigationDepartment.COMPLIANCE,
  })
  @IsEnum(InvestigationDepartment)
  @IsOptional()
  department?: InvestigationDepartment;

  @ApiPropertyOptional({
    description: "Due date for investigation completion (ISO 8601)",
    example: "2026-02-28",
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    description: "Template UUID to use for investigation checklist",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsUUID()
  @IsOptional()
  templateId?: string;
}
