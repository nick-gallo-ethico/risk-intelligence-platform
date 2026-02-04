/**
 * Disclosure Form Field Types
 * Implements RS.23 - Full compliance field set for disclosure forms.
 *
 * This module defines all field types, configurations, and structures
 * for the disclosure form schema engine.
 */

// ===========================================
// Field Type Enums
// ===========================================

/**
 * Basic field types for standard form inputs.
 */
export enum BasicFieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  DROPDOWN = 'DROPDOWN',
  MULTI_SELECT = 'MULTI_SELECT',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  FILE_UPLOAD = 'FILE_UPLOAD',
}

/**
 * Compliance-specific field types (RS.23).
 * These field types are designed for ethics and compliance workflows.
 */
export enum ComplianceFieldType {
  /** Maps relationships between entities and persons (e.g., vendor-employee) */
  RELATIONSHIP_MAPPER = 'RELATIONSHIP_MAPPER',
  /** Currency field with threshold checking and warning/block rules */
  DOLLAR_THRESHOLD = 'DOLLAR_THRESHOLD',
  /** Date field with annual, quarterly, or monthly tracking */
  RECURRING_DATE = 'RECURRING_DATE',
  /** Lookup field that searches vendor master, HRIS, or other entity sources */
  ENTITY_LOOKUP = 'ENTITY_LOOKUP',
  /** Digital signature capture with timestamp */
  SIGNATURE_CAPTURE = 'SIGNATURE_CAPTURE',
  /** Required acknowledgment checkbox with statement */
  ATTESTATION = 'ATTESTATION',
  /** Multi-currency field with ISO 4217 support */
  CURRENCY = 'CURRENCY',
  /** Percentage field (0-100) with validation */
  PERCENTAGE = 'PERCENTAGE',
}

/**
 * Union type of all form field types.
 */
export type FormFieldType = BasicFieldType | ComplianceFieldType;

// ===========================================
// Field Definition Interfaces
// ===========================================

/**
 * Complete field definition structure.
 * Used in the DisclosureFormTemplate.fields JSON array.
 */
export interface FormField {
  /** Unique identifier for the field */
  id: string;
  /** Field type (basic or compliance-specific) */
  type: FormFieldType;
  /** Unique key for field data storage */
  key: string;
  /** Display label */
  label: string;
  /** Optional description shown below label */
  description?: string;
  /** Placeholder text for input fields */
  placeholder?: string;

  // Validation
  /** Whether the field is required */
  required?: boolean;
  /** Validation rules */
  validation?: FieldValidation;

  // Conditional logic (RS.27)
  /** Conditional visibility/requirement rules */
  conditionals?: FieldConditional[];

  // Type-specific configuration
  /** Type-specific configuration options */
  config?: FieldTypeConfig;

  // UI hints
  /** UI rendering configuration */
  uiConfig?: FieldUiConfig;
}

/**
 * Field validation rules.
 */
export interface FieldValidation {
  /** Minimum string length */
  minLength?: number;
  /** Maximum string length */
  maxLength?: number;
  /** Minimum numeric value */
  min?: number;
  /** Maximum numeric value */
  max?: number;
  /** Regex pattern for validation */
  pattern?: string;
  /** Error message when pattern fails */
  patternMessage?: string;
  /** Name of a registered custom validator function */
  customValidator?: string;
}

// ===========================================
// Conditional Logic (RS.27)
// ===========================================

/**
 * Conditional rule for dynamic form behavior.
 * Shows/hides/requires fields based on other field values.
 */
export interface FieldConditional {
  /** Condition to evaluate */
  if: {
    /** Field key to check */
    field: string;
    /** Comparison operator */
    operator: ConditionalOperator;
    /** Value to compare against */
    value: unknown;
  };
  /** Actions to take when condition is met */
  then: ConditionalAction;
}

/**
 * Conditional operators for field comparisons.
 */
export enum ConditionalOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_OR_EQUALS = 'gte',
  LESS_THAN_OR_EQUALS = 'lte',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
}

/**
 * Actions that can be triggered by conditional rules.
 */
export interface ConditionalAction {
  /** Show the field */
  show?: boolean;
  /** Hide the field */
  hide?: boolean;
  /** Make the field required */
  require?: boolean;
  /** Remove required constraint */
  unrequire?: boolean;
  /** Set the field value */
  setValue?: unknown;
}

// ===========================================
// Type-Specific Configurations
// ===========================================

/**
 * Configuration options specific to field types.
 */
export interface FieldTypeConfig {
  // Dropdown/Multi-select options
  /** Available options for select fields */
  options?: FieldOption[];
  /** Allow user to enter "Other" option */
  allowOther?: boolean;
  /** Field key for cascading dropdown source (RS.30) */
  cascadeFrom?: string;

  // Entity lookup configuration
  /** Entity type to search: 'vendor', 'employee', 'person', 'organization' */
  entityType?: 'vendor' | 'employee' | 'person' | 'organization';
  /** Fields to search within the entity */
  searchFields?: string[];
  /** Template for displaying search results (e.g., "{{name}} - {{department}}") */
  displayTemplate?: string;

  // Relationship mapper configuration
  /** Available relationship types (e.g., 'spouse', 'business_partner') */
  relationshipTypes?: string[];
  /** Allow mapping multiple relationships */
  allowMultiple?: boolean;

  // Dollar threshold configuration
  /** Value that triggers a warning (soft threshold) */
  thresholdWarning?: number;
  /** Value that blocks submission (hard threshold) */
  thresholdBlock?: number;
  /** Default currency code (ISO 4217) */
  currency?: string;

  // Recurring date configuration
  /** Type of recurrence tracking */
  recurrenceType?: 'annual' | 'quarterly' | 'monthly';

  // File upload configuration
  /** Allowed MIME types (e.g., 'application/pdf', 'image/*') */
  allowedTypes?: string[];
  /** Maximum file size in bytes */
  maxSizeBytes?: number;
  /** Maximum number of files */
  maxFiles?: number;

  // Calculated field reference (RS.28)
  /** Expression for calculated fields (e.g., "SUM(gifts.value)") */
  expression?: string;
  /** Field keys this calculation depends on */
  expressionFields?: string[];
}

/**
 * Option for dropdown/select fields.
 */
export interface FieldOption {
  /** Stored value */
  value: string;
  /** Display label */
  label: string;
  /** Parent value for cascading dropdowns */
  parentValue?: string;
  /** Whether option is disabled */
  disabled?: boolean;
}

/**
 * UI configuration for field rendering.
 */
export interface FieldUiConfig {
  /** Grid column span (1-12) */
  colSpan?: number;
  /** Custom widget name for specialized rendering */
  widget?: string;
  /** Help text shown below field */
  helpText?: string;
  /** Tooltip text on hover */
  tooltip?: string;
  /** Whether field is hidden from view */
  hidden?: boolean;
}

// ===========================================
// Section Structure with Nested Repeaters (RS.29)
// ===========================================

/**
 * Form section grouping fields together.
 * Supports repeater configuration for dynamic field groups.
 */
export interface FormSection {
  /** Unique section identifier */
  id: string;
  /** Section title */
  title: string;
  /** Section description */
  description?: string;
  /** Field IDs belonging to this section */
  fields: string[];

  // Repeater configuration
  /** Configuration for repeatable sections */
  repeater?: RepeaterConfig;

  // Conditional visibility
  /** Conditional rule for section visibility */
  conditional?: FieldConditional;

  // UI options
  /** Whether section can be collapsed */
  collapsible?: boolean;
  /** Default collapsed state */
  collapsed?: boolean;
}

/**
 * Configuration for repeatable sections (RS.29).
 * Supports up to 2 levels of nesting.
 */
export interface RepeaterConfig {
  /** Whether repeater is enabled */
  enabled: boolean;
  /** Minimum number of items required */
  minItems?: number;
  /** Maximum number of items allowed */
  maxItems?: number;
  /** Label template for items (e.g., "Gift {{index}}") */
  itemLabel?: string;

  /**
   * Nested repeater configuration (RS.29 - max 2 levels).
   * Allows fields within a repeater to themselves be repeatable.
   */
  nestedRepeaters?: {
    /** Field ID that contains the nested repeater */
    fieldId: string;
    /** Nested repeater configuration */
    config: RepeaterConfig;
  }[];

  /** Aggregation rules for repeater data */
  aggregate?: AggregateConfig[];
}

/**
 * Aggregation configuration for repeater sections.
 * Used to calculate totals, counts, etc.
 */
export interface AggregateConfig {
  /** Aggregation function */
  function: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX';
  /** Field key within repeater to aggregate */
  sourceField: string;
  /** Field key where result is stored */
  targetField: string;
}

// ===========================================
// Calculated Fields (RS.28)
// ===========================================

/**
 * Calculated field definition using expression engine.
 * Automatically computed based on other field values.
 */
export interface CalculatedField {
  /** Unique identifier */
  id: string;
  /** Field key for data storage */
  key: string;
  /** Expression to evaluate (e.g., "SUM(gifts.value)", "field1 + field2") */
  expression: string;
  /** Field keys this calculation depends on (for reactivity) */
  dependencies: string[];
  /** Output format for display */
  format?: 'currency' | 'percentage' | 'number' | 'date';
}

// ===========================================
// Validation Rules (RS.27)
// ===========================================

/**
 * Cross-field validation rule.
 * Validates relationships between multiple fields.
 */
export interface ValidationRule {
  /** Unique rule identifier */
  id: string;
  /** Rule name for display/debugging */
  name: string;
  /** Condition that must be true for validation to pass */
  condition: {
    /** Left operand (field key or expression) */
    left: string;
    /** Comparison operator */
    operator: ConditionalOperator;
    /** Right operand (field key, expression, or literal value) */
    right: string;
  };
  /** Error message when validation fails */
  errorMessage: string;
  /** Severity level: 'error' blocks submission, 'warning' allows with confirmation */
  severity: 'error' | 'warning';
}

// ===========================================
// Summary Types
// ===========================================

/**
 * Form template summary for list views.
 * Lightweight representation without full schema.
 */
export interface FormTemplateSummary {
  id: string;
  name: string;
  disclosureType: string;
  version: number;
  status: string;
  language: string;
  hasTranslations: boolean;
  fieldCount: number;
  createdAt: Date;
  updatedAt: Date;
}
