import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  ArrayMinSize,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for assigning investigators to an investigation.
 */
export class AssignInvestigationDto {
  @ApiProperty({
    description: "UUIDs of users to assign as investigators",
    example: ["550e8400-e29b-41d4-a716-446655440000"],
    minItems: 1,
  })
  @IsArray()
  @IsUUID("4", { each: true })
  @ArrayMinSize(1)
  assignedTo: string[];

  @ApiProperty({
    description:
      "UUID of the primary investigator (must be in assignedTo list)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  primaryInvestigatorId: string;

  @ApiPropertyOptional({
    description: "Whether to send notification emails to assignees",
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  notifyAssignees?: boolean = true;
}
