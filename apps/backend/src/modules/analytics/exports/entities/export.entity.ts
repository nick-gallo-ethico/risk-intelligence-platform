import { ExportDataType, ExportSourceType } from "@prisma/client";

// ===========================================
// Column Definition Types
// ===========================================

/**
 * Represents a single column in the flat file export.
 */
export interface ColumnDefinition {
  /** Column key/identifier */
  key: string;
  /** Display label for header row */
  label: string;
  /** Data type for formatting */
  type: "string" | "number" | "date" | "boolean" | "currency" | "percentage";
  /** Format pattern (e.g., "$#,##0.00", "YYYY-MM-DD") */
  format?: string;
  /** Column width in characters (for Excel) */
  width?: number;
  /** Whether this is a required/core column */
  isCore?: boolean;
  /** For investigation columns, which investigation index (1, 2, 3) */
  investigationIndex?: number;
  /** For tagged fields, the tag slot number */
  tagSlot?: number;
}

/**
 * Configuration for admin-tagged fields that become named export columns.
 */
export interface TaggedFieldConfig {
  /** Tag slot number (1-20) */
  tagSlot: number;
  /** Entity type to extract from */
  sourceEntityType: ExportSourceType;
  /** JSON path to the field value */
  sourceFieldPath: string;
  /** Optional form template ID */
  templateId?: string;
  /** Export column name */
  columnName: string;
  /** Human-readable label */
  displayLabel: string;
  /** Data type for formatting */
  dataType: ExportDataType;
  /** Format pattern */
  formatPattern?: string;
}

/**
 * Mapping between source field and export column.
 * Used to denormalize hierarchical data into flat rows.
 */
export interface ColumnMapping {
  /** Source entity (e.g., "case", "investigation", "category") */
  source: string;
  /** Field path in source entity (e.g., "status", "category.name") */
  fieldPath: string;
  /** Target column key */
  targetColumn: string;
  /** Whether value is calculated (not direct field lookup) */
  isCalculated?: boolean;
  /** Calculation function name for calculated fields */
  calculationFn?: string;
}

// ===========================================
// Export Row Types
// ===========================================

/**
 * Core case columns that are always present in flat file exports.
 * ~40 columns covering case metadata, classification, assignment, and outcomes.
 */
export interface CoreCaseColumns {
  // Identity
  case_id: string;
  case_number: string;

  // Status
  case_status: string;
  case_priority: string;

  // Dates
  case_created_at: Date;
  case_closed_at: Date | null;
  case_days_open: number;
  case_sla_breached: boolean;

  // Classification
  category_name: string;
  category_code: string;
  subcategory_name: string | null;

  // Source
  source_channel: string;
  is_anonymous: boolean;
  reporter_relationship: string | null;

  // Assignment
  assigned_to_name: string | null;
  assigned_to_email: string | null;

  // Organization
  business_unit_name: string | null;
  business_unit_code: string | null;
  location_name: string | null;
  location_country: string | null;
  location_region: string | null;

  // Outcome
  outcome: string | null;
  outcome_reason: string | null;

  // Remediation
  has_remediation: boolean;
  remediation_status: string | null;

  // Counts
  riu_count: number;
  investigation_count: number;
  subject_count: number;
  attachment_count: number;
}

/**
 * Investigation columns for a single investigation.
 * These are repeated with N suffix (inv_1, inv_2, inv_3).
 */
export interface InvestigationColumns {
  inv_id: string | null;
  inv_type: string | null;
  inv_status: string | null;
  inv_outcome: string | null;
  inv_started_at: Date | null;
  inv_completed_at: Date | null;
  inv_days_to_complete: number | null;
  inv_investigator_name: string | null;
  inv_interview_count: number | null;
  inv_finding_summary: string | null;
}

/**
 * Tagged field value with metadata.
 */
export interface TaggedFieldValue {
  slot: number;
  columnName: string;
  displayLabel: string;
  rawValue: unknown;
  formattedValue: string;
  dataType: ExportDataType;
}

/**
 * Overflow JSON columns for power users who need all data.
 */
export interface OverflowColumns {
  all_custom_fields: Record<string, unknown>;
  all_investigations: unknown[];
  all_interview_responses: unknown[];
  all_disclosures: unknown[];
  all_subjects: unknown[];
}

/**
 * Complete flat export row combining all column types.
 */
export interface FlatExportRow extends CoreCaseColumns {
  // Investigation columns (inv_1_*, inv_2_*, inv_3_*, etc.)
  [key: `inv_${number}_${string}`]: unknown;
  // Tagged field columns (tag_1_value, tag_2_value, etc.)
  [key: `tag_${number}_value`]: unknown;
  // Overflow columns (optional)
  all_custom_fields?: Record<string, unknown>;
  all_investigations?: unknown[];
  all_interview_responses?: unknown[];
  all_disclosures?: unknown[];
  all_subjects?: unknown[];
}

// ===========================================
// Export Configuration Types
// ===========================================

/**
 * Configuration for a flat file export job.
 */
export interface ExportConfig {
  /** Include investigation columns */
  includeInvestigations: boolean;
  /** Maximum investigations per row */
  maxInvestigations: number;
  /** Include admin-tagged fields */
  includeTaggedFields: boolean;
  /** Include overflow JSON columns */
  includeOverflow: boolean;
  /** Date format for date columns */
  dateFormat: string;
  /** Currency symbol */
  currencySymbol: string;
  /** Timezone for date formatting */
  timezone: string;
}

/**
 * Default export configuration.
 */
export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  includeInvestigations: true,
  maxInvestigations: 3,
  includeTaggedFields: true,
  includeOverflow: false,
  dateFormat: "YYYY-MM-DD",
  currencySymbol: "$",
  timezone: "UTC",
};

// ===========================================
// Core Column Definitions
// ===========================================

/**
 * Core case column definitions.
 * These 40+ columns are always present in flat file exports.
 */
export const CORE_COLUMN_DEFINITIONS: ColumnDefinition[] = [
  // Identity
  { key: "case_id", label: "Case ID", type: "string", width: 36, isCore: true },
  {
    key: "case_number",
    label: "Case Number",
    type: "string",
    width: 20,
    isCore: true,
  },

  // Status
  {
    key: "case_status",
    label: "Status",
    type: "string",
    width: 12,
    isCore: true,
  },
  {
    key: "case_priority",
    label: "Priority",
    type: "string",
    width: 12,
    isCore: true,
  },

  // Dates
  {
    key: "case_created_at",
    label: "Created At",
    type: "date",
    format: "YYYY-MM-DD HH:mm",
    width: 18,
    isCore: true,
  },
  {
    key: "case_closed_at",
    label: "Closed At",
    type: "date",
    format: "YYYY-MM-DD HH:mm",
    width: 18,
    isCore: true,
  },
  {
    key: "case_days_open",
    label: "Days Open",
    type: "number",
    width: 10,
    isCore: true,
  },
  {
    key: "case_sla_breached",
    label: "SLA Breached",
    type: "boolean",
    width: 12,
    isCore: true,
  },

  // Classification
  {
    key: "category_name",
    label: "Category",
    type: "string",
    width: 25,
    isCore: true,
  },
  {
    key: "category_code",
    label: "Category Code",
    type: "string",
    width: 12,
    isCore: true,
  },
  {
    key: "subcategory_name",
    label: "Subcategory",
    type: "string",
    width: 25,
    isCore: true,
  },

  // Source
  {
    key: "source_channel",
    label: "Source Channel",
    type: "string",
    width: 15,
    isCore: true,
  },
  {
    key: "is_anonymous",
    label: "Anonymous",
    type: "boolean",
    width: 10,
    isCore: true,
  },
  {
    key: "reporter_relationship",
    label: "Reporter Relationship",
    type: "string",
    width: 18,
    isCore: true,
  },

  // Assignment
  {
    key: "assigned_to_name",
    label: "Assigned To",
    type: "string",
    width: 25,
    isCore: true,
  },
  {
    key: "assigned_to_email",
    label: "Assignee Email",
    type: "string",
    width: 30,
    isCore: true,
  },

  // Organization
  {
    key: "business_unit_name",
    label: "Business Unit",
    type: "string",
    width: 20,
    isCore: true,
  },
  {
    key: "business_unit_code",
    label: "BU Code",
    type: "string",
    width: 10,
    isCore: true,
  },
  {
    key: "location_name",
    label: "Location",
    type: "string",
    width: 20,
    isCore: true,
  },
  {
    key: "location_country",
    label: "Country",
    type: "string",
    width: 15,
    isCore: true,
  },
  {
    key: "location_region",
    label: "Region",
    type: "string",
    width: 15,
    isCore: true,
  },

  // Outcome
  { key: "outcome", label: "Outcome", type: "string", width: 20, isCore: true },
  {
    key: "outcome_reason",
    label: "Outcome Reason",
    type: "string",
    width: 30,
    isCore: true,
  },

  // Remediation
  {
    key: "has_remediation",
    label: "Has Remediation",
    type: "boolean",
    width: 15,
    isCore: true,
  },
  {
    key: "remediation_status",
    label: "Remediation Status",
    type: "string",
    width: 18,
    isCore: true,
  },

  // Counts
  {
    key: "riu_count",
    label: "RIU Count",
    type: "number",
    width: 10,
    isCore: true,
  },
  {
    key: "investigation_count",
    label: "Investigation Count",
    type: "number",
    width: 18,
    isCore: true,
  },
  {
    key: "subject_count",
    label: "Subject Count",
    type: "number",
    width: 12,
    isCore: true,
  },
  {
    key: "attachment_count",
    label: "Attachment Count",
    type: "number",
    width: 15,
    isCore: true,
  },
];

/**
 * Investigation column definitions (per investigation).
 * These are suffixed with _1, _2, _3 for each investigation.
 */
export const INVESTIGATION_COLUMN_DEFINITIONS: Omit<
  ColumnDefinition,
  "key" | "label"
>[] = [
  { type: "string", width: 36 }, // id
  { type: "string", width: 15 }, // type
  { type: "string", width: 15 }, // status
  { type: "string", width: 15 }, // outcome
  { type: "date", format: "YYYY-MM-DD", width: 12 }, // started_at
  { type: "date", format: "YYYY-MM-DD", width: 12 }, // completed_at
  { type: "number", width: 15 }, // days_to_complete
  { type: "string", width: 25 }, // investigator_name
  { type: "number", width: 15 }, // interview_count
  { type: "string", width: 50 }, // finding_summary
];

/**
 * Investigation column labels (without index suffix).
 */
export const INVESTIGATION_COLUMN_LABELS = [
  "Investigation ID",
  "Investigation Type",
  "Investigation Status",
  "Investigation Outcome",
  "Investigation Started",
  "Investigation Completed",
  "Days to Complete",
  "Investigator",
  "Interview Count",
  "Finding Summary",
];

/**
 * Investigation column keys (without index suffix).
 */
export const INVESTIGATION_COLUMN_KEYS = [
  "inv_id",
  "inv_type",
  "inv_status",
  "inv_outcome",
  "inv_started_at",
  "inv_completed_at",
  "inv_days_to_complete",
  "inv_investigator_name",
  "inv_interview_count",
  "inv_finding_summary",
];

/**
 * Generate investigation columns for N investigations.
 */
export function generateInvestigationColumns(
  maxInvestigations: number,
): ColumnDefinition[] {
  const columns: ColumnDefinition[] = [];

  for (let i = 1; i <= maxInvestigations; i++) {
    INVESTIGATION_COLUMN_KEYS.forEach((key, idx) => {
      const def = INVESTIGATION_COLUMN_DEFINITIONS[idx];
      columns.push({
        key: `${key.replace("inv_", `inv_${i}_`)}`,
        label: `Inv ${i} ${INVESTIGATION_COLUMN_LABELS[idx]}`,
        type: def.type,
        format: def.format,
        width: def.width,
        investigationIndex: i,
      });
    });
  }

  return columns;
}
