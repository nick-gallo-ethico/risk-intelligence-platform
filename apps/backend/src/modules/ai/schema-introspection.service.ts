import { Injectable, Logger } from "@nestjs/common";
import {
  EntitySchemaRegistryService,
  EntitySchema,
  FieldSchema,
  FieldType,
} from "./services/entity-schema-registry.service";
import {
  FilterValidatorService,
  FilterValidationResult,
  FilterOperator,
  FILTER_OPERATORS,
} from "./services/filter-validator.service";

// Re-export types for backward compatibility
export type { EntitySchema, FieldSchema, FieldType, FilterValidationResult };
export { FilterOperator, FILTER_OPERATORS };

/**
 * SchemaIntrospectionService provides schema discovery for AI-powered features.
 *
 * This service enables AI agents and skills to:
 * - Discover queryable entities and their fields
 * - Understand field types and valid values
 * - Validate AI-generated filters against schema
 * - Generate schema documentation for prompts
 *
 * Used by:
 * - AiTriageService: Schema context for NL query interpretation
 * - UserTableService (09-12): Field selectors for table builder UI
 * - AI Skills: Understanding available data structures
 *
 * Architecture: Thin coordinator delegating to:
 * - EntitySchemaRegistryService: Static schema definitions
 * - FilterValidatorService: Dynamic filter validation
 *
 * @example
 * ```typescript
 * // Get schema for AI prompt
 * const schema = service.getSchemaForPrompt(['disclosure', 'conflict']);
 *
 * // Validate AI-generated filter
 * const result = service.validateFilter('disclosure', { status: 'SUBMITTED' });
 * ```
 */
@Injectable()
export class SchemaIntrospectionService {
  private readonly logger = new Logger(SchemaIntrospectionService.name);

  constructor(
    private readonly entitySchemaRegistry: EntitySchemaRegistryService,
    private readonly filterValidator: FilterValidatorService,
  ) {}

  /**
   * Get all queryable entities with their field schemas.
   * Organization ID can be used for future org-specific schema extensions.
   *
   * @param organizationId - Organization context (for future customization)
   * @returns Array of entity schemas
   */
  getQueryableEntities(organizationId?: string): EntitySchema[] {
    return this.entitySchemaRegistry.getQueryableEntities(organizationId);
  }

  /**
   * Get schema for a specific entity.
   *
   * @param entityName - Entity identifier
   * @param organizationId - Organization context
   * @returns Entity schema or undefined if not found
   */
  getEntitySchema(
    entityName: string,
    organizationId?: string,
  ): EntitySchema | undefined {
    return this.entitySchemaRegistry.getEntitySchema(
      entityName,
      organizationId,
    );
  }

  /**
   * Format schema for AI prompt injection.
   * Generates human-readable schema documentation for LLM context.
   *
   * @param entityTypes - Optional filter for specific entity types
   * @param organizationId - Organization context
   * @returns Formatted schema string for prompt injection
   */
  getSchemaForPrompt(entityTypes?: string[], organizationId?: string): string {
    return this.entitySchemaRegistry.getSchemaForPrompt(
      entityTypes,
      organizationId,
    );
  }

  /**
   * Validate a filter object against entity schema.
   * Checks that fields exist, types match, and operators are valid.
   *
   * @param entityName - Entity to validate against
   * @param filter - Filter object to validate
   * @param organizationId - Organization context
   * @returns Validation result with errors if any
   */
  validateFilter(
    entityName: string,
    filter: Record<string, unknown>,
    organizationId?: string,
  ): FilterValidationResult {
    return this.filterValidator.validateFilter(
      entityName,
      filter,
      organizationId,
    );
  }

  /**
   * Get list of valid actions for an entity.
   * Used by AI to understand what bulk operations are available.
   *
   * @param entityName - Entity identifier
   * @returns Array of valid action names
   */
  getValidActions(entityName: string): string[] {
    return this.entitySchemaRegistry.getValidActions(entityName);
  }

  /**
   * Get field names that can be used for sorting.
   *
   * @param entityName - Entity identifier
   * @param organizationId - Organization context
   * @returns Array of sortable field names
   */
  getSortableFields(entityName: string, organizationId?: string): string[] {
    return this.entitySchemaRegistry.getSortableFields(
      entityName,
      organizationId,
    );
  }

  /**
   * Get field names that can be aggregated.
   *
   * @param entityName - Entity identifier
   * @param organizationId - Organization context
   * @returns Array of aggregatable field names
   */
  getAggregatableFields(entityName: string, organizationId?: string): string[] {
    return this.entitySchemaRegistry.getAggregatableFields(
      entityName,
      organizationId,
    );
  }
}
