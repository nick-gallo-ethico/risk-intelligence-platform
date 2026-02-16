import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsBoolean,
  ValidateNested,
  Min,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { WorkflowEntityType } from "@prisma/client";
import {
  WorkflowStep,
  StageGate,
  TransitionCondition,
  TransitionAction,
} from "../types/workflow.types";

/**
 * DTO for workflow stage definition.
 */
export class WorkflowStageDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @IsOptional()
  steps?: WorkflowStep[];

  @IsInt()
  @IsOptional()
  @Min(1)
  slaDays?: number;

  @IsArray()
  @IsOptional()
  gates?: StageGate[];

  @IsBoolean()
  @IsOptional()
  isTerminal?: boolean;
}

/**
 * DTO for workflow transition definition.
 */
export class WorkflowTransitionDto {
  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;

  @IsArray()
  @IsOptional()
  conditions?: TransitionCondition[];

  @IsArray()
  @IsOptional()
  actions?: TransitionAction[];

  @IsBoolean()
  @IsOptional()
  requiresReason?: boolean;
}

/**
 * DTO for creating a new workflow template.
 */
export class CreateWorkflowTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsEnum(WorkflowEntityType)
  entityType: WorkflowEntityType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStageDto)
  stages: WorkflowStageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTransitionDto)
  transitions: WorkflowTransitionDto[];

  @IsString()
  @IsNotEmpty()
  initialStage: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  defaultSlaDays?: number;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
