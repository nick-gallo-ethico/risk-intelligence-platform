import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { MigrationSourceType, MigrationJobStatus } from "@prisma/client";
import {
  FieldMappingDto,
  TransformFunction,
  TargetEntityType,
  FormatDetectionResponseDto,
  PreviewRow,
} from "../dto/migration.dto";
import {
  getFieldMappingHints,
  TARGET_FIELDS,
} from "../entities/migration.entity";

/**
 * MigrationParserService handles file parsing, format detection, and field mapping.
 *
 * Responsibilities:
 * - Detect file format and source type (NAVEX, EQS, CSV)
 * - Generate suggested field mappings based on source type
 * - Fuzzy match field names to target fields
 * - Apply transform functions to values
 * - Parse and normalize values
 *
 * This service extracts parsing-related logic from MigrationService
 * to follow the thin coordinator pattern.
 */
@Injectable()
export class MigrationParserService {
  private readonly logger = new Logger(MigrationParserService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Format Detection

  /**
   * Detect file format and suggest field mappings.
   * Updates job status and stores detection results.
   *
   * @param organizationId - Tenant organization ID
   * @param jobId - Migration job ID
   * @param job - Migration job (pre-fetched)
   * @param fileContent - Parsed file content as array of records
   * @returns Format detection result with suggested mappings
   */
  async detectFormat(
    organizationId: string,
    jobId: string,
    job: { sourceType: MigrationSourceType },
    fileContent: Record<string, unknown>[],
  ): Promise<FormatDetectionResponseDto> {
    // Update job status to validating
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: MigrationJobStatus.VALIDATING,
        currentStep: "Detecting file format",
      },
    });

    // Detect fields from first row
    const detectedFields =
      fileContent.length > 0 ? Object.keys(fileContent[0]) : [];

    // Get sample rows for preview
    const sampleRows = fileContent.slice(0, 5);

    // Get suggested mappings based on source type
    const hints = getFieldMappingHints(job.sourceType);
    const suggestedMappings = this.generateSuggestedMappings(
      detectedFields,
      hints,
      job.sourceType,
    );

    // Calculate confidence based on matched fields
    const matchedCount = suggestedMappings.filter((m) => m.targetField).length;
    const confidence =
      detectedFields.length > 0
        ? Math.round((matchedCount / detectedFields.length) * 100)
        : 0;

    // Update job with total rows and status
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        totalRows: fileContent.length,
        status: MigrationJobStatus.MAPPING,
        currentStep: "Awaiting field mapping",
      },
    });

    this.logger.log(
      `Format detected for job ${jobId}: ${detectedFields.length} fields, ${confidence}% confidence`,
    );

    return {
      sourceType: job.sourceType,
      confidence,
      detectedFields,
      sampleRows,
      suggestedMappings,
    };
  }

  /**
   * Detect source type from headers and sample data.
   * Analyzes field names to determine if data is from NAVEX, EQS, or generic CSV.
   *
   * @param headers - Array of column headers
   * @param sampleRows - Sample rows for analysis
   * @returns Detected source type
   */
  detectSourceType(
    headers: string[],
    _sampleRows: Record<string, unknown>[],
  ): MigrationSourceType {
    const normalizedHeaders = headers.map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    );

    // Check for NAVEX-specific fields
    const navexIndicators = [
      "case_number",
      "case_id",
      "incident_type",
      "navex",
      "report_id",
    ];
    const navexMatches = normalizedHeaders.filter((h) =>
      navexIndicators.some((ind) => h.includes(ind)),
    ).length;

    // Check for EQS-specific fields
    const eqsIndicators = [
      "report_id",
      "ref_number",
      "category_name",
      "eqs",
      "conversant",
    ];
    const eqsMatches = normalizedHeaders.filter((h) =>
      eqsIndicators.some((ind) => h.includes(ind)),
    ).length;

    // Check for Legacy Ethico fields
    const legacyIndicators = [
      "case_num",
      "riu_num",
      "call_details",
      "site_code",
    ];
    const legacyMatches = normalizedHeaders.filter((h) =>
      legacyIndicators.some((ind) => h.includes(ind)),
    ).length;

    // Determine best match
    if (navexMatches >= 2) {
      return MigrationSourceType.NAVEX;
    }
    if (eqsMatches >= 2) {
      return MigrationSourceType.EQS;
    }
    if (legacyMatches >= 2) {
      return MigrationSourceType.LEGACY_ETHICO;
    }

    return MigrationSourceType.GENERIC_CSV;
  }

  /**
   * Detect CSV delimiter from content.
   *
   * @param content - Raw CSV content string
   * @returns Detected delimiter character
   */
  detectDelimiter(content: string): string {
    const firstLine = content.split("\n")[0] || "";

    // Count occurrences of common delimiters
    const delimiters = [",", ";", "\t", "|"];
    const counts = delimiters.map((d) => ({
      delimiter: d,
      count: (firstLine.match(new RegExp(`\\${d}`, "g")) || []).length,
    }));

    // Return the delimiter with highest count
    const sorted = counts.sort((a, b) => b.count - a.count);
    return sorted[0]?.count > 0 ? sorted[0].delimiter : ",";
  }

  /**
   * Detect file encoding from buffer.
   * Checks for BOM markers and validates UTF-8.
   *
   * @param buffer - File buffer
   * @returns Detected encoding name
   */
  detectEncoding(buffer: Buffer): string {
    // Check for BOM markers
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return "utf-8-bom";
    }
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return "utf-16le";
    }
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      return "utf-16be";
    }

    // Check if valid UTF-8
    try {
      const text = buffer.toString("utf-8");
      if (text.includes("\uFFFD")) {
        return "latin1"; // Contains replacement characters
      }
      return "utf-8";
    } catch {
      return "latin1";
    }
  }

  // Field Mapping

  /**
   * Generate suggested field mappings based on source fields and hints.
   *
   * @param sourceFields - Array of source field names
   * @param hints - Mapping hints from source type configuration
   * @param sourceType - Migration source type
   * @returns Array of suggested field mappings
   */
  generateSuggestedMappings(
    sourceFields: string[],
    hints: Record<
      string,
      { targetField: string; targetEntity: TargetEntityType }
    >,
    sourceType: MigrationSourceType,
  ): FieldMappingDto[] {
    return sourceFields.map((field) => {
      const normalizedField = field.toLowerCase().replace(/[^a-z0-9]/g, "_");

      // Check for exact match in hints
      const hint = hints[normalizedField] || hints[field.toLowerCase()];

      if (hint) {
        return {
          sourceField: field,
          targetField: hint.targetField,
          targetEntity: hint.targetEntity,
          isRequired: false,
        };
      }

      // Fuzzy match for generic CSV
      if (sourceType === MigrationSourceType.GENERIC_CSV) {
        const fuzzyMatch = this.fuzzyMatchField(normalizedField);
        if (fuzzyMatch) {
          return {
            sourceField: field,
            targetField: fuzzyMatch.targetField,
            targetEntity: fuzzyMatch.targetEntity,
            isRequired: false,
          };
        }
      }

      // No match - return unmapped
      return {
        sourceField: field,
        targetField: "",
        targetEntity: TargetEntityType.CASE,
        isRequired: false,
      };
    });
  }

  /**
   * Generate AI-assisted field mapping suggestions.
   * Analyzes source headers and sample data to suggest optimal mappings.
   *
   * @param sourceHeaders - Source column headers
   * @param targetEntity - Target entity type
   * @param sampleData - Sample rows for context
   * @returns Array of suggested field mappings
   */
  async generateFieldSuggestions(
    sourceHeaders: string[],
    targetEntity: TargetEntityType,
    sampleData?: Record<string, unknown>[],
  ): Promise<FieldMappingDto[]> {
    const suggestions: FieldMappingDto[] = [];
    const targetFields = TARGET_FIELDS[targetEntity];

    for (const header of sourceHeaders) {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "_");

      // Try exact match first
      const exactMatch = targetFields.find(
        (tf) => tf.toLowerCase() === normalizedHeader,
      );

      if (exactMatch) {
        suggestions.push({
          sourceField: header,
          targetField: exactMatch,
          targetEntity,
          isRequired: false,
        });
        continue;
      }

      // Try fuzzy match
      const fuzzyMatch = this.fuzzyMatchFieldForEntity(
        normalizedHeader,
        targetEntity,
      );
      if (fuzzyMatch) {
        suggestions.push({
          sourceField: header,
          targetField: fuzzyMatch,
          targetEntity,
          isRequired: false,
          transformFunction: this.suggestTransform(header, sampleData),
        });
        continue;
      }

      // No match - suggest unmapped
      suggestions.push({
        sourceField: header,
        targetField: "",
        targetEntity,
        isRequired: false,
      });
    }

    return suggestions;
  }

  /**
   * Apply field mapping to transform a row.
   *
   * @param row - Source data row
   * @param mappings - Field mappings to apply
   * @returns Transformed data grouped by entity type
   */
  applyFieldMapping(
    row: Record<string, unknown>,
    mappings: FieldMappingDto[],
  ): PreviewRow["transformedData"] {
    const result: PreviewRow["transformedData"] = {
      case: {},
      riu: {},
      person: {},
      investigation: {},
    };

    for (const mapping of mappings) {
      if (!mapping.targetField) continue;

      let value = row[mapping.sourceField];

      // Apply transform if specified
      if (mapping.transformFunction && value !== null && value !== undefined) {
        value = this.applyTransform(
          value,
          mapping.transformFunction,
          mapping.transformParams,
        );
      }

      // Apply default value if empty
      if (
        (value === null || value === undefined || value === "") &&
        mapping.defaultValue !== undefined
      ) {
        value = mapping.defaultValue;
      }

      // Skip if still empty
      if (value === null || value === undefined || value === "") continue;

      // Add to appropriate entity
      switch (mapping.targetEntity) {
        case TargetEntityType.CASE:
          result.case![mapping.targetField] = value;
          break;
        case TargetEntityType.RIU:
          result.riu![mapping.targetField] = value;
          break;
        case TargetEntityType.PERSON:
          result.person![mapping.targetField] = value;
          break;
        case TargetEntityType.INVESTIGATION:
          result.investigation![mapping.targetField] = value;
          break;
      }
    }

    return result;
  }

  /**
   * Validate that mappings are complete and valid.
   *
   * @param mappings - Field mappings to validate
   * @param targetEntity - Target entity for validation
   * @returns Validation errors (empty if valid)
   */
  validateMapping(
    mappings: FieldMappingDto[],
    targetEntity: TargetEntityType,
  ): string[] {
    const errors: string[] = [];
    const validFields = TARGET_FIELDS[targetEntity];

    // Check for required fields without mapping
    const requiredMappings = mappings.filter(
      (m) => m.isRequired && !m.targetField,
    );
    if (requiredMappings.length > 0) {
      errors.push(
        `Required fields not mapped: ${requiredMappings.map((m) => m.sourceField).join(", ")}`,
      );
    }

    // Check for valid target fields
    for (const mapping of mappings) {
      if (mapping.targetField && mapping.targetEntity === targetEntity) {
        if (!validFields.includes(mapping.targetField)) {
          errors.push(
            `Invalid target field '${mapping.targetField}' for entity ${targetEntity}`,
          );
        }
      }
    }

    return errors;
  }

  /**
   * Save field mappings to the migration job.
   *
   * @param organizationId - Tenant organization ID
   * @param jobId - Migration job ID
   * @param mappings - Field mappings to save
   */
  async saveFieldMappings(
    organizationId: string,
    jobId: string,
    mappings: FieldMappingDto[],
  ): Promise<void> {
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        fieldMappings: JSON.parse(JSON.stringify(mappings)),
        status: MigrationJobStatus.MAPPING,
        currentStep: "Field mappings saved",
      },
    });

    this.logger.log(`Saved ${mappings.length} field mappings for job ${jobId}`);
  }

  // Parsing and Transformation

  /**
   * Parse a single row using the provided mappings.
   *
   * @param row - Source data row
   * @param mappings - Field mappings to apply
   * @param _transforms - Additional transforms (reserved for future use)
   * @returns Transformed row data
   */
  parseRow(
    row: Record<string, unknown>,
    mappings: FieldMappingDto[],
    _transforms?: Record<string, TransformFunction>,
  ): PreviewRow["transformedData"] {
    return this.applyFieldMapping(row, mappings);
  }

  /**
   * Apply a transform function to a value.
   *
   * @param value - Value to transform
   * @param transform - Transform function to apply
   * @param _params - Transform parameters (reserved for future use)
   * @returns Transformed value
   */
  applyTransform(
    value: unknown,
    transform: TransformFunction,
    _params?: Record<string, unknown>,
  ): unknown {
    const strValue = String(value);

    switch (transform) {
      case TransformFunction.UPPERCASE:
        return strValue.toUpperCase();

      case TransformFunction.LOWERCASE:
        return strValue.toLowerCase();

      case TransformFunction.TRIM:
        return strValue.trim();

      case TransformFunction.PARSE_DATE:
      case TransformFunction.PARSE_DATE_US:
      case TransformFunction.PARSE_DATE_EU:
      case TransformFunction.PARSE_DATE_ISO:
        return this.parseDate(strValue, transform);

      case TransformFunction.PARSE_BOOLEAN:
        const lowered = strValue.toLowerCase().trim();
        return ["yes", "true", "1", "y"].includes(lowered);

      case TransformFunction.PARSE_NUMBER:
        return Number(strValue.replace(/[^0-9.-]/g, ""));

      case TransformFunction.SPLIT_COMMA:
        return strValue
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      case TransformFunction.EXTRACT_EMAIL:
        const emailMatch = strValue.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
        );
        return emailMatch ? emailMatch[0] : null;

      case TransformFunction.EXTRACT_PHONE:
        const phoneMatch = strValue.match(/[\d\-\(\)\s\.]+/);
        return phoneMatch ? phoneMatch[0].replace(/\D/g, "") : null;

      case TransformFunction.MAP_SEVERITY:
        return this.mapSeverity(strValue);

      case TransformFunction.MAP_STATUS:
        return this.mapStatus(strValue);

      case TransformFunction.MAP_CATEGORY:
        // Category mapping requires lookup - return original for now
        return strValue;

      default:
        return value;
    }
  }

  /**
   * Normalize a value to the expected target type.
   *
   * @param value - Value to normalize
   * @param targetType - Expected target type
   * @returns Normalized value
   */
  normalizeValue(
    value: unknown,
    targetType: "string" | "number" | "date" | "boolean" | "array",
  ): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    switch (targetType) {
      case "string":
        return String(value).trim();

      case "number":
        const num = Number(String(value).replace(/[^0-9.-]/g, ""));
        return isNaN(num) ? null : num;

      case "date":
        const date = this.parseDate(
          String(value),
          TransformFunction.PARSE_DATE,
        );
        return date;

      case "boolean":
        const str = String(value).toLowerCase().trim();
        return ["yes", "true", "1", "y"].includes(str);

      case "array":
        if (Array.isArray(value)) return value;
        return String(value)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      default:
        return value;
    }
  }

  // Private Helpers

  /**
   * Fuzzy match a field name to a target field.
   */
  private fuzzyMatchField(
    fieldName: string,
  ): { targetField: string; targetEntity: TargetEntityType } | null {
    const commonPatterns: Record<
      string,
      { targetField: string; targetEntity: TargetEntityType }
    > = {
      // Case fields
      case: {
        targetField: "referenceNumber",
        targetEntity: TargetEntityType.CASE,
      },
      ref: {
        targetField: "referenceNumber",
        targetEntity: TargetEntityType.CASE,
      },
      number: {
        targetField: "referenceNumber",
        targetEntity: TargetEntityType.CASE,
      },
      status: { targetField: "status", targetEntity: TargetEntityType.CASE },
      severity: {
        targetField: "severity",
        targetEntity: TargetEntityType.CASE,
      },
      priority: {
        targetField: "severity",
        targetEntity: TargetEntityType.CASE,
      },
      category: {
        targetField: "categoryName",
        targetEntity: TargetEntityType.CASE,
      },
      type: {
        targetField: "categoryName",
        targetEntity: TargetEntityType.CASE,
      },
      description: {
        targetField: "details",
        targetEntity: TargetEntityType.RIU,
      },
      details: { targetField: "details", targetEntity: TargetEntityType.RIU },
      narrative: { targetField: "details", targetEntity: TargetEntityType.RIU },
      summary: { targetField: "summary", targetEntity: TargetEntityType.RIU },

      // Location fields
      location: {
        targetField: "locationName",
        targetEntity: TargetEntityType.CASE,
      },
      site: {
        targetField: "locationName",
        targetEntity: TargetEntityType.CASE,
      },
      facility: {
        targetField: "locationName",
        targetEntity: TargetEntityType.CASE,
      },
      city: {
        targetField: "locationCity",
        targetEntity: TargetEntityType.CASE,
      },
      state: {
        targetField: "locationState",
        targetEntity: TargetEntityType.CASE,
      },
      country: {
        targetField: "locationCountry",
        targetEntity: TargetEntityType.CASE,
      },

      // Date fields
      date: { targetField: "createdAt", targetEntity: TargetEntityType.CASE },
      created: {
        targetField: "createdAt",
        targetEntity: TargetEntityType.CASE,
      },
      reported: {
        targetField: "intakeTimestamp",
        targetEntity: TargetEntityType.CASE,
      },

      // Person fields
      name: { targetField: "name", targetEntity: TargetEntityType.PERSON },
      employee: {
        targetField: "employeeId",
        targetEntity: TargetEntityType.PERSON,
      },
      email: { targetField: "email", targetEntity: TargetEntityType.PERSON },
    };

    for (const [pattern, mapping] of Object.entries(commonPatterns)) {
      if (fieldName.includes(pattern)) {
        return mapping;
      }
    }

    return null;
  }

  /**
   * Fuzzy match for a specific target entity.
   */
  private fuzzyMatchFieldForEntity(
    fieldName: string,
    targetEntity: TargetEntityType,
  ): string | null {
    const targetFields = TARGET_FIELDS[targetEntity];

    for (const targetField of targetFields) {
      const normalizedTarget = targetField.toLowerCase();

      // Check if field name contains target field name or vice versa
      if (
        fieldName.includes(normalizedTarget) ||
        normalizedTarget.includes(fieldName)
      ) {
        return targetField;
      }
    }

    return null;
  }

  /**
   * Suggest a transform function based on field name and sample data.
   */
  private suggestTransform(
    fieldName: string,
    sampleData?: Record<string, unknown>[],
  ): TransformFunction | undefined {
    const normalizedField = fieldName.toLowerCase();

    // Date fields
    if (
      normalizedField.includes("date") ||
      normalizedField.includes("time") ||
      normalizedField.includes("created") ||
      normalizedField.includes("updated")
    ) {
      return TransformFunction.PARSE_DATE;
    }

    // Email fields
    if (normalizedField.includes("email")) {
      return TransformFunction.EXTRACT_EMAIL;
    }

    // Phone fields
    if (normalizedField.includes("phone") || normalizedField.includes("tel")) {
      return TransformFunction.EXTRACT_PHONE;
    }

    // Status fields
    if (normalizedField.includes("status")) {
      return TransformFunction.MAP_STATUS;
    }

    // Severity fields
    if (
      normalizedField.includes("severity") ||
      normalizedField.includes("priority")
    ) {
      return TransformFunction.MAP_SEVERITY;
    }

    // Check sample data for type hints
    if (sampleData && sampleData.length > 0) {
      const sampleValue = sampleData[0][fieldName];
      if (sampleValue !== null && sampleValue !== undefined) {
        const strValue = String(sampleValue);

        // Check if it looks like a date
        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(strValue)) {
          return TransformFunction.PARSE_DATE;
        }

        // Check if it looks like an email
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
          return TransformFunction.EXTRACT_EMAIL;
        }
      }
    }

    return undefined;
  }

  /**
   * Parse a date string.
   */
  private parseDate(value: string, format: TransformFunction): Date | null {
    try {
      const trimmed = value.trim();

      switch (format) {
        case TransformFunction.PARSE_DATE_US: {
          // MM/DD/YYYY
          const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (match) {
            return new Date(
              parseInt(match[3]),
              parseInt(match[1]) - 1,
              parseInt(match[2]),
            );
          }
          break;
        }
        case TransformFunction.PARSE_DATE_EU: {
          // DD/MM/YYYY
          const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (match) {
            return new Date(
              parseInt(match[3]),
              parseInt(match[2]) - 1,
              parseInt(match[1]),
            );
          }
          break;
        }
        case TransformFunction.PARSE_DATE_ISO: {
          // YYYY-MM-DD
          const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (match) {
            return new Date(
              parseInt(match[1]),
              parseInt(match[2]) - 1,
              parseInt(match[3]),
            );
          }
          break;
        }
        default: {
          // Auto-detect
          const date = new Date(trimmed);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Map severity strings to enum values.
   */
  private mapSeverity(value: string): string {
    const lowered = value.toLowerCase().trim();

    if (["high", "critical", "3", "urgent"].includes(lowered)) return "HIGH";
    if (["medium", "moderate", "2", "normal"].includes(lowered))
      return "MEDIUM";
    if (["low", "1", "minor"].includes(lowered)) return "LOW";

    return "MEDIUM"; // Default
  }

  /**
   * Map status strings to enum values.
   */
  private mapStatus(value: string): string {
    const lowered = value.toLowerCase().trim();

    if (["new", "pending", "received"].includes(lowered)) return "NEW";
    if (["open", "in progress", "active", "investigating"].includes(lowered))
      return "OPEN";
    if (["closed", "resolved", "complete", "completed"].includes(lowered))
      return "CLOSED";

    return "NEW"; // Default
  }
}
