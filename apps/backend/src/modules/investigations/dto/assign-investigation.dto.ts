import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  ArrayMinSize,
} from "class-validator";

/**
 * DTO for assigning investigators to an investigation.
 */
export class AssignInvestigationDto {
  @IsArray()
  @IsUUID("4", { each: true })
  @ArrayMinSize(1)
  assignedTo: string[];

  @IsUUID()
  primaryInvestigatorId: string;

  @IsBoolean()
  @IsOptional()
  notifyAssignees?: boolean = true;
}
