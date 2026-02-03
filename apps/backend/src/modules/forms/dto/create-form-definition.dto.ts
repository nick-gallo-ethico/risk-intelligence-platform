import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FormType } from '@prisma/client';

/**
 * DTO for creating a new form definition.
 */
export class CreateFormDefinitionDto {
  /**
   * Form name (unique within organization for each version).
   */
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  /**
   * Optional description of the form's purpose.
   */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /**
   * Type of form (determines where it can be used).
   */
  @IsEnum(FormType)
  formType: FormType;

  /**
   * JSON Schema definition for the form.
   */
  @IsObject()
  schema: Record<string, unknown>;

  /**
   * UI configuration (field ordering, widgets, conditionals).
   */
  @IsOptional()
  @IsObject()
  uiSchema?: Record<string, unknown>;

  /**
   * Default values for form fields.
   */
  @IsOptional()
  @IsObject()
  defaultValues?: Record<string, unknown>;

  /**
   * Whether anonymous submissions are allowed.
   */
  @IsOptional()
  @IsBoolean()
  allowAnonymous?: boolean;

  /**
   * Whether submissions require approval before processing.
   */
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  /**
   * Optional category ID for classification.
   */
  @IsOptional()
  @IsString()
  categoryId?: string;

  /**
   * Tags for organization and search.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * DTO for updating an existing form definition.
 */
export class UpdateFormDefinitionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsObject()
  schema?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  uiSchema?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  defaultValues?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  allowAnonymous?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
