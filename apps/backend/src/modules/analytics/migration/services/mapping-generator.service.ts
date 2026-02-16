import { Injectable, Logger } from "@nestjs/common";
import { MigrationSourceType } from "@prisma/client";
import {
  FieldMappingDto,
  TransformFunction,
  TargetEntityType,
} from "../dto/migration.dto";
import {
  getFieldMappingHints,
  TARGET_FIELDS,
} from "../entities/migration.entity";
import { FieldMatcherService } from "./field-matcher.service";

/**
 * MappingGeneratorService handles field mapping generation and validation.
 *
 * Responsibilities:
 * - Generate suggested field mappings based on source type and hints
 * - Validate mappings against target entity fields
 * - Apply field mappings to transform rows
 * - Apply transform functions to values
 * - Suggest transforms based on field names and sample data
 *
 * This service extracts mapping generation logic from MigrationParserService
 * to follow the thin coordinator pattern.
 */
@Injectable()
export class MappingGeneratorService {
  private readonly logger = new Logger(MappingGeneratorService.name);

  constructor(private readonly fieldMatcher: FieldMatcherService) {}

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
   * Generate field mapping suggestions using full mapping analysis.
   *
   * @param sourceFields - Source column names
   * @param sourceType - Migration source type
   * @param fileContent - Sample file content for analysis
   * @returns Array of suggested mappings
   */
  generateMappingsFromContent(
    sourceFields: string[],
    sourceType: MigrationSourceType,
    fileContent?: Record<string, unknown>[],
  ): FieldMappingDto[] {
    const hints = getFieldMappingHints(sourceType);
    const mappings = this.generateSuggestedMappings(
      sourceFields,
      hints,
      sourceType,
    );

    // Enhance with transform suggestions if sample data available
    if (fileContent && fileContent.length > 0) {
      for (const mapping of mappings) {
        if (!mapping.transformFunction) {
          mapping.transformFunction = this.suggestTransform(
            mapping.sourceField,
            fileContent,
          );
        }
      }
    }

    return mappings;
  }

  /**
   * Generate AI-assisted field mapping suggestions.
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

      // Try fuzzy match using FieldMatcherService
      const usedTargets = new Set<string>();
      for (const existing of suggestions) {
        if (existing.targetField) usedTargets.add(existing.targetField);
      }

      const fuzzyMatch = this.fieldMatcher.findBestMatch(header, usedTargets);

      if (fuzzyMatch && fuzzyMatch.similarity >= 0.6) {
        suggestions.push({
          sourceField: header,
          targetField: fuzzyMatch.targetField,
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
   * Validate that mappings are complete and valid.
   *
   * @param mappings - Field mappings to validate
   * @param targetEntity - Target entity for validation
   * @returns Validation errors (empty if valid)
   */
  validateMappings(
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

    // Check for duplicate target field mappings
    const targetFieldCounts = new Map<string, number>();
    for (const mapping of mappings) {
      if (mapping.targetField) {
        const key = `${mapping.targetEntity}:${mapping.targetField}`;
        targetFieldCounts.set(key, (targetFieldCounts.get(key) || 0) + 1);
      }
    }

    for (const [key, count] of targetFieldCounts.entries()) {
      if (count > 1) {
        const [entity, field] = key.split(":");
        errors.push(
          `Target field '${field}' on ${entity} has ${count} source mappings`,
        );
      }
    }

    return errors;
  }

  /**
   * Suggest a transform function based on field name and sample data.
   */
  suggestTransform(
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
   * Fuzzy match a field name to a target field.
   * Common pattern matching for well-known field names.
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
}
