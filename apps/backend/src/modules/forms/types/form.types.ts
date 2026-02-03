import { JSONSchema7 } from 'json-schema';

/**
 * Extended JSON Schema for form definitions.
 * Uses standard JSON Schema 7 with optional extensions.
 */
export interface FormSchema extends JSONSchema7 {
  // Extended for platform-specific needs (currently uses standard JSON Schema 7)
}

/**
 * UI Schema controls how form fields are rendered.
 * Separate from JSON Schema to keep validation logic clean.
 */
export interface UiSchema {
  /** Field ordering */
  order?: string[];
  /** Per-field UI configuration */
  fields?: Record<string, UiFieldConfig>;
  /** Conditional visibility/requirement rules */
  conditionals?: ConditionalRule[];
}

/**
 * Configuration for individual form field rendering.
 */
export interface UiFieldConfig {
  /** Widget type for rendering */
  widget?:
    | 'text'
    | 'textarea'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'date'
    | 'file'
    | 'rich-text'
    | 'phone'
    | 'email'
    | 'currency';
  /** Placeholder text */
  placeholder?: string;
  /** Help text shown below field */
  helpText?: string;
  /** Hide field from view */
  hidden?: boolean;
  /** Disable field editing */
  disabled?: boolean;
  /** CSS class name for styling */
  className?: string;
  /** Label override (defaults to property name) */
  label?: string;
  /** Column span in grid layout (1-12) */
  colSpan?: number;
}

/**
 * Conditional rule for dynamic form behavior.
 * Shows/hides/requires fields based on other field values.
 */
export interface ConditionalRule {
  /** Condition to evaluate */
  if: {
    field: string;
    value: unknown;
    operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  };
  /** Actions to take when condition is met */
  then: {
    show?: string[];
    hide?: string[];
    require?: string[];
    unrequire?: string[];
  };
}

/**
 * Result of form validation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Individual validation error.
 */
export interface ValidationError {
  /** Field path (dot-notation for nested) */
  field: string;
  /** Human-readable error message */
  message: string;
  /** JSON Schema validation keyword that failed */
  keyword: string;
}

/**
 * Form submission data with metadata.
 */
export interface FormSubmissionData {
  formDefinitionId: string;
  data: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
}
