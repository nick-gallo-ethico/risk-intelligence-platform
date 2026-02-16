import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { FieldMappingDto } from "./dto/migration.dto";
import { MigrationSourceType } from "@prisma/client";
import {
  FieldMatcherService,
  SuggestedMapping,
  FIELD_SYNONYMS,
  TARGET_FIELDS,
} from "./services/field-matcher.service";
import {
  TransformApplierService,
  TemplateSummary,
} from "./services/transform-applier.service";

// Re-export types for backward compatibility
export type { SuggestedMapping, TemplateSummary };

/**
 * MappingSuggestionService provides intelligent field mapping suggestions
 * for CSV imports based on field name analysis and data type inference.
 *
 * Architecture: Thin coordinator delegating to:
 * - FieldMatcherService: Fuzzy field matching and similarity scoring
 * - TransformApplierService: Value transformation and template management
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldMatcher: FieldMatcherService,
    private readonly transformApplier: TransformApplierService,
  ) {}

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
    const sortedFields = this.fieldMatcher.prioritizeFields(sourceFields);

    for (const sourceField of sortedFields) {
      const suggestion = this.fieldMatcher.suggestMapping(
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
    return this.transformApplier.saveTemplate(orgId, userId, name, mappings);
  }

  /**
   * List saved templates for organization.
   */
  async listTemplates(orgId: string): Promise<TemplateSummary[]> {
    return this.transformApplier.listTemplates(orgId);
  }

  /**
   * Load a specific template by name.
   */
  async loadTemplate(
    orgId: string,
    templateName: string,
  ): Promise<FieldMappingDto[] | null> {
    return this.transformApplier.loadTemplate(orgId, templateName);
  }

  /**
   * Delete a template.
   */
  async deleteTemplate(orgId: string, templateName: string): Promise<boolean> {
    return this.transformApplier.deleteTemplate(orgId, templateName);
  }
}
