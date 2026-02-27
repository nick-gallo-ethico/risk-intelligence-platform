import { PartialType } from "@nestjs/mapped-types";
import { IsOptional, IsBoolean } from "class-validator";
import { CreateRuleDto } from "./create-rule.dto";

/**
 * DTO for updating an existing rule definition.
 * All fields are optional. Includes isActive for activation/deactivation.
 */
export class UpdateRuleDto extends PartialType(CreateRuleDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
