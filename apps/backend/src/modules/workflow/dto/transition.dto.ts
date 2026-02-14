import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
} from "class-validator";

/**
 * DTO for transitioning a workflow instance to a new stage.
 */
export class TransitionDto {
  @IsString()
  @IsNotEmpty()
  toStage: string;

  @IsBoolean()
  @IsOptional()
  validateGates?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
