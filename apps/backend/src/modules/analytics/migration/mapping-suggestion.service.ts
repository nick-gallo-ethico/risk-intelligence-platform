import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { FieldMappingDto, TargetEntityType } from "./dto/migration.dto";
import { MigrationSourceType } from "@prisma/client";

/**
 * Known field synonyms for fuzzy matching.
 * Maps target field names to common source field variations.
 */
const FIELD_SYNONYMS: Record<string, string[]> = {
  // Case/RIU identifiers
  sourceRecordId: [
    "id",
    "case_id",
    "case_number",
    "report_id",
    "incident_id",
    "reference",
    "ref",
    "ticket",
    "record_id",
    "external_id",
  ],
  referenceNumber: [
    "case_number",
    "case_ref",
    "reference",
    "ref_number",
    "ticket_number",
    "report_number",
    "incident_number",
  ],

  // Dates
  incidentDate: [
    "incident_date",
    "date_of_incident",
    "occurrence_date",
    "event_date",
    "when",
    "happened_date",
    "occurred_date",
  ],
  createdAt: [
    "created_date",
    "report_date",
    "submitted_date",
    "submission_date",
    "opened_date",
    "intake_date",
    "received_date",
    "date_created",
    "created",
  ],
  closedAt: [
    "closed_date",
    "close_date",
    "resolution_date",
    "completed_date",
    "end_date",
    "resolved_date",
    "finished_date",
  ],

  // Content
  details: [
    "description",
    "allegation",
    "narrative",
    "summary",
    "incident_description",
    "details",
    "report_text",
    "content",
    "concern",
    "issue",
    "body",
    "message",
    "notes",
  ],
  categoryName: [
    "category",
    "incident_type",
    "issue_type",
    "type",
    "classification",
    "topic",
    "concern_type",
    "report_type",
    "case_type",
  ],
  severity: [
    "severity",
    "priority",
    "risk_level",
    "urgency",
    "criticality",
    "importance",
    "risk",
    "level",
  ],
  status: [
    "status",
    "state",
    "case_status",
    "current_status",
    "workflow_status",
    "stage",
    "phase",
  ],

  // Reporter
  reporterType: [
    "reporter_type",
    "anonymous",
    "is_anonymous",
    "reporter_relationship",
    "contact_type",
    "source_type",
    "confidential",
  ],
  reporterName: [
    "reporter_name",
    "reporter",
    "complainant",
    "complainant_name",
    "submitted_by",
    "filed_by",
    "source_name",
  ],
  reporterEmail: [
    "reporter_email",
    "email",
    "contact_email",
    "complainant_email",
  ],
  reporterPhone: [
    "reporter_phone",
    "phone",
    "telephone",
    "contact_phone",
    "contact_number",
  ],

  // Location
  locationName: [
    "location",
    "location_name",
    "site",
    "office",
    "country",
    "region",
    "facility",
    "branch",
    "building",
    "workplace",
  ],
  locationCity: ["city", "town", "municipality"],
  locationState: ["state", "province", "region", "state_province"],
  locationCountry: ["country", "nation", "country_code"],
  businessUnitName: [
    "business_unit",
    "department",
    "division",
    "team",
    "group",
    "unit",
    "area",
    "org_unit",
  ],

  // Assignment
  assignedToEmail: [
    "assigned_to",
    "assignee",
    "handler",
    "investigator",
    "owner",
    "case_manager",
    "case_owner",
    "responsible",
  ],

  // Person fields
  firstName: ["first_name", "given_name", "forename", "fname"],
  lastName: ["last_name", "surname", "family_name", "lname"],
  email: ["email", "email_address", "e_mail", "mail"],
  phone: ["phone", "phone_number", "telephone", "mobile", "cell"],
  employeeId: [
    "employee_id",
    "emp_id",
    "staff_id",
    "worker_id",
    "badge",
    "badge_number",
  ],
  jobTitle: ["job_title", "title", "position", "role"],

  // Subject/Accused
  subjectName: [
    "subject_name",
    "subject",
    "accused",
    "accused_name",
    "respondent",
    "respondent_name",
    "person_involved",
  ],

  // Resolution
  resolution: [
    "resolution",
    "outcome",
    "findings",
    "result",
    "final_outcome",
    "determination",
    "conclusion",
    "disposition",
    "action_taken",
  ],

  // Investigation
  investigationNotes: [
    "investigation_notes",
    "inv_notes",
    "findings_detail",
    "investigation_summary",
  ],
  dueDate: ["due_date", "deadline", "target_date", "expected_close"],
};

/**
 * Platform target fields with their entity types and descriptions.
 */
const TARGET_FIELDS: {
  field: string;
  entity: TargetEntityType;
  description: string;
  isRequired?: boolean;
}[] = [
  // RIU fields
  {
    field: "sourceRecordId",
    entity: TargetEntityType.RIU,
    description: "Original record identifier",
    isRequired: true,
  },
  {
    field: "details",
    entity: TargetEntityType.RIU,
    description: "Incident description/narrative",
    isRequired: true,
  },
  {
    field: "categoryName",
    entity: TargetEntityType.RIU,
    description: "Category or incident type",
  },
  {
    field: "severity",
    entity: TargetEntityType.RIU,
    description: "Severity or priority level",
  },
  {
    field: "reporterType",
    entity: TargetEntityType.RIU,
    description: "Reporter type (anonymous/confidential/identified)",
  },
  {
    field: "incidentDate",
    entity: TargetEntityType.RIU,
    description: "Date incident occurred",
  },
  {
    field: "locationName",
    entity: TargetEntityType.RIU,
    description: "Location or site name",
  },
  {
    field: "businessUnitName",
    entity: TargetEntityType.RIU,
    description: "Business unit or department",
  },
  {
    field: "reporterName",
    entity: TargetEntityType.RIU,
    description: "Reporter name (if not anonymous)",
  },
  {
    field: "reporterEmail",
    entity: TargetEntityType.RIU,
    description: "Reporter email",
  },
  {
    field: "reporterPhone",
    entity: TargetEntityType.RIU,
    description: "Reporter phone",
  },

  // Case fields
  {
    field: "referenceNumber",
    entity: TargetEntityType.CASE,
    description: "Case reference number",
  },
  {
    field: "status",
    entity: TargetEntityType.CASE,
    description: "Current case status",
  },
  {
    field: "assignedToEmail",
    entity: TargetEntityType.CASE,
    description: "Assigned handler email",
  },
  {
    field: "closedAt",
    entity: TargetEntityType.CASE,
    description: "Date case was closed",
  },
  {
    field: "resolution",
    entity: TargetEntityType.CASE,
    description: "Resolution or outcome",
  },
  {
    field: "createdAt",
    entity: TargetEntityType.CASE,
    description: "Date case was created",
  },
  {
    field: "locationCity",
    entity: TargetEntityType.CASE,
    description: "City name",
  },
  {
    field: "locationState",
    entity: TargetEntityType.CASE,
    description: "State or province",
  },
  {
    field: "locationCountry",
    entity: TargetEntityType.CASE,
    description: "Country name or code",
  },

  // Person fields
  {
    field: "firstName",
    entity: TargetEntityType.PERSON,
    description: "First/given name",
  },
  {
    field: "lastName",
    entity: TargetEntityType.PERSON,
    description: "Last/family name",
  },
  {
    field: "email",
    entity: TargetEntityType.PERSON,
    description: "Email address",
  },
  { field: "phone", entity: TargetEntityType.PERSON, description: "Phone number" },
  {
    field: "employeeId",
    entity: TargetEntityType.PERSON,
    description: "Employee ID",
  },
  {
    field: "jobTitle",
    entity: TargetEntityType.PERSON,
    description: "Job title",
  },
  {
    field: "subjectName",
    entity: TargetEntityType.PERSON,
    description: "Subject/accused name",
  },

  // Investigation fields
  {
    field: "investigationNotes",
    entity: TargetEntityType.INVESTIGATION,
    description: "Investigation notes/findings",
  },
  {
    field: "dueDate",
    entity: TargetEntityType.INVESTIGATION,
    description: "Investigation due date",
  },
];

/**
 * Suggested mapping with confidence score and reasoning.
 */
export interface SuggestedMapping extends FieldMappingDto {
  confidence: number; // 0-100
  reason: string;
}

/**
 * Template summary returned when listing templates.
 */
export interface TemplateSummary {
  name: string;
  fieldCount: number;
  createdAt: Date;
}

/**
 * MappingSuggestionService provides intelligent field mapping suggestions
 * for CSV imports based on field name analysis and data type inference.
 *
 * Features:
 * - Fuzzy matching on field names using synonyms
 * - Data type inference from sample values
 * - Confidence scoring for each suggestion
 * - Template save/load for reusing mappings
 */
@Injectable()
export class MappingSuggestionService {
  private readonly logger = new Logger(MappingSuggestionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Suggest field mappings based on source column names and sample data.
   *
   * @param orgId - Organization ID
   * @param sourceFields - Array of column names from the CSV
   * @param sampleData - Sample rows for data type inference
   * @param existingTemplate - Optional template name to load instead of generating
   */
  async suggestMappings(
    orgId: string,
    sourceFields: string[],
    sampleData: Record<string, unknown>[],
    existingTemplate?: string,
  ): Promise<SuggestedMapping[]> {
    // Load existing template if specified
    if (existingTemplate) {
      const template = await this.prisma.migrationFieldTemplate.findFirst({
        where: {
          organizationId: orgId,
          name: existingTemplate,
          sourceType: MigrationSourceType.GENERIC_CSV,
        },
      });

      if (template && Array.isArray(template.mappings)) {
        this.logger.log(`Using saved template: ${existingTemplate}`);
        return (template.mappings as unknown as SuggestedMapping[]).map(
          (m) => ({
            ...m,
            confidence: 100,
            reason: `From saved template: ${existingTemplate}`,
          }),
        );
      }

      this.logger.warn(`Template not found: ${existingTemplate}`);
    }

    const suggestions: SuggestedMapping[] = [];
    const usedTargets = new Set<string>();

    // Sort source fields to process potential identifiers first
    const sortedFields = this.prioritizeFields(sourceFields);

    for (const sourceField of sortedFields) {
      const suggestion = this.suggestMapping(
        sourceField,
        sampleData,
        usedTargets,
      );
      if (suggestion) {
        suggestions.push(suggestion);
        usedTargets.add(suggestion.targetField);
      }
    }

    return suggestions;
  }

  /**
   * Suggest mapping for a single field.
   */
  private suggestMapping(
    sourceField: string,
    sampleData: Record<string, unknown>[],
    usedTargets: Set<string>,
  ): SuggestedMapping | null {
    const normalized = this.normalizeFieldName(sourceField);

    // Try exact synonym match first
    for (const [targetField, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (usedTargets.has(targetField)) continue;

      const normalizedSynonyms = synonyms.map((s) => this.normalizeFieldName(s));

      if (normalizedSynonyms.includes(normalized)) {
        const targetInfo = TARGET_FIELDS.find((t) => t.field === targetField);
        if (targetInfo) {
          return {
            sourceField,
            targetField,
            targetEntity: targetInfo.entity,
            isRequired: targetInfo.isRequired || false,
            transformFunction: this.inferTransform(targetField),
            confidence: 95,
            reason: `Exact match: "${sourceField}" matches known synonym`,
          };
        }
      }
    }

    // Try partial/substring match
    for (const [targetField, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (usedTargets.has(targetField)) continue;

      const normalizedSynonyms = synonyms.map((s) => this.normalizeFieldName(s));

      for (const synonym of normalizedSynonyms) {
        if (normalized.includes(synonym) || synonym.includes(normalized)) {
          if (Math.min(normalized.length, synonym.length) >= 3) {
            const targetInfo = TARGET_FIELDS.find((t) => t.field === targetField);
            if (targetInfo) {
              return {
                sourceField,
                targetField,
                targetEntity: targetInfo.entity,
                isRequired: false, // Partial matches not required
                transformFunction: this.inferTransform(targetField),
                confidence: 75,
                reason: `Partial match: "${sourceField}" contains "${synonym}"`,
              };
            }
          }
        }
      }
    }

    // Try fuzzy match using Levenshtein distance
    const fuzzyMatch = this.findFuzzyMatch(normalized, usedTargets);
    if (fuzzyMatch) {
      const targetInfo = TARGET_FIELDS.find(
        (t) => t.field === fuzzyMatch.targetField,
      );
      if (targetInfo) {
        return {
          sourceField,
          targetField: fuzzyMatch.targetField,
          targetEntity: targetInfo.entity,
          isRequired: false,
          transformFunction: this.inferTransform(fuzzyMatch.targetField),
          confidence: Math.round(fuzzyMatch.similarity * 100),
          reason: `Fuzzy match: "${sourceField}" similar to "${fuzzyMatch.matchedSynonym}"`,
        };
      }
    }

    // Try data-type inference as last resort
    const inferredTarget = this.inferFromDataType(
      sourceField,
      sampleData,
      usedTargets,
    );
    if (inferredTarget) {
      return inferredTarget;
    }

    return null;
  }

  /**
   * Find fuzzy match using Levenshtein distance.
   */
  private findFuzzyMatch(
    normalized: string,
    usedTargets: Set<string>,
  ): { targetField: string; similarity: number; matchedSynonym: string } | null {
    let bestMatch: {
      targetField: string;
      similarity: number;
      matchedSynonym: string;
    } | null = null;

    for (const [targetField, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (usedTargets.has(targetField)) continue;

      for (const synonym of synonyms) {
        const normalizedSynonym = this.normalizeFieldName(synonym);
        const similarity = this.calculateSimilarity(normalized, normalizedSynonym);

        if (similarity > 0.7 && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = {
            targetField,
            similarity,
            matchedSynonym: synonym,
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Infer mapping from data values when name matching fails.
   */
  private inferFromDataType(
    sourceField: string,
    sampleData: Record<string, unknown>[],
    usedTargets: Set<string>,
  ): SuggestedMapping | null {
    const values = sampleData
      .map((row) => row[sourceField])
      .filter((v) => v !== null && v !== undefined && v !== "");

    if (values.length === 0) return null;

    const sampleValue = String(values[0]);

    // Check for date patterns
    if (this.looksLikeDate(sampleValue) && !usedTargets.has("incidentDate")) {
      return {
        sourceField,
        targetField: "incidentDate",
        targetEntity: TargetEntityType.RIU,
        isRequired: false,
        transformFunction: undefined, // Will be detected
        confidence: 50,
        reason: "Detected date format in values",
      };
    }

    // Check for email patterns
    if (this.looksLikeEmail(sampleValue) && !usedTargets.has("email")) {
      return {
        sourceField,
        targetField: "email",
        targetEntity: TargetEntityType.PERSON,
        isRequired: false,
        confidence: 60,
        reason: "Detected email format in values",
      };
    }

    // Check for phone patterns
    if (this.looksLikePhone(sampleValue) && !usedTargets.has("phone")) {
      return {
        sourceField,
        targetField: "phone",
        targetEntity: TargetEntityType.PERSON,
        isRequired: false,
        confidence: 55,
        reason: "Detected phone number format in values",
      };
    }

    // Check for long text (likely description)
    const avgLength =
      values.reduce((sum, v) => sum + String(v).length, 0) / values.length;
    if (avgLength > 100 && !usedTargets.has("details")) {
      return {
        sourceField,
        targetField: "details",
        targetEntity: TargetEntityType.RIU,
        isRequired: false,
        confidence: 40,
        reason: `Detected long text values (avg ${Math.round(avgLength)} chars)`,
      };
    }

    return null;
  }

  /**
   * Infer appropriate transform function based on target field.
   */
  private inferTransform(targetField: string): string | undefined {
    const dateFields = ["incidentDate", "createdAt", "closedAt", "dueDate"];
    if (dateFields.includes(targetField)) {
      return "parseDate";
    }

    if (targetField === "categoryName") {
      return "mapCategory";
    }

    if (targetField === "status") {
      return "mapStatus";
    }

    if (targetField === "severity") {
      return "mapSeverity";
    }

    if (targetField === "reporterEmail" || targetField === "email") {
      return "extractEmail";
    }

    if (targetField === "reporterPhone" || targetField === "phone") {
      return "extractPhone";
    }

    if (targetField === "reporterType") {
      return "parseBoolean";
    }

    return undefined;
  }

  /**
   * Normalize field name for comparison (lowercase, remove special chars).
   */
  private normalizeFieldName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }

  /**
   * Calculate string similarity using Levenshtein distance.
   * Returns 0-1 where 1 is identical.
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Boost for substring containment
    if (str1.includes(str2) || str2.includes(str1)) {
      const minLen = Math.min(str1.length, str2.length);
      const maxLen = Math.max(str1.length, str2.length);
      return 0.7 + (minLen / maxLen) * 0.3;
    }

    const len1 = str1.length;
    const len2 = str2.length;

    // Levenshtein distance calculation
    const matrix: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    const distance = matrix[len1][len2];
    return 1 - distance / maxLen;
  }

  /**
   * Prioritize fields for processing (identifiers first).
   */
  private prioritizeFields(fields: string[]): string[] {
    const priorityPatterns = ["id", "number", "ref", "key"];

    return [...fields].sort((a, b) => {
      const aNorm = a.toLowerCase();
      const bNorm = b.toLowerCase();

      const aIsPriority = priorityPatterns.some((p) => aNorm.includes(p));
      const bIsPriority = priorityPatterns.some((p) => bNorm.includes(p));

      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return 0;
    });
  }

  /**
   * Check if value looks like a date.
   */
  private looksLikeDate(value: string): boolean {
    return (
      /^\d{4}-\d{2}-\d{2}/.test(value) ||
      /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value) ||
      /^\d{1,2}-\d{1,2}-\d{2,4}/.test(value)
    );
  }

  /**
   * Check if value looks like an email.
   */
  private looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /**
   * Check if value looks like a phone number.
   */
  private looksLikePhone(value: string): boolean {
    const digitsOnly = value.replace(/\D/g, "");
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  }

  /**
   * Get all available target fields with descriptions.
   */
  getTargetFields(): typeof TARGET_FIELDS {
    return TARGET_FIELDS;
  }

  /**
   * Get all known field synonyms.
   */
  getFieldSynonyms(): Record<string, string[]> {
    return FIELD_SYNONYMS;
  }

  /**
   * Save mapping template for reuse.
   *
   * @param orgId - Organization ID
   * @param userId - User saving the template
   * @param name - Template name
   * @param mappings - Field mappings to save
   */
  async saveTemplate(
    orgId: string,
    userId: string,
    name: string,
    mappings: FieldMappingDto[],
  ): Promise<void> {
    await this.prisma.migrationFieldTemplate.upsert({
      where: {
        organizationId_sourceType_name: {
          organizationId: orgId,
          sourceType: MigrationSourceType.GENERIC_CSV,
          name,
        },
      },
      create: {
        organizationId: orgId,
        name,
        sourceType: MigrationSourceType.GENERIC_CSV,
        mappings: mappings as unknown as object,
        createdById: userId,
      },
      update: {
        mappings: mappings as unknown as object,
      },
    });

    this.logger.log(`Saved template "${name}" for org ${orgId}`);
  }

  /**
   * List saved templates for organization.
   */
  async listTemplates(orgId: string): Promise<TemplateSummary[]> {
    const templates = await this.prisma.migrationFieldTemplate.findMany({
      where: {
        organizationId: orgId,
        sourceType: MigrationSourceType.GENERIC_CSV,
      },
      select: {
        name: true,
        mappings: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return templates.map((t) => ({
      name: t.name,
      fieldCount: Array.isArray(t.mappings) ? t.mappings.length : 0,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Load a specific template by name.
   */
  async loadTemplate(
    orgId: string,
    templateName: string,
  ): Promise<FieldMappingDto[] | null> {
    const template = await this.prisma.migrationFieldTemplate.findFirst({
      where: {
        organizationId: orgId,
        sourceType: MigrationSourceType.GENERIC_CSV,
        name: templateName,
      },
    });

    if (!template) return null;

    return template.mappings as unknown as FieldMappingDto[];
  }

  /**
   * Delete a template.
   */
  async deleteTemplate(orgId: string, templateName: string): Promise<boolean> {
    try {
      await this.prisma.migrationFieldTemplate.delete({
        where: {
          organizationId_sourceType_name: {
            organizationId: orgId,
            sourceType: MigrationSourceType.GENERIC_CSV,
            name: templateName,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
