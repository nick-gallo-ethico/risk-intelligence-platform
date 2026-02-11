/**
 * RIU Form Data Response Types
 *
 * Structures for presenting RIU intake data organized by logical sections.
 * Used by the case detail page to display original intake form answers.
 */

/**
 * Field type determines how the value is rendered in the UI
 */
export type FormFieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "date"
  | "datetime"
  | "boolean"
  | "number"
  | "currency";

/**
 * Single form field with label, value, and type
 */
export interface FormField {
  /** Human-readable label */
  label: string;
  /** Field value - can be string, array, number, boolean, or null */
  value: string | string[] | number | boolean | null;
  /** Field type for rendering */
  type: FormFieldType;
}

/**
 * Logical section grouping related fields
 */
export interface FormSection {
  /** Unique section identifier */
  id: string;
  /** Human-readable section title */
  title: string;
  /** Fields in this section */
  fields: FormField[];
}

/**
 * Complete RIU form data response
 */
export interface RiuFormDataResponse {
  /** RIU ID */
  riuId: string;
  /** RIU type (HOTLINE_REPORT, WEB_FORM_SUBMISSION, DISCLOSURE_RESPONSE) */
  riuType: string;
  /** Reference number */
  referenceNumber: string;
  /** Sections containing intake form fields */
  sections: FormSection[];
}
