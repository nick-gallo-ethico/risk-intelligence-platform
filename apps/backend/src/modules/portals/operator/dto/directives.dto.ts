import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { DirectiveStage } from "@prisma/client";

/**
 * DTO for creating a new client directive.
 *
 * Directives are client-specific scripts that operators read during calls.
 * They can be opening statements, category-specific guidance, or closing scripts.
 */
export class CreateDirectiveDto {
  @IsEnum(DirectiveStage)
  stage: DirectiveStage;

  /**
   * Category ID is required when stage is CATEGORY_SPECIFIC.
   * Must be a valid category within the organization.
   */
  @ValidateIf((o) => o.stage === "CATEGORY_SPECIFIC")
  @IsUUID()
  categoryId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  /**
   * If true, the directive must be read verbatim to the caller.
   * Used for legal disclaimers and compliance requirements.
   */
  @IsOptional()
  @IsBoolean()
  isReadAloud?: boolean;
}

/**
 * DTO for updating an existing directive.
 * All fields are optional for partial updates.
 */
export class UpdateDirectiveDto {
  @IsOptional()
  @IsEnum(DirectiveStage)
  stage?: DirectiveStage;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  isReadAloud?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for reordering directives.
 * Accepts an array of directive IDs in the desired order.
 */
export class ReorderDirectivesDto {
  @IsUUID("4", { each: true })
  ids: string[];
}
