import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";
import { WorkflowEntityType } from "@prisma/client";

/**
 * DTO for starting a new workflow instance.
 */
export class StartWorkflowDto {
  @IsEnum(WorkflowEntityType)
  entityType: WorkflowEntityType;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsOptional()
  templateId?: string;
}
