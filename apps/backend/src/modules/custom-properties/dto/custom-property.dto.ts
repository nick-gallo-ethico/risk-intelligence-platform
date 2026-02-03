import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
} from 'class-validator';
import {
  CustomPropertyEntityType,
  PropertyDataType,
} from '@prisma/client';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface TextValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string; // Regex pattern
}

export interface NumberValidation {
  min?: number;
  max?: number;
  decimals?: number;
}

export interface DateValidation {
  minDate?: string; // ISO date string
  maxDate?: string;
  allowFuture?: boolean;
  allowPast?: boolean;
}

export type ValidationRules = TextValidation | NumberValidation | DateValidation;

export class CreateCustomPropertyDto {
  @IsEnum(CustomPropertyEntityType)
  entityType: CustomPropertyEntityType;

  @IsString()
  name: string;

  @IsString()
  key: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PropertyDataType)
  dataType: PropertyDataType;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsOptional()
  defaultValue?: unknown;

  @IsArray()
  @IsOptional()
  options?: SelectOption[];

  @IsOptional()
  validationRules?: ValidationRules;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  groupName?: string;

  @IsString()
  @IsOptional()
  helpText?: string;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsString()
  @IsOptional()
  width?: string;
}

export class UpdateCustomPropertyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsOptional()
  defaultValue?: unknown;

  @IsArray()
  @IsOptional()
  options?: SelectOption[];

  @IsOptional()
  validationRules?: ValidationRules;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  groupName?: string;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsString()
  @IsOptional()
  helpText?: string;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsString()
  @IsOptional()
  width?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ValidateValuesDto {
  @IsEnum(CustomPropertyEntityType)
  entityType: CustomPropertyEntityType;

  values: Record<string, unknown>;
}

export class ValidationResult {
  valid: boolean;
  errors: {
    key: string;
    message: string;
  }[];
  sanitized: Record<string, unknown>;
}
