import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateTier } from '@prisma/client';

// ===========================================
// JSON Schema Types for Template Structure
// ===========================================

/**
 * ChecklistItem represents a single actionable item within a section.
 * Items can be required, have dependencies, and require evidence.
 */
export interface ChecklistItem {
  id: string;
  text: string;
  order: number;
  required: boolean;
  evidenceRequired: boolean;
  guidance?: string;
  dependencies?: string[]; // Item IDs that must be completed first
}

/**
 * ChecklistSection groups related items together.
 * Sections can have suggested durations and dependencies on other sections.
 */
export interface ChecklistSection {
  id: string;
  name: string;
  order: number;
  suggestedDays?: number;
  sectionDependencies?: string[]; // Section IDs that must be completed first
  items: ChecklistItem[];
}

/**
 * ConditionalRule defines when sections/items should be shown/hidden/required.
 * Rules evaluate based on case metadata (category, severity, custom fields).
 */
export interface ConditionalRule {
  targetId: string; // Section or item ID
  targetType: 'section' | 'item';
  condition: {
    field: string; // e.g., 'category', 'severity', 'customField.hipaa'
    operator: 'equals' | 'not_equals' | 'contains' | 'in';
    value: string | string[];
  };
  action: 'show' | 'hide' | 'require';
}

// ===========================================
// DTOs
// ===========================================

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(TemplateTier)
  @IsOptional()
  tier?: TemplateTier;

  @IsUUID()
  @IsOptional()
  sharedWithTeamId?: string;

  @IsArray()
  sections: ChecklistSection[];

  @IsOptional()
  suggestedDurations?: Record<string, number>;

  @IsArray()
  @IsOptional()
  conditionalRules?: ConditionalRule[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(TemplateTier)
  @IsOptional()
  tier?: TemplateTier;

  @IsUUID()
  @IsOptional()
  sharedWithTeamId?: string;

  @IsArray()
  @IsOptional()
  sections?: ChecklistSection[];

  @IsOptional()
  suggestedDurations?: Record<string, number>;

  @IsArray()
  @IsOptional()
  conditionalRules?: ConditionalRule[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class TemplateQueryDto {
  @IsEnum(TemplateTier)
  @IsOptional()
  tier?: TemplateTier;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  includeArchived?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class PublishTemplateDto {
  @IsBoolean()
  @IsOptional()
  createNewVersion?: boolean;
}

export class ImportTemplateDto {
  @IsString()
  templateJson: string; // Stringified template export

  @IsBoolean()
  @IsOptional()
  importAsOfficial?: boolean;
}

export class DuplicateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;
}
