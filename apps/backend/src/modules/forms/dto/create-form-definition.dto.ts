import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
} from "class-validator";
import { FormType } from "@prisma/client";
import { FormSchema, UiSchema } from "../types/form.types";

/**
 * DTO for creating a new form definition.
 *
 * Uses FormSchema and UiSchema types from form.types.ts for type safety.
 * class-validator's @IsObject() validates these at runtime.
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
   * Must be valid JSON Schema 7 format.
   */
  @IsObject()
  schema: FormSchema;

  /**
   * UI configuration (field ordering, widgets, conditionals).
   */
  @IsOptional()
  @IsObject()
  uiSchema?: UiSchema;

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
 *
 * Uses FormSchema and UiSchema types from form.types.ts for type safety.
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
  schema?: FormSchema;

  @IsOptional()
  @IsObject()
  uiSchema?: UiSchema;

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
