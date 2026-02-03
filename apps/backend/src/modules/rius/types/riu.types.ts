/**
 * RIU (Risk Intelligence Unit) Type Definitions
 *
 * Defines immutability enforcement for RIU fields.
 * RIU content is frozen at intake - only status and AI enrichment can change.
 */

/**
 * Fields that CANNOT be modified after RIU creation.
 * These represent the original intake content - corrections go on the linked Case.
 */
export const IMMUTABLE_RIU_FIELDS = [
  // Classification
  'type',
  'sourceChannel',

  // Content
  'details',
  'summary',

  // Reporter Information
  'reporterType',
  'anonymousAccessCode',
  'reporterName',
  'reporterEmail',
  'reporterPhone',

  // Classification (as captured at intake)
  'categoryId',
  'severity',

  // Location Information
  'locationName',
  'locationAddress',
  'locationCity',
  'locationState',
  'locationZip',
  'locationCountry',

  // Campaign linkage
  'campaignId',
  'campaignAssignmentId',

  // Custom Data
  'customFields',
  'formResponses',

  // Migration Support
  'sourceSystem',
  'sourceRecordId',
  'migratedAt',

  // Audit
  'createdAt',
  'createdById',
  'referenceNumber',
  'organizationId',
] as const;

/**
 * Fields that CAN be modified after RIU creation.
 * These are system-managed fields for status tracking and AI enrichment.
 */
export const MUTABLE_RIU_FIELDS = [
  // Status workflow
  'status',
  'statusChangedAt',
  'statusChangedById',

  // Language handling
  'languageDetected',
  'languageConfirmed',
  'languageEffective',

  // AI Enrichment (can be regenerated)
  'aiSummary',
  'aiRiskScore',
  'aiTranslation',
  'aiLanguageDetected',
  'aiModelVersion',
  'aiGeneratedAt',
  'aiConfidenceScore',

  // Demo support
  'demoUserSessionId',
  'isBaseData',
] as const;

/**
 * Type for immutable RIU field names
 */
export type ImmutableRiuField = (typeof IMMUTABLE_RIU_FIELDS)[number];

/**
 * Type for mutable RIU field names
 */
export type MutableRiuField = (typeof MUTABLE_RIU_FIELDS)[number];

/**
 * Checks if a field is immutable
 */
export function isImmutableField(field: string): boolean {
  return IMMUTABLE_RIU_FIELDS.includes(field as ImmutableRiuField);
}

/**
 * Checks if a field is mutable
 */
export function isMutableField(field: string): boolean {
  return MUTABLE_RIU_FIELDS.includes(field as MutableRiuField);
}

/**
 * Returns all immutable fields that are present in the given object
 */
export function getImmutableFieldsInObject(obj: object): string[] {
  return Object.keys(obj).filter(isImmutableField);
}
