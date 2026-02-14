import { IsString, IsOptional, IsUUID, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for submitting a policy for approval.
 */
export class SubmitForApprovalDto {
  @ApiPropertyOptional({
    description:
      "Optional workflow template ID (uses default if not specified)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("4", { message: "workflowTemplateId must be a valid UUID" })
  @IsOptional()
  workflowTemplateId?: string;

  @ApiPropertyOptional({
    description: "Notes for reviewers",
    maxLength: 2000,
    example: "Please review the updated harassment policy section.",
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  submissionNotes?: string;
}

/**
 * DTO for cancelling an approval workflow.
 */
export class CancelApprovalDto {
  @ApiProperty({
    description: "Reason for cancelling the approval workflow",
    maxLength: 2000,
    example: "Additional changes needed before approval.",
  })
  @IsString()
  @MaxLength(2000)
  reason: string;
}
