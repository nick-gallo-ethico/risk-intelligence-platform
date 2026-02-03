import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
} from 'class-validator';

// ===========================================
// Type Definitions for Checklist State
// ===========================================

/**
 * Status of a checklist item.
 */
export type ItemStatus = 'pending' | 'completed' | 'skipped';

/**
 * Status of a checklist section.
 */
export type SectionStatus = 'pending' | 'in_progress' | 'completed';

/**
 * State of a single checklist item.
 * Stored in itemStates JSON field keyed by item ID.
 */
export interface ChecklistItemState {
  status: ItemStatus;
  completedAt?: string;
  completedById?: string;
  completedByName?: string;
  completionNotes?: string;
  attachmentIds?: string[];
  linkedInterviewIds?: string[];
}

/**
 * State of a checklist section.
 * Stored in sectionStates JSON field keyed by section ID.
 */
export interface SectionState {
  status: SectionStatus;
  completedItems: number;
  totalItems: number;
}

/**
 * Custom item added by an investigator.
 * Stored in customItems JSON array.
 */
export interface CustomItem {
  id: string;
  sectionId: string;
  text: string;
  order: number;
  required: boolean;
  evidenceRequired: boolean;
  addedById: string;
  addedByName: string;
  addedAt: string;
}

/**
 * Record of a skipped item with reason.
 * Stored in skippedItems JSON array.
 */
export interface SkippedItem {
  itemId: string;
  reason: string;
  skippedById: string;
  skippedByName: string;
  skippedAt: string;
}

// ===========================================
// DTOs for API Operations
// ===========================================

/**
 * Apply a template to an investigation, creating checklist progress.
 */
export class ApplyTemplateDto {
  @IsUUID()
  investigationId: string;

  @IsUUID()
  templateId: string;
}

/**
 * Complete a checklist item with optional notes and attachments.
 */
export class CompleteItemDto {
  @IsString()
  @IsOptional()
  completionNotes?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  attachmentIds?: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  linkedInterviewIds?: string[];
}

/**
 * Skip a checklist item with required reason.
 */
export class SkipItemDto {
  @IsString()
  reason: string;
}

/**
 * Add a custom item to a section.
 */
export class AddCustomItemDto {
  @IsUUID()
  sectionId: string;

  @IsString()
  text: string;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsBoolean()
  @IsOptional()
  evidenceRequired?: boolean;
}

/**
 * Update the order of items in the checklist.
 */
export class UpdateItemOrderDto {
  @IsArray()
  @IsString({ each: true })
  itemOrder: string[];
}

// ===========================================
// Response Types
// ===========================================

/**
 * Template section information for response.
 */
export interface TemplateSectionResponse {
  id: string;
  name: string;
  order: number;
  items: {
    id: string;
    text: string;
    order: number;
    required: boolean;
    evidenceRequired: boolean;
    guidance?: string;
  }[];
}

/**
 * Full checklist progress response with template details.
 */
export interface ChecklistProgressResponse {
  id: string;
  investigationId: string;
  templateId: string;
  templateVersion: number;
  template: {
    name: string;
    sections: TemplateSectionResponse[];
  };
  itemStates: Record<string, ChecklistItemState>;
  sectionStates: Record<string, SectionState>;
  customItems: CustomItem[];
  skippedItems: SkippedItem[];
  totalItems: number;
  completedItems: number;
  skippedCount: number;
  customCount: number;
  progressPercent: number;
  startedAt?: string;
  completedAt?: string;
  lastActivityAt?: string;
}
