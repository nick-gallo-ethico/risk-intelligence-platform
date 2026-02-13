import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsInt,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Represents a single stage in a pipeline configuration.
 */
export class PipelineStageDto {
  @ApiProperty({ description: "Unique stage identifier" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Display name of the stage" })
  @IsString()
  name: string;

  @ApiProperty({ description: "Order in the pipeline (0-indexed)" })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({ description: "Color hex code for UI display" })
  @IsString()
  color: string;

  @ApiProperty({ description: "Whether this is a terminal/closed stage" })
  @IsBoolean()
  isClosed: boolean;

  @ApiProperty({
    description: "List of stage IDs this stage can transition to",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  allowedTransitions: string[];

  @ApiPropertyOptional({ description: "Optional description of the stage" })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Full pipeline configuration with all stages.
 */
export class PipelineConfigDto {
  @ApiProperty({ description: "Pipeline configuration ID" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Module type this pipeline applies to" })
  @IsString()
  moduleType: string;

  @ApiProperty({ description: "Display name of the pipeline" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Stages in this pipeline",
    type: [PipelineStageDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineStageDto)
  stages: PipelineStageDto[];

  @ApiProperty({
    description: "Whether this is the default pipeline for the module",
  })
  @IsBoolean()
  isDefault: boolean;
}

/**
 * Input DTO for updating pipeline configuration.
 */
export class UpdatePipelineDto {
  @ApiPropertyOptional({ description: "Updated pipeline name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "Updated stages array",
    type: [PipelineStageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineStageDto)
  stages?: PipelineStageDto[];
}
