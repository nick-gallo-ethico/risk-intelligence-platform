/**
 * Custom Properties Types
 *
 * TypeScript types for custom property management.
 * Matches backend DTOs from CustomPropertiesController and custom-property.dto.ts.
 */

/**
 * Entity types that support custom properties.
 */
export type CustomPropertyEntityType =
  | "CASE"
  | "INVESTIGATION"
  | "PERSON"
  | "RIU";

/**
 * Data types supported for custom property values.
 */
export type PropertyDataType =
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "DATETIME"
  | "SELECT"
  | "MULTI_SELECT"
  | "BOOLEAN"
  | "URL"
  | "EMAIL"
  | "PHONE";

/**
 * Option for SELECT and MULTI_SELECT data types.
 */
export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

/**
 * Validation rules for TEXT data type.
 */
export interface TextValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string; // Regex pattern
}

/**
 * Validation rules for NUMBER data type.
 */
export interface NumberValidation {
  min?: number;
  max?: number;
  decimals?: number;
}

/**
 * Validation rules for DATE/DATETIME data types.
 */
export interface DateValidation {
  minDate?: string; // ISO date string
  maxDate?: string;
  allowFuture?: boolean;
  allowPast?: boolean;
}

/**
 * Union type of all validation rules.
 */
export type ValidationRules =
  | TextValidation
  | NumberValidation
  | DateValidation;

/**
 * Full custom property entity.
 */
export interface CustomProperty {
  id: string;
  organizationId: string;
  entityType: CustomPropertyEntityType;
  name: string;
  key: string;
  description?: string;
  dataType: PropertyDataType;
  isRequired: boolean;
  isActive: boolean;
  isVisible?: boolean;
  defaultValue?: unknown;
  options?: SelectOption[];
  validationRules?: ValidationRules;
  displayOrder: number;
  groupName?: string;
  helpText?: string;
  placeholder?: string;
  width?: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
}

/**
 * DTO for creating a new custom property.
 */
export interface CreateCustomPropertyDto {
  entityType: CustomPropertyEntityType;
  name: string;
  key: string;
  description?: string;
  dataType: PropertyDataType;
  isRequired?: boolean;
  defaultValue?: unknown;
  options?: SelectOption[];
  validationRules?: ValidationRules;
  displayOrder?: number;
  groupName?: string;
  helpText?: string;
  placeholder?: string;
  width?: string;
}

/**
 * DTO for updating an existing custom property.
 */
export interface UpdateCustomPropertyDto {
  name?: string;
  description?: string;
  isRequired?: boolean;
  isVisible?: boolean;
  isActive?: boolean;
  defaultValue?: unknown;
  options?: SelectOption[];
  validationRules?: ValidationRules;
  displayOrder?: number;
  groupName?: string;
  helpText?: string;
  placeholder?: string;
  width?: string;
}

/**
 * Human-readable labels for entity types.
 */
export const ENTITY_TYPE_LABELS: Record<CustomPropertyEntityType, string> = {
  CASE: "Cases",
  INVESTIGATION: "Investigations",
  PERSON: "People",
  RIU: "RIUs",
};

/**
 * Human-readable labels for data types.
 */
export const DATA_TYPE_LABELS: Record<PropertyDataType, string> = {
  TEXT: "Single-line Text",
  NUMBER: "Number",
  DATE: "Date",
  DATETIME: "Date & Time",
  SELECT: "Dropdown Select",
  MULTI_SELECT: "Multi-select",
  BOOLEAN: "Yes/No",
  URL: "URL",
  EMAIL: "Email",
  PHONE: "Phone Number",
};

/**
 * Lucide icon names for data types.
 */
export const DATA_TYPE_ICONS: Record<PropertyDataType, string> = {
  TEXT: "Type",
  NUMBER: "Hash",
  DATE: "Calendar",
  DATETIME: "CalendarClock",
  SELECT: "ChevronDown",
  MULTI_SELECT: "CheckSquare",
  BOOLEAN: "ToggleLeft",
  URL: "Link",
  EMAIL: "Mail",
  PHONE: "Phone",
};

/**
 * Descriptions for data types shown in the UI.
 */
export const DATA_TYPE_DESCRIPTIONS: Record<PropertyDataType, string> = {
  TEXT: "A single line of text",
  NUMBER: "Numeric value with optional decimal places",
  DATE: "Date picker (no time)",
  DATETIME: "Date and time picker",
  SELECT: "Choose one option from a dropdown",
  MULTI_SELECT: "Choose multiple options",
  BOOLEAN: "Simple yes or no toggle",
  URL: "Website address with validation",
  EMAIL: "Email address with validation",
  PHONE: "Phone number with formatting",
};

/**
 * All entity types as an array for iteration.
 */
export const ENTITY_TYPES: CustomPropertyEntityType[] = [
  "CASE",
  "INVESTIGATION",
  "PERSON",
  "RIU",
];

/**
 * All data types as an array for iteration.
 */
export const DATA_TYPES: PropertyDataType[] = [
  "TEXT",
  "NUMBER",
  "DATE",
  "DATETIME",
  "SELECT",
  "MULTI_SELECT",
  "BOOLEAN",
  "URL",
  "EMAIL",
  "PHONE",
];

/**
 * Generate a key from a property name.
 * Converts to snake_case and removes special characters.
 *
 * @param name - Property name to convert
 */
export function generatePropertyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
}
