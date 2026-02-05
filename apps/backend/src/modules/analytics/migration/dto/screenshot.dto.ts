// =============================================================================
// SCREENSHOT ANALYSIS DTOs - Form field extraction from images
// =============================================================================
//
// DTOs for the screenshot-to-form AI assistant that extracts form definitions
// from competitor screenshots for migration or form builder purposes.
//
// Use cases:
// - Migration: Analyzing competitor forms (NAVEX, EQS, OneTrust, STAR) to replicate
// - Form Builder: Creating new forms from screenshot mockups
// =============================================================================

import { IsString, IsOptional, IsEnum, IsArray } from "class-validator";

/**
 * Context for screenshot analysis.
 * Affects the prompt and focus of the AI analysis.
 */
export enum ScreenshotContext {
  /** Analyzing competitor forms for migration */
  MIGRATION = "migration",
  /** Creating new forms from mockups */
  FORM_BUILDER = "form_builder",
}

/**
 * Known competitor systems for targeted field pattern recognition.
 */
export enum CompetitorHint {
  NAVEX = "navex",
  EQS = "eqs",
  ONETRUST = "onetrust",
  STAR = "star",
  UNKNOWN = "unknown",
}

/**
 * Request DTO for screenshot analysis.
 */
export class AnalyzeScreenshotDto {
  @IsEnum(ScreenshotContext)
  context: ScreenshotContext;

  @IsOptional()
  @IsEnum(CompetitorHint)
  competitorHint?: CompetitorHint;

  @IsOptional()
  @IsString()
  additionalInstructions?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  existingFieldNames?: string[]; // Avoid duplicates in form builder
}

/**
 * Types of form fields that can be extracted.
 */
export enum ExtractedFieldType {
  TEXT = "text",
  TEXTAREA = "textarea",
  NUMBER = "number",
  EMAIL = "email",
  PHONE = "phone",
  DATE = "date",
  DATETIME = "datetime",
  SELECT = "select",
  MULTISELECT = "multiselect",
  RADIO = "radio",
  CHECKBOX = "checkbox",
  FILE = "file",
  CURRENCY = "currency",
  PERCENTAGE = "percentage",
  URL = "url",
}

/**
 * Validation rule that can be extracted from a screenshot.
 */
export interface ValidationRule {
  type:
    | "required"
    | "min"
    | "max"
    | "minLength"
    | "maxLength"
    | "pattern"
    | "custom";
  value?: string | number;
  message?: string;
}

/**
 * A form field extracted from a screenshot.
 */
export class ExtractedField {
  /** Camel-case field name for programmatic use */
  name: string;

  /** Human-readable label */
  label: string;

  /** Field type */
  type: ExtractedFieldType;

  /** Whether the field is required */
  isRequired: boolean;

  /** Placeholder text if visible */
  placeholder?: string;

  /** Help text or description if present */
  helpText?: string;

  /** Options for select, radio, or checkbox fields */
  options?: string[];

  /** Extracted validation rules */
  validationRules?: ValidationRule[];

  /** Position within the form */
  position: {
    section?: string;
    order: number;
  };

  /** Confidence score (0-100) for this extraction */
  confidence: number;
}

/**
 * A form section extracted from a screenshot.
 */
export class ExtractedSection {
  /** Section name/title */
  name: string;

  /** Optional description */
  description?: string;

  /** Order in the form */
  order: number;

  /** Number of fields in this section */
  fieldCount: number;
}

/**
 * Result of screenshot analysis.
 */
export class ScreenshotAnalysisResult {
  /** Extracted fields */
  fields: ExtractedField[];

  /** Extracted sections */
  sections: ExtractedSection[];

  /** Form title if detected */
  formTitle?: string;

  /** Form description if detected */
  formDescription?: string;

  /** Overall confidence score (0-100) */
  confidenceOverall: number;

  /** Warnings about the extraction */
  warnings: string[];

  /** Auto-detected competitor if different from hint */
  competitorDetected?: CompetitorHint;

  /** Raw AI response for transparency and debugging */
  rawAnalysis: string;
}

/**
 * Competitor-specific field patterns for improved type detection.
 * Maps common field labels to expected types.
 */
export const COMPETITOR_FIELD_PATTERNS: Record<
  CompetitorHint,
  Record<string, ExtractedFieldType>
> = {
  [CompetitorHint.NAVEX]: {
    "incident type": ExtractedFieldType.SELECT,
    "date of incident": ExtractedFieldType.DATE,
    location: ExtractedFieldType.SELECT,
    "business unit": ExtractedFieldType.SELECT,
    description: ExtractedFieldType.TEXTAREA,
    anonymous: ExtractedFieldType.RADIO,
    "contact information": ExtractedFieldType.TEXT,
    "incident date": ExtractedFieldType.DATE,
    department: ExtractedFieldType.SELECT,
    "your relationship": ExtractedFieldType.SELECT,
  },
  [CompetitorHint.EQS]: {
    category: ExtractedFieldType.SELECT,
    subcategory: ExtractedFieldType.SELECT,
    "when did this happen": ExtractedFieldType.DATE,
    country: ExtractedFieldType.SELECT,
    "detailed description": ExtractedFieldType.TEXTAREA,
    "relationship to company": ExtractedFieldType.SELECT,
    "describe what happened": ExtractedFieldType.TEXTAREA,
    "persons involved": ExtractedFieldType.TEXTAREA,
    evidence: ExtractedFieldType.FILE,
  },
  [CompetitorHint.ONETRUST]: {
    "incident type": ExtractedFieldType.SELECT,
    severity: ExtractedFieldType.SELECT,
    department: ExtractedFieldType.SELECT,
    details: ExtractedFieldType.TEXTAREA,
    evidence: ExtractedFieldType.FILE,
    "data subject": ExtractedFieldType.TEXT,
    "affected records": ExtractedFieldType.NUMBER,
    "discovery date": ExtractedFieldType.DATE,
  },
  [CompetitorHint.STAR]: {
    "matter type": ExtractedFieldType.SELECT,
    "report date": ExtractedFieldType.DATE,
    "business area": ExtractedFieldType.SELECT,
    narrative: ExtractedFieldType.TEXTAREA,
    "reporter name": ExtractedFieldType.TEXT,
    "contact phone": ExtractedFieldType.PHONE,
    "contact email": ExtractedFieldType.EMAIL,
  },
  [CompetitorHint.UNKNOWN]: {},
};

/**
 * Response from AI image analysis (internal use).
 */
export interface AiImageAnalysisResponse {
  formTitle?: string | null;
  formDescription?: string | null;
  sections?: Array<{
    name: string;
    description?: string | null;
    order: number;
  }>;
  fields?: Array<{
    name: string;
    label: string;
    type: string;
    isRequired: boolean;
    placeholder?: string | null;
    helpText?: string | null;
    options?: string[];
    validationRules?: ValidationRule[];
    section?: string | null;
    order: number;
    confidence: number;
  }>;
}
