import { Injectable, Logger } from "@nestjs/common";
import { MigrationSourceType } from "@prisma/client";
import {
  BaseMigrationConnector,
  FieldMapping,
  FieldTransform,
  MigrationTargetEntity,
  TransformedRow,
  ValidationResult,
} from "./base.connector";

/**
 * Common field name variations for fuzzy matching
 * Maps normalized target field names to common source field variations
 */
const FIELD_ALIASES: Record<string, string[]> = {
  // Case identifiers
  caseNumber: [
    "case_number",
    "casenumber",
    "case_id",
    "caseid",
    "case_no",
    "caseno",
    "id",
    "report_number",
    "reportnumber",
    "report_id",
    "reportid",
    "incident_id",
    "incidentid",
    "ticket_number",
    "ticketnumber",
    "reference",
    "ref",
    "ref_no",
    "refno",
    "reference_number",
    "referencenumber",
  ],

  // Status
  status: [
    "status",
    "case_status",
    "casestatus",
    "current_status",
    "currentstatus",
    "state",
    "workflow_status",
    "workflowstatus",
    "stage",
    "phase",
  ],

  // Category/Type
  category: [
    "category",
    "type",
    "case_type",
    "casetype",
    "incident_type",
    "incidenttype",
    "issue_type",
    "issuetype",
    "classification",
    "class",
    "report_type",
    "reporttype",
    "concern_type",
    "concerntype",
  ],

  // Severity/Priority
  severity: [
    "severity",
    "priority",
    "urgency",
    "risk_level",
    "risklevel",
    "risk",
    "importance",
    "level",
    "criticality",
  ],

  // Dates
  createdAt: [
    "created",
    "created_at",
    "createdat",
    "date_created",
    "datecreated",
    "creation_date",
    "creationdate",
    "date_reported",
    "datereported",
    "report_date",
    "reportdate",
    "submitted",
    "submitted_at",
    "submittedat",
    "submission_date",
    "submissiondate",
    "received_date",
    "receiveddate",
    "intake_date",
    "intakedate",
  ],

  closedAt: [
    "closed",
    "closed_at",
    "closedat",
    "date_closed",
    "dateclosed",
    "resolution_date",
    "resolutiondate",
    "completed",
    "completed_at",
    "completedat",
    "close_date",
    "closedate",
    "end_date",
    "enddate",
  ],

  incidentDate: [
    "incident_date",
    "incidentdate",
    "event_date",
    "eventdate",
    "occurrence_date",
    "occurrencedate",
    "date_of_incident",
    "dateofincident",
    "when",
  ],

  // Description/Content
  description: [
    "description",
    "details",
    "narrative",
    "summary",
    "case_description",
    "casedescription",
    "report_details",
    "reportdetails",
    "incident_description",
    "incidentdescription",
    "allegation",
    "allegations",
    "concern",
    "issue",
    "notes",
    "body",
    "text",
    "content",
    "message",
  ],

  // Anonymous flag
  isAnonymous: [
    "anonymous",
    "is_anonymous",
    "isanonymous",
    "anon",
    "reporter_anonymous",
    "reporteranonymous",
    "confidential",
    "is_confidential",
    "isconfidential",
  ],

  // Location
  location: [
    "location",
    "site",
    "facility",
    "office",
    "branch",
    "place",
    "building",
    "workplace",
    "work_location",
    "worklocation",
  ],

  city: ["city", "town", "municipality"],

  state: [
    "state",
    "province",
    "region",
    "state_province",
    "stateprovince",
    "st",
  ],

  country: ["country", "nation", "country_code", "countrycode"],

  // Department/Business Unit
  department: [
    "department",
    "business_unit",
    "businessunit",
    "division",
    "org_unit",
    "orgunit",
    "unit",
    "team",
    "group",
    "area",
  ],

  // Outcome/Resolution
  outcome: [
    "outcome",
    "resolution",
    "finding",
    "findings",
    "result",
    "conclusion",
    "disposition",
    "decision",
    "action_taken",
    "actiontaken",
  ],

  // Reporter
  reporterName: [
    "reporter_name",
    "reportername",
    "reporter",
    "complainant",
    "complainant_name",
    "complainantname",
    "submitted_by",
    "submittedby",
    "filed_by",
    "filedby",
    "source_name",
    "sourcename",
  ],

  reporterEmail: [
    "reporter_email",
    "reporteremail",
    "email",
    "contact_email",
    "contactemail",
    "complainant_email",
    "complainantemail",
  ],

  reporterPhone: [
    "reporter_phone",
    "reporterphone",
    "phone",
    "telephone",
    "contact_phone",
    "contactphone",
    "contact_number",
    "contactnumber",
  ],

  // Subject/Accused
  subjectName: [
    "subject_name",
    "subjectname",
    "subject",
    "accused",
    "accused_name",
    "accusedname",
    "respondent",
    "respondent_name",
    "respondentname",
    "person_involved",
    "personinvolved",
  ],

  // Assignment
  assignee: [
    "assigned_to",
    "assignedto",
    "assignee",
    "owner",
    "handler",
    "investigator",
    "case_owner",
    "caseowner",
    "responsible",
    "responsible_person",
    "responsibleperson",
  ],

  // Employee ID
  employeeId: [
    "employee_id",
    "employeeid",
    "emp_id",
    "empid",
    "staff_id",
    "staffid",
    "worker_id",
    "workerid",
    "badge",
    "badge_number",
    "badgenumber",
  ],
};

/**
 * Target field to entity mapping
 */
const TARGET_ENTITY_MAP: Record<string, MigrationTargetEntity> = {
  caseNumber: "Case",
  status: "Case",
  category: "Case",
  severity: "Case",
  createdAt: "Case",
  closedAt: "Case",
  incidentDate: "Case",
  location: "Case",
  city: "Case",
  state: "Case",
  country: "Case",
  department: "Case",
  outcome: "Case",
  reporterName: "Case",
  reporterEmail: "Case",
  reporterPhone: "Case",
  description: "RIU",
  isAnonymous: "RIU",
  subjectName: "Person",
  employeeId: "Person",
  assignee: "Investigation",
};

/**
 * Target field name mapping to actual field names
 */
const TARGET_FIELD_MAP: Record<string, string> = {
  caseNumber: "referenceNumber",
  status: "status",
  category: "categoryName",
  severity: "severity",
  createdAt: "createdAt",
  closedAt: "closedAt",
  incidentDate: "incidentDate",
  location: "locationName",
  city: "locationCity",
  state: "locationState",
  country: "locationCountry",
  department: "businessUnitName",
  outcome: "outcome",
  reporterName: "reporterName",
  reporterEmail: "reporterEmail",
  reporterPhone: "reporterPhone",
  description: "details",
  isAnonymous: "isAnonymous",
  subjectName: "name",
  employeeId: "employeeId",
  assignee: "primaryInvestigatorName",
};

/**
 * Required fields for a valid import
 */
const REQUIRED_TARGETS = ["caseNumber", "description"];

/**
 * Generic status value mappings - covers common status values from various systems.
 * Maps source status strings (lowercase) to platform status values.
 */
const GENERIC_STATUS_MAPPINGS: Record<string, string> = {
  // Open/New statuses
  new: "OPEN",
  open: "OPEN",
  active: "OPEN",
  pending: "PENDING_INFO",
  awaiting: "PENDING_INFO",
  awaiting_info: "PENDING_INFO",
  waiting: "PENDING_INFO",
  on_hold: "PENDING_INFO",
  hold: "PENDING_INFO",

  // In Progress statuses
  in_progress: "IN_PROGRESS",
  inprogress: "IN_PROGRESS",
  investigating: "IN_PROGRESS",
  under_investigation: "IN_PROGRESS",
  assigned: "IN_PROGRESS",
  working: "IN_PROGRESS",
  review: "IN_REVIEW",
  in_review: "IN_REVIEW",
  under_review: "IN_REVIEW",

  // Closed statuses
  closed: "CLOSED",
  resolved: "CLOSED",
  complete: "CLOSED",
  completed: "CLOSED",
  done: "CLOSED",
  finished: "CLOSED",
  closed_substantiated: "CLOSED",
  closed_unsubstantiated: "CLOSED",
  dismissed: "CLOSED",
  withdrawn: "CLOSED",
  cancelled: "CLOSED",
  archived: "CLOSED",
};

/**
 * Generic category value mappings - covers common category values.
 * Maps source category strings (lowercase) to platform category values.
 */
const GENERIC_CATEGORY_MAPPINGS: Record<string, string> = {
  // Harassment
  harassment: "HARASSMENT",
  sexual_harassment: "HARASSMENT",
  bullying: "HARASSMENT",
  hostile_work_environment: "HARASSMENT",
  workplace_harassment: "HARASSMENT",

  // Discrimination
  discrimination: "DISCRIMINATION",
  bias: "DISCRIMINATION",
  unfair_treatment: "DISCRIMINATION",
  race: "DISCRIMINATION",
  gender: "DISCRIMINATION",
  age: "DISCRIMINATION",
  disability: "DISCRIMINATION",
  religious: "DISCRIMINATION",

  // Fraud
  fraud: "FRAUD",
  financial_fraud: "FRAUD",
  expense_fraud: "FRAUD",
  embezzlement: "FRAUD",
  falsification: "FRAUD",
  misrepresentation: "FRAUD",
  accounting_fraud: "FRAUD",

  // Theft
  theft: "THEFT",
  stealing: "THEFT",
  misappropriation: "THEFT",
  asset_theft: "THEFT",

  // Safety
  safety: "SAFETY",
  health_safety: "SAFETY",
  unsafe_conditions: "SAFETY",
  workplace_safety: "SAFETY",
  osha: "SAFETY",
  injury: "SAFETY",
  accident: "SAFETY",
  environmental: "SAFETY",

  // Policy Violations
  policy: "POLICY_VIOLATION",
  policy_violation: "POLICY_VIOLATION",
  code_of_conduct: "POLICY_VIOLATION",
  compliance: "POLICY_VIOLATION",
  procedure_violation: "POLICY_VIOLATION",
  rule_violation: "POLICY_VIOLATION",

  // Ethics
  ethics: "ETHICS_VIOLATION",
  ethics_violation: "ETHICS_VIOLATION",
  unethical: "ETHICS_VIOLATION",
  misconduct: "ETHICS_VIOLATION",

  // Conflict of Interest
  conflict: "CONFLICT_OF_INTEREST",
  conflict_of_interest: "CONFLICT_OF_INTEREST",
  coi: "CONFLICT_OF_INTEREST",
  related_party: "CONFLICT_OF_INTEREST",
  gifts: "CONFLICT_OF_INTEREST",

  // Retaliation
  retaliation: "RETALIATION",
  whistleblower_retaliation: "RETALIATION",
  retaliatory: "RETALIATION",

  // Data/Privacy
  data_breach: "DATA_PRIVACY",
  privacy: "DATA_PRIVACY",
  data_privacy: "DATA_PRIVACY",
  confidentiality: "DATA_PRIVACY",
  information_security: "DATA_PRIVACY",

  // Substance Abuse
  substance: "SUBSTANCE_ABUSE",
  substance_abuse: "SUBSTANCE_ABUSE",
  drugs: "SUBSTANCE_ABUSE",
  alcohol: "SUBSTANCE_ABUSE",
  impairment: "SUBSTANCE_ABUSE",

  // Other
  other: "OTHER",
  general: "OTHER",
  miscellaneous: "OTHER",
  unknown: "OTHER",
  unclassified: "OTHER",
  inquiry: "OTHER",
  question: "OTHER",
  suggestion: "OTHER",
};

/**
 * Generic severity value mappings.
 */
const GENERIC_SEVERITY_MAPPINGS: Record<string, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  urgent: "HIGH",
  severe: "HIGH",
  major: "HIGH",
  medium: "MEDIUM",
  moderate: "MEDIUM",
  normal: "MEDIUM",
  standard: "MEDIUM",
  low: "LOW",
  minor: "LOW",
  minimal: "LOW",
  informational: "LOW",
  info: "LOW",
};

/**
 * Generic CSV connector
 * Handles arbitrary CSV files with fuzzy field matching
 *
 * Features:
 * - Fuzzy field name matching using Levenshtein distance
 * - Comprehensive synonym dictionary for field mapping
 * - Generic status/category/severity value mappings
 * - Row ID generation for records without identifiers
 * - Configurable confidence thresholds
 */
@Injectable()
export class CsvConnector extends BaseMigrationConnector {
  readonly sourceType = MigrationSourceType.GENERIC_CSV;
  private readonly logger = new Logger(CsvConnector.name);

  /**
   * Calculate confidence that headers can be mapped
   * Generic CSV always has moderate base confidence, boosted by field matches
   */
  protected calculateConfidence(headers: string[]): number {
    const normalizedHeaders = headers.map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );

    let matchedFields = 0;
    const matchedTargets = new Set<string>();

    for (const [target, aliases] of Object.entries(FIELD_ALIASES)) {
      const normalizedAliases = aliases.map((a) =>
        a.toLowerCase().replace(/[^a-z0-9]/g, ""),
      );

      const hasMatch = normalizedHeaders.some(
        (h) =>
          normalizedAliases.includes(h) ||
          normalizedAliases.some((a) => this.calculateSimilarity(h, a) > 0.85),
      );

      if (hasMatch) {
        matchedFields++;
        matchedTargets.add(target);
      }
    }

    // Check for required fields (case number and description)
    const hasRequiredFields = REQUIRED_TARGETS.every((req) =>
      matchedTargets.has(req),
    );

    if (!hasRequiredFields) {
      // Without required fields, low confidence
      return Math.min(0.3, matchedFields / Object.keys(FIELD_ALIASES).length);
    }

    // Base confidence 0.5 + up to 0.4 based on field matches
    const matchRatio = matchedFields / Object.keys(FIELD_ALIASES).length;
    return 0.5 + matchRatio * 0.4;
  }

  /**
   * Get suggested field mappings - empty for generic CSV
   * Use generateMappings() instead for dynamic mapping
   */
  getSuggestedMappings(): FieldMapping[] {
    // Generic CSV doesn't have pre-defined mappings
    // Mappings are dynamically generated based on file headers
    return [];
  }

  /**
   * Generate suggested mappings based on actual file headers
   * Uses fuzzy matching against known field aliases
   */
  async generateMappings(buffer: Buffer): Promise<FieldMapping[]> {
    const headers = await this.getAvailableFields(buffer);
    const mappings: FieldMapping[] = [];
    const usedTargets = new Set<string>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");

      let bestMatch: { target: string; score: number } | null = null;

      for (const [target, aliases] of Object.entries(FIELD_ALIASES)) {
        // Skip if this target was already matched
        if (usedTargets.has(target)) continue;

        const normalizedAliases = aliases.map((a) =>
          a.replace(/[^a-z0-9]/g, ""),
        );

        // Check for exact match
        if (normalizedAliases.includes(normalizedHeader)) {
          bestMatch = { target, score: 1.0 };
          break;
        }

        // Check for fuzzy match
        for (const alias of normalizedAliases) {
          const similarity = this.calculateSimilarity(normalizedHeader, alias);
          if (
            similarity > 0.75 &&
            (!bestMatch || similarity > bestMatch.score)
          ) {
            bestMatch = { target, score: similarity };
          }
        }
      }

      if (bestMatch) {
        usedTargets.add(bestMatch.target);

        mappings.push({
          sourceField: header,
          targetField: TARGET_FIELD_MAP[bestMatch.target] || bestMatch.target,
          targetEntity: TARGET_ENTITY_MAP[bestMatch.target] || "Case",
          isRequired: REQUIRED_TARGETS.includes(bestMatch.target),
          transform: this.getDefaultTransform(bestMatch.target),
          description: `Auto-mapped from "${header}" (${Math.round(bestMatch.score * 100)}% match)`,
        });
      }
    }

    return mappings;
  }

  /**
   * Find best matching field for a given header
   * Returns the target field name and match score
   */
  findBestMatch(header: string): {
    target: string;
    targetField: string;
    entity: MigrationTargetEntity;
    score: number;
  } | null {
    const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
    let bestMatch: {
      target: string;
      targetField: string;
      entity: MigrationTargetEntity;
      score: number;
    } | null = null;

    for (const [target, aliases] of Object.entries(FIELD_ALIASES)) {
      const normalizedAliases = aliases.map((a) => a.replace(/[^a-z0-9]/g, ""));

      // Check for exact match
      if (normalizedAliases.includes(normalizedHeader)) {
        return {
          target,
          targetField: TARGET_FIELD_MAP[target] || target,
          entity: TARGET_ENTITY_MAP[target] || "Case",
          score: 1.0,
        };
      }

      // Check for fuzzy match
      for (const alias of normalizedAliases) {
        const similarity = this.calculateSimilarity(normalizedHeader, alias);
        if (similarity > 0.7 && (!bestMatch || similarity > bestMatch.score)) {
          bestMatch = {
            target,
            targetField: TARGET_FIELD_MAP[target] || target,
            entity: TARGET_ENTITY_MAP[target] || "Case",
            score: similarity,
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns a value between 0 (completely different) and 1 (identical)
   */
  calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Check for substring containment (partial match boost)
    if (s1.includes(s2) || s2.includes(s1)) {
      const minLen = Math.min(s1.length, s2.length);
      const maxLen = Math.max(s1.length, s2.length);
      return 0.7 + (minLen / maxLen) * 0.3;
    }

    const len1 = s1.length;
    const len2 = s2.length;

    // Create distance matrix
    const matrix: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost, // substitution
        );
      }
    }

    // Calculate similarity from distance
    const maxLen = Math.max(len1, len2);
    const distance = matrix[len1][len2];
    return 1 - distance / maxLen;
  }

  /**
   * Get default transform for a target field type
   */
  private getDefaultTransform(target: string): FieldTransform | undefined {
    switch (target) {
      case "createdAt":
      case "closedAt":
      case "incidentDate":
        // Auto-detect date format
        return { type: "parseDate", format: "auto" };

      case "isAnonymous":
        return { type: "parseBoolean" };

      case "status":
        return { type: "uppercase" };

      case "severity":
        return { type: "uppercase" };

      case "reporterEmail":
        return { type: "extractEmail" };

      case "reporterPhone":
        return { type: "extractPhone" };

      default:
        return { type: "trim" };
    }
  }

  /**
   * Get all known field aliases for documentation/UI
   */
  getFieldAliases(): Record<string, string[]> {
    return FIELD_ALIASES;
  }

  /**
   * Get required target fields
   */
  getRequiredTargets(): string[] {
    return REQUIRED_TARGETS;
  }

  /**
   * Get generic status mappings for external use.
   */
  getStatusMappings(): Record<string, string> {
    return GENERIC_STATUS_MAPPINGS;
  }

  /**
   * Get generic category mappings for external use.
   */
  getCategoryMappings(): Record<string, string> {
    return GENERIC_CATEGORY_MAPPINGS;
  }

  /**
   * Get generic severity mappings for external use.
   */
  getSeverityMappings(): Record<string, string> {
    return GENERIC_SEVERITY_MAPPINGS;
  }

  /**
   * Map a status value using generic mappings.
   * Tries exact match, then partial match, then defaults to OPEN.
   */
  mapStatus(value: string): string {
    if (!value) return "OPEN";
    const normalized = value.toLowerCase().trim().replace(/[\s-]+/g, "_");

    // Exact match
    if (GENERIC_STATUS_MAPPINGS[normalized]) {
      return GENERIC_STATUS_MAPPINGS[normalized];
    }

    // Partial match
    for (const [key, mapped] of Object.entries(GENERIC_STATUS_MAPPINGS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return mapped;
      }
    }

    // Default
    this.logger.debug(`Unknown status value: "${value}", defaulting to OPEN`);
    return "OPEN";
  }

  /**
   * Map a category value using generic mappings.
   * Tries exact match, then partial match, then defaults to OTHER.
   */
  mapCategory(value: string): string {
    if (!value) return "OTHER";
    const normalized = value.toLowerCase().trim().replace(/[\s-]+/g, "_");

    // Exact match
    if (GENERIC_CATEGORY_MAPPINGS[normalized]) {
      return GENERIC_CATEGORY_MAPPINGS[normalized];
    }

    // Partial match
    for (const [key, mapped] of Object.entries(GENERIC_CATEGORY_MAPPINGS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return mapped;
      }
    }

    // Default
    this.logger.debug(`Unknown category value: "${value}", defaulting to OTHER`);
    return "OTHER";
  }

  /**
   * Map a severity value using generic mappings.
   * Tries exact match, then partial match, then defaults to MEDIUM.
   */
  mapSeverity(value: string): string {
    if (!value) return "MEDIUM";
    const normalized = value.toLowerCase().trim().replace(/[\s-]+/g, "_");

    // Exact match
    if (GENERIC_SEVERITY_MAPPINGS[normalized]) {
      return GENERIC_SEVERITY_MAPPINGS[normalized];
    }

    // Partial match
    for (const [key, mapped] of Object.entries(GENERIC_SEVERITY_MAPPINGS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return mapped;
      }
    }

    // Try to infer from numbers (1-5 scale)
    const numMatch = normalized.match(/^(\d)$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num === 1 || num === 5) return "CRITICAL";
      if (num === 2 || num === 4) return "HIGH";
      if (num === 3) return "MEDIUM";
      return "LOW";
    }

    // Default
    this.logger.debug(`Unknown severity value: "${value}", defaulting to MEDIUM`);
    return "MEDIUM";
  }

  /**
   * Generate a unique row ID for records without identifiers.
   * Uses a hash of the row content to create a deterministic ID.
   */
  generateRowId(row: Record<string, unknown>, rowNumber?: number): string {
    // Try to create a meaningful ID from row content
    const content = JSON.stringify(row);
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const hashHex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");

    if (rowNumber !== undefined) {
      return `CSV-${hashHex}-R${rowNumber}`;
    }

    return `CSV-${hashHex}`;
  }

  /**
   * Override validateRow to use generic CSV validation rules.
   * More lenient than specific connectors - just checks for data presence.
   */
  override validateRow(
    row: Record<string, string>,
    mappings: FieldMapping[],
  ): ValidationResult {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    // Check row isn't empty
    const hasData = Object.values(row).some(
      (v) => v !== null && v !== undefined && v !== "",
    );

    if (!hasData) {
      errors.push({
        field: "_row",
        message: "Row appears to be empty",
      });
      return { isValid: false, errors, warnings };
    }

    // Check required fields from mappings
    for (const mapping of mappings) {
      if (!mapping.isRequired) continue;

      const value = row[mapping.sourceField];
      if (!value || String(value).trim() === "") {
        errors.push({
          field: mapping.sourceField,
          message: `Required field "${mapping.sourceField}" is empty`,
        });
      }
    }

    // Validate specific field types (warnings only for optional)
    for (const mapping of mappings) {
      const value = row[mapping.sourceField];
      if (!value || String(value).trim() === "") continue;

      // Validate email format
      if (
        mapping.targetField === "reporterEmail" ||
        mapping.targetField === "email"
      ) {
        if (!this.looksLikeEmail(String(value))) {
          warnings.push({
            field: mapping.sourceField,
            message: `Value "${value}" doesn't look like a valid email`,
          });
        }
      }

      // Validate date format
      if (
        ["createdAt", "closedAt", "incidentDate"].includes(mapping.targetField)
      ) {
        if (!this.looksLikeDate(String(value))) {
          warnings.push({
            field: mapping.sourceField,
            message: `Value "${value}" might not be a valid date`,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Override transformRow to apply generic value mappings.
   */
  override transformRow(
    row: Record<string, string>,
    mappings: FieldMapping[],
  ): TransformedRow {
    // Call base implementation
    const result = super.transformRow(row, mappings);

    // Apply additional generic mappings to transformed values
    if (result.case) {
      if (result.case.status && typeof result.case.status === "string") {
        result.case.status = this.mapStatus(result.case.status);
      }
      if (result.case.categoryName && typeof result.case.categoryName === "string") {
        result.case.categoryName = this.mapCategory(result.case.categoryName);
      }
      if (result.case.severity && typeof result.case.severity === "string") {
        result.case.severity = this.mapSeverity(result.case.severity);
      }

      // Ensure reference number exists
      if (!result.case.referenceNumber) {
        result.case.referenceNumber = this.generateRowId(row);
      }
    }

    if (result.riu) {
      if (result.riu.categoryName && typeof result.riu.categoryName === "string") {
        result.riu.categoryName = this.mapCategory(result.riu.categoryName);
      }
      if (result.riu.severity && typeof result.riu.severity === "string") {
        result.riu.severity = this.mapSeverity(result.riu.severity);
      }

      // Ensure reference number exists
      if (!result.riu.referenceNumber) {
        result.riu.referenceNumber = this.generateRowId(row);
      }
    }

    return result;
  }

  /**
   * Check if value looks like an email address.
   */
  private looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  /**
   * Check if value looks like a date.
   */
  private looksLikeDate(value: string): boolean {
    const trimmed = value.trim();
    return (
      /^\d{4}-\d{2}-\d{2}/.test(trimmed) || // ISO
      /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed) || // US/EU
      /^\d{1,2}-\d{1,2}-\d{2,4}/.test(trimmed) || // Alternative
      !isNaN(Date.parse(trimmed)) // Generic date parse
    );
  }
}
