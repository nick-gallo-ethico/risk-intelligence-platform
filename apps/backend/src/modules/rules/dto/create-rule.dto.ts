import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { RuleTriggerEvent, RuleActionType } from "../types/rule.types";

/**
 * Condition block for json-rules-engine format.
 */
export class RuleConditionBlockDto {
  @IsString()
  fact!: string;

  @IsString()
  operator!: string;

  // Value can be any type (string, number, array, etc.)
  value: unknown;

  @IsOptional()
  @IsString()
  path?: string;
}

/**
 * Root conditions structure supporting all/any logic.
 */
export class RuleConditionsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionBlockDto)
  all?: RuleConditionBlockDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionBlockDto)
  any?: RuleConditionBlockDto[];
}

/**
 * Action definition with type and parameters.
 */
export class RuleActionDto {
  @IsEnum([
    "assign_user",
    "assign_team",
    "round_robin",
    "set_priority",
    "set_field",
    "send_notification",
    "add_tag",
  ] as RuleActionType[])
  type!: RuleActionType;

  @IsObject()
  params!: Record<string, unknown>;
}

/**
 * DTO for creating a new rule definition.
 */
export class CreateRuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number = 100;

  @IsEnum([
    "case.created",
    "case.updated",
    "case.status_changed",
    "investigation.created",
    "investigation.status_changed",
    "riu.released",
  ] as RuleTriggerEvent[])
  triggerEvent!: RuleTriggerEvent;

  @ValidateNested()
  @Type(() => RuleConditionsDto)
  conditions!: RuleConditionsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions!: RuleActionDto[];
}
