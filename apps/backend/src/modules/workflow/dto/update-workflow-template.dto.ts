import { PartialType } from "@nestjs/mapped-types";
import { CreateWorkflowTemplateDto } from "./create-workflow-template.dto";
import { IsBoolean, IsOptional } from "class-validator";

/**
 * DTO for updating a workflow template.
 * All fields are optional.
 */
export class UpdateWorkflowTemplateDto extends PartialType(
  CreateWorkflowTemplateDto,
) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
