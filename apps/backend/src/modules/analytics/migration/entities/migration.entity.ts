import { MigrationSourceType } from '@prisma/client';
import { TargetEntityType, TransformFunction } from '../dto/migration.dto';

/**
 * Field mapping configuration stored in MigrationJob.fieldMappings
 */
export interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  targetEntity: TargetEntityType;
  transformFunction?: TransformFunction;
  transformParams?: Record<string, unknown>;
  defaultValue?: unknown;
  isRequired: boolean;
  description?: string;
}

/**
 * Source field metadata detected from file
 */
export interface SourceFieldInfo {
  name: string;
  sampleValues: unknown[];
  detectedType: 'string' | 'number' | 'date' | 'boolean' | 'unknown';
  nullCount: number;
  uniqueCount: number;
}

/**
 * NAVEX field mapping hints
 */
export const NAVEX_FIELD_MAPPINGS: Record<string, { targetField: string; targetEntity: TargetEntityType }> = {
  // Case number and identifiers
  case_number: { targetField: 'referenceNumber', targetEntity: TargetEntityType.CASE },
  case_id: { targetField: 'referenceNumber', targetEntity: TargetEntityType.CASE },
  report_id: { targetField: 'referenceNumber', targetEntity: TargetEntityType.RIU },

  // Classification
  incident_type: { targetField: 'categoryName', targetEntity: TargetEntityType.CASE },
  issue_type: { targetField: 'categoryName', targetEntity: TargetEntityType.CASE },
  category: { targetField: 'categoryName', targetEntity: TargetEntityType.CASE },
  subcategory: { targetField: 'secondaryCategoryName', targetEntity: TargetEntityType.CASE },
  severity: { targetField: 'severity', targetEntity: TargetEntityType.CASE },
  priority: { targetField: 'severity', targetEntity: TargetEntityType.CASE },

  // Dates
  created_date: { targetField: 'createdAt', targetEntity: TargetEntityType.CASE },
  date_reported: { targetField: 'intakeTimestamp', targetEntity: TargetEntityType.CASE },
  incident_date: { targetField: 'incidentDate', targetEntity: TargetEntityType.CASE },
  closed_date: { targetField: 'closedAt', targetEntity: TargetEntityType.CASE },
  due_date: { targetField: 'dueDate', targetEntity: TargetEntityType.INVESTIGATION },

  // Status
  status: { targetField: 'status', targetEntity: TargetEntityType.CASE },
  case_status: { targetField: 'status', targetEntity: TargetEntityType.CASE },
  outcome: { targetField: 'outcome', targetEntity: TargetEntityType.CASE },

  // Content
  description: { targetField: 'details', targetEntity: TargetEntityType.RIU },
  details: { targetField: 'details', targetEntity: TargetEntityType.RIU },
  narrative: { targetField: 'details', targetEntity: TargetEntityType.RIU },
  summary: { targetField: 'summary', targetEntity: TargetEntityType.RIU },
  notes: { targetField: 'notes', targetEntity: TargetEntityType.INVESTIGATION },

  // Location
  location: { targetField: 'locationName', targetEntity: TargetEntityType.CASE },
  facility: { targetField: 'locationName', targetEntity: TargetEntityType.CASE },
  site: { targetField: 'locationName', targetEntity: TargetEntityType.CASE },
  city: { targetField: 'locationCity', targetEntity: TargetEntityType.CASE },
  state: { targetField: 'locationState', targetEntity: TargetEntityType.CASE },
  country: { targetField: 'locationCountry', targetEntity: TargetEntityType.CASE },

  // Reporter
  reporter_type: { targetField: 'reporterType', targetEntity: TargetEntityType.RIU },
  anonymous: { targetField: 'reporterAnonymous', targetEntity: TargetEntityType.CASE },
  reporter_name: { targetField: 'reporterName', targetEntity: TargetEntityType.CASE },
  reporter_email: { targetField: 'reporterEmail', targetEntity: TargetEntityType.CASE },

  // Person/Subject
  subject_name: { targetField: 'name', targetEntity: TargetEntityType.PERSON },
  accused_name: { targetField: 'name', targetEntity: TargetEntityType.PERSON },
  employee_name: { targetField: 'name', targetEntity: TargetEntityType.PERSON },
  employee_id: { targetField: 'employeeId', targetEntity: TargetEntityType.PERSON },

  // Assignment
  assigned_to: { targetField: 'primaryInvestigatorName', targetEntity: TargetEntityType.INVESTIGATION },
  investigator: { targetField: 'primaryInvestigatorName', targetEntity: TargetEntityType.INVESTIGATION },
};

/**
 * EQS/Conversant field mapping hints
 */
export const EQS_FIELD_MAPPINGS: Record<string, { targetField: string; targetEntity: TargetEntityType }> = {
  report_id: { targetField: 'referenceNumber', targetEntity: TargetEntityType.RIU },
  ref_number: { targetField: 'referenceNumber', targetEntity: TargetEntityType.CASE },
  created_date: { targetField: 'createdAt', targetEntity: TargetEntityType.CASE },
  report_date: { targetField: 'intakeTimestamp', targetEntity: TargetEntityType.CASE },
  category_name: { targetField: 'categoryName', targetEntity: TargetEntityType.CASE },
  issue_category: { targetField: 'categoryName', targetEntity: TargetEntityType.CASE },
  report_text: { targetField: 'details', targetEntity: TargetEntityType.RIU },
  description: { targetField: 'details', targetEntity: TargetEntityType.RIU },
  status_name: { targetField: 'status', targetEntity: TargetEntityType.CASE },
  assigned_user: { targetField: 'primaryInvestigatorName', targetEntity: TargetEntityType.INVESTIGATION },
  site_name: { targetField: 'locationName', targetEntity: TargetEntityType.CASE },
  region: { targetField: 'locationState', targetEntity: TargetEntityType.CASE },
};

/**
 * Legacy Ethico field mapping hints
 */
export const LEGACY_ETHICO_FIELD_MAPPINGS: Record<string, { targetField: string; targetEntity: TargetEntityType }> = {
  case_num: { targetField: 'referenceNumber', targetEntity: TargetEntityType.CASE },
  riu_num: { targetField: 'referenceNumber', targetEntity: TargetEntityType.RIU },
  case_type: { targetField: 'categoryName', targetEntity: TargetEntityType.CASE },
  narrative: { targetField: 'details', targetEntity: TargetEntityType.RIU },
  call_details: { targetField: 'details', targetEntity: TargetEntityType.RIU },
  intake_date: { targetField: 'intakeTimestamp', targetEntity: TargetEntityType.CASE },
  case_status: { targetField: 'status', targetEntity: TargetEntityType.CASE },
  investigator: { targetField: 'primaryInvestigatorName', targetEntity: TargetEntityType.INVESTIGATION },
  site_code: { targetField: 'locationName', targetEntity: TargetEntityType.CASE },
};

/**
 * Get field mapping hints based on source type
 */
export function getFieldMappingHints(
  sourceType: MigrationSourceType,
): Record<string, { targetField: string; targetEntity: TargetEntityType }> {
  switch (sourceType) {
    case MigrationSourceType.NAVEX:
      return NAVEX_FIELD_MAPPINGS;
    case MigrationSourceType.EQS:
      return EQS_FIELD_MAPPINGS;
    case MigrationSourceType.LEGACY_ETHICO:
      return LEGACY_ETHICO_FIELD_MAPPINGS;
    default:
      return {}; // Generic CSV uses fuzzy matching
  }
}

/**
 * Target fields available for each entity type
 */
export const TARGET_FIELDS: Record<TargetEntityType, string[]> = {
  [TargetEntityType.CASE]: [
    'referenceNumber',
    'status',
    'details',
    'summary',
    'severity',
    'intakeTimestamp',
    'categoryName',
    'secondaryCategoryName',
    'locationName',
    'locationCity',
    'locationState',
    'locationCountry',
    'locationZip',
    'reporterType',
    'reporterName',
    'reporterEmail',
    'reporterPhone',
    'reporterAnonymous',
    'outcome',
    'outcomeNotes',
    'tags',
    'customFields',
  ],
  [TargetEntityType.RIU]: [
    'referenceNumber',
    'type',
    'details',
    'summary',
    'severity',
    'categoryName',
    'reporterType',
    'reporterName',
    'reporterEmail',
    'reporterPhone',
    'locationName',
    'locationCity',
    'locationState',
    'locationCountry',
    'customFields',
    'formResponses',
  ],
  [TargetEntityType.PERSON]: [
    'firstName',
    'lastName',
    'name', // Split into first/last
    'email',
    'phone',
    'employeeId',
    'jobTitle',
    'department',
    'location',
    'company',
    'relationship',
    'notes',
  ],
  [TargetEntityType.INVESTIGATION]: [
    'investigationNumber',
    'status',
    'dueDate',
    'primaryInvestigatorName',
    'findingsSummary',
    'findingsDetail',
    'outcome',
    'notes',
    'rootCause',
    'lessonsLearned',
  ],
};

/**
 * Transform function descriptions for UI
 */
export const TRANSFORM_DESCRIPTIONS: Record<TransformFunction, string> = {
  [TransformFunction.UPPERCASE]: 'Convert text to uppercase',
  [TransformFunction.LOWERCASE]: 'Convert text to lowercase',
  [TransformFunction.TRIM]: 'Remove leading/trailing whitespace',
  [TransformFunction.PARSE_DATE]: 'Parse date (auto-detect format)',
  [TransformFunction.PARSE_DATE_US]: 'Parse date in MM/DD/YYYY format',
  [TransformFunction.PARSE_DATE_EU]: 'Parse date in DD/MM/YYYY format',
  [TransformFunction.PARSE_DATE_ISO]: 'Parse date in YYYY-MM-DD format',
  [TransformFunction.MAP_CATEGORY]: 'Map to category using lookup table',
  [TransformFunction.MAP_SEVERITY]: 'Map to severity level (HIGH/MEDIUM/LOW)',
  [TransformFunction.MAP_STATUS]: 'Map to case status',
  [TransformFunction.PARSE_BOOLEAN]: 'Parse as boolean (yes/no, true/false, 1/0)',
  [TransformFunction.PARSE_NUMBER]: 'Parse as number',
  [TransformFunction.SPLIT_COMMA]: 'Split comma-separated values into array',
  [TransformFunction.EXTRACT_EMAIL]: 'Extract email address from text',
  [TransformFunction.EXTRACT_PHONE]: 'Extract phone number from text',
};
