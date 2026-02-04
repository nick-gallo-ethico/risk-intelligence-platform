/**
 * DTOs for Disclosure Form Template CRUD operations.
 * Provides validation for form template creation, update, and querying.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsObject,
  MinLength,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  FormField,
  FormSection,
  CalculatedField,
  ValidationRule,
} from '../entities/form-field.types';

// ===========================================
// Enums (matching Prisma enums)
// ===========================================

/**
 * Disclosure form types matching Prisma DisclosureFormType enum.
 */
export enum DisclosureFormTypeDto {
  COI = 'COI',
  GIFT = 'GIFT',
  OUTSIDE_EMPLOYMENT = 'OUTSIDE_EMPLOYMENT',
  ATTESTATION = 'ATTESTATION',
  POLITICAL = 'POLITICAL',
  CHARITABLE = 'CHARITABLE',
  TRAVEL = 'TRAVEL',
  CUSTOM = 'CUSTOM',
}

/**
 * Form template status matching Prisma FormTemplateStatus enum.
 */
export enum FormTemplateStatusDto {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

// ===========================================
// Create/Update DTOs
// ===========================================

/**
 * DTO for creating a new disclosure form template.
 */
export class CreateFormTemplateDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(DisclosureFormTypeDto)
  disclosureType: DisclosureFormTypeDto;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string = 'en';

  @IsOptional()
  @IsUUID()
  parentTemplateId?: string;

  @IsArray()
  fields: FormField[];

  @IsArray()
  sections: FormSection[];

  @IsOptional()
  @IsArray()
  validationRules?: ValidationRule[];

  @IsOptional()
  @IsArray()
  calculatedFields?: CalculatedField[];

  @IsOptional()
  @IsObject()
  uiSchema?: Record<string, unknown>;
}

/**
 * DTO for updating an existing disclosure form template.
 * All fields are optional - only provided fields are updated.
 */
export class UpdateFormTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  fields?: FormField[];

  @IsOptional()
  @IsArray()
  sections?: FormSection[];

  @IsOptional()
  @IsArray()
  validationRules?: ValidationRule[];

  @IsOptional()
  @IsArray()
  calculatedFields?: CalculatedField[];

  @IsOptional()
  @IsObject()
  uiSchema?: Record<string, unknown>;
}

/**
 * DTO for publishing a form template.
 */
export class PublishFormTemplateDto {
  @IsOptional()
  @IsBoolean()
  createNewVersion?: boolean; // If true, creates new version instead of publishing current
}

/**
 * DTO for cloning a form template.
 */
export class CloneFormTemplateDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsBoolean()
  asTranslation?: boolean; // If true, links as child translation
}

// ===========================================
// Query DTOs
// ===========================================

/**
 * DTO for querying form templates with filters.
 */
export class FormTemplateQueryDto {
  @IsOptional()
  @IsEnum(DisclosureFormTypeDto)
  disclosureType?: DisclosureFormTypeDto;

  @IsOptional()
  @IsEnum(FormTemplateStatusDto)
  status?: FormTemplateStatusDto;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsBoolean()
  includeTranslations?: boolean;

  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean;
}

// ===========================================
// Response DTOs
// ===========================================

/**
 * Full form template response with all fields.
 */
export class FormTemplateResponseDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  disclosureType: string;
  version: number;
  status: string;
  publishedAt?: Date;
  publishedBy?: string;
  language: string;
  parentTemplateId?: string;
  fields: FormField[];
  sections: FormSection[];
  validationRules?: ValidationRule[];
  calculatedFields?: CalculatedField[];
  uiSchema?: Record<string, unknown>;
  isSystem: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;

  // Computed fields
  /** True if parent template has a newer version */
  isStale?: boolean;
  /** Parent template version this was based on */
  parentVersion?: number;
  /** Number of translations for this template */
  translationCount?: number;
}

/**
 * Lightweight form template for list views.
 */
export class FormTemplateListItemDto {
  id: string;
  name: string;
  description?: string;
  disclosureType: string;
  version: number;
  status: string;
  language: string;
  hasTranslations: boolean;
  fieldCount: number;
  sectionCount: number;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response for form template version history.
 */
export class FormTemplateVersionDto {
  version: number;
  status: string;
  publishedAt?: Date;
  publishedBy?: string;
  createdAt: Date;
  fieldCount: number;
  changesSummary?: string;
}

/**
 * Response for form template translations.
 */
export class FormTemplateTranslationDto {
  id: string;
  language: string;
  name: string;
  status: string;
  version: number;
  isStale: boolean;
  updatedAt: Date;
}
